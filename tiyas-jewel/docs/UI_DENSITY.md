# Shared UI density and homepage autoplay

Updated 21 November 2026 at the owner's request.

## Overall scale

`apps/web/src/app/density.css` supplies one `--ui-scale: 0.8` screen setting. Body-level CSS zoom reduces the existing typography, spacing, icons, imagery and fixed component dimensions consistently across storefront and admin routes. Existing responsive breakpoints and the two-column mobile product grid remain intact. The layout continues to fill the available viewport width.

This does not change the browser zoom preference or disable user zoom. Print styling and browsers without CSS zoom retain normal sizing. Full-height drawers, admin shells and admin login use `--ui-viewport-height` to retain the actual screen height after scaling.

Measured examples:

| Component | Previous visible size | New visible size |
| --- | --- | --- |
| Desktop/tablet shared product card | 260 x 400px | 208 x 320px |
| Product card at a 390px viewport | 165 x 400px | 132 x 320px |
| Homepage hero at 1440px | 430px high | 412.8px high |
| Homepage hero at 390px | 510px high | 489.6px high |

The underlying shared card design tokens remain 260 x 400px; historical card documentation describes those original dimensions. The site-wide scale changes the rendered dimensions on every page together.

Footer follow-up: a separate semantic footer type scale of **1.2** increases its text by 20% within the existing site-wide density. Logo dimensions and other page typography remain unchanged. Shared product rails now fit and page complete card units; card dimensions remain unchanged. See [UI_CONSISTENCY_AUDIT.md](UI_CONSISTENCY_AUDIT.md).

Hero follow-up: the owner requested 20% more hero height after the density change. Every existing hero breakpoint is now 1.2 times its compact height; the rest of the site retains the 80% density.

## Homepage carousel

The existing three campaigns now rotate every five seconds. The interval is configurable as `heroAutoplayIntervalMs` in `homepage-config.ts`.

- A pause/start button is first in the carousel's keyboard order.
- Hovering an interactive control temporarily pauses rotation; leaving the pointer over the banner photograph does not pause it. Keyboard-visible focus stops playback until explicitly restarted.
- Manual arrows, dots and swipe navigation restart the five-second slide timer. They do not permanently stop automatic playback after a pointer/touch interaction. Explicit Pause and keyboard pauses remain respected.
- Reduced-motion preference disables automatic playback; manual navigation remains available.
- Rotation suspends while the document is hidden or the hero is offscreen. Timers and observers are cleaned up on unmount.
- Automatic changes do not generate repeated live-region announcements.

The carousel retains the rotation control, keyboard pause and live-region conventions described in the [WAI carousel pattern](https://www.w3.org/WAI/ARIA/apg/patterns/carousel/). Banner-wide hover pause was deliberately narrowed to controls after the owner reported that the carousel appeared stationary during normal browsing. CSS zoom layout behavior was checked against the [CSS Viewport working draft](https://drafts.csswg.org/css-viewport/#zoom-property) and verified in the running browser.

## Verification

The live browser sweep covers nine page types at 320, 390, 768, 1024, 1440 and 1920px. All 54 checks pass without horizontal overflow, broken images or page exceptions. Full-height mobile menu checks pass. Ten production carousel behavior checks cover timed transitions, looping, hover, explicit controls, focus, viewport visibility, reduced motion, manual navigation and mobile autoplay.

TypeScript, lint, both production builds and all 46 unit tests pass. The complete production browser regression reports 73 passed and eight intentional duplicate-check skips, including protected admin workflows and checkout. Tests use the dedicated local PostgreSQL database, never the configured store database.

Desktop/mobile screenshots are `output/playwright/scale-{home,shop,collection,product,wishlist,bag,checkout,information,admin-login}-{1440,390}.png`. Captures use explicit viewport bounds because Playwright's automatic full-page bounds include unscaled body dimensions when CSS zoom is active.

Logs: `output/verification/site-scale-checks.log`, `carousel-autoplay-checks.log` and `scale-e2e.log`. Final production test results and cleanup are recorded in `IMPLEMENTATION_STATUS.md`.

No database schema, backend endpoint, environment file, checkout calculation or admin authorization logic changed.

Final cleanup: production screenshots were visually inspected, the normal production build and port-4000 API/upload rewrites are restored, and temporary test services are stopped. The isolated test database retains 14 products with zero orders, payments or admins.

Hero follow-up verification: seven widths confirm the requested 20% height increase without overflow. Seven real-time carousel checks pass on the existing local dev preview, including automatic advance while the pointer remains on the image and after manual Next, explicit pause/restart, keyboard pause, mobile autoplay and reduced motion. Both final hero screenshots were visually reviewed. TypeScript, ESLint, formatting and 46 unit tests pass. The owner's running dev server was left running; no build was run over it. Earlier production/full-suite results above are historical to the initial density update.
