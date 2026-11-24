BEGIN;
UPDATE fixture_transaction_probe
   SET policy_snapshot_revision = 1
 WHERE fixture_policy_key = 'fixture-v1'
   AND policy_snapshot_revision IS NULL;
COMMIT;
