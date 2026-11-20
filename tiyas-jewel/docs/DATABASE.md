# Database foundation

PostgreSQL 17 with Prisma 7 and the PostgreSQL driver adapter. The API is the only application allowed database access. Prisma CLI/seed are explicit development/operations tools. Generated client output belongs to `apps/api/src/generated/prisma` and is ignored by Git; both install and Docker builds regenerate it.

## Initial migration

| Model | Responsibility |
| --- | --- |
| Product | Unique slug, description, integer base pricePaise, active flag, basic stock, category, timestamps |
| ProductImage | Ordered local public image path, alt text, product FK, timestamps |
| ProductVariant | Unique SKU, optional price override, stock, active flag and product FK |
| Category | Unique slug, name/description, active flag and timestamps |
| Collection | Unique slug, name/description, active flag and timestamps |
| ProductCollection | Composite product/collection primary key and creation timestamp |
| AdminUser | Unique normalized email, future password hash, active flag, timestamps; no seeded credentials |

All amounts are INR **integer paise** (`245000` = INR 2,450). The PostgreSQL signed Int maximum is 2,147,483,647 paise. Zod enforces the same range and the migration adds CHECK constraints for nonnegative prices/stocks/positions. Database checks also enforce slug shape and normalized admin emails. Prisma does not represent CHECK constraints in its schema file; preserve the custom migration SQL when authoring later changes.

IDs are Prisma-generated CUIDs. Slugs are lowercase hyphenated ASCII, unique per table, at most 120 characters. Timestamps are timestamptz(3); Prisma maintains updatedAt on writes. Products reference categories with RESTRICT deletion. Images/variants/memberships cascade on product deletion; memberships cascade on collection deletion. Public reads filter active flags. Stage 05 should normally archive products to preserve future order history.

A product without variants uses product.stockQuantity. A product with variants uses active variants' stock for availability, and variant.pricePaise overrides the product base price when present. Product stock must not also be decremented for variant purchases. Stage 04 must finalize transactional stock checks/decrement and authoritative price calculations; Stage 01 availability is informational only. No inventory reservation or advanced stock system exists.

Images currently use `/images/...` paths, resolved on the storefront origin, with ordered positions and required alt text. The seeded SVG is an explicit photography placeholder. Stage 05 must finalize image storage/uploads and validate file type/size before extending this contract for object-storage URLs.

## Stage 03 additive migration

`20261120000200_shopping_catalog` adds Product.sku (optional unique), featured, optional compareAtPaise, ProductImage.concept and optional ProductVariant.imageId. A CHECK requires compare-at prices to exceed the base price. A composite image/product foreign key prevents a variant from using another product's image. The original foundation migration is unchanged. No order/payment tables are introduced.

The development seed now inserts 13 public products, four featured products, four categories, three collections, an archived fixture and three ring variants. Concept images are marked explicitly. Existing catalog edits are not overwritten on reseed. The configured Neon public schema was inspected empty before applying both migrations and the seed; no reset was performed. Automated test writes use a separate local database.

## Reserved Stage 04 commerce design (not migrated)

- **Order**: immutable public order number; guest contact/address snapshot; INR; integer subtotal, shipping, tax, discount and total; payment and fulfillment status kept separate; timestamps. No customer-account FK.
- **OrderItem**: order FK; optional product/variant FK with deletion policy preserving history; immutable name/SKU/unit-price snapshots; quantity; integer line total. Catalog edits must never change previous orders.
- **Payment**: order FK; provider (Razorpay or optional COD); provider order/payment identifiers with unique constraints; integer amount/currency; explicit verified payment state; timestamps. Persist and deduplicate verified webhook events before changing payment status.

Stage 04 must define precise rounding/tax/shipping policies, idempotency, signature verification, partial/failed payment handling, stock races and the order/payment state transitions. Never trust totals or payment success sent by the browser. Admin completion after fulfillment is the minimal Stage 05 requirement; no courier or complex OMS design is authorized.

## Local lifecycle

`npm ci` generates the client without connecting. Copy/edit `.env`, start a dedicated database with `db:start`, apply checked-in SQL with `db:migrate`, then explicitly run `db:seed`. Seed is transactional and idempotent: it inserts four categories, three collections, 13 public development samples and one inactive fixture; it does not overwrite edits. It creates no admin user and refuses production NODE_ENV. Three ring variants exercise base/override prices, variant images and availability.

Use DATABASE_URL for API/seed and optional DIRECT_DATABASE_URL for migrations. Make sure both URLs target the intended same database. Do not run migrate reset, db push or seed against shared/live systems. The integration suite requires a separately selected TEST_DATABASE_URL and rolls back its invalid-write checks; temporary visibility fixtures are removed in finally blocks. A persistent Docker volume survives normal shutdown. Backups, migration role separation, restore rehearsal and production credentials are Stage 06 deployment work.
