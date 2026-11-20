# Approved festive homepage redesign

## Design basis and scope

The approved reference was supplied as an attachment in this conversation. The requested canonical path design/reference/tiyas-homepage-approved.png is absent from the checkout; its attachment was visually studied directly. No reference screenshot is used as a page background. Restore the approved source file at that path for future handoff/review.

This is a redesign of the existing Next.js storefront. Fastify catalog/cart/checkout/payment routes, Prisma schema, migration history and money/stock rules are unchanged by this redesign. Stage 04 work already present in the working tree is preserved. No admin or unrelated backend functionality is added. Root SEO metadata is retained.

## Visual system and components

Burgundy #650F2A, wine #3F0B1B, ivory #FFF9F4, cream #F7EEE8, blush #F3DDD2, champagne #EAC9A8 and gold #C8A06B are centralized semantic roles in homepage.css. Cormorant Garamond/DM Sans remain locally hosted; the editorial italic face is added. Interface/product titles use compact sans-serif; major headings use the serif. Header/footer share the new identity across routes while existing shopping/checkout composition remains intact.

- AnnouncementBar: configurable truthful messages; manually swipeable mobile strip with previous/next controls, desktop multi-message layout. No fabricated free-shipping, return-window, phone or WhatsApp claim.
- Header / BrandIdentity / LotusMark: compact sticky mobile menu/logo/search/wishlist/bag; desktop search input and eight collection links. Submitting the desktop search carries the typed query into the existing accessible API search dialog. No account icon.
- HeroCarousel / ArtDirectedImage: three configurable campaigns, manual buttons/dots and touch gestures; a dedicated mobile hero image; Next.js optimized art-directed picture sources, one active slide/heading, first image eager/high priority, inactive slide imagery not mounted.
- HomeSectionHeading, editorial collection cards, ProductRail and HomeMotion: reusable presentation patterns with native scrolling, keyboard controls and restrained observer reveals.
- Existing ProductCard gains a compact campaign variant: API price/availability, compare-at only when supported, wishlist, bag/option action, alternate image and added feedback. The original shopping state/actions and default card remain shared.
- Footer retains collapsible groups, genuine navigation and only configured contact/social values. No invented contact details, social handles or mobile app badges.
- NewsletterForm keeps the existing truthful no-storage preview. It has loading/error/acknowledgment handling for an explicitly supplied future endpoint; no endpoint or subscription backend is fabricated.

## Section order

1. Announcement strip.
2. Shared header and eight-category navigation.
3. Three-slide Tyohar/diamond/heritage hero.
4. Eight quick collection thumbnails.
5. Three Tiyas editorial collection cards.
6. New Arrivals using current backend newest ordering.
7. Brace Kundan campaign.
8. Eight occasion cards, four/two columns by viewport.
9. Four alternating campaign/product showcases.
10. Configurable active promotions; currently hidden because no approved promotion exists.
11. Four trust points based on existing verified application behavior: considered edits, guest checkout, wishlist and clear checkout totals.
12. Tiyas Story; no factual business history invented.
13. Approved review carousel; currently hidden because no genuine approved reviews/ratings exist.
14. Burgundy newsletter strip.
15. Deep-wine footer.

## Catalog truth and explicit fallback approval

The current backend has 13 public contemporary sample products and only three existing edits. No products are assigned to Premium Kundan, American Diamond, CZ, 1 Gram Gold, Temple Jewellery, Brace Kundan, Silver Replica or Pearl Jewellery yet. The user explicitly approved showing labelled **More from Tiyas** catalog fallbacks until those assignments exist.

New Arrivals requests sort=newest, limit=6. Each showcase requests its actual collection, limit=3. Requests run in parallel, are deduplicated once per server render using React cache, and stream behind reserved skeletons. Empty heritage groups use current real catalog responses, labelled as the current edit; no names, prices, availability or material/category assignments are fabricated. Actual assigned data automatically replaces the fallback when available.

Known new collection routes resolve to an explicitly labelled frontend preview when the existing collection-detail API returns 404. They browse the current catalog under a visible curation notice. Real collection routes keep their actual API membership; unknown slugs still return the established proper 404. No backend taxonomy records or synthetic product records are written. Occasion links use real edits or the approved preview destinations.

An unavailable API shows a recoverable shop link/message, never invented purchasable data. The retired homepage-only sample edit/category components and the context's unnecessary featured-product request are removed; cart, wishlist and checkout state remain unchanged.

## Images and remaining brand inputs

Eight new campaign concepts were generated with the built-in image_gen tool, encoded as WebP and saved under apps/web/public/images/campaign/. Existing catalog images are never replaced with these campaigns. Every campaign is illustrative, and actual catalog image provenance labels remain visible. The dedicated mobile Tyohar image preserves the jewellery above the copy area. Image sizes/source sets avoid sending maximum-resolution assets to all carousels.

The final prompt set and asset paths are in homepage-campaign-prompts.json. Production requires approved campaign/product photography, the actual collection assignments and assortment, the original reference file, final brand artwork, verified contact/social details and approved policy copy. Reviews/promotions require genuine approved data before enabling their configured components.

## Responsive and motion engineering

Mobile-first layouts start at 390px and remain usable at 320px. Native horizontal rails expose part of the next item and provide button/keyboard alternatives. Occasion cards use two mobile columns and four desktop columns; showcases place the dominant banner before products on mobile and alternate its side on desktop. Page gutters and type scale expand through 430/768/1024/1440px, with a 1600px content cap at 1920px. Shopping controls have visible focus and enlarged mobile bag/wishlist targets. Dark surfaces use champagne focus outlines.

Manual carousels never rotate automatically. Reveals use IntersectionObserver plus streamed-content observation, small opacity/transform transitions and a safe visible server-rendered fallback. Hero parallax is limited to 22px, scheduled with requestAnimationFrame only while visible; it is clipped to the hero. No GSAP or animation library is needed. Reduced motion disables these effects and smooth scrolling. No scroll pinning/hijacking is used.

## Verification

See IMPLEMENTATION_STATUS.md for final results. Tests cover API-backed/SSR products, eight collection destinations, menu focus/Escape, search, hero controls, touch swiping, fallback labels, offer/review omission, wishlist/bag persistence, newsletter truthfulness, metadata, and existing shopping/checkout flows.

Captures: output/playwright/homepage-approved-desktop.png (1440px), homepage-approved-mobile.png (390px), tablet capture, and homepage-width-{320,375,390,430,768,1024,1440,1920}.png. Full-page captures scroll through the page to trigger genuine reveals before review; reduced-motion width captures verify the static fallback. Screenshots are ignored development artifacts. No numerical Core Web Vitals or production deployment result is claimed without measurement.

Final verification: TypeScript, lint and both production builds pass; 34 unit tests and 57 production-browser checks pass (six intentional duplicate viewport/link-audit skips). Final mobile and desktop captures were visually reviewed after corrections to hero containment, jewellery crop, banner readability and mobile shopping targets. The test suite exercised existing checkout/COD/development payment, cart and wishlist against dedicated local PostgreSQL. The app's normal API rewrite origin is rebuilt after the suite. Numerical Core Web Vitals remain unmeasured.
