# M01.01 Implementation evidence

**Requirement trace** Master §§16.1 and 22. **Implementation** Independent POS web shell, pinned workspace importer and package boundaries. **Approval** Roni paul confirmed the v3.3 ADR-024 carry-forward and POS shell inclusion after approving RG0 as Founder/Product and Architect. [RG0](../../RG0_SIGNOFF.md) · [ADR-024](../../adr/ADR-024.md) · [POS scope decision](../../../prompts/CommerceOS_v3_3_General_BusinessOS_Execution_Pack/MASTER_BLUEPRINT.md#235-m0101-pos-shell-scope-decision)

## Workspace and dependency graph

| Component | Verification boundary |
|---|---|
| API and Worker | Existing independent NestJS builds and runtime entry points. Each uses the shared TypeScript config. |
| Business Web, Platform Admin and POS | Three independent Next.js apps. Use public `@businessos/ui-web` and its exported stylesheet. The UI package owns the shared design-token dependency. |
| Business Mobile | Existing Expo Android and iOS exports use the public design-token package. |
| Shared packages | Config holds strict TypeScript presets. API client consumes the API contracts package. UI and tokens stay platform-specific and platform-neutral, respectively. |
| Import and ownership checks | The existing dependency-cruiser checks cover cross-app, private shared package, private backend module and cycle rules. The existing git-root CODEOWNERS rule covers the BusinessOS subtree. |

The POS shell uses the pinned Next.js, React, PostCSS and shared package versions already used by Business Web and Platform Admin. Its single new lockfile importer resolves those same packages. The root Turbo app/package discovery is unchanged. `pnpm --filter @businessos/pos dev` starts it on loopback port 3003.

## Runtime and scope

POS adds a static route with a labelled main heading, a standalone web app manifest and two local PNG icons. A shell build needs neither environment files nor service credentials. No tenant/member state, provider integration, offline transaction handling, service-worker cache, API contract, background event or schema is added. Operational POS remains gated. Storefront remains a future workstream. [Design](DESIGN.md)

Rollback of the application scope removes `apps/pos` and its importer, and reverts the POS checkout notes and M01.01 evidence/status. Revoke or revise approved architecture decisions through the master change protocol if the decision itself changes. No persisted business data is involved. [Verification](VERIFICATION.md)
