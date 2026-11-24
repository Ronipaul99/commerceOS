BEGIN;

CREATE TABLE outbox_events (
    event_id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES fixture_tenant (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    branch_id UUID,
    event_type TEXT NOT NULL,
    schema_version INTEGER NOT NULL CHECK (schema_version > 0),
    aggregate_type TEXT NOT NULL,
    aggregate_id UUID NOT NULL,
    aggregate_version INTEGER NOT NULL CHECK (aggregate_version > 0),
    occurred_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    correlation_id UUID NOT NULL,
    causation_id UUID NOT NULL,
    payload JSONB NOT NULL CHECK (octet_length(payload::text) <= 2048),
    consumer TEXT NOT NULL,
    state TEXT NOT NULL DEFAULT 'READY' CHECK (state IN ('READY', 'LEASED', 'ENQUEUED', 'COMPLETED', 'DEAD_LETTER')),
    next_attempt_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    lease_token UUID,
    lease_until TIMESTAMPTZ(6),
    generation INTEGER NOT NULL DEFAULT 1 CHECK (generation > 0),
    dispatch_attempts INTEGER NOT NULL DEFAULT 0 CHECK (dispatch_attempts >= 0),
    attempts_used INTEGER NOT NULL DEFAULT 0 CHECK (attempts_used >= 0),
    proof_digest TEXT CHECK (proof_digest ~ '^[0-9a-f]{64}$'),
    proof_expires_at TIMESTAMPTZ(6),
    updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id, branch_id) REFERENCES fixture_branch (tenant_id, id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CHECK ((state = 'LEASED' AND lease_token IS NOT NULL AND lease_until IS NOT NULL)
        OR (state <> 'LEASED' AND lease_token IS NULL AND lease_until IS NULL)),
    CHECK ((proof_digest IS NULL) = (proof_expires_at IS NULL))
);
CREATE UNIQUE INDEX outbox_events_tenant_id_event_id_key ON outbox_events (tenant_id, event_id);
CREATE UNIQUE INDEX outbox_events_scope_key ON outbox_events (tenant_id, branch_id, event_id);
CREATE UNIQUE INDEX outbox_events_stream_version_key ON outbox_events
    (tenant_id, aggregate_type, aggregate_id, aggregate_version);
CREATE INDEX outbox_events_dispatch_idx ON outbox_events (consumer, state, next_attempt_at, event_id);
CREATE INDEX outbox_events_lease_idx ON outbox_events (consumer, state, lease_until);
CREATE INDEX outbox_events_operator_idx ON outbox_events (tenant_id, branch_id, occurred_at, event_id);

CREATE FUNCTION preserve_outbox_envelope() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF ROW(NEW.event_id, NEW.tenant_id, NEW.branch_id, NEW.event_type, NEW.schema_version,
           NEW.aggregate_type, NEW.aggregate_id, NEW.aggregate_version, NEW.occurred_at,
           NEW.correlation_id, NEW.causation_id, NEW.payload, NEW.consumer)
       IS DISTINCT FROM
       ROW(OLD.event_id, OLD.tenant_id, OLD.branch_id, OLD.event_type, OLD.schema_version,
           OLD.aggregate_type, OLD.aggregate_id, OLD.aggregate_version, OLD.occurred_at,
           OLD.correlation_id, OLD.causation_id, OLD.payload, OLD.consumer) THEN
        RAISE EXCEPTION 'The outbox event envelope is immutable' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER outbox_events_immutable_envelope BEFORE UPDATE ON outbox_events
    FOR EACH ROW EXECUTE FUNCTION preserve_outbox_envelope();

CREATE TABLE inbox_dedupes (
    consumer TEXT NOT NULL,
    event_id UUID NOT NULL,
    tenant_id UUID NOT NULL,
    completed_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    effect_ref UUID,
    PRIMARY KEY (consumer, event_id),
    FOREIGN KEY (tenant_id, event_id) REFERENCES outbox_events (tenant_id, event_id)
        ON DELETE RESTRICT ON UPDATE RESTRICT
);

CREATE TABLE job_failures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    event_id UUID NOT NULL,
    consumer TEXT NOT NULL,
    generation INTEGER NOT NULL CHECK (generation > 0),
    kind TEXT NOT NULL CHECK (kind IN ('FAILURE', 'REPLAY')),
    reason TEXT NOT NULL CHECK (reason IN (
      'INVALID_EVENT', 'DISPATCH_EXHAUSTED', 'CONSUMER_EXHAUSTED', 'QUEUE_FAILED',
      'FIX_APPLIED', 'DEPENDENCY_RESTORED', 'OPERATOR_REVIEW'
    )),
    recorded_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    operator_id TEXT,
    request_key TEXT,
    audit_ref UUID,
    FOREIGN KEY (tenant_id, event_id) REFERENCES outbox_events (tenant_id, event_id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CHECK ((kind = 'FAILURE' AND operator_id IS NULL AND request_key IS NULL AND audit_ref IS NULL)
        OR (kind = 'REPLAY' AND operator_id IS NOT NULL AND request_key IS NOT NULL AND audit_ref IS NOT NULL))
);
CREATE UNIQUE INDEX job_failures_generation_kind_key ON job_failures (event_id, consumer, generation, kind);
CREATE UNIQUE INDEX job_failures_request_key ON job_failures (tenant_id, consumer, request_key);
CREATE INDEX job_failures_event_history_idx ON job_failures (tenant_id, event_id, generation);

CREATE UNIQUE INDEX fixture_transaction_probe_scope_key ON fixture_transaction_probe (tenant_id, branch_id, id);
CREATE TABLE fixture_outbox_projection (
    event_id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    branch_id UUID NOT NULL,
    probe_ref UUID NOT NULL,
    applied_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id, branch_id, event_id) REFERENCES outbox_events (tenant_id, branch_id, event_id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    FOREIGN KEY (tenant_id, branch_id, probe_ref) REFERENCES fixture_transaction_probe (tenant_id, branch_id, id)
        ON DELETE RESTRICT ON UPDATE RESTRICT
);

COMMIT;
