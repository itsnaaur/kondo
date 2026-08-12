import type { Palette } from "../../content/normalize-brand-colors";

export function ledgerStyles(p: Palette): string {
  return `
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
  --maxw: 1280px;
  --gutter: clamp(18px, 3.4vw, 44px);
  --band: clamp(60px, 8vw, 112px);
}

*, *::before, *::after { box-sizing: border-box; }

html { -webkit-text-size-adjust: 100%; }

body.tpl-ledger {
  margin: 0;
  background: var(--paper);
  color: var(--ink);
  font-family: "Instrument Sans", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  font-size: 17px;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

.tpl-ledger img { max-width: 100%; display: block; }

.tpl-ledger a { color: inherit; }

.tl-wrap {
  width: 100%;
  max-width: var(--maxw);
  margin: 0 auto;
  padding-left: var(--gutter);
  padding-right: var(--gutter);
}

/* ---------- type ---------- */

.tl-display {
  font-size: clamp(2.4rem, 6.2vw, 4.3rem);
  line-height: 1.04;
  letter-spacing: -0.03em;
  font-weight: 600;
  margin: 0;
  text-wrap: balance;
}

.tl-h2 {
  font-size: clamp(1.75rem, 3.6vw, 2.7rem);
  line-height: 1.1;
  letter-spacing: -0.025em;
  font-weight: 600;
  margin: 0;
  text-wrap: balance;
}

/* The Raven move: the tail of the headline set in an italic serif.
   Applied to the prospect's own tagline, so every page reads as written for them. */
.tl-em {
  font-family: "Newsreader", Georgia, "Times New Roman", serif;
  font-style: italic;
  font-weight: 400;
  letter-spacing: -0.01em;
  color: var(--accent);
}

.tl-eyebrow {
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ink-muted);
  margin: 0 0 18px;
  display: flex;
  align-items: center;
  gap: 12px;
}
.tl-eyebrow::before {
  content: "";
  width: 26px;
  height: 1px;
  background: currentColor;
  opacity: 0.5;
  flex: none;
}

.tl-lede {
  font-size: clamp(1.02rem, 1.7vw, 1.22rem);
  line-height: 1.6;
  color: var(--ink-muted);
  max-width: 62ch;
  margin: 20px 0 0;
}

/* ---------- buttons ---------- */

.tl-btn {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  padding: 14px 24px;
  border-radius: 2px;
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  text-decoration: none;
  border: 1px solid transparent;
  transition: transform 0.15s ease, background-color 0.15s ease, color 0.15s ease;
}
.tl-btn:hover { transform: translateY(-1px); }
.tl-btn--solid { background: var(--accent); color: var(--accent-ink); }
.tl-btn--ghost { border-color: currentColor; opacity: 0.9; }
.tl-btn--ghost:hover { background: var(--ink); color: var(--paper); border-color: var(--ink); }

.tl-actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 34px; }

/* ---------- nav ---------- */

.tl-nav {
  border-bottom: 1px solid var(--line);
  background: var(--paper);
}
.tl-nav__in {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  min-height: 76px;
  padding-top: 14px;
  padding-bottom: 14px;
}
.tl-nav__mark { display: flex; align-items: center; gap: 12px; min-width: 0; }
.tl-nav__logo { max-height: 40px; width: auto; }
.tl-nav__name {
  font-weight: 600;
  font-size: 1.06rem;
  letter-spacing: -0.02em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.tl-nav__links {
  display: flex;
  align-items: center;
  gap: clamp(18px, 2.2vw, 34px);
  margin-left: auto;
}
.tl-nav__links a {
  font-size: 0.94rem;
  font-weight: 500;
  letter-spacing: -0.012em;
  text-decoration: none;
  color: var(--ink);
  padding: 6px 0;
  border-bottom: 1px solid transparent;
  transition: border-color 0.15s ease;
  white-space: nowrap;
}
.tl-nav__links a:hover { border-bottom-color: var(--accent); }

.tl-nav__side { display: flex; align-items: center; gap: 20px; flex: none; margin-left: clamp(20px, 3vw, 44px); }
.tl-nav__tel {
  font-weight: 600;
  font-size: 0.95rem;
  text-decoration: none;
  letter-spacing: -0.01em;
}

/* ---------- hero ---------- */

.tl-hero { position: relative; overflow: hidden; background: var(--mist); }

/* With a photo: full-bleed split. Copy stays aligned to the container's left
   edge, the image runs to the right edge of the viewport, and the two meet
   through a gradient rather than a hard seam. */
.tl-hero--split {
  /* Where the photo begins, as a share of the viewport. Raise to push the
     image further right, lower to widen it. 54% sits just past centre. */
  --hero-split: 62%;
  /* How far the photo reaches back to the LEFT, past the column boundary and
     under the text. This is what physically moves the image left and makes it
     wider — the split above only sets where the text column ends. */
  --hero-reach: 2vw;
  /* How much of the photo's left edge dissolves. Shorter = more photo visible
     and a crisper edge; longer = softer blend but eats picture. */
  --hero-fade: 30%;
  /* Pans the photo inside its frame. Lower slides the picture RIGHT, higher
     slides it LEFT. Independent of --hero-split, which sets the frame. */
  --hero-pan: 18%;
  display: grid;
  grid-template-columns: var(--hero-split) minmax(0, 1fr);
  align-items: center;
  min-height: min(76vh, 700px);
}
.tl-hero__copy {
  padding-block: clamp(52px, 7vw, 92px);
  padding-right: clamp(28px, 3.6vw, 60px);
  padding-left: max(var(--gutter), calc((100vw - var(--maxw)) / 2 + var(--gutter)));
  position: relative;
  z-index: 2;
}
.tl-hero__copy .tl-lede { max-width: 46ch; }

.tl-hero__media {
  position: relative;
  align-self: stretch;
  min-height: 340px;
  margin-left: calc(var(--hero-reach) * -1);
  z-index: 1; /* sits under .tl-hero__copy, which is z-index 2 */
}
.tl-hero__media img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: var(--hero-pan) center;
  /* The seam. The image itself dissolves at its left edge, revealing the band
     behind it — masking, not overlaying. An overlay paints a strip of the
     background colour ON TOP of the photo, which reads as a pale vertical line
     rather than a fade. */
  -webkit-mask-image: linear-gradient(to right,
    rgba(0,0,0,0) 0%,
    rgba(0,0,0,0.03) calc(var(--hero-fade) * 0.2),
    rgba(0,0,0,0.11) calc(var(--hero-fade) * 0.4),
    rgba(0,0,0,0.28) calc(var(--hero-fade) * 0.6),
    rgba(0,0,0,0.6) calc(var(--hero-fade) * 0.8),
    rgba(0,0,0,0.88) calc(var(--hero-fade) * 0.93),
    #000 var(--hero-fade));
  mask-image: linear-gradient(to right,
    rgba(0,0,0,0) 0%,
    rgba(0,0,0,0.03) calc(var(--hero-fade) * 0.2),
    rgba(0,0,0,0.11) calc(var(--hero-fade) * 0.4),
    rgba(0,0,0,0.28) calc(var(--hero-fade) * 0.6),
    rgba(0,0,0,0.6) calc(var(--hero-fade) * 0.8),
    rgba(0,0,0,0.88) calc(var(--hero-fade) * 0.93),
    #000 var(--hero-fade));
}

/* Without a photo — the common case. Dark band with a soft field in the brand
   hue, meant to read as a deliberate treatment rather than a hole. */
.tl-hero--plain { background: var(--deep); color: var(--paper); }
.tl-hero--plain .tl-hero__in {
  padding-top: clamp(66px, 9vw, 116px);
  padding-bottom: clamp(66px, 9vw, 116px);
  position: relative;
  z-index: 1;
}
.tl-hero--plain .tl-hero__copy { padding: 0; max-width: 30ch; }
.tl-hero--plain .tl-lede { color: rgb(255 255 255 / 0.62); max-width: 52ch; }
.tl-hero--plain .tl-em { color: var(--paper); opacity: 0.92; }
.tl-hero--plain .tl-btn--ghost { color: var(--paper); }
.tl-hero--plain .tl-btn--ghost:hover { background: var(--paper); color: var(--deep); border-color: var(--paper); }
.tl-hero--plain .tl-eyebrow { color: rgb(255 255 255 / 0.55); }
.tl-hero__field {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(120% 90% at 88% 12%, color-mix(in srgb, var(--accent) 55%, transparent) 0%, transparent 58%),
    radial-gradient(80% 70% at 96% 96%, color-mix(in srgb, var(--accent) 34%, transparent) 0%, transparent 62%);
  opacity: 0.85;
  pointer-events: none;
}

/* ---------- trust strip ----------
   These were 34px tall, desaturated and at 62% opacity — a treatment that
   makes sense for client logos on an agency site, where the point is "lots of
   them" rather than "these ones". Here they're health funds and accreditations:
   a prospect scanning for whether their insurer is accepted needs to read them,
   and washing out the colour is what makes a Bupa logo stop looking like Bupa.

   Full colour, roughly double the size, each in its own cell of a hairline
   lattice so a row of four and a row of nine both look composed. */

.tl-strip { border-bottom: 1px solid var(--line); background: var(--paper); }
.tl-strip__in { padding-top: clamp(44px, 5vw, 68px); padding-bottom: clamp(44px, 5vw, 68px); }
.tl-strip__label {
  font-size: 0.72rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ink-muted);
  margin: 0 0 clamp(22px, 2.6vw, 32px);
  text-align: center;
}
.tl-strip__row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(148px, 100%), 1fr));
  gap: 1px;
  background: var(--line);
  border: 1px solid var(--line);
}
.tl-strip__row > span {
  background: var(--paper);
  display: grid;
  place-items: center;
  padding: clamp(20px, 2.4vw, 30px) clamp(14px, 1.8vw, 22px);
  min-height: 104px;
  transition: background-color 0.18s ease;
}
.tl-strip__row > span:hover { background: var(--mist); }
.tl-strip__row img {
  max-height: 62px;
  max-width: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
}
/* Text-form credentials ("AHPRA registered") for sites with no partner logos to crawl —
   same strip, a lighter-weight treatment than the logo tiles since there's no image to
   give the pill its own visual weight. */
.tl-credentials { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; }
.tl-credentials > span {
  font-size: 0.82rem; color: var(--ink-muted); padding: 8px 16px;
  border: 1px solid var(--line); border-radius: 999px; background: var(--paper);
}

/* ---------- statement band ---------- */

.tl-statement { background: var(--mist); }
.tl-statement__in { padding-top: var(--band); padding-bottom: var(--band); }
.tl-statement__body {
  font-size: clamp(1.25rem, 2.5vw, 1.85rem);
  line-height: 1.42;
  letter-spacing: -0.02em;
  max-width: 34ch;
  margin: 0;
  font-weight: 500;
}
.tl-statement__grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: clamp(28px, 5vw, 72px);
  align-items: start;
}
.tl-statement__aside {
  font-size: 1rem;
  line-height: 1.65;
  color: var(--ink-muted);
  margin: 0;
  padding-top: 8px;
}

/* ---------- services ledger (signature) ---------- */
/* A services list is an index, not a sequence — so it's set as a ruled ledger,
   not numbered cards. Holds its shape from 4 rows to 20. */

.tl-services__in { padding-top: var(--band); padding-bottom: var(--band); }
.tl-services__head { margin-bottom: clamp(34px, 4vw, 56px); max-width: 40ch; }

.tl-ledger { border-top: 1px solid var(--line); }
.tl-row {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.35fr);
  gap: clamp(16px, 4vw, 56px);
  align-items: baseline;
  padding: 22px 4px;
  border-bottom: 1px solid var(--line);
  transition: background-color 0.18s ease, padding-left 0.18s ease;
}
.tl-row:hover { background: var(--accent-soft); padding-left: 14px; }
.tl-row__name {
  font-size: clamp(1.05rem, 1.9vw, 1.28rem);
  font-weight: 600;
  letter-spacing: -0.022em;
  line-height: 1.25;
  margin: 0;
}
.tl-row__desc {
  margin: 0;
  color: var(--ink-muted);
  font-size: 0.97rem;
  line-height: 1.58;
}

/* ---------- deep band ---------- */

.tl-deep { background: var(--deep); color: var(--paper); }
.tl-deep__in { padding-top: var(--band); padding-bottom: var(--band); }
.tl-deep .tl-eyebrow { color: rgb(255 255 255 / 0.55); }
.tl-deep .tl-lede { color: rgb(255 255 255 / 0.66); }
.tl-deep__head { max-width: 44ch; margin-bottom: clamp(34px, 4vw, 52px); }

/* Columns rather than a fixed grid, so each photo keeps its own proportions.
   The forced 4:3 cropped every portrait through its subject. */
.tl-gallery { columns: 2; column-gap: 14px; }
.tl-gallery figure {
  break-inside: avoid;
  margin: 0 0 14px;
  border-radius: 3px;
  overflow: hidden;
  background: var(--deep-soft);
}
.tl-gallery img { width: 100%; height: auto; display: block; }

.tl-facts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(200px, 100%), 1fr));
  gap: 1px;
  background: rgb(255 255 255 / 0.14);
  border: 1px solid rgb(255 255 255 / 0.14);
}
.tl-facts div { background: var(--deep); padding: 26px 24px; }
.tl-facts dt {
  font-size: 0.72rem;
  letter-spacing: 0.13em;
  text-transform: uppercase;
  color: rgb(255 255 255 / 0.5);
  margin: 0 0 8px;
}
.tl-facts dd {
  margin: 0;
  font-size: 1.06rem;
  font-weight: 500;
  letter-spacing: -0.015em;
  line-height: 1.45;
}
.tl-facts a { text-decoration: none; }

/* ---------- testimonials ----------
   Was a grid of bordered cards with an accent rule on top — the one card
   treatment left in a template built entirely from hairlines and ruled rows.
   Set in the serif italic instead, the face Ledger already uses for its
   headline accent, stacked with room to breathe and alternately offset. The
   type does the work the borders were doing. */

.tl-quotes__in { padding-top: var(--band); padding-bottom: var(--band); }
.tl-quotes__list { margin-top: clamp(34px, 4.4vw, 60px); }
.tl-quote {
  margin: 0;
  padding-block: clamp(26px, 3.2vw, 44px);
  border-top: 1px solid var(--line);
  max-width: 46ch;
}
.tl-quote:last-child { border-bottom: 1px solid var(--line); }
/* Alternate the offset so a stack of six doesn't read as a single column of
   left-aligned paragraphs. */
.tl-quote:nth-child(even) { margin-left: auto; }
.tl-quote p {
  margin: 0 0 18px;
  font-family: "Newsreader", Georgia, "Times New Roman", serif;
  font-style: italic;
  font-weight: 400;
  font-size: clamp(1.2rem, 2.2vw, 1.72rem);
  line-height: 1.32;
  letter-spacing: -0.014em;
}
.tl-quote footer {
  font-size: 0.76rem;
  letter-spacing: 0.13em;
  text-transform: uppercase;
  color: var(--ink-muted);
}
.tl-quote footer b { color: var(--ink); font-weight: 600; }

/* ---------- closing cta ----------
   A flat accent stripe with a heading left and buttons right has no hierarchy,
   and it sat directly above the dark footer — two solid bands closing the page.

   The deep band already carries the contact facts, so repeating them here
   would be filler. Instead the phone number itself is set at display size: for
   a local business the next step is a call, so the number is the call to
   action rather than something buried inside a button. */

.tl-cta { background: var(--accent); color: var(--accent-ink); position: relative; overflow: hidden; }
.tl-cta::after {
  content: "";
  position: absolute; inset: 0; pointer-events: none;
  background:
    radial-gradient(58% 70% at 88% 6%, rgb(255 255 255 / 0.14) 0%, transparent 62%),
    radial-gradient(48% 60% at 6% 96%, rgb(0 0 0 / 0.16) 0%, transparent 66%);
}
.tl-cta__in {
  position: relative; z-index: 1;
  padding-top: clamp(60px, 8vw, 106px);
  padding-bottom: clamp(60px, 8vw, 106px);
  text-align: center;
}
.tl-cta .tl-eyebrow { color: color-mix(in srgb, var(--accent-ink) 62%, transparent); justify-content: center; }
.tl-cta__tel {
  display: inline-block;
  margin: 0;
  font-size: clamp(2.2rem, 6.4vw, 4.4rem);
  font-weight: 600;
  letter-spacing: -0.045em;
  line-height: 1;
  text-decoration: none;
  color: currentColor;
  border-bottom: 3px solid color-mix(in srgb, var(--accent-ink) 34%, transparent);
  padding-bottom: 6px;
  transition: border-color 0.18s ease;
}
.tl-cta__tel:hover { border-bottom-color: currentColor; }
.tl-cta__note {
  margin: clamp(22px, 2.6vw, 32px) auto 0;
  max-width: 48ch;
  font-size: 1rem;
  line-height: 1.6;
  opacity: 0.82;
}
.tl-cta__note a { font-weight: 600; text-decoration: none; border-bottom: 1px solid color-mix(in srgb, var(--accent-ink) 45%, transparent); }
.tl-cta__note a:hover { border-bottom-color: currentColor; }
/* No phone — fall back to the heading-and-button shape rather than leaving the
   band empty. */
.tl-cta .tl-h2 { max-width: 20ch; margin-inline: auto; }
.tl-cta .tl-actions { justify-content: center; margin-top: 28px; }
.tl-cta .tl-btn--solid { background: var(--paper); color: var(--ink); }
.tl-cta .tl-btn--ghost { color: currentColor; }
.tl-cta .tl-btn--ghost:hover { background: var(--accent-ink); color: var(--accent); border-color: var(--accent-ink); }

/* ---------- footer ---------- */

.tl-foot { background: var(--deep); color: rgb(255 255 255 / 0.72); }
.tl-foot__in {
  padding-top: 60px;
  padding-bottom: 34px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(220px, 100%), 1fr));
  gap: 34px;
}
.tl-foot__name {
  color: var(--paper);
  font-weight: 600;
  font-size: 1.16rem;
  letter-spacing: -0.02em;
  margin: 0 0 10px;
}
.tl-foot h4 {
  font-size: 0.72rem;
  letter-spacing: 0.13em;
  text-transform: uppercase;
  color: rgb(255 255 255 / 0.45);
  margin: 0 0 12px;
  font-weight: 600;
}
.tl-foot p, .tl-foot a { margin: 0 0 7px; font-size: 0.95rem; line-height: 1.55; }
.tl-foot a { text-decoration: none; display: block; }
.tl-foot a:hover { color: var(--paper); }

/* ---------- responsive ---------- */

@media (max-width: 1040px) {
  .tl-nav__links { display: none; }
}

@media (max-width: 860px) {
  .tl-hero--split { grid-template-columns: minmax(0, 1fr); min-height: 0; }
  .tl-hero--split { --hero-split: 100%; }
  .tl-hero__media { order: -1; min-height: 0; aspect-ratio: 16 / 10; }
  .tl-hero__media img {
    -webkit-mask-image: linear-gradient(to bottom, #000 58%, rgba(0,0,0,0.6) 84%, transparent 100%);
    mask-image: linear-gradient(to bottom, #000 58%, rgba(0,0,0,0.6) 84%, transparent 100%);
  }
  .tl-hero__copy {
    padding-inline: var(--gutter);
    padding-block: clamp(30px, 6vw, 52px) clamp(44px, 8vw, 72px);
  }
  .tl-statement__grid { grid-template-columns: minmax(0, 1fr); }
  .tl-statement__body { max-width: none; }
  .tl-row { grid-template-columns: minmax(0, 1fr); gap: 7px; padding: 20px 4px; }
  .tl-gallery { columns: 1; }
  .tl-quote { max-width: none; }
  .tl-nav__tel { display: none; }
}

@media (max-width: 520px) {
  body.tpl-ledger { font-size: 16px; }
  .tl-actions .tl-btn { flex: 1 1 auto; justify-content: center; }
}

@media (prefers-reduced-motion: reduce) {
  .tpl-ledger *, .tpl-ledger *::before, .tpl-ledger *::after {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
  }
}

.tpl-ledger a:focus-visible, .tpl-ledger button:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
}
.tl-deep a:focus-visible, .tl-cta a:focus-visible, .tl-foot a:focus-visible {
  outline-color: currentColor;
}
`;
}