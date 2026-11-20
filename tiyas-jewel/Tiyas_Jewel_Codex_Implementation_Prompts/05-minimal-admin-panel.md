# STAGE 05 — MINIMAL ADMIN PANEL

Continue TIYAS JEWEL.

Build a simple administration panel for the store owner.

Do not create a separate CommerceOS application.

The admin interface must use the existing Next.js application and Fastify API.

## 1. Admin screens

Build only:

1. /admin/login
2. /admin
3. /admin/products
4. /admin/products/new
5. /admin/products/[id]/edit
6. /admin/orders
7. /admin/orders/[id]

No additional admin modules unless necessary for these functions.

## 2. Authentication

Implement:
- Secure admin login
- Session management
- HttpOnly secure cookies
- Logout
- Server-side authorization
- Protection of admin APIs

Do not enable public admin registration.

Provide a secure initial admin creation script.

## 3. Dashboard

Display four summary metrics:
- Total Products
- Active Products
- New Orders
- Completed Orders

Below these metrics display:
- Recent orders
- Add Product shortcut
- View Orders shortcut

All metrics must come from PostgreSQL.

Exclude failed or unaccepted payments from new actionable order counts.

Do not implement advanced analytics.

## 4. Product management

Create a product list showing:
- Thumbnail
- Product name
- Category
- Price
- Stock
- Active status
- Edit action
- Archive/Delete action

Support:
- Search products
- Filter by category
- Add product
- Edit product
- Archive product
- Delete unused products safely

Products referenced by historical orders must not be destructively removed in a way that damages order records.

## 5. Add/Edit product

Fields:
- Product name
- Product slug
- Description
- Category
- Collection
- Price
- Compare-at price
- SKU
- Basic stock quantity
- Product variants
- Featured toggle
- Active toggle

Images:
- Upload multiple product images
- Preview images
- Reorder images
- Replace images
- Remove images

Store image objects in OCI Object Storage through the backend.

Use a storage adapter so local development can use a compatible implementation.

Do not store image binaries inside PostgreSQL.

Validate:
- File type using actual file content
- File size
- Image dimensions
- Product data
- Authorization

Use safe object names and least-privilege storage credentials.

## 6. Order listing

Create /admin/orders.

Display:
- Order number
- Date
- Customer name
- Phone
- Total amount
- Payment method
- Payment status
- Operational status

Filters:
- New
- Completed
- All accepted orders

Default to displaying NEW orders first.

## 7. Order details

Display:
- Customer name
- Email
- Phone number
- Full delivery address
- Ordered items
- Product variants
- Quantities
- Unit prices
- Order total
- Payment method
- Payment status
- Order date
- Operational status

Make the customer mobile number and delivery address easily accessible to the store owner.

Protect personal information through admin authorization.

## 8. Manual order completion

Implement one action:

MARK AS COMPLETED

Workflow:
1. Accepted order arrives with status NEW.
2. Admin reviews the order.
3. Admin arranges shipment manually outside the platform.
4. After fulfillment, admin clicks MARK AS COMPLETED.
5. Show a confirmation dialog.
6. Backend validates the order state.
7. Change status from NEW to COMPLETED.
8. Save completedAt timestamp.
9. Update dashboard and order list.

COMPLETED means the store owner has finished manual fulfillment. It is not a verified courier-delivered status.

Make the operation safe against repeated clicks.

Do not implement:
- Courier tracking
- Shipment labels
- Logistics APIs
- Packaging workflows
- Return workflows
- Refund processing
- Warehouse inventory
- Advanced status pipelines

## 9. Backend APIs

Create secured admin endpoints for:
- Dashboard metrics
- Product creation
- Product editing
- Product archive/deletion
- Image upload and removal
- Product list
- Order list
- Order detail
- Order completion

Enforce admin authorization on every protected endpoint.

Do not rely solely on hiding buttons in the frontend.

## 10. Admin UI design

Keep the admin interface:
- Clean
- Minimal
- Professional
- Easy to understand
- Fast
- Responsive

Use:
- Simple sidebar or navigation
- Compact summary cards
- Product tables
- Order tables
- Clear forms
- Confirmation dialogs
- Success/error notifications

Use the established Tiyas Jewel colors while prioritizing operational clarity.

## 11. Testing

Verify:
- Admin authentication
- Unauthorized access rejection
- Product creation
- Product editing
- Image upload
- Product archiving
- Product deletion safeguards
- Product availability on storefront
- New order display
- Order detail access
- Manual order completion
- Duplicate completion requests
- Dashboard count updates

## Acceptance criteria

- Admin can securely log in.
- Admin can upload and manage products.
- Products appear correctly on the storefront.
- Admin can see incoming orders.
- Admin can read customer delivery information.
- Admin can manually close an order.
- Dashboard counts update correctly.
- All admin API routes are protected.

Do not expand the scope beyond basic products and orders.

Update implementation documentation.

Stop after Stage 05.
