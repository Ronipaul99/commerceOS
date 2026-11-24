# M01.02 local and test environments

Requires Node.js 22.13+ from the 22.x line and a local Docker engine with Compose v2.24.4 or later. The launcher uses the active local Docker context and rejects remote transports. [Compose merge rules](https://docs.docker.com/reference/compose-file/merge/)

## Local development

| Command | Result |
|---|---|
| `node infra/local/manage.mjs up` | Starts PostgreSQL, runs the fixture migration, builds the API, starts Redis and storage, then waits for API readiness. |
| `node infra/local/manage.mjs migrate` | Starts local PostgreSQL if needed and reruns the transactional, idempotent fixture migration. |
| `node infra/local/manage.mjs down` | Stops the local Compose project and preserves its volumes. |
| `node infra/local/manage.mjs reset --confirm-local-reset` | Removes the local project's disposable Postgres and Redis volumes, then recreates and reseeds the stack. |

The API uses `http://127.0.0.1:13001` by default. Copy [.env.example](../../../.env.example) to `.env` to choose a different loopback port. The launcher reads that port only. Database, queue and object stub are on a private Compose network with fixed fixture-only configuration. The API health route reports process liveness. Readiness in this stack checks the PostgreSQL listener, Redis PING and storage health. Compose additionally checks PostgreSQL with an authenticated SQL query and runs migration before API startup.

Initial builds may download the pinned base images and locked npm dependencies. If startup fails, check the local engine, free loopback port, disk space and Compose logs under project `businessos-local`. Re-run `up` after correcting the error. `down` preserves data for diagnosis. Reset is for rebuildable synthetic data.

## Isolated test

```sh
node infra/local/manage.mjs test
```

Each run uses a unique Compose project, its own `businessos_test` database and volumes, and an internal network without published ports. It reapplies the fixture migration, checks seed counts and a rejected cross-tenant foreign key, submits and consumes a Redis list message, and verifies API liveness/readiness and the stub object round trip. It repeats the checks after destroying and recreating the test volumes and cleans up the disposable project. It exercises infrastructure queue connectivity. BullMQ job handling and outbox/inbox business effects belong to their later work items. For a Docker-free host smoke after building the API, run `node --test infra/local/host-smoke.test.mjs`.

## Staging deployment plan

Use separate staging data stores, network, account, DNS, credentials and private object storage under G-11 and the approved staging architecture. Build from the locked source revision, publish an immutable image and record its digest. The local Compose file and fixture credentials are for disposable environments. Keep staging connection details in the approved secret store. Run reviewed staging schema changes using the migration job from the database work item and a direct connection. Use staged, authorized synthetic data for tests.

Provision staging dependency configuration and probes through their owning configuration/operations items. Verify container liveness, dependency-backed readiness, database/queue/storage smoke checks, access limits and observable failures before promotion. If checks fail, stop promotion, roll back to the prior image and review migration compatibility and restore evidence. Hosting choice, live deploy, backups and release approval remain tracked separately. [G-11](../M00.05/DECISIONS_LOG.md#gate-register)
