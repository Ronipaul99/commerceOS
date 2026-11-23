# CommerceOS v3.0 — Authoritative Business OS Blueprint

**Version:** 3.0.1 (24 November 2026)  
**Status:** requirements/design specification only. It does not contain implemented application code.  
**Source:** Revised from user's `CommerceOS_v2_Revised_Codex_Blueprint(1).zip` (21 files) and the requested v3 expansion.

## Read order and precedence

1. Read **`MASTER_BLUEPRINT.md`** from beginning to end. This is the **single authoritative product/architecture/delivery specification**; it supersedes v2 documentation wherever different.
2. Read `AGENTS.md` for mandatory execution discipline for coding agents.
3. Work on **only one** numbered prompt from `prompts/` at a time, in order unless an approved gate/ADR says otherwise.
4. Use `IMPLEMENTATION_TRACEABILITY.csv` to track implementation evidence, not as independent product policy.
5. Read `V2_TO_V3_CHANGELOG.md` for historical differences and `SOURCE_MANIFEST.md` for original file provenance.

The prompts and tracking CSV derive from the master. If they conflict with the master, STOP, log the conflict and update the master via approved change control (Section 1). Do not silently choose a second authority. The original v2 ZIP is retained separately by the owner, not copied into this package to prevent accidental execution of deprecated prompts.

## Active architecture

NestJS modular monolith + Prisma/PostgreSQL, Redis/BullMQ/outbox; multi-tenant/branch-scoped API; separate business web, Expo mobile, online-first POS, restricted platform admin. Native storefront is **future scope**. Plan/API/automation/enrolment foundations are Business OS features but exact external integrations/paid billing are gated.

[ADR-024](MASTER_BLUEPRINT.md#234-adr-024-businessos-engineering-toolchain) records the approved engineering toolchain.

The packaged Word rendition reflects v3.0.0. Use `MASTER_BLUEPRINT.md` for the current specification.

## Truth labels

- `[SPECIFIED]`: requirement planned in this blueprint; code may not exist.
- `[GATE]`: pending product/legal/provider decision before enablement.
- `[P0]`: controlled merchant pilot minimum.
- `[P1]`: first paid release, or only when module advertised/activated.
- `[P2]`: advanced growth.
- `[F]`: future storefront.

Never state `implemented`, `tested` or `compliant` without actual repository/build/QA/legal evidence.
