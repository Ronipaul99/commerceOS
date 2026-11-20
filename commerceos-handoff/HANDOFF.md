# CommerceOS Design System — Developer Handoff v1

Figma: https://www.figma.com/design/r2FRSigIYC9sGI1WV07XCD?node-id=53-2

## Verified design inventory
- 3 variable collections: 21 primitives, 16 semantic, 15 dimensions (52 variables).
- 8 typography styles.
- 35 reusable component families with 116 visual state variants in the expanded section.
- Responsive reference dashboards: desktop 1440px, tablet 834px, mobile 390px.

## Implementation rules
1. Consume semantic design tokens, not primitive colors, in product components.
2. Map Figma variant properties to typed component props; handle default, hover, focus, disabled, loading and error as applicable.
3. Use responsive CSS Grid/Flexbox and avoid absolute Figma canvas positions in production.
4. Suggested breakpoints: mobile <600px, tablet 600–1023px, desktop >=1024px. Validate at 320, 390, 600, 834, 1024, 1280, 1440px.
5. Prefer native HTML semantics, accessible names, keyboard navigation and visible focus.
6. Implement dialog focus trap, Escape close, focus return, live error announcements and reduced motion support.

## Accessibility checks
- Target WCAG 2.2 AA: >=4.5:1 normal text, >=3:1 large text and essential UI indicators.
- Post-update sampled contrast ratios: primary/white 15.25, secondary/white 6.22, white/brand 6.28, error/white 6.49, green/sage 5.75, focus/white 9.40.
- Default border/white remains 1.27:1; ensure any essential control boundary has >=3:1 contrast.
- Dashboard reference text was raised to >=14px; check for text wrapping and overflow.
- Minimum WCAG pointer target 24x24px (exceptions apply); aim for 44x44px mobile targets.

## Acceptance checklist
- [ ] Token parity checked against current Figma modes, including dark mode.
- [ ] Visual regression at all reference and intermediate widths.
- [ ] All component states functional (not merely drawn).
- [ ] Keyboard and screen-reader audit passed.
- [ ] 200% zoom, long content and translated text tested.
- [ ] Interactive boundaries and touch targets checked.
- [ ] Error, empty, loading, offline and permission states tested.
- [ ] Cross-browser QA and product owner sign-off.

## Current status
Design documentation and starter CSS provided. This is **not** an accessibility certification or engineering production sign-off. CSS starter values should be compared against current Figma variable exports before shipping; dark theme and interaction implementations are not included.
