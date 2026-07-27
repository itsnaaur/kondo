# Layout & interaction pattern standards

Named, current layout/interaction patterns to draw from instead of defaulting to the generic
"hero → 3-column features → testimonials → CTA → footer" template every time. Pick the pattern
that fits the archetype and the client's actual content — don't force a pattern the content
doesn't support.

## Pattern: Confident minimalism

- Large negative space, one focal element per section, restrained color use, generous margins.
- Best for: Professional, Luxurious, Calm archetypes.
- Implementation: wide section padding (80-120px vertical on desktop), max one CTA per
  viewport, avoid decorative elements that don't carry information.

## Pattern: Bold statement typography

- Oversized headlines (often 60px+ on desktop) doing the visual heavy lifting instead of imagery,
  tight line-height, high contrast against background.
- Best for: Bold, Modern, Creative archetypes.
- Implementation: hero section is majority typography, minimal supporting copy, one strong CTA
  styled to match the heading's confidence (large, high-contrast, no timid outline buttons).

## Pattern: Warm, dense storytelling

- Multiple content blocks with photography/illustration-style CSS art, generous body copy,
  narrative section flow (problem → story → solution) rather than a flat feature grid.
- Best for: Warm, Playful, Creative archetypes.
- Implementation: alternate left/right image-text sections, avoid uniform 3-column grids —
  vary section rhythm to feel handcrafted.

## Pattern: Structured grid / data-forward

- Clear grid alignment, card-based content, consistent spacing units, subtle borders instead of
  shadows for separation.
- Best for: Professional, Modern/Tech archetypes.
- Implementation: 12-column-equivalent grid via CSS grid, consistent card padding, monospace
  accents for stats/numbers (Tech archetype).

## Pattern: Soft depth (neumorphism-adjacent)

- Very subtle shadows/highlights on surfaces to suggest tactile depth without skeuomorphism.
  Use sparingly — this pattern ages fast if overdone.
- Best for: Calm, Modern/Tech (fintech-adjacent) archetypes.
- Implementation: one soft box-shadow direction consistently applied to cards/buttons, low
  contrast between surface and background so the depth reads as subtle, not gimmicky.

## Pattern: Editorial collage

- Overlapping content blocks, mixed alignment, torn/irregular section boundaries via CSS
  clip-path or skewed dividers, mixed type scale within one section.
- Best for: Creative, Playful archetypes; works well for portfolios.
- Implementation: use CSS `clip-path` or rotated/offset absolutely-positioned elements sparingly
  — one or two per page, not every section, or it stops reading as intentional.

## Pattern: Raw / neo-brutalist

- Visible borders instead of shadows, high-contrast flat color blocks, deliberately "unpolished"
  alignment, thick black outlines on interactive elements.
- Best for: Bold, Creative archetypes wanting to feel unconventional/edgy.
- Implementation: 2-4px solid borders on cards/buttons, flat colors (no gradients), intentionally
  asymmetric section widths.

## Motion guidance (all archetypes)

- Subtle by default: fade/slide-in on scroll (via CSS `@keyframes` + `IntersectionObserver`,
  no external animation library), hover states on every interactive element.
- Luxurious/Calm archetypes: motion should be slow and minimal (300-500ms, ease-out).
- Bold/Playful/Creative archetypes: motion can be snappier and more expressive (150-250ms) but
  should never block interaction — no animation the user has to wait out.
- Respect `prefers-reduced-motion` — disable non-essential animation when set.

## Spacing scale (all archetypes)

- Use a consistent numeric spacing scale for every margin/padding/gap value (e.g. a 4px base
  unit: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128) — never arbitrary values like 17px or 23px.
- Vary *which* step you use by section weight, per the section-arrangement checklist below —
  a dense section might sit at 24-32px padding, a spacious hero at 96-128px — but every value
  should come from the scale, not be picked ad hoc per section.
- On mobile, drop down the scale rather than keeping desktop spacing at every breakpoint (e.g.
  a 96px desktop section padding becomes 48px on mobile, not squeezed content at full padding).

## Responsive & mobile behavior (all archetypes)

- Design mobile as its own layout, not a squeezed desktop one: multi-column grids stack to a
  single column, side-by-side image+text sections reorder (image above or below text, never
  narrowed to a sliver), and navigation collapses to a menu control below roughly 768px.
- Touch targets (buttons, nav links, form inputs) must be at least 44x44px on mobile. Don't
  rely on hover-only states for anything functionally important — touch has no hover.
- Typography scales down but stays legible — a 60px desktop hero heading should get a
  recalculated mobile size (often 32-40px), not a straight percentage shrink that leaves it
  either still oversized or cramped.
- Check the layout at roughly 375px (small phone) and 768px (tablet/small laptop) specifically
  — a layout that only looks right at a wide desktop width isn't done.

## Images & imagery treatment (all archetypes)

- When a real asset is available (logo, uploaded photo), use `object-fit: cover` inside a
  fixed-aspect-ratio container so images crop consistently instead of distorting or varying
  wildly in proportion across the page.
- When no real photography exists (the common case per the output rules — no fabricated stock
  photos), still vary the CSS-generated visual interest across the page: don't reuse the
  identical gradient blob or identical inline SVG icon shape in every section. Vary shape,
  composition, and placement so the page doesn't read as one motif copy-pasted down the page.
- Give an attached logo real breathing room (padding around it in header/footer) rather than
  cramming it against nav links or other elements.

## Page transitions (all archetypes)

- For multi-page static sites, use the CSS View Transitions API for a subtle cross-fade
  between pages (`@view-transition { navigation: auto; }`, with `::view-transition-old/new`
  rules if you want more than the default cross-fade). It degrades invisibly to an instant page
  swap on browsers that don't support it, so it's safe to always include — no JS framework or
  library needed.
- Keep any transition subtle (150-250ms cross-fade). A page transition should feel like part of
  the same site, not a slideshow effect.
- Skip this entirely for a true single-page site (index.html only) — there's nothing to
  transition between.

## Dark mode

- Treat as a deliberate design choice tied to archetype (Modern/Tech, Luxurious, Bold suit a
  dark-first design), not a bolt-on toggle, unless the brief specifically asks for a toggle.
- If dark-first: don't use pure black (`#000000`) — use a dark gray/near-black (see color
  palette standards) so text and surfaces don't create harsh pure-black/pure-white contrast.

## Section arrangement checklist

- Vary section rhythm — don't repeat the exact same layout shape (image-left-text-right) for
  every section; alternate or break pattern at least once per page.
- Every page needs one clear primary CTA above the fold — decide what it is before laying out
  the rest of the page.
- Content density should match the archetype: minimalism/calm archetypes get more whitespace and
  fewer simultaneous elements; bold/creative archetypes can support denser composition.
