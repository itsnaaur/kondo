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
  // Task 3.5a. TemplateTokens' own fontBody/fontHeading are already-resolved font-STACK strings
  // (e.g. `"Playfair Display", ui-sans-serif, ...`) — the raw googleFontsUrl a browser actually
  // needs to fetch the font files is a different value, TypographyResolution's own field, lost
  // by the time it reaches TemplateTokens. Threaded through here directly rather than
  // re-deriving it, so this module can emit the one real @import build plan §6.4's "self-
  // contained <style> block" was always supposed to carry — see this task's own log entry for
  // why this, not a <link> in 3.4's markup or a separate 3.6 task, is where it belongs.
  googleFontsUrl: string;
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
  { className: ".section", description: "Vertical rhythm spacing (top/bottom padding), scaled to this client's resolved style bundle. Apply to each major page section — and ALTERNATE its paired .surface-* class between adjacent sections (e.g. .surface-paper, then .surface-mist, then .surface-paper again), not the same surface throughout. A page where every section shares one background reads as flat and undifferentiated, not calm." },
  { className: ".surface-paper", description: "Default light surface: white background, ink text. This is the page's own default — only write it explicitly when nesting a different surface inside paper again." },
  { className: ".surface-mist", description: "Pale tinted surface, for alternating section backgrounds. The ONLY surface where .text-accent and .btn--outline are colour-safe — including on a .stat's <dt> numeral or on a link, not just plain body text." },
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
  { className: ".card", description: "Filled card container — its own tinted background and text colour (self-contained, safe on any surface), plus radius/shadow/border. Use for every card in a .grid; a card with no fill disappears into the page it sits on." },
  { className: ".card--elevated", description: "Modifier on .card — swaps the flat border for a stronger drop shadow." },
  { className: ".card--dark", description: "Modifier on .card for use inside a .surface-deep section — swaps .card's own light fill for a dark one (self-contained pair, still safe anywhere)." },
  { className: ".img", description: "Applies the resolved image corner radius. Put on <img> tags." },
  { className: ".pill", description: "Small rounded badge/tag shape. Sets no colour of its own — pair with a .surface-* class, or use .pill--accent." },
  { className: ".pill--accent", description: "Modifier on .pill — fills it with the brand accent colour (self-contained pair, safe on any surface). Use for a highlighted badge or tag." },
  { className: ".tile-accent", description: "Small square accent-filled tile (self-contained pair, safe on any surface) — a fixed-size container for a single short number, initial, or short label. Use for a row of feature/benefit markers instead of leaving icon-shaped space empty." },
  // Task 3.7c. Harvested from the three now-doomed templates' own composition CSS (lib/templates/
  // {atlas,ledger,showcase}/styles.ts) before 3.8 deletes them — see this task's own log entry for
  // the full inventory. Expressed against these same resolved tokens, not the templates' hardcoded
  // values, and under new semantic names, never the templates' own BEM classes (.at-*/.tl-*/.sc-*
  // were template-specific markup structure, not a vocabulary this model should inherit). None of
  // these six set `color`/`background` — every one is either pure layout (.grid, .split), pure
  // shape (.media-*), or a CSS custom-property modifier that only takes effect on a .media-*
  // element (.obj-*) — so the 191-palette contrast gate and 3.5's structural colour-safety check
  // are untouched by construction, the same way .card/.pill already were.
  { className: ".grid", description: "Responsive multi-column grid. Wraps a row of .card items (a service/feature card grid), logo tiles (a trust strip), or .stat items (a stat row) into columns that reflow down to one on narrow screens." },
  { className: ".split", description: "Even two-column layout for paired content — a CTA panel (ask + contact details), an about section (copy + image), anything that reads as two blocks side by side. Collapses to one column on narrow screens." },
  { className: ".stat", description: "A single statistic. Apply to a <dl> containing exactly one <dt> (the number, e.g. \"200+\") and one <dd> (its label, e.g. \"Projects completed\"). Put several inside a .grid for a stat row." },
  { className: ".media-16-9", description: "Crops an <img> to a 16:9 frame, filling it (the image is cropped, never distorted). Use for wide hero/feature photography." },
  { className: ".media-4-3", description: "Crops an <img> to a 4:3 frame, filling it. Use for standard landscape photography." },
  { className: ".media-1-1", description: "Crops an <img> to a square frame, filling it. Use for logo tiles, headshots, or a uniform gallery grid." },
  { className: ".media-3-4", description: "Crops an <img> to a 3:4 portrait frame, filling it. Use for team headshots or portrait-oriented photography." },
  { className: ".obj-top", description: "Combine with a .media-* class: shifts that image's visible crop toward its top edge instead of centring it. Use when the image manifest's focalPoint.y for that image is below ~0.33." },
  { className: ".obj-bottom", description: "Combine with a .media-* class: shifts that image's visible crop toward its bottom edge. Use when the image manifest's focalPoint.y for that image is above ~0.66." },
  { className: ".obj-left", description: "Combine with a .media-* class: shifts that image's visible crop toward its left edge. Use when the image manifest's focalPoint.x for that image is below ~0.33." },
  { className: ".obj-right", description: "Combine with a .media-* class: shifts that image's visible crop toward its right edge. Use when the image manifest's focalPoint.x for that image is above ~0.66. Omit every .obj-* class when a focalPoint is centred (~0.33-0.66 on both axes) or null." },
  // Task 3.7g. h1-h6 already carry a real, differentiated type scale (size/weight/line-height per
  // level) directly — no class needed, just use the semantically-correct heading level. These
  // three fill the gaps a bare heading tag can't: an intro paragraph larger than body copy, a
  // small label above a heading, and fine print. None declare colour — compose with .text-muted/
  // .text-accent for colour, exactly like every other shape-only utility in this list.
  { className: ".lede", description: "Larger intro/lead paragraph, for the sentence directly under a heading that needs more presence than body copy. Sets no colour of its own." },
  { className: ".eyebrow", description: "Small uppercase label above a heading (e.g. \"WHY CHOOSE US\"). Always carries a short accent-coloured marker before the text — this is the one place accent colour is guaranteed regardless of surface. Sets no text colour of its own — compose with .text-muted or .text-accent." },
  { className: ".caption", description: "Small fine-print text — an image credit, a footnote, a terms line. Sets no colour of its own." },
  { className: ".section--accent-top", description: "Modifier on .section — adds a thin accent-coloured bar across the top of the section, as a deliberate divider between it and whatever comes before it. Use sparingly, for one or two sections that deserve emphasis, not every section." },
];

export function generateStylesheet(input: StylesheetInput): string {
  const { palette: p, tokens: t } = input;
  return `@import url("${input.googleFontsUrl}");

:root {
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
  --obj-x: 50%;
  --obj-y: 50%;
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

/* ---------- type scale — Task 3.7g. Real per-level differentiation: harvested from all three
   doomed templates' own type scales (they independently converged on the same shape — a big
   display size, a smaller h2, card/row headings around 1.1-1.4rem at weight 600, body text left
   at its own default weight) rather than every heading relying on the browser's own UA default,
   which is why h3 (a card title) used to land within a couple of px of body copy. No colour set
   here — same as before, colour only ever comes from an ancestor .surface-* or a scoped utility. ---------- */

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-heading);
  margin: 0;
}
h1 { font-size: clamp(2.25rem, 5vw, 3.75rem); line-height: 1.05; letter-spacing: -0.02em; font-weight: 700; }
h2 { font-size: clamp(1.75rem, 3.5vw, 2.5rem); line-height: 1.1; letter-spacing: -0.015em; font-weight: 700; }
h3 { font-size: clamp(1.15rem, 1.8vw, 1.375rem); line-height: 1.25; letter-spacing: -0.01em; font-weight: 600; }
h4 { font-size: 1.15rem; line-height: 1.3; font-weight: 600; }
h5, h6 { font-size: 0.95rem; line-height: 1.35; font-weight: 600; }

p { margin: 0; }

.lede { font-size: clamp(1.05rem, 1.6vw, 1.25rem); line-height: 1.6; font-weight: 400; }

.eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
/* A decorative rule, not text — background is always safe here regardless of surface, the same
   reasoning .card's own border already relies on. This is the one place accent colour shows up
   unconditionally, everywhere, not just inside .surface-mist. */
.eyebrow::before {
  content: "";
  width: 20px;
  height: 2px;
  background: var(--accent);
  flex: none;
}

.caption { font-size: 0.8125rem; line-height: 1.5; }

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

/* ---------- cards, images, pills ----------
   Task 3.7g: .card now carries a real, self-contained fill (mist/ink — already one of the 12
   validated pairs, reused here rather than adding a 13th) instead of setting no colour at all. A
   card with the exact same background as the page it sits on was the real bug this fixes — shadow
   and a hairline border alone aren't enough separation, confirmed by the human's own real render
   review. .card--dark is the same self-contained shape for a .surface-deep context (paper/deep-
   soft, also already validated), with its border colour swapped to a translucent white the same
   way atlas's own dark-context card did — --line is tuned for a light surface and reads wrong on
   a dark one. ---------- */

.card {
  background: var(--mist);
  color: var(--ink);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
  border: var(--border-weight) solid var(--line);
}
.card--elevated { box-shadow: var(--shadow-elevated); border: none; }
.card--dark {
  background: var(--deep-soft);
  color: var(--paper);
  border-color: rgb(255 255 255 / 0.14);
}

.img { border-radius: var(--radius-image); }

.pill {
  display: inline-block;
  padding: 0.3em 0.9em;
  border-radius: var(--radius-pill);
}
.pill--accent { background: var(--accent); color: var(--accent-ink); }

.tile-accent {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.75em;
  height: 2.75em;
  border-radius: var(--radius-card);
  background: var(--accent);
  color: var(--accent-ink);
  font-weight: 600;
}

.section--accent-top { border-top: 3px solid var(--accent); }

/* ---------- Task 3.7c: composition vocabulary harvested from the doomed templates ----------
   Grid, split, stat, media, obj-* — none of these declare color or background, so they need no
   entry in the 12-pair validated-text-pairs correspondence and cannot affect the 191-palette
   contrast gate. See CLASS_VOCABULARY above for the full per-class contract with 3.4. ---------- */

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(260px, 100%), 1fr));
  gap: clamp(16px, 2.4vw, 28px);
}

.split {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: clamp(24px, 4vw, 64px);
  align-items: center;
}
@media (max-width: 720px) {
  .split { grid-template-columns: minmax(0, 1fr); }
}

.stat dt {
  margin: 0;
  font-size: clamp(2rem, 4vw, 3rem);
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1;
}
.stat dd {
  margin: 0.5em 0 0;
  font-size: 0.9rem;
  line-height: 1.4;
}

/* Fixed-ratio, filled crop. object-position reads --obj-x/--obj-y, which default to centred
   (50% 50%, set in :root above) and are only ever moved by the .obj-* modifiers below — so a
   .media-* image with no .obj-* class behaves exactly like a plain object-fit: cover crop. */
.media-16-9, .media-4-3, .media-1-1, .media-3-4 {
  width: 100%;
  height: auto;
  display: block;
  object-fit: cover;
  object-position: var(--obj-x) var(--obj-y);
}
.media-16-9 { aspect-ratio: 16 / 9; }
.media-4-3 { aspect-ratio: 4 / 3; }
.media-1-1 { aspect-ratio: 1 / 1; }
.media-3-4 { aspect-ratio: 3 / 4; }

.obj-top { --obj-y: 18%; }
.obj-bottom { --obj-y: 82%; }
.obj-left { --obj-x: 18%; }
.obj-right { --obj-x: 82%; }
`;
}
