BEGIN;
LOCK TABLE fixture_transaction_probe IN SHARE ROW EXCLUSIVE MODE;
-- Cover compatible legacy inserts made after the earlier backfill.
UPDATE fixture_transaction_probe
   SET policy_snapshot_revision = 1
 WHERE fixture_policy_key = 'fixture-v1'
   AND policy_snapshot_revision IS NULL;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM fixture_transaction_probe WHERE policy_snapshot_revision IS NULL) THEN
        RAISE EXCEPTION 'Unmapped fixture policy revision' USING ERRCODE = '23514';
    END IF;
END
$$;

ALTER TABLE fixture_transaction_probe ALTER COLUMN policy_snapshot_revision SET NOT NULL;
COMMIT;
