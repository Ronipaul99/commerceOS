# M01.02 Verification

**Status** `IN_REVIEW`. Local Docker runtime acceptance passed on 25 November 2026. Human review remains pending.

**Checked** 24 November 2026, Asia/Kolkata, Windows. Host checks used Node.js 22.22.2 and pnpm 9.4.0.

| Check | Actual result |
|---|---|
| C01 API typecheck and build | PASS. `pnpm.cmd --filter @businessos/api run typecheck` and `pnpm.cmd --filter @businessos/api run build` both exited 0. |
| C02 API lint and boundary checks | PASS. `& .\node_modules\.bin\eslint.cmd apps/api --max-warnings 0` and `& .\node_modules\.bin\depcruise.cmd --config .dependency-cruiser.cjs apps/api packages/config` exited 0. Four modules and three dependencies checked. |
| C03 Host smoke and adverse behavior | PASS. `node --test infra/local/host-smoke.test.mjs` passed three tests after building the API. It checked the existing identity route, new liveness and unconfigured readiness, object round trip and bounds, and rejection of unconfirmed reset and invalid port. |
| C04 Compose source and fixture checks | PASS for static checks. A Node script on stdin parsed both YAML files using the installed js-yaml 4.3.2 with declarations for the Compose merge tags. Assertions covered local bind address, private test network, fixture tool profile, managed volumes, local DB names and the scope FK. This was a source check. |
| C05 Docker boot, fixture/queue/API smoke and reset | BLOCKED. `node infra/local/manage.mjs up` exited 1 because Docker CLI was absent. Docker, Podman and local PostgreSQL CLI were unavailable and WSL enumeration was denied. Positive dependency readiness, authenticated PostgreSQL queries, seed replay, Redis list round trip and clean-volume rebuild all await `node infra/local/manage.mjs test` on a Docker-capable host. |
| C06 Scope, links and whitespace | PASS. Reviewed the current diff and checked the prior RG0 document hashes, existing staged entries, M01.01 status and changed Markdown links. `git -c core.safecrlf=false diff --check` passed. |

The initial host smoke started before the API build finished and the API route check timed out. The sequential build and test rerun passed. A direct reachability check of the image registry also failed in this session. Local Docker build and registry image pulls were not verified here.

| Handoff | Status |
|---|---|
| Requirement trace | Master §§16 and 21. [Design](DESIGN.md) · [Implementation evidence](IMPLEMENTATION_EVIDENCE.md) · [Runbook](RUNBOOK.md) |
| Impact | New local fixture schema, operational API routes, Docker/Compose setup and synthetic smoke tests. No business UI, domain schema, event or provider changes. |
| Runtime and performance | Docker runtime acceptance and clean-volume reset/reseed passed in the later run below. The recorded elapsed time is a local run duration. |
| Review and rollback | Human review pending. No commit or PR created. Revert the M01.02 changes to roll back code. Project-local fixture volumes are disposable. |

## M01 closeout step 2

The first Step 2 attempt on 25 November 2026, Asia/Kolkata, was blocked before Docker Desktop was installed. Windows had no `docker` or `docker-compose` command, Docker service or Docker Engine named pipe. The installed Ubuntu WSL distribution was also checked. `wsl.exe -d Ubuntu --exec /usr/bin/which docker` and `wsl.exe -d Ubuntu --exec /usr/bin/test -S /var/run/docker.sock` both exited 1. The Docker Compose version and daemon were unavailable then. The later Docker run supersedes the runtime result from this attempt.

Source inspection confirmed that `test` allocates a `businessos-test-<random-id>` project, uses the `businessos_test` fixture database, and passes that project name to every Compose command. The test overlay removes API host ports and uses the internal `data` network. PostgreSQL and Redis have project-managed volumes. Both reset and final teardown call `down --volumes` with the generated test project name. [Launcher](../../../infra/local/manage.mjs) · [Compose definition](../../../compose.yaml) · [Test overlay](../../../infra/local/test.compose.yaml)

| Phase | Actual result |
|---|---|
| Command | `node infra/local/manage.mjs test` exited 1 on Windows with `Docker CLI was not found. Start a local Docker engine with Compose v2.` The launcher stopped at `docker context show`, before allocating the test project. |
| Image build and startup | `NOT_RUN`. Docker was unavailable before Compose could build the API or start any container. |
| API and dependency smoke checks | `NOT_RUN`. No Compose API, PostgreSQL, Redis or storage fixture started. |
| Fixture SQL migration and seed replay | `NOT_RUN`. The initial migration and the repeated fixture pass require the Compose PostgreSQL service. |
| Reset and reseed | `NOT_RUN`. No test volumes were created. |
| Teardown | `NOT_APPLICABLE` to this attempt. The failed Docker preflight created no Compose resources. |

## Docker Desktop acceptance after installation

On 25 November 2026, Asia/Kolkata, `node infra/local/manage.mjs test` exited 0 in 304.5 seconds on the current Windows working tree based on `d4031a6e0d51a82c819e406509924a4241585020`. Node.js was 22.22.2, Docker CLI and engine were 29.9.3, and the Docker Compose plugin was v5.7.1. The test used the local `desktop-linux` named pipe and a Linux/amd64 engine. The Docker Desktop `resources/bin` directory was added to `PATH` for the test process. The launcher used the generated project `businessos-test-2116612d`.

| Phase | Observed result |
|---|---|
| Image build and startup | PASS. The API image built successfully. PostgreSQL, Redis, the storage stub and the API reached healthy state in both rounds. |
| Fixture SQL and seed replay | PASS. PostgreSQL created and seeded the synthetic fixture schema. The repeated fixture run inserted no duplicate rows. |
| API and dependency smoke | PASS twice. The launcher reported `PASS API, fixtures, Redis queue round trip and storage stub` before and after the clean reset. The API identity, `/health` and `/ready` checks returned success. |
| Clean-volume reset and reseed | PASS. The launcher removed the project volumes, recreated them, applied the fixture SQL and reported `PASS clean-volume reset and reseed`. |
| Teardown | PASS. Final teardown removed the test project's runtime resources. A read-only Docker check using the exact `com.docker.compose.project` label found zero remaining containers, volumes or networks for that project. |

M01.02 is ready for human review. This record covers local Docker acceptance for the tested working tree.
