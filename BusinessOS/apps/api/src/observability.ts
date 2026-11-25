import type { ServerResponse } from "node:http";
import { createTelemetry } from "@businessos/telemetry";
import type { Telemetry } from "@businessos/telemetry";

export const apiTelemetry = createTelemetry("api", {
  write: (entry) => console.info(JSON.stringify(entry)),
  captureSuccess: process.env.BUSINESSOS_TELEMETRY_LOCAL === "1",
});

export function observeHttp(telemetry: Telemetry) {
  return (_request: unknown, response: ServerResponse, next: () => void) => {
    const scope = telemetry.begin("http.request");
    response.once("finish", () => {
      const status = response.statusCode;
      scope.end(status >= 500 ? "error" : status >= 400 ? "denied" : "ok", status);
    });
    response.once("close", () => scope.end("error"));
    scope.run(next);
  };
}
