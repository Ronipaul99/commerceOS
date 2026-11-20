import { config as loadEnv } from "dotenv";
import { fileURLToPath } from "node:url";
import type { FastifyInstance } from "fastify";
import { parseEnv } from "./config/env.js";
import { buildApp } from "./app.js";

// Resolves the same project-root .env from both src/ and dist/.
loadEnv({ path: fileURLToPath(new URL("../../../.env", import.meta.url)), quiet: true });
let app: FastifyInstance | undefined;
try {
  const config = parseEnv(process.env);
  app = await buildApp(config);
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.once(signal, () => { void app?.close().catch(() => { process.exitCode = 1; }); });
  }
  await app.listen({ host: config.API_HOST, port: config.API_PORT });
} catch (error) {
  const message = error instanceof Error && error.message.startsWith("Invalid API environment:") ? error.message : "API startup failed; check configuration and database availability";
  if (app) app.log.error(message);
  else process.stderr.write(`${message}\n`);
  await app?.close();
  process.exitCode = 1;
}
