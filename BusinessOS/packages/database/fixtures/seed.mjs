export const tenantA = "00000000-0000-4000-8000-000000000001";
export const tenantB = "00000000-0000-4000-8000-000000000002";

export const a1 = Object.freeze({ tenantId: tenantA, branchId: "00000000-0000-4000-8000-000000000011" });
export const b1 = Object.freeze({ tenantId: tenantB, branchId: "00000000-0000-4000-8000-000000000021" });
export const b2 = Object.freeze({ tenantId: tenantB, branchId: "00000000-0000-4000-8000-000000000022" });

export async function seedFixtures(owner) {
  await owner.query(`
    INSERT INTO fixture_tenant (id, label)
    VALUES ($1, 'Tenant A'), ($2, 'Tenant B')
    ON CONFLICT (id) DO NOTHING
  `, [tenantA, tenantB]);
  await owner.query(`
    INSERT INTO fixture_branch (id, tenant_id, code)
    VALUES ($1, $2, 'MAIN'), ($3, $4, 'MAIN'), ($5, $4, 'SECOND')
    ON CONFLICT (id) DO NOTHING
  `, [a1.branchId, tenantA, b1.branchId, tenantB, b2.branchId]);
}
