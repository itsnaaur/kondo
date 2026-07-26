# Interpreting feeling-words in the brief

Clients describe what they want in feelings, not specs — "make it look trustworthy,"
"professional but not generic," "I want it to feel premium." These words don't map to one
fixed look; they map to underlying *perceptual mechanisms*. Reasoning from the mechanism, not
from a memorized stereotype of the word, is what keeps the result from defaulting to the most
common (and now most recognizable-as-AI) execution of that word.

The brief describes the **desired future state**. The audit's detected brand tone describes the
**current state** of the old site. When they conflict — e.g. the brief asks for "modern" but the
current site reads as dated — the brief wins; the audit is context for how far to move, not a
ceiling on it.

## What actually reads as each feeling, and why

**Trustworthy** comes from consistency and restraint, not from any specific color:
- Repeated, aligned patterns (consistent spacing units, consistent corner radius, consistent
  heading treatment) — inconsistency reads as sloppy, and sloppy reads as untrustworthy.
- A limited, deliberate color palette (2-3 colors used consistently) rather than many colors
  used loosely.
- Specific, verifiable claims in copy over vague superlatives — "Licensed and insured since
  2009" reads as more trustworthy than "The best in the business."
- Moderate contrast and stable, well-established typography — nothing that reads as
  experimental or trend-chasing, which undercuts a sense of stability.

**Professional** comes from polish and appropriate information density:
- Correct, consistent formatting throughout (heading hierarchy actually followed, not just
  visually similar).
- Content density matched to the business type — too sparse reads as unfinished, too dense
  reads as amateur/cluttered. Neither reads as professional.
- Restrained color use and clean alignment — professional is closer to "nothing to notice" than
  "impressive to look at."

**Modern** comes from spacing, structure, and absence of dated conventions:
- Generous, intentional whitespace (not padding for its own sake — see the anti-patterns file
  on default wide margins).
- Flat design — no skeuomorphic textures, no drop-shadow-on-everything.
- Asymmetric or varied section layouts rather than a rigid, uniform grid on every section.
- Sans-serif or a deliberate, contemporary serif — never a decorative/script typeface for body
  content.

**Approachable / friendly** comes from softness and specificity, not just warm color:
- Rounded corners and softer shapes at a *consistent* radius (not the blanket-apply anti-pattern
  — pick one radius scale and use it deliberately).
- Conversational, specific copy ("We'll call you back the same day" beats "Customer-first
  service").
- Larger touch targets and looser line-height — a cramped layout reads as unfriendly regardless
  of color.

**Luxurious / premium** comes from restraint and scale, not gold and serif fonts alone:
- Negative space is the single strongest luxury signal — cramped premium is a contradiction.
- One color story, used with confidence (see the Luxurious archetype's single-accent rule).
- Large-scale typography contrast between a big, quiet heading and small, precise body text.
- Slower motion (see layout-patterns.md) — luxury doesn't rush.

**Bold / confident** comes from decisiveness, not just bright color:
- Large-scale typography that commits to one strong statement per section rather than hedging
  with multiple competing messages.
- High contrast and a single dominant color used with intent (90/10 dominant/accent split, not
  a 50/50 fight for attention).
- Copy that states things directly ("We fix it right the first time") rather than hedging
  ("We aim to try to provide quality service").

**Calm / wellness** comes from softness and pacing:
- Low-contrast, analogous color relationships (see the Calm archetype).
- Slow or no motion, generous whitespace, fewer simultaneous elements per view.
- Longer line-height and paragraph spacing — density itself reads as stressful regardless of
  color choice.

## Handling explicit negations ("but not generic," "not too corporate," "avoid boring")

When a brief pairs a feeling word with an explicit rejection of its most common execution —
"professional but not generic," "trustworthy but not boring/corporate," "modern but not cold" —
treat that as a **hard constraint**, not a nice-to-have:

1. Identify the underlying feeling (professional, trustworthy, etc.) and apply the mechanisms
   above — the feeling itself is still the goal.
2. Do **not** default to the "Example instance" color/type combination given in
   color-palettes.md / typography.md for that archetype — those are illustrative anchors to show
   the *structure*, not a palette to reuse verbatim. Pick a different, still-valid instance of
   the same structure (same role-based formula, different actual hue/font choice).
3. Cross-check against anti-patterns.md and make sure none of them crept in under the cover of
   the "safe" version of the feeling word — a navy-and-checkmarks "professional" site or a
   beige-and-Georgia "trustworthy" site are exactly the generic outcomes the client is asking to
   avoid, even though they technically match the archetype.
4. When multiple feeling-words are given together (e.g. "trustworthy AND modern AND
   approachable"), blend the underlying mechanisms rather than picking one archetype and
   ignoring the others — e.g. trustworthy's consistency + modern's whitespace + approachable's
   softer shapes, combined into one coherent direction, rather than three archetypes stacked
   incoherently.
