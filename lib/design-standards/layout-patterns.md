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
