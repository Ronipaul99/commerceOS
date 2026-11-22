import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { publicMediaPath } from "@tiyas/shared";
import type { ApiConfig } from "../../config/env.js";
import type { PrismaClient } from "../../generated/prisma/client.js";
import { isPublicRepresentation } from "./public-media.js";

export class PurgeFailure extends Error {
  constructor(
    readonly code: string,
    readonly delayMs = 0,
  ) {
    super(code);
  }
}

function retryAfter(header: string | null, now = Date.now()) {
  if (!header) return 0;
  const delay = /^\d+$/.test(header)
    ? Number(header) * 1000
    : Date.parse(header) - now;
  return Number.isFinite(delay) ? Math.max(0, delay) : 0;
}

export function cloudflarePurge(config: ApiConfig, request = fetch) {
  return async (paths: string[]) => {
    if (paths.some((path) => !publicMediaPath.test(path)))
      throw new PurgeFailure("invalid_path", 3600000);
    const urls = config.CDN_PUBLIC_HOSTS.flatMap((host) =>
      paths.map((path) => `https://${host}${path}`),
    );
    for (let i = 0; i < urls.length; i += config.CDN_PURGE_BATCH_SIZE) {
      const response = await request(
        `https://api.cloudflare.com/client/v4/zones/${config.CDN_ZONE_ID}/purge_cache`,
        {
          method: "POST",
          redirect: "error",
          signal: AbortSignal.timeout(5000),
          headers: {
            Authorization: `Bearer ${config.CDN_PURGE_API_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            files: urls.slice(i, i + config.CDN_PURGE_BATCH_SIZE),
          }),
        },
      ).catch(() => {
        throw new PurgeFailure("network");
      });
      if (response.status === 429) {
        await response.body?.cancel();
        throw new PurgeFailure(
          "rate_limit",
          retryAfter(response.headers.get("retry-after")),
        );
      }
      if (!response.ok) {
        await response.body?.cancel();
        throw new PurgeFailure(
          `http_${response.status}`,
          response.status < 500 ? 3600000 : 0,
        );
      }
      const body: unknown = await response.json().catch(() => null);
      if (
        !body ||
        typeof body !== "object" ||
        !("success" in body) ||
        body.success !== true
      )
        throw new PurgeFailure("provider_rejected");
    }
  };
}

export async function drainMediaPurge(
  db: PrismaClient,
  purge: (paths: string[]) => Promise<void>,
  now = new Date(),
) {
  const started = performance.now();
  const leaseToken = randomUUID();
  const rows = await db.$queryRaw<
    { id: bigint; paths: string[]; attempts: number }[]
  >`
    UPDATE "MediaPurgeEvent" e
    SET "leaseUntil" = ${new Date(now.getTime() + 600000)}, "leaseToken" = ${leaseToken}::uuid
    FROM (
      SELECT id FROM "MediaPurgeEvent"
      WHERE "nextAttemptAt" <= ${now} AND ("leaseUntil" IS NULL OR "leaseUntil" <= ${now})
      ORDER BY "nextAttemptAt", id LIMIT 4 FOR UPDATE SKIP LOCKED
    ) q WHERE e.id = q.id
    RETURNING e.id, e.paths, e.attempts
  `;
  if (!rows.length) return { processed: 0, failures: 0 };
  const leased = { id: { in: rows.map((r) => r.id) }, leaseToken };
  const candidates = [...new Set(rows.flatMap((row) => row.paths))];
  // Recheck the committed publication state. The same image can still have another live use.
  const revoked: string[] = [];
  try {
    for (const path of candidates) {
      if (!publicMediaPath.test(path))
        throw new PurgeFailure("invalid_path", 3600000);
      if (!(await isPublicRepresentation(db, path))) revoked.push(path);
    }
    if (revoked.length) await purge(revoked);
    await db.mediaPurgeEvent.deleteMany({ where: leased });
    return { processed: rows.length, failures: 0 };
  } catch (error) {
    const failure =
      error instanceof PurgeFailure ? error : new PurgeFailure("worker_error");
    const backoff = Math.min(
      3600000,
      15000 * 2 ** Math.min(8, Math.max(...rows.map((r) => r.attempts))),
    );
    await db.mediaPurgeEvent.updateMany({
      where: leased,
      data: {
        attempts: { increment: 1 },
        lastError: failure.code,
        leaseToken: null,
        leaseUntil: null,
        nextAttemptAt: new Date(
          now.getTime() +
            Math.ceil(performance.now() - started) +
            Math.max(backoff, failure.delayMs),
        ),
      },
    });
    return {
      processed: rows.length,
      failures: rows.length,
      reason: failure.code,
    };
  }
}

export function startMediaPurgeWorker(app: FastifyInstance, config: ApiConfig) {
  if (config.CDN_PROVIDER !== "cloudflare") return;
  const purge = cloudflarePurge(config);
  let pending: Promise<void> | undefined;
  const timer = setInterval(() => {
    if (pending) return;
    pending = drainMediaPurge(app.db, purge)
      .then((result) => {
        if (result.failures)
          app.log.warn(result, "Public media purge scheduled for retry");
        else if (result.processed)
          app.log.info(result, "Public media purges processed");
      })
      .catch(() => app.log.warn("Public media purge worker unavailable"))
      .finally(() => {
        pending = undefined;
      });
  }, 5000);
  timer.unref();
  app.addHook("onClose", async () => {
    clearInterval(timer);
    await pending;
  });
}
