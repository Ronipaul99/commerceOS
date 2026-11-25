import { AsyncLocalStorage } from "node:async_hooks";
import { createHmac, randomBytes } from "node:crypto";
import { ROOT_CONTEXT, SpanKind, SpanStatusCode, trace } from "@opentelemetry/api";
import type { Span, SpanContext } from "@opentelemetry/api";
import { MeterProvider, MetricReader } from "@opentelemetry/sdk-metrics";
import { AlwaysOnSampler, BasicTracerProvider } from "@opentelemetry/sdk-trace-base";
import type { ReadableSpan, SpanProcessor } from "@opentelemetry/sdk-trace-base";

const operations = [
  "http.request", "readiness.db", "readiness.redis", "readiness.storage", "db.outbox_append",
  "db.outbox_claim", "db.outbox_lookup", "db.outbox_reserve", "db.outbox_apply", "outbox.dispatch",
  "outbox.consume", "outbox.dead_letter", "queue.outbox_read", "queue.outbox_enqueue", "queue.outbox_failed",
  "queue.outbox_stalled", "queue.outbox_connection", "queue.files_read", "queue.files_enqueue",
  "queue.files_failed", "queue.files_stalled", "queue.files_connection", "files.process", "files.dispatch",
] as const;
export type Operation = typeof operations[number];
type Outcome = "ok" | "denied" | "error";
type Service = "api" | "worker";
const allowedOperations = new Set<string>(operations);
const alerts = {
  "readiness.db": ["DATABASE_UNAVAILABLE", "Data Recovery On-call"],
  "db.outbox_append": ["DATABASE_WRITE_FAILED", "Data Recovery On-call"],
  "db.outbox_claim": ["DATABASE_OUTBOX_FAILED", "Data Recovery On-call"],
  "db.outbox_lookup": ["DATABASE_OUTBOX_FAILED", "Data Recovery On-call"],
  "db.outbox_reserve": ["DATABASE_OUTBOX_FAILED", "Data Recovery On-call"],
  "db.outbox_apply": ["DATABASE_OUTBOX_FAILED", "Data Recovery On-call"],
  "readiness.redis": ["REDIS_UNAVAILABLE", "Platform On-call"],
  "readiness.storage": ["STORAGE_UNAVAILABLE", "Platform On-call"],
  "queue.outbox_read": ["REDIS_COMMAND_FAILED", "Platform On-call"],
  "queue.outbox_enqueue": ["REDIS_COMMAND_FAILED", "Platform On-call"],
  "queue.outbox_connection": ["REDIS_UNAVAILABLE", "Platform On-call"],
  "queue.files_read": ["REDIS_COMMAND_FAILED", "Platform On-call"],
  "queue.files_enqueue": ["REDIS_COMMAND_FAILED", "Platform On-call"],
  "queue.files_connection": ["REDIS_UNAVAILABLE", "Platform On-call"],
  "queue.outbox_stalled": ["OUTBOX_QUEUE_STALLED", "Platform On-call"],
  "queue.files_stalled": ["FILE_QUEUE_STALLED", "Platform On-call"],
  "queue.outbox_failed": ["OUTBOX_JOB_FAILED", "Platform On-call"],
  "queue.files_failed": ["FILE_JOB_FAILED", "Platform On-call"],
  "outbox.dead_letter": ["OUTBOX_DEAD_LETTER", "Platform On-call"],
} as const satisfies Partial<Record<Operation, readonly [string, string]>>;
type AlertOperation = keyof typeof alerts;
type Signal = Readonly<{
  kind: "businessos.observation";
  service: Service;
  operation: Operation;
  outcome: Outcome;
  time: string;
  durationMs: number;
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  status?: number;
  tenantRef?: string;
  actorRef?: string;
  alert?: Readonly<{ code: string; owner: string }>;
}>;

const active = new AsyncLocalStorage<Span>();
const traceparentPattern = /^00-([0-9a-f]{32})-([0-9a-f]{16})-(00|01)$/;
const maskKey = randomBytes(32);

function parentFromValue(value: unknown): SpanContext | undefined {
  if (typeof value !== "string" || value.length !== 55) return undefined;
  const match = traceparentPattern.exec(value);
  if (!match) return undefined;
  const context = { traceId: match[1]!, spanId: match[2]!, traceFlags: Number(match[3]), isRemote: true };
  return trace.isSpanContextValid(context) ? context : undefined;
}

export function activeTraceParent(): string | null {
  const span = active.getStore();
  if (!span || !span.isRecording()) return null;
  const { traceId, spanId, traceFlags } = span.spanContext();
  return "00-" + traceId + "-" + spanId + "-" + ((traceFlags & 1) ? "01" : "00");
}

export function recordVerifiedScope(tenantId: string, actorId: string): void {
  const span = active.getStore();
  if (!span) return;
  const ref = (kind: string, value: string) => createHmac("sha256", maskKey).update(kind + "\0" + value).digest("hex").slice(0, 16);
  span.setAttribute("businessos.tenant.ref", ref("tenant", tenantId));
  span.setAttribute("businessos.actor.ref", ref("actor", actorId));
}

class InProcessReader extends MetricReader {
  async onForceFlush(): Promise<void> { /* Collection is explicit. */ }
  async onShutdown(): Promise<void> { /* No external destination. */ }
}

type Options = Readonly<{ write?: (entry: Signal) => void; captureSuccess?: boolean }>;

export function createTelemetry(service: Service, options: Options = {}) {
  if (service !== "api" && service !== "worker") throw new TypeError("Invalid telemetry service.");
  const reader = new InProcessReader();
  const metrics = new MeterProvider({ readers: [reader] });
  const meter = metrics.getMeter("businessos." + service);
  const completed = meter.createCounter("businessos.operations");
  const duration = meter.createHistogram("businessos.operation.duration", { unit: "ms" });
  const depth = meter.createGauge("businessos.queue.depth", { unit: "{job}" });
  const age = meter.createHistogram("businessos.queue.age", { unit: "ms" });
  const ring: Signal[] = [];
  const capacity = 256;
  let inserted = 0;
  const lastLog = new Map<string, number>();
  const onEnd = (span: ReadableSpan) => {
    const { traceId, spanId } = span.spanContext();
    const operation = span.name as Operation;
    const outcome = span.attributes["businessos.outcome"] as Outcome;
    const [seconds, nanos] = span.duration;
    const durationMs = seconds * 1000 + nanos / 1_000_000;
    const labels = { service, operation, outcome };
    completed.add(1, labels);
    duration.record(durationMs, labels);
    const alert = outcome === "error" && Object.hasOwn(alerts, operation) ? alerts[operation as AlertOperation] : undefined;
    const status = span.attributes["http.response.status_code"];
    const tenantRef = span.attributes["businessos.tenant.ref"];
    const actorRef = span.attributes["businessos.actor.ref"];
    const entry: Signal = Object.freeze({
      kind: "businessos.observation", ...labels, time: new Date().toISOString(), durationMs, traceId, spanId,
      ...(span.parentSpanContext ? { parentSpanId: span.parentSpanContext.spanId } : {}),
      ...(typeof status === "number" ? { status } : {}),
      ...(typeof tenantRef === "string" ? { tenantRef } : {}),
      ...(typeof actorRef === "string" ? { actorRef } : {}),
      ...(alert ? { alert: Object.freeze({ code: alert[0], owner: alert[1] }) } : {}),
    });
    ring[inserted % capacity] = entry;
    inserted++;
    if (!options.write || (!options.captureSuccess && outcome !== "error")) return;
    const key = operation + ":" + outcome;
    const now = Date.now();
    if (now - (lastLog.get(key) ?? 0) < 1000 && !options.captureSuccess) return;
    lastLog.set(key, now);
    try { options.write(entry); } catch { /* Diagnostics cannot change operation state. */ }
  };
  const processor: SpanProcessor = {
    onStart() { /* Records are committed on span completion. */ },
    onEnd,
    async shutdown() { /* No external destination. */ },
    async forceFlush() { /* Records are available synchronously. */ },
  };
  const traces = new BasicTracerProvider({
    sampler: new AlwaysOnSampler(),
    spanLimits: { attributeCountLimit: 8, attributeValueLengthLimit: 64 },
    spanProcessors: [processor],
  });
  const tracer = traces.getTracer("businessos." + service);

  function begin(operation: Operation, durableParent?: unknown) {
    if (!allowedOperations.has(operation)) throw new TypeError("Unknown telemetry operation.");
    const parentSpan = active.getStore();
    const remote = parentFromValue(durableParent);
    const parent = remote ? trace.setSpanContext(ROOT_CONTEXT, remote)
      : parentSpan ? trace.setSpan(ROOT_CONTEXT, parentSpan) : ROOT_CONTEXT;
    const kind = operation === "http.request" ? SpanKind.SERVER : operation === "outbox.consume" ? SpanKind.CONSUMER
      : operation.endsWith("_enqueue") ? SpanKind.PRODUCER : SpanKind.INTERNAL;
    const span = tracer.startSpan(operation, { kind }, parent);
    let ended = false;
    return {
      run<T>(work: () => T): T {
        return active.run(span, work);
      },
      end(outcome: Outcome, status?: number) {
        if (ended) return;
        ended = true;
        const safeOutcome = outcome === "ok" || outcome === "denied" ? outcome : "error";
        span.setAttribute("businessos.outcome", safeOutcome);
        if (typeof status === "number" && Number.isInteger(status) && status >= 100 && status <= 599) {
          span.setAttribute("http.response.status_code", status);
        }
        span.setStatus({ code: safeOutcome === "error" ? SpanStatusCode.ERROR : SpanStatusCode.OK });
        span.end();
      },
    };
  }

  return {
    begin,
    async observe<T>(operation: Operation, work: () => Promise<T>, parent?: unknown, classify?: (result: T) => Outcome): Promise<T> {
      const scope = begin(operation, parent);
      try {
        const result = await scope.run(work);
        scope.end(classify?.(result) ?? "ok");
        return result;
      } catch (error) {
        scope.end("error");
        throw error;
      }
    },
    signal(operation: Operation, outcome: Outcome) {
      begin(operation).end(outcome);
    },
    queueSample(queue: "outbox" | "files", sample: Readonly<{ depth?: number; ageMs?: number }>) {
      if (queue !== "outbox" && queue !== "files") return;
      if (Number.isSafeInteger(sample.depth) && sample.depth! >= 0) depth.record(sample.depth!, { service, queue });
      if (Number.isSafeInteger(sample.ageMs) && sample.ageMs! >= 0) age.record(sample.ageMs!, { service, queue });
    },
    async snapshot() {
      const pivot = inserted >= capacity ? inserted % capacity : 0;
      const observations = [...ring.slice(pivot), ...ring.slice(0, pivot)];
      const { resourceMetrics } = await reader.collect();
      return { observations, metrics: resourceMetrics.scopeMetrics.flatMap((scope) => scope.metrics) };
    },
  };
}

export type Telemetry = ReturnType<typeof createTelemetry>;

export function reportObservation(value: unknown) {
  if (!value || typeof value !== "object") return undefined;
  const entry = value as Partial<Signal>;
  if (entry.kind !== "businessos.observation" || (entry.service !== "api" && entry.service !== "worker")
      || typeof entry.operation !== "string" || !allowedOperations.has(entry.operation)
      || (entry.outcome !== "ok" && entry.outcome !== "error" && entry.outcome !== "denied")
      || typeof entry.durationMs !== "number" || !Number.isFinite(entry.durationMs) || entry.durationMs < 0
      || typeof entry.traceId !== "string" || !/^[a-f0-9]{32}$/.test(entry.traceId) || entry.traceId.length !== 32
      || typeof entry.spanId !== "string" || !/^[a-f0-9]{16}$/.test(entry.spanId) || entry.spanId.length !== 16) return undefined;
  const route = entry.outcome === "error" && Object.hasOwn(alerts, entry.operation)
    ? alerts[entry.operation as AlertOperation] : undefined;
  return {
    service: entry.service, operation: entry.operation, outcome: entry.outcome,
    durationMs: entry.durationMs, traceId: entry.traceId, spanId: entry.spanId,
    parentSpanId: typeof entry.parentSpanId === "string" && entry.parentSpanId.length === 16 && /^[a-f0-9]{16}$/.test(entry.parentSpanId)
      ? entry.parentSpanId : undefined,
    ...(route ? { alert: route[0], owner: route[1] } : {}),
  };
}
