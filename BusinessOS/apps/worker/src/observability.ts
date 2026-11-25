import { createTelemetry } from "@businessos/telemetry";

export const workerTelemetry = createTelemetry("worker", {
  write: (entry) => console.info(JSON.stringify(entry)),
  captureSuccess: process.env.BUSINESSOS_TELEMETRY_LOCAL === "1",
});
