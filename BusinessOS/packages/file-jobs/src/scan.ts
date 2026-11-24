import { createJobConsumer, authorizeWrite, ContextError, signJobReference } from "@businessos/execution-context";
import type { JobBinding, JobReference, RequestContext } from "@businessos/execution-context";
import type { KeyObject } from "node:crypto";
import { bounded, fileAccess, FileError, fileQueue, uuidValue, validateText } from "./contract.ts";
import type { PrepareVariants, PrivateStorage, Scan } from "./contract.ts";
import { FileRepository, finish, scanFields } from "./repository.ts";
import type { ReloadAuthority, ScanJob } from "./repository.ts";
import { checkedObject } from "./service.ts";

const maxAttempts = 3;
const leaseMs = 15000;
export type ScanQueue = (id: string, reference: JobReference) => Promise<void>;
type WorkerBinding = Pick<JobBinding<ScanJob>, "executor" | "authenticateService" | "keyFor" | "resolve" | "audit">;
type Signing = () => Promise<{ id: string; material: KeyObject }>;
const idFor = (job: ScanJob) => job.id + "-" + job.generation;
const scopeForJob = (job: ScanJob) => ({ tenant: job.tenantId, branch: job.branchId, owner: null });

export class ScanDispatcher {
  constructor(private readonly repository: FileRepository, private readonly send: ScanQueue, private readonly signing: Signing) {}

  async dispatch(): Promise<number> {
    const { db } = this.repository;
    const key = await bounded(() => this.signing());
    const claimed = await db.$transaction(async (tx) => {
      const [gate] = await tx.$queryRawUnsafe<{ allowed: boolean }[]>(
        "SELECT pg_try_advisory_xact_lock(hashtext('businessos-private-file-jobs')) AS allowed",
      );
      if (!gate?.allowed) return [];
      const rows = await tx.$queryRawUnsafe<ScanJob[]>(`SELECT ${scanFields} FROM file_jobs j
        WHERE ((state='RUNNING' AND lease_until<=clock_timestamp()) OR
          (state='QUEUED' AND next_attempt_at<=clock_timestamp())) AND
           (SELECT count(*) FROM file_jobs active WHERE active.state='RUNNING' AND active.lease_until>clock_timestamp())<8 AND
           (SELECT count(*) FROM file_jobs active WHERE active.state='RUNNING' AND active.lease_until>clock_timestamp()
             AND active.tenant_id=j.tenant_id)<4
        ORDER BY next_attempt_at,id LIMIT 1 FOR UPDATE SKIP LOCKED`);
      const result: ScanJob[] = [];
      for (const row of rows) {
        if (row.generation >= maxAttempts) {
          await finish(tx, row, "FAILED");
          continue;
        }
        const [claimedRow] = await tx.$queryRawUnsafe<ScanJob[]>(`UPDATE file_jobs SET state='RUNNING',
          generation=generation+1, version=version+1, lease_until=clock_timestamp()+$2::int*interval '1 millisecond'
          WHERE id=$1::uuid RETURNING ${scanFields}`, row.id, leaseMs);
        if (claimedRow) result.push(claimedRow);
      }
      return result;
    });
    for (const job of claimed) {
      const issuedAt = Math.floor(Date.now() / 1000);
      const reference = signJobReference({
        ...fileQueue, version: 1, keyId: key.id, jobId: idFor(job), correlationId: job.correlationId,
        issuedAt, expiresAt: issuedAt + 15,
      }, key.material);
      // Redis errors leave the lease to expire. Only the next generation is accepted after reclaim.
      await bounded(() => this.send(idFor(job), reference));
    }
    return claimed.length;
  }
}

export function scanProcessor(
  repository: FileRepository, storage: PrivateStorage, scanner: Scan, binding: WorkerBinding,
  lockAuthority: ReloadAuthority, prepareVariants?: PrepareVariants,
) {
  const { db } = repository;
  function same(job: ScanJob, expected: ScanJob): boolean {
    return job.generation === expected.generation && job.state === "RUNNING" && job.leaseActive;
  }

  async function scan(job: ScanJob, context: RequestContext): Promise<"APPLIED" | "STALE" | "RETRY"> {
    const scope = scopeForJob(job);
    const file = await repository.file(db, scope, job.fileId);
    if (file.state !== "QUARANTINED") return "STALE";
    let verdict: Awaited<ReturnType<Scan>>;
    try {
      verdict = await bounded(async (signal) => {
        const bytes = await checkedObject(storage, file, signal);
        validateText(bytes);
        const response = await scanner(Uint8Array.from(bytes), "text/plain", signal);
        if (response === "clean" && prepareVariants) await prepareVariants(Uint8Array.from(bytes), signal);
        return response;
      }, 5000);
    } catch {
      verdict = "unavailable";
    }
    return db.$transaction((tx) => authorizeWrite(tx, context, fileAccess.scan, lockAuthority, async (client, authorized) => {
      if (authorized.tenantId !== job.tenantId || authorized.branchId !== job.branchId || authorized.ownerId !== undefined) {
        throw new ContextError("FORBIDDEN");
      }
      const current = await repository.job(client, scope, job.id, true);
      if (!same(current, job)) return "STALE";
      if (verdict === "clean" || verdict === "rejected" || job.generation >= maxAttempts) {
        await finish(client, current, verdict === "clean" ? "SUCCEEDED" : verdict === "rejected" ? "REJECTED" : "FAILED");
        return "APPLIED";
      }
      await client.$executeRawUnsafe(`UPDATE file_jobs SET state='QUEUED', version=version+1, lease_until=NULL,
        next_attempt_at=clock_timestamp()+$2::int*interval '1 millisecond' WHERE id=$1::uuid`,
      job.id, 250 * 2 ** (job.generation - 1));
      return "RETRY";
    }));
  }

  return async (deliveryId: string, envelope: unknown): Promise<"APPLIED" | "STALE" | "RETRY" | "DENIED"> => {
    const id = deliveryId.slice(0, 36);
    if (!uuidValue(id)) return "DENIED";
    const consumer = createJobConsumer<ScanJob, "APPLIED" | "STALE" | "RETRY">({
      ...binding,
      route: fileQueue, access: fileAccess.scan, allowDelegation: false,
      loadJob: async (jobId) => {
        if (jobId !== deliveryId) return undefined;
        const [job] = await db.$queryRawUnsafe<ScanJob[]>(
          `SELECT ${scanFields} FROM file_jobs WHERE id=$1::uuid AND state='RUNNING' AND lease_until>clock_timestamp()`, id,
        );
        if (!job || idFor(job) !== jobId) return undefined;
        return {
          identity: { ...fileQueue, jobId, correlationId: job.correlationId }, principal: binding.executor,
          selection: { tenantId: job.tenantId, branchId: job.branchId }, input: job,
        };
      },
    }, async (context, job) => scan(job, context));
    try { return await consumer(envelope); } catch (error) {
      if (error instanceof ContextError && error.code !== "UNAVAILABLE") return "DENIED";
      if (error instanceof FileError && error.code === "NOT_FOUND") return "DENIED";
      // The broker needs a stable failure reason, without database or scanner detail.
      throw new FileError("UNAVAILABLE");
    }
  };
}
