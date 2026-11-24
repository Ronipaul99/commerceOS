import { createApi } from "./create-api.js";
import { loadSecurityConfig } from "./security/config.js";
import { reportSecurity, SecurityFailure } from "./security/policy.js";

const started = performance.now();
try {
  if (loadSecurityConfig(process.env).mode !== "shell") throw new SecurityFailure("CONFIG_INVALID");
  const app = await createApi();
  try {
    await app.listen(Number(process.env.PORT ?? 3001), process.env.HOST ?? "127.0.0.1");
  } catch (error) {
    await app.close();
    throw error;
  }
} catch (error) {
  reportSecurity((entry) => console.error(JSON.stringify(entry)), "startup",
    error instanceof SecurityFailure ? error.reason : "UNAVAILABLE", started);
  process.exitCode = 1;
}
