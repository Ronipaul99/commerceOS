# Tiyas Jewel — Codex Implementation Prompt Pack

Seven Markdown prompts: six implementation stages and one reusable review prompt.

## Project scope

A single premium Tiyas Jewel jewellery ecommerce storefront with a minimal admin panel for product uploads, editing/archiving and viewing/closing orders. No CommerceOS, multistore SaaS, customer accounts, courier integrations or full OMS.

## Stack

- **UI:** Next.js App Router, React, TypeScript, Tailwind CSS
- **Backend:** Node.js, Fastify, TypeScript, REST API
- **Database:** PostgreSQL, Prisma
- **Payments:** Razorpay test mode then production after verification; optional COD
- **Images:** OCI Object Storage
- **Deployment:** OCI Always Free eligible Ampere A1 Ubuntu ARM64 VM, Docker Compose, Nginx, Cloudflare

## Instructions

1. Place your reference screenshot at `design/reference/tiyas-homepage.png` inside the Codex repository. The image is **not embedded in this prompts-only ZIP**.
2. Copy the contents of `01-project-foundation.md` into a Codex session, and let it implement and test Stage 01.
3. Run `07-review-after-each-stage.md` to audit the result. Fix issues before moving on.
4. Repeat for stages 02 through 06, in ascending order, always using the same codebase.
5. Never send secrets to chat or put them into code. Configure OCI and Razorpay using private environment variables and verify resource eligibility before creating anything.

## File index

| File | Purpose |
|---|---|
| `01-project-foundation.md` | Monorepo, Next.js, Fastify, PostgreSQL, local Docker |
| `02-design-system-homepage.md` | Premium design system and reference-based homepage |
| `03-shopping-storefront.md` | Product listing, product detail, search, wishlist and cart |
| `04-checkout-payments-orders.md` | Guest checkout, Razorpay/COD, secure order capture |
| `05-minimal-admin-panel.md` | Admin auth, products, image uploads, order completion |
| `06-oci-deployment-qa.md` | OCI Always Free deployment, security, QA, backups and SEO |
| `07-review-after-each-stage.md` | Repeatable completion audit after each stage |

## Deployment note

Always Free resource limits and actual availability can change. Inspect **your current OCI tenancy quota and usage** and verify eligibility before provisioning. A single VM is a cost-conscious MVP deployment, not a high-availability architecture.
