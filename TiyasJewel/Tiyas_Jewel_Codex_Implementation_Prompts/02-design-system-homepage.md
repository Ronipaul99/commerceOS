# STAGE 02 — PREMIUM DESIGN SYSTEM & HOMEPAGE

Continue the existing TIYAS JEWEL project.

Read:
- AGENTS.md
- docs/ARCHITECTURE.md
- docs/IMPLEMENTATION_STATUS.md

Study the design reference:
design/reference/tiyas-homepage.png

If installed, use the frontend-design and ui-ux-pro-max Codex skills.

Your task is to deliver a premium, visually distinctive, production-quality jewellery storefront homepage.

Do not implement checkout, payments or admin functionality in this stage.

## 1. Creative direction

Design concept:

SCULPTURAL MINIMALISM + EDITORIAL LUXURY

The website should feel like a premium jewellery fashion campaign rather than a generic ecommerce template.

Design characteristics:
- Elegant serif headings
- Minimal sans-serif navigation
- Warm ivory backgrounds
- Sandstone and beige textures
- Sculptural jewellery photography
- Deliberate whitespace
- Refined image compositions
- Minimal controls
- Sophisticated mobile layouts
- Subtle transitions

Avoid:
- Generic Shopify-style layouts
- Heavy card shadows
- Excessively rounded components
- Bright buttons
- Generic AI-generated hero layouts
- Distracting animations

## 2. Design tokens

Create a centralized semantic design system.

Initial palette:
- Background: #F8F5F0
- Warm ivory: #F2EDE5
- Sand: #E8DED0
- Beige: #D8C7B3
- Text: #241C17
- Secondary text: #75685C
- Antique gold: #B08D57
- Border: #E5DED5
- White: #FFFFFF

Typography:
- Editorial headings: Cormorant Garamond or equivalent
- Interface text: DM Sans or equivalent

Implement responsive type scales, spacing tokens and component variants.

Use semantic tokens consistently.

If the CommerceOS handoff exists, reuse its accessibility and responsive engineering conventions, not its brand styling.

## 3. Shared components

Implement:
- DesktopHeader
- MobileHeader
- MobileMenu
- Footer
- PrimaryButton
- SecondaryButton
- EditorialTextLink
- ProductCard
- CategoryCard
- EditorialBanner
- WishlistButton
- CartButton
- SectionHeading
- NewsletterForm
- ResponsiveImage
- SearchDialog shell

Use accessible interactions, keyboard navigation and visible focus states.

## 4. Homepage sections

Implement the following sections in order.

### 01 — HERO

Heading:
The art of being noticed.

Description:
Sculptural jewellery for everyday expression.

CTA:
EXPLORE COLLECTION

Desktop:
- Large editorial headline on the left
- Gold jewellery imagery on sculptural stone on the right
- Full-width immersive composition

Mobile:
- Distinct image composition
- Elegant typography
- Visible CTA
- No overflow

### 02 — SHOP BY FORM

Heading:
Discover your signature.

Categories:
- Earrings
- Necklaces
- Rings
- Bracelets

Desktop: four-column image gallery.
Mobile: horizontal swipe gallery.

### 03 — EVERYDAY EDIT

Heading:
Beautifully ordinary. Anything but basic.

Display four featured products with:
- Product image
- Product name
- INR price
- Wishlist icon
- Add-to-bag button

Use the existing product API wherever possible.

### 04 — CELEBRATION EDIT

Heading:
For moments that stay.

Full-width editorial fashion image.

CTA:
EXPLORE OCCASION JEWELLERY

### 05 — STATEMENT PIECES

Heading:
Designed to stand apart.

Build an asymmetric image-and-text layout.

### 06 — OUR STORY

Heading:
More than jewellery.

Short brand introduction and lifestyle photography.

### 07 — STYLE IT YOUR WAY

Create an editorial styling gallery with multiple lifestyle images.

### 08 — SERVICE BENEFITS

Show:
- Free Shipping
- Easy Returns
- Secure Payments
- Premium Packaging

Use configurable copy for shipping and return policies.

### 09 — JOURNAL PREVIEW

Heading:
Stories, styles and inspiration.

Display editorial content cards.

A full blog CMS is not required.

### 10 — NEWSLETTER

Heading:
Join the Tiyas Circle.

Implement the UI and validation. Do not imply successful subscription before a real backend integration exists.

### 11 — FOOTER

Display:
- Brand
- Shop links
- Collections
- Contact
- Policies
- Social links

Create an elegant collapsible footer for mobile.

## 5. Asset handling

Use supplied brand images if available.

If images are missing:
- Use suitable legally usable development assets.
- Record required production assets.
- Make image sources replaceable.
- Never present unrelated stock images as actual purchasable products.

Do not use the entire reference screenshot as a website background.

## 6. Responsive design

Validate at:
- 320px
- 390px
- 600px
- 834px
- 1024px
- 1280px
- 1440px

Desktop and mobile should follow the reference's distinct compositions.

Do not simply stack desktop sections mechanically.

## 7. Interaction

Implement:
- Functional navigation
- Mobile menu
- Search dialog shell
- Collection links
- Product links
- Wishlist UI state
- Add-to-bag preview
- Scroll-to-top
- Subtle hover effects

Temporary controls must be clearly implemented as demo state until their real backend integration is completed.

## 8. Mandatory visual testing

Run the application in a browser.

Capture full-page screenshots for:
- Desktop 1440px
- Mobile 390px

Compare the rendered output against the reference.

Identify and fix:
- Hero composition differences
- Typography discrepancies
- Incorrect spacing
- Poor image crops
- Product card proportions
- Mobile layout problems
- Inconsistent backgrounds
- Unrefined buttons

Repeat visual checks after corrections.

Respect reduced-motion preferences and accessibility requirements.

## Acceptance criteria

- All homepage sections complete.
- Desktop and mobile layouts visually reviewed.
- Navigation works.
- Design tokens are reusable.
- No broken images or horizontal overflow.
- TypeScript and lint checks pass.
- API integration does not break the design.
- Screenshots are available.

Update the implementation status and document missing brand assets.

Stop after Stage 02.
