import console from "node:console";
import { stdin, argv, exit } from "node:process";
import { createInterface } from "node:readline";
import { reportObservation } from "../../packages/telemetry/dist/index.js";

const [traceId, ...extra] = argv.slice(2);
if (extra.length || (traceId !== undefined && (traceId.length !== 32 || !/^[a-f0-9]{32}$/.test(traceId)))) {
  console.error("Use one optional 32-character lowercase trace ID.");
  exit(1);
}

const lines = createInterface({ input: stdin, crlfDelay: Infinity });
const grouped = new Map();
const spans = [];
let scanned = 0;
for await (const line of lines) {
  if (++scanned > 10_000) {
    console.error("Limit the input to 10000 lines and retry.");
    exit(1);
  }
  if (line.length > 2048) continue;
  let parsed;
  try { parsed = JSON.parse(line); } catch { continue; }
  const record = reportObservation(parsed);
  if (!record) continue;
  if (traceId) {
    if (record.traceId === traceId) spans.push(record);
    continue;
  }
  const key = record.service + " / " + record.operation;
  const point = grouped.get(key) ?? { service: record.service, operation: record.operation,
    observations: 0, errors: 0, denied: 0, meanMs: 0, alert: "", owner: "" };
  point.observations++;
  point.errors += Number(record.outcome === "error");
  point.denied += Number(record.outcome === "denied");
  point.meanMs += (record.durationMs - point.meanMs) / point.observations;
  if (record.alert) { point.alert = record.alert; point.owner = record.owner; }
  grouped.set(key, point);
}

if (traceId && spans.length) console.table(spans);
else if (grouped.size) console.table([...grouped.values()].map((entry) => ({ ...entry, meanMs: entry.meanMs.toFixed(3) })));
else console.log("No matching BusinessOS observations.");
