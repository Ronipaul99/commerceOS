BEGIN;

CREATE TABLE file_objects (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  branch_id UUID NOT NULL,
  owner_id VARCHAR(128) NOT NULL,
  request_key VARCHAR(128) NOT NULL,
  filename VARCHAR(100) NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type = 'text/plain'),
  size_bytes INTEGER NOT NULL CHECK (size_bytes BETWEEN 1 AND 16384),
  digest CHAR(64) CHECK (digest ~ '^[a-f0-9]{64}$'),
  state TEXT NOT NULL DEFAULT 'INTENT' CHECK (state IN ('INTENT','QUARANTINED','AVAILABLE','REJECTED','FAILED','CANCELLED')),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  upload_expires_at TIMESTAMPTZ(6) NOT NULL,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id, branch_id) REFERENCES fixture_branch (tenant_id,id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CHECK (state = 'INTENT' OR digest IS NOT NULL)
);
CREATE UNIQUE INDEX file_objects_scope_key ON file_objects(tenant_id,branch_id,id);
CREATE UNIQUE INDEX file_objects_request_key ON file_objects(tenant_id,branch_id,owner_id,request_key);

CREATE TABLE file_jobs (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  branch_id UUID NOT NULL,
  file_id UUID NOT NULL,
  correlation_id UUID NOT NULL,
  state TEXT NOT NULL DEFAULT 'QUEUED' CHECK (state IN ('QUEUED','RUNNING','SUCCEEDED','REJECTED','FAILED','CANCELLED')),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  generation INTEGER NOT NULL DEFAULT 0 CHECK (generation BETWEEN 0 AND 3),
  next_attempt_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  lease_until TIMESTAMPTZ(6),
  failure TEXT CHECK (failure IN ('SCAN_REJECTED','SCAN_UNAVAILABLE')),
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id, branch_id, file_id) REFERENCES file_objects(tenant_id,branch_id,id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CHECK ((state = 'RUNNING') = (lease_until IS NOT NULL)),
  CHECK (CASE state WHEN 'REJECTED' THEN failure IS NOT DISTINCT FROM 'SCAN_REJECTED'
                    WHEN 'FAILED' THEN failure IS NOT DISTINCT FROM 'SCAN_UNAVAILABLE' ELSE failure IS NULL END)
);
CREATE UNIQUE INDEX file_jobs_file_key ON file_jobs(tenant_id,branch_id,file_id);
CREATE INDEX file_jobs_claim_idx ON file_jobs(state,next_attempt_at,id);
CREATE INDEX file_jobs_lease_idx ON file_jobs(state,lease_until,id);

COMMIT;
