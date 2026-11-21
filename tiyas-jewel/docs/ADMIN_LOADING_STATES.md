# Admin loading and dialog behavior

The administration interface keeps the established typography, density and burgundy/ivory styling. Loading feedback is presentation-only; authentication, product/order APIs, database rules and image storage are unchanged.

## Requests and actions

`AdminActivityProvider` wraps the admin layout. The typed admin HTTP client starts a labelled operation before fetching and clears it in `finally`, including network, HTTP and response-validation failures. The activity store handles overlapping requests independently, so one completed request cannot hide another in-flight operation. Labels contain operation descriptions, never private identifiers, credentials or request bodies.

An unobtrusive fixed spinner/status and a top progress strip report active requests. Admin links use Next.js `useLinkStatus`; programmatic navigation/refresh and filter submission use transitions so progress continues while server-rendered content arrives. Native GET semantics are retained for filter forms, while hydrated submissions use client navigation and URL query parameters. Prefetched routes can complete immediately without an artificial delay.

Local controls show the action in progress and retain existing duplicate-submit protection: sign-in/email verification, product save/draft, image uploads, confirmation actions, admin invitations/access changes, CMS draft/publish/unpublish/preview, JSON reading, prompt copying, sign-out and error-screen retry. Actions that only synchronously update local form fields do not pretend to perform network work. Shared confirmation dialogs use unique accessible title IDs and cannot be dismissed during a mutation.

## Page and image skeletons

The admin root and protected routes have Next.js `loading.tsx` fallbacks. Skeletons cover dashboard metrics, lists/tables, product forms, order details, CMS columns and user forms. Product/order filters and CMS query-tab changes also have keyed Suspense boundaries, allowing a new fallback on the same route with different query parameters. Skeletons retain the sidebar when the protected shell is already available and include a screen-reader loading status.

`AdminImage` replaces admin product, order and CMS image rendering with a shared lazy-loading wrapper. Existing dimensions/crops are retained. The image area shows a warm neutral shimmer while loading, removes it on load, resets for a new source and uses the existing catalog placeholder on failure. This preserves allocated space rather than inserting content after load. No external image or storage behavior changes.

## Dialogs and motion

All native admin dialogs use fixed positioning, viewport insets and automatic margins. The rule covers archive/delete/completion confirmations, JSON import and prompt dialogs. Tall dialogs scroll internally within the available viewport. Native modal focus handling, keyboard navigation and Escape support remain in place; busy confirmations intentionally reject dismissal.

Reduced-motion preference disables spinner, progress-strip and skeleton animation while retaining visible progress feedback. Status announcements are polite, loading icons are hidden from assistive technology and forms/actions expose busy/disabled state where applicable.

Check results and screenshots are recorded in [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md). Temporary latency injection is confined to ignored review scripts and the isolated test database; the application contains no simulated delay.
