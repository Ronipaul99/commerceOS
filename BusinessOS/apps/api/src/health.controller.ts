import { Controller, Get, Header, ServiceUnavailableException } from "@nestjs/common";
import { createConnection } from "node:net";
import { apiTelemetry } from "./observability.js";

function probeSocket(host: string, port: number, command?: string): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = createConnection({ host, port });
    function finish(healthy: boolean) {
      socket.destroy();
      resolve(healthy);
    }
    socket.setTimeout(1000, () => finish(false));
    socket.once("error", () => finish(false));
    socket.once("close", () => finish(false));
    socket.once("connect", () => {
      if (command === undefined) {
        finish(true);
      } else {
        socket.write(command);
      }
    });
    if (command !== undefined) {
      let reply = "";
      socket.on("data", (chunk: Buffer) => {
        reply += chunk.toString("ascii");
        if (reply.length >= 7) {
          finish(reply === "+PONG\r\n");
        }
      });
    }
  });
}

@Controller()
export class HealthController {
  @Get("health")
  health(): { status: "ok" } {
    return { status: "ok" };
  }

  @Get("ready")
  @Header("Cache-Control", "no-store")
  async ready(): Promise<{ status: "ready" }> {
    if (process.env.BUSINESSOS_LOCAL_STACK === "1") {
      const result = (ok: boolean) => ok ? "ok" : "error";
      const checks = await Promise.all([
        apiTelemetry.observe("readiness.db", () => probeSocket("postgres", 5432), undefined, result),
        apiTelemetry.observe("readiness.redis", () => probeSocket("redis", 6379, "*1\r\n$4\r\nPING\r\n"), undefined, result),
        apiTelemetry.observe("readiness.storage", () => fetch("http://storage:3100/health", {
          signal: AbortSignal.timeout(1000),
          redirect: "error",
        }).then((response) => response.ok, () => false), undefined, result),
      ]);
      if (checks.every(Boolean)) {
        return { status: "ready" };
      }
    }

    throw new ServiceUnavailableException({ status: "not_ready" });
  }
}
