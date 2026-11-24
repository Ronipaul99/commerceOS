BEGIN;
DO $$
BEGIN
    IF current_database() NOT IN ('businessos_local', 'businessos_test') THEN
        RAISE EXCEPTION 'Expected a BusinessOS disposable fixture database';
    END IF;
END
$$;
SELECT pg_advisory_xact_lock(10102);

CREATE SCHEMA IF NOT EXISTS local_fixture;

CREATE TABLE IF NOT EXISTS local_fixture.tenant (
    id text PRIMARY KEY CHECK (id IN ('A', 'B')),
    label text NOT NULL
);

CREATE TABLE IF NOT EXISTS local_fixture.branch (
    tenant_id text NOT NULL REFERENCES local_fixture.tenant(id),
    code text NOT NULL,
    PRIMARY KEY (tenant_id, code),
    CHECK ((tenant_id = 'A' AND code = 'A1') OR
           (tenant_id = 'B' AND code IN ('B1', 'B2')))
);

CREATE TABLE IF NOT EXISTS local_fixture.branch_marker (
    tenant_id text NOT NULL,
    branch_code text NOT NULL,
    fixture_key text NOT NULL,
    PRIMARY KEY (tenant_id, branch_code, fixture_key),
    FOREIGN KEY (tenant_id, branch_code)
        REFERENCES local_fixture.branch(tenant_id, code)
);

INSERT INTO local_fixture.tenant (id, label)
VALUES ('A', 'Fictional Tenant A'), ('B', 'Fictional Tenant B')
ON CONFLICT DO NOTHING;

INSERT INTO local_fixture.branch (tenant_id, code)
VALUES ('A', 'A1'), ('B', 'B1'), ('B', 'B2')
ON CONFLICT DO NOTHING;

INSERT INTO local_fixture.branch_marker (tenant_id, branch_code, fixture_key)
VALUES ('A', 'A1', 'shared-marker'), ('B', 'B1', 'shared-marker')
ON CONFLICT DO NOTHING;
COMMIT;
