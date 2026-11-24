BEGIN;

CREATE TABLE fixture_tenant (
    id UUID PRIMARY KEY,
    label TEXT NOT NULL,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE TABLE fixture_branch (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    code TEXT NOT NULL,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
    CONSTRAINT fixture_branch_tenant_id_fkey FOREIGN KEY (tenant_id)
        REFERENCES fixture_tenant (id) ON DELETE RESTRICT ON UPDATE RESTRICT
);
CREATE UNIQUE INDEX fixture_branch_tenant_id_id_key ON fixture_branch (tenant_id, id);
CREATE UNIQUE INDEX fixture_branch_tenant_id_code_key ON fixture_branch (tenant_id, code);

CREATE TABLE fixture_transaction_probe (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    branch_id UUID NOT NULL,
    source_key TEXT NOT NULL,
    request_fingerprint TEXT NOT NULL CHECK (request_fingerprint ~ '^[a-f0-9]{64}$'),
    currency_code VARCHAR(3) NOT NULL CHECK (currency_code ~ '^[A-Z]{3}$'),
    amount_minor BIGINT NOT NULL,
    quantity NUMERIC(20,6) NOT NULL CHECK (quantity > 0 AND quantity < 100000000000000),
    fixture_policy_key TEXT NOT NULL,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
    CONSTRAINT fixture_transaction_probe_tenant_id_branch_id_fkey
        FOREIGN KEY (tenant_id, branch_id)
        REFERENCES fixture_branch (tenant_id, id) ON DELETE RESTRICT ON UPDATE RESTRICT
);
CREATE UNIQUE INDEX fixture_transaction_probe_tenant_id_id_key
    ON fixture_transaction_probe (tenant_id, id);
CREATE UNIQUE INDEX fixture_transaction_probe_tenant_id_branch_id_source_key_key
    ON fixture_transaction_probe (tenant_id, branch_id, source_key);

COMMIT;
