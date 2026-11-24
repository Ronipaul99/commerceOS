import { randomUUID } from "node:crypto";
import { authorizeWrite, scopeFor } from "@businessos/execution-context";
import type { Access, AuthContext, Authority, RequestContext, ScopePredicate } from "@businessos/execution-context";
import { fileAccess, FileError, uuidValue } from "./contract.ts";
import type { JobFailure, JobState, JobStatus, UploadIntent } from "./contract.ts";

export interface Sql {
  $queryRawUnsafe<T>(text: string, ...args: unknown[]): Promise<T>;
  $executeRawUnsafe(text: string, ...args: unknown[]): Promise<number>;
}
export interface Database extends Sql { $transaction<T>(work: (tx: Sql) => Promise<T>): Promise<T> }
export type ReloadAuthority = (tx: Sql, auth: AuthContext) => Promise<Authority | undefined>;
type Scope = Readonly<{ tenant: string; branch: string; owner: string | null }>;
type FileState = "INTENT" | "QUARANTINED" | "AVAILABLE" | "REJECTED" | "FAILED" | "CANCELLED";
export type FileRow = UploadIntent & {
  id: string; tenantId: string; branchId: string; ownerId: string; digest: string | null; uploadExpiresAt: Date;
  state: FileState; version: number; expired: boolean;
};
export type ScanJob = {
  id: string; tenantId: string; branchId: string; fileId: string; state: JobState; version: number;
  correlationId: string; generation: number; failure: JobFailure | null; leaseActive: boolean;
};

const fileFields = `id, tenant_id AS "tenantId", branch_id AS "branchId", owner_id AS "ownerId",
  filename, media_type AS "mediaType", size_bytes AS "sizeBytes", digest, state, version,
  upload_expires_at AS "uploadExpiresAt", upload_expires_at <= clock_timestamp() AS expired`;
const jobFields = `id, tenant_id AS "tenantId", branch_id AS "branchId", file_id AS "fileId",
  correlation_id AS "correlationId", state, version, generation, failure,
  coalesce(lease_until > clock_timestamp(),false) AS "leaseActive"`;

function branchScope(value: ScopePredicate): Scope {
  if (!uuidValue(value.tenantId) || !uuidValue(value.branchId)) throw new FileError("NOT_FOUND");
  return { tenant: value.tenantId, branch: value.branchId, owner: value.ownerId ?? null };
}
export function jobStatus(job: ScanJob): JobStatus {
  return {
    jobId: job.id, state: job.state, version: job.version, failure: job.failure,
    progress: job.state === "QUEUED" ? 0 : job.state === "RUNNING" ? 50 : 100,
  };
}

export class FileRepository {
  constructor(readonly db: Database, private readonly reload: ReloadAuthority) {}

  scopedWrite<T>(context: RequestContext, access: Access, write: (tx: Sql, scope: Scope) => Promise<T>) {
    return this.db.$transaction((tx) => authorizeWrite(tx, context, access, this.reload,
      (client, where) => write(client, branchScope(where))));
  }

  async file(client: Sql, scope: Scope, id: string, lock = false): Promise<FileRow> {
    if (!uuidValue(id)) throw new FileError("NOT_FOUND");
    const [row] = await client.$queryRawUnsafe<FileRow[]>(`SELECT ${fileFields} FROM file_objects
      WHERE tenant_id=$1::uuid AND branch_id=$2::uuid AND id=$3::uuid AND ($4::text IS NULL OR owner_id=$4)
      ${lock ? "FOR UPDATE" : ""}`, scope.tenant, scope.branch, id, scope.owner);
    if (!row) throw new FileError("NOT_FOUND");
    return row;
  }

  async job(client: Sql, scope: Scope, id: string, lock = false): Promise<ScanJob> {
    if (!uuidValue(id)) throw new FileError("NOT_FOUND");
    const [row] = await client.$queryRawUnsafe<ScanJob[]>(`SELECT ${jobFields} FROM file_jobs j
      WHERE tenant_id=$1::uuid AND branch_id=$2::uuid AND id=$3::uuid AND ($4::text IS NULL OR EXISTS (
        SELECT 1 FROM file_objects f WHERE (f.tenant_id,f.branch_id,f.id)=(j.tenant_id,j.branch_id,j.file_id) AND f.owner_id=$4
      )) ${lock ? "FOR UPDATE" : ""}`, scope.tenant, scope.branch, id, scope.owner);
    if (!row) throw new FileError("NOT_FOUND");
    return row;
  }

  create(context: RequestContext, key: string, input: UploadIntent) {
    return this.scopedWrite(context, fileAccess.upload, async (tx, scope) => {
      const owner = scope.owner ?? context.auth.principal.id;
      const [created] = await tx.$queryRawUnsafe<FileRow[]>(`
        INSERT INTO file_objects(id,tenant_id,branch_id,owner_id,request_key,filename,media_type,size_bytes,upload_expires_at)
        VALUES ($1::uuid,$2::uuid,$3::uuid,$4,$5,$6,$7,$8::int,clock_timestamp()+interval '15 minutes')
        ON CONFLICT(tenant_id,branch_id,owner_id,request_key) DO NOTHING RETURNING ${fileFields}
      `, randomUUID(), scope.tenant, scope.branch, owner, key, input.filename, input.mediaType, input.sizeBytes);
      const row = created ?? (await tx.$queryRawUnsafe<FileRow[]>(`SELECT ${fileFields} FROM file_objects
        WHERE tenant_id=$1::uuid AND branch_id=$2::uuid AND owner_id=$3 AND request_key=$4`,
      scope.tenant, scope.branch, owner, key))[0];
      if (!row || row.filename !== input.filename || row.mediaType !== input.mediaType || row.sizeBytes !== input.sizeBytes) {
        throw new FileError("CONFLICT");
      }
      return { fileId: row.id, state: row.state, expiresAt: row.uploadExpiresAt.toISOString() };
    });
  }

  pin(context: RequestContext, id: string, size: number, digest: string) {
    return this.scopedWrite(context, fileAccess.upload, async (tx, scope) => {
      const row = await this.file(tx, scope, id, true);
      if (row.sizeBytes !== size) throw new FileError("BAD_REQUEST");
      if ((row.digest && row.digest !== digest) || (row.state === "INTENT" && row.expired)) throw new FileError("CONFLICT");
      if (!row.digest) await tx.$executeRawUnsafe("UPDATE file_objects SET digest=$2 WHERE id=$1::uuid", row.id, digest);
      return { ...row, digest };
    });
  }

  finalize(context: RequestContext, id: string, digest: string) {
    return this.scopedWrite(context, fileAccess.upload, async (tx, scope) => {
      const row = await this.file(tx, scope, id, true);
      if (row.digest !== digest) throw new FileError("CONFLICT");
      if (row.state === "INTENT") {
        if (row.expired) throw new FileError("CONFLICT");
        await tx.$executeRawUnsafe("UPDATE file_objects SET state='QUARANTINED', version=version+1 WHERE id=$1::uuid", row.id);
        await tx.$executeRawUnsafe(`INSERT INTO file_jobs(id,tenant_id,branch_id,file_id,correlation_id)
          VALUES ($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::uuid)`, randomUUID(), row.tenantId, row.branchId, id,
        context.origin.correlationId);
      }
      const [job] = await tx.$queryRawUnsafe<ScanJob[]>(`SELECT ${jobFields} FROM file_jobs
        WHERE tenant_id=$1::uuid AND branch_id=$2::uuid AND file_id=$3::uuid`, row.tenantId, row.branchId, row.id);
      if (!job) throw new FileError("UNAVAILABLE");
      return jobStatus(job);
    });
  }

  async status(context: RequestContext, id: string) {
    return jobStatus(await this.job(this.db, branchScope(scopeFor(context, fileAccess.status)), id));
  }

  cancel(context: RequestContext, id: string, expected: number) {
    return this.scopedWrite(context, fileAccess.cancel, async (tx, scope) => {
      const row = await this.job(tx, scope, id, true);
      if (row.state === "CANCELLED" && (expected === row.version || expected + 1 === row.version)) return jobStatus(row);
      if (row.version !== expected || (row.state !== "QUEUED" && row.state !== "RUNNING")) throw new FileError("CONFLICT");
      return jobStatus(await finish(tx, row, "CANCELLED"));
    });
  }

  download(context: RequestContext, id: string) {
    return this.file(this.db, branchScope(scopeFor(context, fileAccess.download)), id);
  }
}

export async function finish(
  tx: Sql, job: ScanJob, state: Exclude<JobState, "RUNNING" | "QUEUED">,
): Promise<ScanJob> {
  const failure = state === "REJECTED" ? "SCAN_REJECTED" : state === "FAILED" ? "SCAN_UNAVAILABLE" : null;
  const fileState = state === "SUCCEEDED" ? "AVAILABLE" : state;
  const changed = await tx.$executeRawUnsafe(`UPDATE file_objects SET state=$4, version=version+1
    WHERE tenant_id=$1::uuid AND branch_id=$2::uuid AND id=$3::uuid AND state='QUARANTINED'`,
  job.tenantId, job.branchId, job.fileId, fileState);
  if (changed !== 1) throw new FileError("UNAVAILABLE");
  await tx.$executeRawUnsafe(`UPDATE file_jobs SET state=$2, version=version+1, failure=$3, lease_until=NULL
    WHERE id=$1::uuid`, job.id, state, failure);
  return { ...job, state, failure, version: job.version + 1, leaseActive: false };
}

export const scanFields = jobFields;
