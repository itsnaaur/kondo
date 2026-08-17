// Task 3.3. Build plan §6.4's "deterministic layer owns the stylesheet" — the load-bearing half
// of the token split. A model (Task 3.4) writes markup only; this module writes CSS,
// deterministically, from resolved design tokens (Palette + TemplateTokens), with zero AI
// involved. Its output is a plain CSS string, handed to lib/templates/shell.ts's existing
// `renderShell({ css, ... })` — already the working pattern every template's own styles.ts
// return value feeds today — so `Concept.html` (the Prisma `Concept.html` column) stays one
// self-contained string with everything inlined in a single `<style>` block, exactly as §6.4
// requires. No change needed to shell.ts for this to work.
//
// FOUR CONSTRAINTS FROM THE TASK, ADDRESSED DIRECTLY:
//
// 1. CONTRAST GUARANTEED BY CONSTRUCTION, NOT CHECKED AFTER. The central design decision below:
// `color` is NEVER set on a typographic element on its own (h1-h6/p/a set font properties and
// `color: inherit` only). Colour only ever appears in two shapes, both provably safe:
//   (a) a `.surface-*` class that sets `background` and `color` TOGETHER, as one atomic pair —
//       each one exactly one of Task 1.6/1.6a/1.6b's 12 AA-validated Palette pairs (the
//       canonical list, now lib/design/validated-text-pairs.ts — see constraint 2 below). Safe
//       regardless of where it's nested, since it never relies on an ambient colour it didn't
//       itself declare.
//   (b) a colour utility (`.text-muted`, `.text-accent`, `.btn--outline`) nested UNDER the one
//       specific `.surface-*` selector where that exact pairing is validated — e.g.
//       `.surface-mist .text-accent`, since `accent` is validated as text only against `mist`,
//       never any other surface. Outside that selector the class has no rule at all, and the
//       element falls back to whatever ambient surface colour it already inherited — which is
//       itself always already safe, never a broken pairing, just a plainer one.
// Ordinary text always inherits its colour from the nearest ancestor `.surface-*`, via CSS's own
// inheritance — a markup author cannot produce an invalid text-on-background pairing through
// normal use, because there is no free-floating "set this text colour" utility outside those two
// shapes. This is verified, not just designed this way — see this task's own log entry's
// per-pair correspondence table: exactly the 12 validated pairs are emitted by the CSS below, no
// more, no fewer, checked by reading every rule that sets `color` in this file.
//
// 2. DETERMINISTIC. A pure string template over `input.palette`/`input.tokens` fields plus a
// small number of named, fixed constants (MAXW/GUTTER/SECTION defaults below) — no Date.now(),
// no Math.random(), no reliance on object key iteration order (every field is referenced by
// name, never looped over a dictionary). Same input, byte-identical output, every call — this
// task's own done-when includes a repeated-call determinism check.
//
// 3. THE CLASS VOCABULARY IS THE CONTRACT WITH 3.4. Every class this module defines is
// documented in CLASS_VOCABULARY below — a real, exported list, not just a comment, so 3.4's own
// prompt-building code can interpolate it directly into whatever instructs the model, and the
// documentation and the actual contract can never drift apart. The `--kebab-case` CSS custom
// property names (`--accent`, `--font-body`, etc.) are NOT new — they're the same names the
// three now-doomed templates (lib/templates/{ledger,showcase,atlas}/styles.ts, all deleted in
// `3.8`) already used to bind resolved Palette/TemplateTokens values to CSS, carried forward
// deliberately before that deletion — same principle as `3.2`'s vertical list rescuing those
// templates' own `industries[]` words before they're gone too. The CLASS names (`.surface-*`,
// `.btn--*`, `.card`, ...) are new: the old templates' `.tl-*`/`.sc-*`/`.at-*` BEM vocabulary was
// template-specific markup structure (hero variants, nav, cta panels), not something a
// semantic-HTML-writing model in `3.4` should inherit.
//
// 4. PICKHUE CARRY-FORWARD (Phase 1 sign-off, item 3) — not fixed here, per instruction, but
// this is the task where it becomes visible in real output. See this task's own log entry for
// what BC Security's and Propell's actual generated stylesheets look like: both currently
// resolve through `buildPalette`'s fallback slate-indigo hue (`FALLBACK_HUE = 222`), not their
// real navy brand colour, because `pickHue`'s `l < 26` floor rejects both (`#024470` at L≈22%,
// `#0e1e39` at L≈14%) despite both being real, high-confidence, sitewide-consistent brand
// colours. The stylesheet this module generates for them is fully AA-safe regardless (the
// fallback hue runs through the exact same corpus-validated derivation every hue does) — the
// cost is entirely a branding cost, not a safety one: both clients get a generic, competent
// slate-indigo page instead of one that actually looks like their own brand.

import type { Palette } from "@/lib/content/normalize-brand-colors";
import type { TemplateTokens } from "./resolve-tokens";

export type StylesheetInput = {
  palette: Palette;
  tokens: TemplateTokens;
};

// Deliberate, disclosed universal defaults — NOT derived from any per-client token, since
// nothing upstream (2.2-3.2) supplies page-layout breakpoints; TemplateTokens has no maxw/
// gutter fields at all. Chosen near the three real (3.8-doomed) templates' own independently-
// hardcoded --maxw values (ledger 1280px, showcase 1320px, atlas 1240px) — a single reasonable
// default rather than a fourth arbitrary number invented from nothing.
const MAXW_DEFAULT = "1280px";
const GUTTER_DEFAULT = "clamp(18px, 3.4vw, 44px)";

// Section vertical-rhythm base, scaled by the real `bandMultiplier` token. Deliberately a
// single flat rule, not the old templates' per-section `scaledBand(min, vwCoefficient, max,
// multiplier)` system (lib/design/resolve-tokens.ts's own `scaledBand`) — that needs a distinct
// min/vw/max triple per section (hero band vs. a smaller content band), and no task through 3.2
// has real section markup yet to tune those against. A real per-section rhythm system is 3.4's
// own concern once real section structure exists to tune it against; this generator gives it one
// working, always-safe default to start from rather than inventing per-section numbers with
// nothing to check them against.
const SECTION_BASE_PX = 64;

// The contract with Task 3.4 — every class this module defines, with what it does and, for the
// scope-limited colour utilities, exactly where it's safe to use. 3.4's own prompt-construction
// code should read this list directly rather than re-deriving it from the CSS text, so the
// documentation a model is given and the actual rules below can never say two different things.
export const CLASS_VOCABULARY: { className: string; description: string }[] = [
  { className: ".container", description: "Centers content, caps width, adds side gutters. Wrap page-level content in this once per section." },
  { className: ".section", description: "Vertical rhythm spacing (top/bottom padding), scaled to this client's resolved style bundle. Apply to each major page section." },
  { className: ".surface-paper", description: "Default light surface: white background, ink text. This is the page's own default — only write it explicitly when nesting a different surface inside paper again." },
  { className: ".surface-mist", description: "Pale tinted surface, for alternating section backgrounds. The ONLY surface where .text-accent and .btn--outline are colour-safe." },
  { className: ".surface-accent-soft", description: "Pale accent-tinted surface, for a highlighted callout or feature panel." },
  { className: ".surface-accent", description: "Solid brand-accent surface with high-contrast text. For one bold, attention-grabbing band — not a routine section background." },
  { className: ".surface-secondary", description: "Solid secondary-brand surface with high-contrast text. A less dominant alternative to .surface-accent." },
  { className: ".surface-deep", description: "Dark surface, for a footer, closing call-to-action, or another deliberately dark section." },
  { className: ".surface-deep-soft", description: "Slightly lighter dark surface, for a card or panel nested inside .surface-deep." },
  { className: ".surface-destructive", description: "Solid error/warning surface. Rare on a marketing page — for an explicit warning callout only." },
  { className: ".text-muted", description: "Secondary, de-emphasised text colour. Only takes effect nested inside .surface-paper, .surface-mist, or .surface-accent-soft — has no rule, and no visible effect, anywhere else." },
  { className: ".text-accent", description: "Brand-accent-coloured text. Only takes effect nested inside .surface-mist — has no rule, and no visible effect, anywhere else." },
  { className: ".btn.btn--solid", description: "Primary call-to-action button. Sets its own background and text colour together — safe on any surface." },
  { className: ".btn.btn--secondary", description: "Secondary call-to-action button. Sets its own background and text colour together — safe on any surface." },
  { className: ".btn.btn--outline", description: "Outline/ghost button (transparent background). Only colour-safe nested inside .surface-mist — has no colour rule, and renders as an unstyled outline in the surface's own text colour, anywhere else." },
  { className: ".card", description: "Bordered, optionally-shadowed container. Sets no colour of its own — pair with a .surface-* class to give it a background." },
  { className: ".card--elevated", description: "Modifier on .card — swaps the flat border for a stronger drop shadow." },
  { className: ".img", description: "Applies the resolved image corner radius. Put on <img> tags." },
  { className: ".pill", description: "Small rounded badge/tag shape. Sets no colour of its own — pair with a .surface-* class." },
];

export function generateStylesheet(input: StylesheetInput): string {
  const { palette: p, tokens: t } = input;
  return `:root {
  --accent: ${p.accent};
  --accent-ink: ${p.accentInk};
  --accent-soft: ${p.accentSoft};
  --deep: ${p.deep};
  --deep-soft: ${p.deepSoft};
  --mist: ${p.mist};
  --ink: ${p.ink};
  --ink-muted: ${p.inkMuted};
  --line: ${p.line};
  --paper: ${p.paper};
  --secondary: ${p.secondary};
  --on-secondary: ${p.onSecondary};
  --ring: ${p.ring};
  --destructive: ${p.destructive};
  --on-destructive: ${p.onDestructive};
  --font-body: ${t.fontBody};
  --font-heading: ${t.fontHeading};
  --radius-btn: ${t.radiusBtn};
  --radius-card: ${t.radiusCard};
  --radius-image: ${t.radiusImage};
  --radius-pill: ${t.radiusPill};
  --shadow-card: ${t.shadowCard};
  --shadow-elevated: ${t.shadowElevated};
  --border-weight: ${t.borderWeight};
  --surface-blur: ${t.surfaceBlur};
  --focus-ring-width: ${t.focusRingWidth};
  --band-multiplier: ${t.bandMultiplier};
  --maxw: ${MAXW_DEFAULT};
  --gutter: ${GUTTER_DEFAULT};
}

body {
  margin: 0;
  background: var(--paper);
  color: var(--ink);
  font-family: var(--font-body);
  font-size: 17px;
  line-height: 1.6;
}

a { color: inherit; }

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-heading);
  margin: 0;
  line-height: 1.15;
  font-weight: 600;
}

p { margin: 0; }

:focus-visible {
  outline: var(--focus-ring-width) solid var(--ring);
  outline-offset: 2px;
}

/* ---------- layout ---------- */

.container {
  width: 100%;
  max-width: var(--maxw);
  margin-inline: auto;
  padding-inline: var(--gutter);
}

.section {
  padding-block: calc(${SECTION_BASE_PX}px * var(--band-multiplier));
}

/* ---------- surfaces — background and text colour set together, each one an exact
   Task 1.6-validated pair. Nothing outside this block ever sets color on its own. ---------- */

.surface-paper { background: var(--paper); color: var(--ink); }
.surface-mist { background: var(--mist); color: var(--ink); }
.surface-accent-soft { background: var(--accent-soft); color: var(--ink); }
.surface-accent { background: var(--accent); color: var(--accent-ink); }
.surface-secondary { background: var(--secondary); color: var(--on-secondary); }
.surface-deep { background: var(--deep); color: var(--paper); }
.surface-deep-soft { background: var(--deep-soft); color: var(--paper); }
.surface-destructive { background: var(--destructive); color: var(--on-destructive); }

/* Muted/accent text — scoped to only the surfaces where that exact pairing is validated. */
.surface-paper .text-muted,
.surface-mist .text-muted,
.surface-accent-soft .text-muted { color: var(--ink-muted); }
.surface-mist .text-accent { color: var(--accent); }

/* ---------- buttons — each variant is a self-contained validated pair, safe on any surface,
   except .btn--outline, which is transparent and only colour-safe where scoped below. ---------- */

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5em;
  padding: 0.85em 1.6em;
  border-radius: var(--radius-btn);
  border: var(--border-weight) solid transparent;
  font-family: var(--font-body);
  font-weight: 600;
  font-size: 1rem;
  line-height: 1;
  text-decoration: none;
  cursor: pointer;
}
.btn--solid { background: var(--accent); color: var(--accent-ink); }
.btn--secondary { background: var(--secondary); color: var(--on-secondary); }
.surface-mist .btn--outline { background: transparent; color: var(--accent); border-color: var(--accent); }

/* ---------- cards, images, pills — shape only, no colour declared. ---------- */

.card {
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
  border: var(--border-weight) solid var(--line);
}
.card--elevated { box-shadow: var(--shadow-elevated); border: none; }

.img { border-radius: var(--radius-image); }

.pill {
  display: inline-block;
  padding: 0.3em 0.9em;
  border-radius: var(--radius-pill);
}
`;
}
