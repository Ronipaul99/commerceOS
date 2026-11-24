import { randomInt } from "node:crypto";
import { setTimeout as sleep } from "node:timers/promises";

export interface TransactionOptions {
  isolationLevel: "Serializable";
  maxWait: number;
  timeout: number;
}

export type DatabaseTransaction<Tx> = <T>(
  command: (client: Tx) => Promise<T>,
  options: TransactionOptions,
) => Promise<T>;

export interface RetryOptions {
  deadlineMs: number;
  signal?: AbortSignal;
}

export class TransactionRetryExhausted extends Error {
  readonly attempts: number;

  constructor(attempts: number) {
    super("Database transaction retry budget exhausted.");
    this.name = "TransactionRetryExhausted";
    this.attempts = attempts;
  }
}

export function isRetryableTransactionError(error: unknown): boolean {
  if (!(error instanceof Error) || !("code" in error)) return false;
  if (error.code === "P2034" || error.code === "40001" || error.code === "40P01") return true;
  if (error.code !== "P2010" || !("meta" in error) || typeof error.meta !== "object" || !error.meta) {
    return false;
  }
  if ("code" in error.meta && (error.meta.code === "40001" || error.meta.code === "40P01")) return true;
  // Prisma 7's adapter reports raw SQLSTATE through the underlying structured driver error.
  const driver = "driverAdapterError" in error.meta ? error.meta.driverAdapterError : undefined;
  const cause = typeof driver === "object" && driver && "cause" in driver ? driver.cause : undefined;
  return typeof cause === "object" && cause !== null && "originalCode" in cause
    && (cause.originalCode === "40001" || cause.originalCode === "40P01");
}

/** The command must perform only short, retry-safe database work with its transaction client. */
export async function runTransaction<Tx, T>(
  transaction: DatabaseTransaction<Tx>,
  command: (client: Tx) => Promise<T>,
  { deadlineMs, signal }: RetryOptions,
): Promise<T> {
  if (!Number.isSafeInteger(deadlineMs) || deadlineMs < 1 || deadlineMs > 60_000) {
    throw new RangeError("Transaction deadline must be an integer from 1 to 60000 milliseconds.");
  }
  const deadline = performance.now() + deadlineMs;
  let attempts = 0;
  while (attempts < 3) {
    signal?.throwIfAborted();
    const remaining = Math.floor(deadline - performance.now());
    if (remaining < 2) break;
    const maxWait = Math.min(2000, Math.max(1, Math.floor(remaining / 4)));
    attempts++;
    try {
      return await transaction(command, { isolationLevel: "Serializable", maxWait, timeout: remaining - maxWait });
    } catch (error) {
      if (!isRetryableTransactionError(error)) throw error;
      if (attempts === 3) break;
      const delay = randomInt(25, 101);
      if (performance.now() + delay >= deadline) break;
      await sleep(delay, undefined, { signal });
    }
  }
  throw new TransactionRetryExhausted(attempts);
}
