BEGIN;
ALTER TABLE fixture_transaction_probe ADD COLUMN policy_snapshot_revision INTEGER;
ALTER TABLE fixture_transaction_probe ADD CONSTRAINT fixture_probe_policy_revision_positive
    CHECK (policy_snapshot_revision > 0);
COMMIT;
