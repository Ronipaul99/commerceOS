# TIYAS JEWEL contributor instructions

- Implement only the stage explicitly requested. Stop after that stage; do not start subsequent stages.
- This is one jewellery storefront for India. Do not add CommerceOS, tenancy, customer accounts, CRM, enterprise OMS, courier services, employee management, analytics platforms or microservices.
- Preserve the approved visual design and supplied assets. The Stage 01 shell is provisional until approved references arrive; do not silently replace an approved design later.
- Keep Next.js responsible for presentation and HTTP clients. Fastify owns database access, validation and business rules. Never import Prisma, pg, DATABASE_URL or database helpers into web code.
- Use shared Zod contracts for request/response boundaries. Keep /api/v1 API compatibility; document intentional changes and update callers and tests together.
- Store INR amounts as integer paise. Validate bounds in Zod and PostgreSQL. Do not compute persisted money using floating point rupees.
- Never hardcode or commit credentials, seed admin passwords or expose server environment variables through NEXT_PUBLIC_. Use .env.example placeholders.
- Keep product endpoints read-only. Admin authentication and product mutations are Stage 05. Checkout and payments are Stage 04.
- Run type checks and relevant tests after changes. Run database integration checks against an explicitly selected dedicated development database. Never reset or seed a shared/live database.
- Run the web and inspect responsive rendering for visual changes. Preserve accessibility, loading and error states.
- Update docs/IMPLEMENTATION_STATUS.md with changes, check results and any unverified acceptance criteria. Never claim Docker/ARM64/deployment verification based only on source inspection.
- Use npm workspaces and the committed package-lock.json. On PowerShell use npm.cmd/npx.cmd if execution policy blocks .ps1 wrappers.
