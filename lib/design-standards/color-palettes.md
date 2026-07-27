# Color palette standards

These are starting formulas, not fixed hex codes to copy verbatim. Each archetype gives a
role-based structure (background / surface / text / accent) built on standard color theory
(monochromatic, analogous, complementary) so a palette can be *derived* from a client's real
brand rather than picked generically. Where the audit already detected a usable brand color,
keep it and build the rest of the palette around it using the same role structure.

Each archetype also specifies **surface treatment** — how shadows, gradients, and corner radius
should behave for that mood. These are real, current visual techniques, not just color: a
"Professional" site and a "Playful" site shouldn't just differ in hue, they should differ in
how hard their shadows are, whether gradients appear at all, and how sharp or rounded their
corners are. Pick deliberately per archetype instead of applying one default treatment
(soft gray shadow + 8px radius + no gradient) to every site regardless of mood.

Every palette must clear WCAG AA contrast (4.5:1 body text, 3:1 large text/UI) between text and
its background — check this, don't assume it from "looks dark enough."

## Archetype: Professional / trustworthy / corporate

- **Structure**: monochromatic blue-gray, low saturation. Background near-white or near-black
  (pick one, don't mix), surface one step off background, body text near-black/near-white,
  one restrained accent for CTAs only.
- **Example instance**: background `#FFFFFF`, surface `#F1F4F8`, text `#1A2433`, accent `#2E5AAC`.
- **Surface treatment**: shadow minimal and functional only — a single soft, low-opacity shadow
  (e.g. `0 1px 3px rgba(0,0,0,0.08)`) on cards/dropdowns, never decorative. Gradient: avoid, or
  at most a near-imperceptible 2-stop gradient (5-8% lightness shift) on a hero background.
  Radius: small-to-moderate (4-8px) — enough to feel current without reading as a consumer app.
- **Avoid**: saturated brights as primary colors, more than one accent hue.

## Archetype: Modern / tech / innovative

- **Structure**: near-black or pure-white base with a single high-saturation accent
  (electric blue, violet, or lime) reserved for interactive elements only. High contrast,
  generous negative space.
- **Example instance**: background `#0A0A0A`, surface `#161616`, text `#F5F5F5`, accent `#7C5CFF`.
- **Surface treatment**: shadow can be a colored glow using the accent at low opacity (e.g.
  `0 8px 24px rgba(124,92,255,0.25)`) on cards/interactive elements — reads as digital, not just
  "a shadow." Gradient: a single subtle radial or two-hue gradient is the one place here where a
  gradient reads as intentional rather than templated — avoid the cliché diagonal purple-blue
  specifically. Radius: sharp-to-small (0-6px), or fully pill-shaped for badges/buttons
  specifically — don't default to a uniform 12px everywhere.
- **Avoid**: gradients as a crutch for visual interest everywhere — use contrast and spacing as
  the primary tool, gradient as an occasional accent.

## Archetype: Playful / friendly / approachable

- **Structure**: light, warm-neutral background with two complementary or analogous accents
  at medium saturation (not neon) — one for primary actions, one for secondary highlights.
- **Example instance**: background `#FFF8F0`, surface `#FFFFFF`, text `#2B2417`, accents
  `#FF6B4A` and `#3FA796`.
- **Surface treatment**: shadow soft and tinted toward the accent hue rather than plain gray
  (reinforces warmth instead of feeling like a default UI-kit shadow). Gradient: two-tone accent
  gradients on buttons/badges suit this archetype — one of the few places a gradient reads as
  "fun" rather than "generic AI." Radius: large and consistent (16-24px, or fully pill buttons)
  — roundness is core to the friendly feel here, unlike the other archetypes.
- **Avoid**: pure black text (feels harsh against a warm background) — use a warm dark brown/navy instead.

## Archetype: Luxurious / elegant / premium

- **Structure**: dark, desaturated base (charcoal, deep navy, or near-black) with a single
  metallic-adjacent or jewel-tone accent (gold, burgundy, emerald) used sparingly. Avoid pure
  black — a dark warm gray reads as designed intent, not default.
- **Example instance**: background `#14120F`, surface `#1F1C17`, text `#EDE8DF`, accent `#C9A24B`.
- **Surface treatment**: shadow should barely register — large-radius, very low-opacity (e.g.
  `0 20px 60px rgba(0,0,0,0.15)`) so elements feel like they're floating, not separated for
  legibility. Gradient: avoid, or use only on a single small accent detail (e.g. a metallic
  underline) — flat color reads as more confident than a blend here. Radius: sharp corners
  (0-2px), or one deliberate custom/asymmetric rounding — a default "rounded card" undercuts
  the premium feel immediately.
- **Avoid**: more than one accent color, saturated brights anywhere in the palette.

## Archetype: Bold / energetic / confident

- **Structure**: high-contrast complementary pair, one dominant one accent (roughly 90/10
  split of usage, never 50/50). Background can be the dominant bold color or a neutral that
  lets the bold color pop as accent.
- **Example instance**: background `#111111`, surface `#1C1C1C`, text `#FFFFFF`, accent `#FF3B30`.
- **Surface treatment**: shadow hard-edged and offset, no blur (e.g. `box-shadow: 6px 6px 0
  #000`) rather than soft/diffuse — reads as deliberate and graphic. Gradient: avoid soft
  blends entirely; use a hard color-block split instead if a transition is wanted. Radius:
  pick one extreme — sharp (0px) or fully pill — and use it consistently; nothing in between.
- **Avoid**: two competing saturated hues fighting for attention — pick one hero color.

## Archetype: Calm / wellness / minimal

- **Structure**: analogous low-saturation palette in the green-blue or green-neutral range.
  Very light background, minimal contrast between background/surface, one muted accent.
- **Example instance**: background `#F6F8F5`, surface `#EDF1EA`, text `#33403A`, accent `#6E9B85`.
- **Surface treatment**: shadow avoided by default, or the faintest possible shadow only where
  functionally needed (e.g. a sticky header) — visible shadows read as noise against this
  archetype's quiet palette. Gradient: avoid entirely — a flat, still surface is the goal.
  Radius: soft and consistent (12-16px) — rounded but understated, not "designed to look cute."
- **Avoid**: pure white (reads clinical, not calm) and saturated accents.

## Archetype: Warm / organic / natural

- **Structure**: earth-tone analogous palette (terracotta, sand, olive, clay) on a warm
  off-white or cream background. Accent should be the most saturated earth tone in the set,
  not an unrelated hue.
- **Example instance**: background `#F7F1E8`, surface `#EFE4D3`, text `#3B2E22`, accent `#B0532F`.
- **Surface treatment**: shadow soft and warm-tinted (lean the shadow color toward brown/amber
  rather than pure black) — a cold gray shadow fights an earth-tone palette. Gradient: a very
  subtle warm gradient (e.g. cream to sand) on a hero background is fine; avoid cool-hued or
  high-contrast gradients. Radius: vary it slightly per element (e.g. an asymmetric image mask)
  rather than one uniform value everywhere — echoes the handcrafted feel.
- **Avoid**: cool grays or blues — they break the organic feel even at low saturation.

## Archetype: Creative / artistic / expressive

- **Structure**: the one archetype where a bolder multi-color approach is appropriate —
  triadic or split-complementary, used in distinct blocks/sections rather than blended.
  Neutral background lets the color blocks read as intentional, not chaotic.
- **Example instance**: background `#FAFAFA`, surface blocks in `#FF5C8A`, `#4ADEDE`, `#FFD23F`
  used as section accents, text `#111111`.
- **Surface treatment**: shadow can be expressive — colored shadows, multiple stacked shadows,
  or a shadow used as a deliberate graphic element rather than realism. Gradient: bold
  multi-stop gradients are welcome, applied to a distinct block per the structure above rather
  than blended across the whole page. Radius: mix deliberately (sharp next to fully rounded on
  the same page) if it reflects intentional variation — not leftover inconsistency.
- **Avoid**: applying all colors uniformly across the whole page — reserve variety for distinct
  content blocks so it reads as design, not noise.

## Choosing an archetype

Match against the personality/voice traits from the audit's brand-tone analysis (e.g.
"professional, trustworthy" → Professional archetype; "playful, energetic" → blend Playful and
Bold). If multiple archetypes are close, prefer the one that best preserves the client's
*existing* detected color palette — evolving a real brand color into the nearest matching
structure beats replacing it outright.
