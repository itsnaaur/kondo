# Color palette standards

These are starting formulas, not fixed hex codes to copy verbatim. Each archetype gives a
role-based structure (background / surface / text / accent) built on standard color theory
(monochromatic, analogous, complementary) so a palette can be *derived* from a client's real
brand rather than picked generically. Where the audit already detected a usable brand color,
keep it and build the rest of the palette around it using the same role structure.

Every palette must clear WCAG AA contrast (4.5:1 body text, 3:1 large text/UI) between text and
its background — check this, don't assume it from "looks dark enough."

## Archetype: Professional / trustworthy / corporate

- **Structure**: monochromatic blue-gray, low saturation. Background near-white or near-black
  (pick one, don't mix), surface one step off background, body text near-black/near-white,
  one restrained accent for CTAs only.
- **Example instance**: background `#FFFFFF`, surface `#F1F4F8`, text `#1A2433`, accent `#2E5AAC`.
- **Avoid**: saturated brights as primary colors, more than one accent hue.

## Archetype: Modern / tech / innovative

- **Structure**: near-black or pure-white base with a single high-saturation accent
  (electric blue, violet, or lime) reserved for interactive elements only. High contrast,
  generous negative space.
- **Example instance**: background `#0A0A0A`, surface `#161616`, text `#F5F5F5`, accent `#7C5CFF`.
- **Avoid**: gradients as a crutch for visual interest — use contrast and spacing instead.

## Archetype: Playful / friendly / approachable

- **Structure**: light, warm-neutral background with two complementary or analogous accents
  at medium saturation (not neon) — one for primary actions, one for secondary highlights.
- **Example instance**: background `#FFF8F0`, surface `#FFFFFF`, text `#2B2417`, accents
  `#FF6B4A` and `#3FA796`.
- **Avoid**: pure black text (feels harsh against a warm background) — use a warm dark brown/navy instead.

## Archetype: Luxurious / elegant / premium

- **Structure**: dark, desaturated base (charcoal, deep navy, or near-black) with a single
  metallic-adjacent or jewel-tone accent (gold, burgundy, emerald) used sparingly. Avoid pure
  black — a dark warm gray reads as designed intent, not default.
- **Example instance**: background `#14120F`, surface `#1F1C17`, text `#EDE8DF`, accent `#C9A24B`.
- **Avoid**: more than one accent color, saturated brights anywhere in the palette.

## Archetype: Bold / energetic / confident

- **Structure**: high-contrast complementary pair, one dominant one accent (roughly 90/10
  split of usage, never 50/50). Background can be the dominant bold color or a neutral that
  lets the bold color pop as accent.
- **Example instance**: background `#111111`, surface `#1C1C1C`, text `#FFFFFF`, accent `#FF3B30`.
- **Avoid**: two competing saturated hues fighting for attention — pick one hero color.

## Archetype: Calm / wellness / minimal

- **Structure**: analogous low-saturation palette in the green-blue or green-neutral range.
  Very light background, minimal contrast between background/surface, one muted accent.
- **Example instance**: background `#F6F8F5`, surface `#EDF1EA`, text `#33403A`, accent `#6E9B85`.
- **Avoid**: pure white (reads clinical, not calm) and saturated accents.

## Archetype: Warm / organic / natural

- **Structure**: earth-tone analogous palette (terracotta, sand, olive, clay) on a warm
  off-white or cream background. Accent should be the most saturated earth tone in the set,
  not an unrelated hue.
- **Example instance**: background `#F7F1E8`, surface `#EFE4D3`, text `#3B2E22`, accent `#B0532F`.
- **Avoid**: cool grays or blues — they break the organic feel even at low saturation.

## Archetype: Creative / artistic / expressive

- **Structure**: the one archetype where a bolder multi-color approach is appropriate —
  triadic or split-complementary, used in distinct blocks/sections rather than blended.
  Neutral background lets the color blocks read as intentional, not chaotic.
- **Example instance**: background `#FAFAFA`, surface blocks in `#FF5C8A`, `#4ADEDE`, `#FFD23F`
  used as section accents, text `#111111`.
- **Avoid**: applying all colors uniformly across the whole page — reserve variety for distinct
  content blocks so it reads as design, not noise.

## Choosing an archetype

Match against the personality/voice traits from the audit's brand-tone analysis (e.g.
"professional, trustworthy" → Professional archetype; "playful, energetic" → blend Playful and
Bold). If multiple archetypes are close, prefer the one that best preserves the client's
*existing* detected color palette — evolving a real brand color into the nearest matching
structure beats replacing it outright.
