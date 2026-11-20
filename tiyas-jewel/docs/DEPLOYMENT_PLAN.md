# Deployment plan - OCI ARM64

Stage 01 provides a local environment and a production-shaped image layout. No OCI resource, DNS, public deployment or payment account is created. Runtime qualification and production launch belong to Stage 06.

## Provided now

- One Dockerfile with Node 24 Debian slim builds, non-root API and standalone Next.js runtime targets.
- Official `node:24-bookworm-slim`, `postgres:17-bookworm` and optional `nginx:stable-alpine` image families publish Linux ARM64 variants. No amd64-only platform override or local binary is copied into images. See official [Node image](https://hub.docker.com/_/node), [PostgreSQL image](https://hub.docker.com/_/postgres) and [Nginx image](https://hub.docker.com/_/nginx) metadata. Actual ARM64 build/runtime still requires verification on a Docker-capable host.
- PostgreSQL persistent volume; no database/API ports in the default stack. Only the web binds to host loopback. The host-development override publishes the database on 127.0.0.1 only.
- Health checks and ordered startup: database - one-shot migrate - API readiness - web - optional Nginx.
- Optional local HTTP Nginx proxy with same-origin `/api/` routing. It is loopback-only and is not a public TLS configuration.
- Reproducible npm lockfile. Prisma Client generated inside the target Linux build. The API image intentionally includes migration tooling at this stage.

## Stage 06 launch checklist

1. Confirm the actual OCI VM CPU architecture, RAM, disk and network. Build and run `docker buildx build --platform linux/arm64` targets on a capable host and test every container/health check. Pin reviewed image digests for the release.
2. Select the domain, issue TLS certificates and configure Nginx HTTPS, redirect, appropriate HSTS/CSP, trusted proxy handling and request limits. Publish only 80/443; keep API and PostgreSQL on the private container network. Review OCI security lists/NSGs and host firewall.
3. Store secrets outside the repository/image. Use separate least-privilege database runtime and migration roles, a scoped deployment environment and explicit HTTPS CORS origins. Review PostgreSQL TLS when the database is remote. Rebuild Next.js if its internal rewrite origin changes.
4. Back up the database and volume, rehearse restore, review migrations and apply them once before new application writers start. Do not reset production or use development seed. Changing POSTGRES_PASSWORD in .env does not rotate an existing initialized database role password; perform controlled rotation.
5. Complete and verify the authorized Stage 02-05 functionality before release. Finalize image storage, Razorpay signatures/webhooks, optional COD policy and admin session/security boundaries in those stages.
6. Run typecheck, unit/integration/E2E suites, real ARM64 container smoke, readiness and proxy checks. Verify all currencies/prices, mobile flows, SEO, support/legal copy, backups, logs and restart/recovery behavior. Supply approved product photography.
7. Record the release artifact digest, migration version, configuration scope, health results and rollback steps. Roll back the application image only when schema compatibility allows; data/schema changes need a reviewed recovery procedure.

Docker is absent on the Stage 01 implementation machine. Compose runtime, image builds, volume persistence and Nginx/ARM64 operation must therefore be reported as unverified until run on an equipped host. See IMPLEMENTATION_STATUS.md for actual results.

## Stage 04 prerequisites before launch

Qualify real Razorpay test payments and public HTTPS signed webhooks using CHECKOUT.md; no account credentials were available during implementation. Configure merchant-approved shipping, PIN/COD and tax rules. The development adapter is forbidden under production NODE_ENV and live keys are rejected in Stage 04. Qualify proxy client-IP trust and edge throttling for the bounded single-process limiter, then define reservation/reconciliation alerts and a manual late-capture refund resolution process. No deployment is performed in this stage.


## Stage 05 admin/storage prerequisites

Apply the fourth migration after backup and historical-reference checks, then explicitly provision the owner with npm run admin:create. Do not ship a default password or automatically provision from public HTTP. Serve the single origin over HTTPS before using production admin cookies; preserve Set-Cookie and no-store headers through the proxy. Keep CORS_ORIGINS restricted to the actual storefront origin. Current in-memory rate limiting assumes one API process with no implicit trust of forwarded IPs; qualify proxy/IP and shared limits before changing topology.

Production product images use a private OCI bucket through the S3 Compatibility adapter; configure only the API's OCI_* variables, least-privilege object create/read/delete permissions and no bucket/IAM administration. Use bucket-specific credentials and verify TLS, upload/read/delete, quotas, retention and recovery with a real bucket before launch. The local Compose adapter has a persistent product_images volume and a bounded Nginx upload location. Back up metadata and objects together; preserve historical order images and review aged unattached uploads. Actual OCI/ARM64/TLS runtime qualification remains Stage 06; source code and mocked adapter tests do not prove a cloud deployment.
