import { randomUUID } from "node:crypto";

const reasons = [
  "CONFIG_INVALID", "SECRET_MISSING", "SECRET_INVALID", "UNAVAILABLE",
  "CREDENTIAL_DENIED", "SESSION_DENIED", "CSRF_DENIED", "TRANSPORT_DENIED", "ACCEPTED",
] as const;
type Reason = typeof reasons[number];
type Operation = "startup" | "refresh" | "authenticate";
const operations: readonly Operation[] = ["startup", "refresh", "authenticate"];
const failureReasons: readonly string[] = reasons.filter((reason) => reason !== "ACCEPTED");

export type SecurityLogEntry = Readonly<{
  service: "businessos-api"; correlationId: string; operation: Operation; result: Reason; elapsedMs: number;
}>;
export type SecurityLog = (entry: SecurityLogEntry) => void | Promise<void>;

export class SecurityFailure extends Error {
  readonly reason: Exclude<Reason, "ACCEPTED">;

  constructor(reason: Exclude<Reason, "ACCEPTED">) {
    super("Protected authentication request failed.");
    this.name = "SecurityFailure";
    this.reason = failureReasons.includes(reason) ? reason : "UNAVAILABLE";
  }
}

export function reportSecurity(log: SecurityLog | undefined, operation: Operation, result: Reason, start: number): void {
  if (!log) return;
  const event = Object.freeze({
    service: "businessos-api" as const,
    correlationId: randomUUID(),
    operation: operations.includes(operation) ? operation : "authenticate",
    result: reasons.includes(result) ? result : "UNAVAILABLE",
    elapsedMs: Number.isFinite(start) ? Math.max(0, Math.round(performance.now() - start)) : 0,
  }) satisfies SecurityLogEntry;
  void Promise.resolve().then(() => log(event)).catch(() => undefined);
}

export const opaqueId = (value: unknown): value is string => typeof value === "string"
  && /^[A-Za-z0-9._:-]{1,128}(?![\s\S])/.test(value);
export const seconds = () => Math.floor(Date.now() / 1000);

export async function withDeadline<T>(
  timeoutMs: number, work: (signal: AbortSignal) => Promise<T>, parent?: AbortSignal,
): Promise<T> {
  const timeout = AbortSignal.timeout(timeoutMs);
  const signal = parent ? AbortSignal.any([parent, timeout]) : timeout;
  if (signal.aborted) throw new SecurityFailure("UNAVAILABLE");
  return new Promise((resolve, reject) => {
    const fail = () => reject(new SecurityFailure("UNAVAILABLE"));
    signal.addEventListener("abort", fail, { once: true });
    Promise.resolve().then(() => work(signal)).then((value) => {
      if (signal.aborted) fail();
      else resolve(value);
    }, (error: unknown) => reject(error instanceof SecurityFailure
      ? new SecurityFailure(error.reason)
      : new SecurityFailure("UNAVAILABLE")))
      .finally(() => signal.removeEventListener("abort", fail));
  });
}
