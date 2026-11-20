# Stage 02 - Sculptural minimalism / editorial luxury

## Reference and intent

The attached desktop/mobile composite is the approved creative reference for this stage. Its image is visible in the conversation, but `design/reference/tiyas-homepage.png` is absent from the repository. The implementation follows its editorial hierarchy, pale stone palette, gold still lifes, asymmetric compositions and distinct mobile art direction. No screenshot has been used as a background or flattened page.

## Token architecture

All tokens live in `apps/web/src/app/globals.css`. Primitive colors map to semantic roles, then component dimensions. Components consume roles rather than repeating brand colors.

| Primitive | Value   | Semantic role               |
| --------- | ------- | --------------------------- |
| Ivory 50  | #F8F5F0 | background                  |
| Ivory 100 | #F2EDE5 | surface                     |
| Sand 200  | #E8DED0 | surface-accent              |
| Beige 300 | #D8C7B3 | surface-rich                |
| Brown 950 | #241C17 | text / dark controls        |
| Brown 600 | #75685C | text-secondary              |
| Gold 400  | #B08D57 | accent, decorative details  |
| Stone 200 | #E5DED5 | decorative border           |
| White     | #FFFFFF | available inverse primitive |

Gold and pale borders are decorative; essential control boundaries and focus use darker roles. The focus color is #775521 and field errors use #963A2D. Campaign scrims support readable inverse copy over photography.

Locally hosted Cormorant Garamond supplies editorial headings; DM Sans supplies controls/body. Responsive heading roles cover hero, large section and secondary headings. UI text uses deliberately modest sizes, with readable body copy and 44px interaction targets. Spacing follows a 4px base with 4/8/12/16/24/32/40/48/64/80/96px roles. Responsive gutters and section spacing use bounded clamp values.

## Shared components

- DesktopHeader / MobileHeader: centered wordmark, semantic navigation, named search/wishlist/bag actions. Compact header below 1024px.
- MobileMenu / SearchDialog shell: native modal dialog, explicit Tab/Shift-Tab loop, Escape, backdrop dismissal, scroll lock and focus restoration. Stage 03 search uses the Fastify API for products, category matches and suggestions.
- PrimaryButton / SecondaryButton / EditorialTextLink: dark filled link, inverse outline link and minimal editorial link variants. Real destinations, visible focus, restrained hover effects.
- ResponsiveImage: next/image with explicit sizes, aspect-ratio containers and meaningful alt text. Hero preload; other assets lazy by default.
- ProductCard / WishlistButton / CartButton: integer INR display, explicit concept badges and identifier-only persistent cart/wishlist actions. Unavailable selections cannot enter the bag. No checkout or reservations.
- CategoryCard: semantic link, image ratio, hover crop and swipe gallery with previous/next alternatives on small screens.
- EditorialBanner / SectionHeading: repeatable campaign and section typography.
- NewsletterForm: labelled email, validation error/focus and truthful integration-pending feedback. No submission or storage.
- Footer: desktop columns, native collapsible mobile groups, configured destinations and scroll-to-top.

## Responsive composition

Desktop: continuous hero photograph with live copy on the left; category intro plus four-image gallery; four product columns; wide celebration campaign; asymmetric statement and story sections. Mobile: jewelry crop first, headline/CTA below; horizontal category gallery; two-column products; portrait celebration crop with bottom-aligned copy; statement text before photography; compact side-by-side story; two-column styling gallery; vertical service benefits and collapsible footer. The page is not a mechanical stack of desktop sections.

Breakpoints follow the handoff's engineering conventions: mobile below 600px, tablet 600-1023px and desktop from 1024px. The header collapses early for legibility. Narrow tablets use an image-first hero with a two-column copy/CTA area to preserve the jewellery crop. Validation covers 320, 390, 600, 834, 1024, 1280 and 1440px. Reduced motion disables smooth scrolling and transitions. No autoplay, animated carousel or video is used.

## Stage 03 shopping extension

The approved homepage composition, existing campaign art and tokens are preserved. Shopping layouts extend them in shopping.css. Category and collection navigation lead to real server-filtered catalog listings; product routes show current API data, options and image galleries. Cart/wishlist state persists as identifiers and quantities, with current prices/availability resolved by Fastify. Search uses the API. See SHOPPING.md for the exact boundaries and test setup.

Newsletter integration and contact/social/policy approval remain pending. Checkout, payments, customer accounts and admin have not been added. Offline homepage concept cards preserve the composition but cannot be purchased or stored as real products.
