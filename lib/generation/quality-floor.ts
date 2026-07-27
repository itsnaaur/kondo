// Call 2's pass/fail requirements. These apply regardless of the approved design
// direction — they are craft and accessibility floors, not aesthetic choices, which is
// why they live here instead of in the design spec. Do not let the model treat these as
// creative license; per the design-prompt-system rationale, mixing "add shadows" into a
// direction-level instruction is what produces a new generic look instead of a distinctive
// one. Here they're framed as engineering requirements to satisfy, not decisions to make.

export const QUALITY_FLOOR = `
## Quality floor (pass/fail — apply regardless of the design direction)

**Structure & semantics**
- One h1 per page, correct heading order with no skipped levels.
- Semantic landmark elements (header/nav/main/footer), alt text on every content image,
  empty alt on decorative images.
- Visible keyboard focus on every interactive element — never \`outline: none\` without a
  replacement indicator.

**Spacing**
- Derive every margin/padding/gap from the spec's \`spacing_scale\` — no arbitrary pixel
  values invented at build time.
- Vary which step you use by section weight (a dense section sits tighter than a spacious
  hero) rather than giving every section identical padding.
- On mobile, step down the scale rather than keeping desktop spacing at every breakpoint.

**Responsive**
- Design mobile as its own layout, not a squeezed desktop one: multi-column grids stack to
  a single column, side-by-side sections reorder (never narrowed to a sliver), navigation
  collapses to a menu control below roughly 768px.
- Touch targets at least 44x44px. Don't rely on hover-only states for anything functionally
  important — touch has no hover.
- Recalculate heading sizes for mobile rather than a straight percentage shrink.
- Check the layout at 320px, 768px, 1024px, and 1440px specifically.
- No horizontal overflow at any breakpoint.

**Color & contrast**
- Body text contrast at least 4.5:1, large text at least 3:1, against the actual background
  it sits on. If a pairing from the spec's palette can't clear this, use a different pairing
  within the same palette — do not invent a new colour to fix it.

**Images**
- \`object-fit: cover\` inside a fixed-aspect-ratio container so images crop consistently.
- Width/height attributes set, \`loading="lazy"\` below the fold.
- Use only the attached/provided image assets — never a placeholder image service, never a
  fabricated stock photo. If a section has no matching real image, use CSS/SVG treatment
  consistent with the spec instead of inventing a photo.

**Motion**
- Implement exactly the moments listed in the spec's \`motion.moments\` — nothing extra.
- Wrap all motion in \`@media (prefers-reduced-motion: reduce)\` fallbacks.
- Respect \`motion.deliberately_absent\` — the absence of motion somewhere is a decision,
  not an oversight to correct.

**Copy discipline (content-level clichés, independent of visual direction)**
- Don't add an eyebrow label above every heading by default — only when it does real work.
- Don't write a subheading that just restates the headline in different words.
- Don't insert a "Trusted by" logo strip or testimonial band unless real names/quotes exist
  in the content spec.
- Don't invent stats ("500+ clients", "10 years experience") not grounded in the content.
- Don't default every CTA to "Get Started" / "Learn More" / "Book a Call" — write the label
  for the actual action this business wants next.
- Don't default to the generic hero → 3-feature-grid → testimonials → CTA-band → footer
  skeleton regardless of business type — build the structure from what the content spec
  actually contains.

**CSS structure**
- Define the spec's palette, type scale, and spacing scale as custom properties in \`:root\`;
  derive everything else from those properties. Never hardcode a hex value or font family
  outside \`:root\`.
- Keep spacing ownership in one place per element — section-level and element-level
  selectors that both set margin/padding on the same box cancel each other unpredictably.
`.trim();
