# STAGE 03 — COMPLETE ECOMMERCE STOREFRONT

Continue TIYAS JEWEL from Stage 02.

Read AGENTS.md and the implementation documentation before making changes.

Preserve the approved homepage, design system, responsive layouts and existing backend architecture.

Implement the complete customer-facing shopping experience.

Do not implement checkout payments or the admin panel in this stage.

## 1. Required screens

Build:
- /shop
- /collections/[slug]
- /products/[slug]
- /cart
- /wishlist
- Search overlay with product results

Reuse the existing Next.js storefront layout.

## 2. Shop and collection pages

Create an elegant, editorial product listing page.

Features:
- Page title and collection description
- Category navigation
- Product image grid
- Product count
- Price filter
- Category filter
- Availability filter
- Sorting by price and newest
- Pagination or Load More
- Empty state

Use URL query parameters for filtering and sorting.

Desktop:
- Spacious product grid
- Minimal filter controls
- Four columns where appropriate

Mobile:
- Two-column product grid
- Slide-out filter panel
- Compact sorting
- Correct image proportions

Avoid generic bordered product cards.

## 3. Product cards

Each card must have:
- Product image
- Product name
- INR price
- Optional compare-at price
- Wishlist button
- Add-to-bag action
- Product details link

Support alternate images on hover where available.

Use restrained interactions.

## 4. Product details

Route:
/products/[slug]

Implement:
- Large product image gallery
- Multiple images
- Image zoom
- Swipe gallery for mobile
- Product title
- Product price
- Description
- Variant selection
- Availability
- Quantity selector
- Add to Bag
- Add to Wishlist
- Jewellery care information
- Related products

When variants change:
- Update selected SKU
- Update displayed price when applicable
- Update availability
- Update image if variant-specific imagery exists

Never allow adding unavailable variants.

## 5. Backend catalog APIs

Extend the Fastify backend with:
- GET /api/v1/products
- GET /api/v1/products/:slug
- GET /api/v1/categories
- GET /api/v1/collections/:slug
- GET /api/v1/search

Support:
- Pagination
- Validated filters
- Server-side sorting
- Featured products
- Category-specific products
- Variant availability

Keep database access exclusively in the backend.

## 6. Shopping cart

Implement:
- Add item
- Remove item
- Update quantity
- Cart drawer
- Cart page
- Subtotal
- Empty state
- Persistent cart

Use local persistence for anonymous users in this stage.

Use product/variant identifiers rather than trusting stored client prices.

Revalidate prices and availability with the backend.

## 7. Wishlist

Implement:
- Add/remove favourite products
- Wishlist page
- Local persistence
- Move to Cart
- Empty wishlist state

Customer login is not required.

## 8. Search

Create an accessible search dialog.

Features:
- Product name search
- Category matches
- Search suggestions
- Product thumbnails
- Keyboard navigation
- No-results state

Search must use the Fastify API.

## 9. Mobile experience

Optimize:
- Product image galleries
- Touch gestures
- Filters
- Add-to-bag buttons
- Cart drawer
- Wishlist controls
- Product information hierarchy

Use existing design tokens.

Do not introduce a different visual design for shopping pages.

## 10. Testing

Verify:
- Products load from PostgreSQL
- Filters work
- Sorting works
- Search works
- Product variants work
- Add to Bag works
- Cart persists after refresh
- Quantity updates
- Wishlist persists
- Out-of-stock products cannot be purchased
- Invalid product routes return a proper not-found state

Capture desktop and mobile screenshots.

## Acceptance criteria

- Customer can browse all products.
- Customer can select variants.
- Customer can search and filter products.
- Customer can save favourites.
- Customer can add and remove cart items.
- Cart totals display correctly.
- All screens match the luxury design system.
- Relevant tests pass.

Do not implement checkout or admin functionality yet.

Update the implementation status.

Stop after Stage 03.
