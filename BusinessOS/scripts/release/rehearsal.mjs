// keep the last healthy API running during schema expansion and preserve it on a bad release
export async function rehearse(adapter, previous, candidate) {
  let current;
  async function activate(image) {
    await adapter.activate(image);
    current = image;
    await adapter.smoke();
  }
  async function recover() {
    try {
      await activate(previous);
      adapter.record("PRIOR_RESTORED");
    } catch {
      adapter.record("RESTORE_FAILED");
      throw new Error("STAGING_RESTORE_FAILED");
    }
  }
  await adapter.prepare();
  await activate(previous);
  adapter.record("BASELINE_SMOKED");
  await adapter.migrate();
  adapter.record("MIGRATION_APPLIED");
  await adapter.smoke();
  adapter.record("PRIOR_SCHEMA_COMPATIBLE");
  try {
    await activate(candidate);
    adapter.record("CANDIDATE_SMOKED");
    await activate(previous);
    adapter.record("ROLLBACK_SMOKED");
    await activate(candidate);
    adapter.record("ROLL_FORWARD_SMOKED");
  } catch {
    await recover();
    throw new Error("STAGING_CANDIDATE_FAILED");
  }
  return current;
}
