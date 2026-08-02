import type { Palette } from "../../content/normalize-brand-colors";

export function showcaseStyles(p: Palette): string {
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
  --maxw: 1320px;
  --gutter: clamp(18px, 3.4vw, 44px);
  --band: clamp(60px, 8vw, 116px);
}

*, *::before, *::after { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }

body.tpl-showcase {
  margin: 0;
  background: var(--paper);
  color: var(--ink);
  font-family: "Instrument Sans", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  font-size: 17px;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}
.tpl-showcase img { max-width: 100%; display: block; }
.tpl-showcase a { color: inherit; }

.sc-wrap {
  width: 100%;
  max-width: var(--maxw);
  margin: 0 auto;
  padding-left: var(--gutter);
  padding-right: var(--gutter);
}

/* ---------- type ---------- */

.sc-display {
  font-size: clamp(2.3rem, 5.2vw, 4rem);
  line-height: 1.02;
  letter-spacing: -0.033em;
  font-weight: 600;
  margin: 0;
  text-wrap: balance;
}
.sc-h2 {
  font-size: clamp(1.8rem, 3.8vw, 2.9rem);
  line-height: 1.08;
  letter-spacing: -0.028em;
  font-weight: 600;
  margin: 0;
  text-wrap: balance;
}
.sc-em {
  font-family: "Newsreader", Georgia, "Times New Roman", serif;
  font-style: italic;
  font-weight: 400;
  letter-spacing: -0.008em;
  color: var(--accent);
}
.sc-eyebrow {
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--ink-muted);
  margin: 0 0 16px;
  display: flex;
  align-items: center;
  gap: 12px;
}
.sc-eyebrow::before {
  content: "";
  width: 26px; height: 1px;
  background: currentColor; opacity: 0.5; flex: none;
}
.sc-lede {
  font-size: clamp(1rem, 1.6vw, 1.18rem);
  line-height: 1.62;
  color: var(--ink-muted);
  max-width: 60ch;
  margin: 18px 0 0;
}

/* ---------- buttons ---------- */

.sc-btn {
  display: inline-flex; align-items: center; gap: 9px;
  padding: 15px 26px; border-radius: 2px;
  font-size: 0.95rem; font-weight: 600; letter-spacing: -0.01em;
  text-decoration: none; border: 1px solid transparent;
  transition: transform 0.15s ease, background-color 0.15s ease, color 0.15s ease;
}
.sc-btn:hover { transform: translateY(-1px); }
.sc-btn--solid { background: var(--accent); color: var(--accent-ink); }
.sc-btn--ghost { border-color: currentColor; opacity: 0.92; }
.sc-btn--ghost:hover { background: var(--ink); color: var(--paper); border-color: var(--ink); }
.sc-actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 30px; }

/* ---------- nav ---------- */

.sc-nav { border-bottom: 1px solid var(--line); background: var(--paper); }
.sc-nav__in {
  display: flex; align-items: center; gap: 20px;
  min-height: 76px; padding-top: 14px; padding-bottom: 14px;
}
.sc-nav__mark { display: flex; align-items: center; gap: 12px; min-width: 0; }
.sc-nav__logo { max-height: 40px; width: auto; }
.sc-nav__name {
  font-weight: 600; font-size: 1.06rem; letter-spacing: -0.02em;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.sc-nav__links { display: flex; align-items: center; gap: clamp(18px, 2.2vw, 34px); margin-left: auto; }
.sc-nav__links a {
  font-size: 0.94rem; font-weight: 500; letter-spacing: -0.012em;
  text-decoration: none; padding: 6px 0;
  border-bottom: 1px solid transparent; transition: border-color 0.15s ease;
  white-space: nowrap;
}
.sc-nav__links a:hover { border-bottom-color: var(--accent); }
.sc-nav__side { display: flex; align-items: center; gap: 18px; flex: none; margin-left: clamp(20px, 3vw, 44px); }
.sc-nav__tel { font-weight: 600; font-size: 0.95rem; text-decoration: none; letter-spacing: -0.01em; }

/* ---------- hero: full-bleed photo, headline over it ---------- */

/* Nav and hero share a stacking context so the nav can sit on the image. */
.sc-top { position: relative; }

.sc-nav--over {
  position: absolute;
  top: 0; left: 0; right: 0;
  z-index: 5;
  background: transparent;
  border-bottom-color: rgb(255 255 255 / 0.16);
  color: var(--paper);
}
.sc-nav--over .sc-nav__links a:hover { border-bottom-color: var(--paper); }
.sc-nav--over .sc-btn--solid { background: var(--paper); color: var(--ink); }

.sc-hero {
  position: relative;
  display: grid;
  align-items: end;
  min-height: min(86vh, 800px);
  background: var(--deep);
  overflow: hidden;
}
.sc-hero__bg { position: absolute; inset: 0; }
.sc-hero__bg img { width: 100%; height: 100%; object-fit: cover; }
/* Two gradients: one lifts the base so the copy holds, one darkens the left
   so the headline never fights whatever the photo happens to contain. */
.sc-hero__bg::after {
  content: "";
  position: absolute; inset: 0;
  background:
    linear-gradient(to top,
      color-mix(in srgb, var(--deep) 94%, transparent) 0%,
      color-mix(in srgb, var(--deep) 72%, transparent) 26%,
      color-mix(in srgb, var(--deep) 28%, transparent) 60%,
      color-mix(in srgb, var(--deep) 6%, transparent) 88%),
    radial-gradient(120% 85% at 50% 78%,
      color-mix(in srgb, var(--deep) 58%, transparent) 0%,
      color-mix(in srgb, var(--deep) 24%, transparent) 52%,
      transparent 88%);
}
.sc-hero__in {
  position: relative;
  z-index: 1;
  color: var(--paper);
  text-align: center;
  padding-top: clamp(130px, 17vw, 230px);
  padding-bottom: clamp(58px, 8vw, 104px);
}
/* Absolute width, not a ch cap. Wide enough that a long tagline breaks
   across two or three generous lines instead of stacking one word per line. */
.sc-hero__copy { max-width: min(100%, 1040px); margin: 0 auto; }
.sc-hero .sc-display { color: var(--paper); }
.sc-hero .sc-em { color: var(--paper); opacity: 0.9; }
.sc-hero .sc-lede { color: rgb(255 255 255 / 0.76); max-width: min(100%, 680px); margin-left: auto; margin-right: auto; }
.sc-hero .sc-actions { justify-content: center; }
.sc-hero .sc-btn--ghost { color: var(--paper); }
.sc-hero .sc-btn--ghost:hover { background: var(--paper); color: var(--deep); border-color: var(--paper); }

/* No usable photo — a designed band rather than a hole. Showcase declares a
   minimum image requirement, so this should be rare. */
.sc-hero--noimg { background: var(--mist); min-height: 0; align-items: start; }
.sc-hero--noimg .sc-hero__in {
  color: var(--ink);
  text-align: left;
  padding-top: clamp(56px, 7.5vw, 104px);
  padding-bottom: clamp(56px, 7.5vw, 104px);
}
.sc-hero--noimg .sc-display { color: var(--ink); }
.sc-hero--noimg .sc-em { color: var(--accent); opacity: 1; }
.sc-hero--noimg .sc-lede { color: var(--ink-muted); }
.sc-hero--noimg .sc-btn--ghost { color: var(--ink); }
.sc-hero--noimg .sc-hero__copy { margin: 0; max-width: min(100%, 780px); }
.sc-hero--noimg .sc-lede { margin-left: 0; }
.sc-hero--noimg .sc-actions { justify-content: flex-start; }

/* ---------- services as image tiles ---------- */

.sc-tiles__in { padding-top: var(--band); padding-bottom: var(--band); }
.sc-tiles__head { max-width: 38ch; margin-bottom: clamp(30px, 4vw, 52px); }
.sc-tiles__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(290px, 100%), 1fr));
  gap: clamp(14px, 1.8vw, 24px);
}
.sc-tile { display: flex; flex-direction: column; }
.sc-tile__img {
  overflow: hidden; border-radius: 3px; background: var(--mist);
  margin-bottom: 20px;
}
.sc-tile__img img {
  width: 100%; aspect-ratio: 4 / 3; object-fit: cover;
  transition: transform 0.5s cubic-bezier(0.2, 0, 0.1, 1);
}
.sc-tile:hover .sc-tile__img img { transform: scale(1.035); }
.sc-tile h3 {
  font-size: clamp(1.12rem, 1.9vw, 1.34rem);
  font-weight: 600; letter-spacing: -0.024em; line-height: 1.22;
  margin: 0 0 9px;
}
.sc-tile p { margin: 0; color: var(--ink-muted); font-size: 0.97rem; line-height: 1.58; }

/* Services beyond the tiled three. A hairline matrix rather than stacked rows —
   Ledger already owns the ruled-list treatment, and repeating it here made the
   two templates look like the same page twice. Reads as a spec sheet, and holds
   from one overflow item to sixteen. */
.sc-grid {
  margin-top: clamp(28px, 3.6vw, 46px);
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(268px, 100%), 1fr));
  gap: 1px;
  background: var(--line);
  border: 1px solid var(--line);
}
.sc-grid__cell {
  background: var(--paper);
  padding: clamp(22px, 2.2vw, 30px) clamp(20px, 2vw, 28px);
  transition: background-color 0.2s ease;
}
.sc-grid__cell:hover { background: var(--accent-soft); }
.sc-grid__cell::before {
  content: "";
  display: block;
  width: 22px;
  height: 2px;
  background: var(--accent);
  margin-bottom: 16px;
  transition: width 0.25s cubic-bezier(0.2, 0, 0.1, 1);
}
.sc-grid__cell:hover::before { width: 40px; }
.sc-grid__cell h4 {
  margin: 0 0 8px;
  font-size: 1.04rem;
  font-weight: 600;
  letter-spacing: -0.022em;
  line-height: 1.25;
}
.sc-grid__cell p {
  margin: 0;
  color: var(--ink-muted);
  font-size: 0.94rem;
  line-height: 1.56;
}

/* ---------- feature: full-bleed image with copy over it ---------- */

.sc-feature {
  position: relative;
  min-height: min(62vh, 560px);
  display: grid;
  align-items: end;
  overflow: hidden;
  background: var(--deep);
}
.sc-feature img {
  position: absolute; inset: 0;
  width: 100%; height: 100%; object-fit: cover;
}
.sc-feature::after {
  content: "";
  position: absolute; inset: 0;
  background: linear-gradient(to top,
    color-mix(in srgb, var(--deep) 92%, transparent) 0%,
    color-mix(in srgb, var(--deep) 62%, transparent) 38%,
    color-mix(in srgb, var(--deep) 12%, transparent) 72%,
    transparent 100%);
}
.sc-feature__in {
  position: relative; z-index: 1;
  padding-top: clamp(50px, 7vw, 92px);
  padding-bottom: clamp(40px, 5vw, 68px);
  color: var(--paper);
}
.sc-feature .sc-eyebrow { color: rgb(255 255 255 / 0.62); }
.sc-feature .sc-em { color: var(--paper); opacity: 0.9; }
.sc-feature blockquote {
  margin: 0; max-width: 26ch;
  font-size: clamp(1.4rem, 2.9vw, 2.15rem);
  line-height: 1.24; letter-spacing: -0.026em; font-weight: 500;
}
.sc-feature cite {
  display: block; margin-top: 18px;
  font-style: normal; font-size: 0.88rem;
  color: rgb(255 255 255 / 0.62); letter-spacing: 0.01em;
}

/* ---------- asymmetric pair + copy ---------- */

.sc-pair__in { padding-top: var(--band); padding-bottom: var(--band); }
.sc-pair__grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr);
  gap: clamp(28px, 4.5vw, 68px);
  align-items: center;
}
.sc-pair__stack { display: grid; gap: clamp(12px, 1.6vw, 20px); }
.sc-pair__stack figure { margin: 0; overflow: hidden; border-radius: 3px; background: var(--mist); }
.sc-pair__stack img { width: 100%; object-fit: cover; }
.sc-pair__stack figure:nth-child(1) img { aspect-ratio: 5 / 4; }
.sc-pair__stack figure:nth-child(2) {
  /* Offset so the two don't read as a plain stack. */
  width: 78%; margin-left: auto;
}
.sc-pair__stack figure:nth-child(2) img { aspect-ratio: 1 / 1; }

/* ---------- mosaic ---------- */

.sc-mosaic { background: var(--mist); }
.sc-mosaic__in { padding-top: var(--band); padding-bottom: var(--band); }
.sc-mosaic__head { max-width: 34ch; margin-bottom: clamp(28px, 3.6vw, 46px); }
.sc-mosaic__grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: clamp(12px, 1.6vw, 20px);
}
.sc-mosaic__grid figure { margin: 0; overflow: hidden; border-radius: 3px; background: var(--paper); }
.sc-mosaic__grid img { width: 100%; height: 100%; object-fit: cover; }
/* Alternating spans keep it from reading as a uniform grid regardless of count. */
.sc-mosaic__grid figure { grid-column: span 2; }
.sc-mosaic__grid figure:nth-child(4n + 1) { grid-column: span 4; }
.sc-mosaic__grid figure:nth-child(4n + 1) img { aspect-ratio: 16 / 9; }
.sc-mosaic__grid figure:nth-child(4n + 2) img { aspect-ratio: 4 / 5; }
.sc-mosaic__grid figure img { aspect-ratio: 4 / 3; }

/* ---------- testimonials ---------- */

.sc-quotes__in { padding-top: var(--band); padding-bottom: var(--band); }
.sc-quotes__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(300px, 100%), 1fr));
  gap: 20px; margin-top: clamp(28px, 3.6vw, 46px);
}
.sc-quote { border: 1px solid var(--line); border-top: 3px solid var(--accent); padding: 30px 28px; }
.sc-quote p { margin: 0 0 20px; font-size: 1.03rem; line-height: 1.55; letter-spacing: -0.012em; }
.sc-quote footer { font-size: 0.86rem; color: var(--ink-muted); }
.sc-quote footer b { display: block; color: var(--ink); font-weight: 600; }

/* ---------- trust strip ---------- */

.sc-strip { border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
.sc-strip__in { padding-top: 32px; padding-bottom: 32px; }
.sc-strip__label {
  font-size: 0.72rem; letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--ink-muted); margin: 0 0 18px; text-align: center;
}
.sc-strip__row {
  display: flex; flex-wrap: wrap; align-items: center; justify-content: center;
  gap: clamp(24px, 5vw, 56px);
}
.sc-strip__row img { max-height: 34px; width: auto; filter: grayscale(1); opacity: 0.62; }

/* ---------- cta + footer ---------- */

.sc-cta { background: var(--accent); color: var(--accent-ink); }
.sc-cta__in {
  padding-top: clamp(50px, 7vw, 88px); padding-bottom: clamp(50px, 7vw, 88px);
  display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 26px;
}
.sc-cta .sc-h2 { max-width: 18ch; }
.sc-cta .sc-btn--solid { background: var(--paper); color: var(--ink); }
.sc-cta .sc-btn--ghost { color: currentColor; }
.sc-cta .sc-btn--ghost:hover { background: var(--accent-ink); color: var(--accent); border-color: var(--accent-ink); }
.sc-cta .sc-actions { margin-top: 0; }

.sc-foot { background: var(--deep); color: rgb(255 255 255 / 0.72); }
.sc-foot__in {
  padding-top: 58px; padding-bottom: 32px;
  display: grid; grid-template-columns: repeat(auto-fit, minmax(min(220px, 100%), 1fr)); gap: 32px;
}
.sc-foot__name { color: var(--paper); font-weight: 600; font-size: 1.16rem; letter-spacing: -0.02em; margin: 0 0 10px; }
.sc-foot h4 {
  font-size: 0.72rem; letter-spacing: 0.13em; text-transform: uppercase;
  color: rgb(255 255 255 / 0.45); margin: 0 0 12px; font-weight: 600;
}
.sc-foot p, .sc-foot a { margin: 0 0 7px; font-size: 0.95rem; line-height: 1.55; }
.sc-foot a { text-decoration: none; display: block; }
.sc-foot a:hover { color: var(--paper); }

/* ---------- responsive ---------- */

@media (max-width: 1040px) { .sc-nav__links { display: none; } }

@media (max-width: 860px) {
  .sc-pair__grid { grid-template-columns: minmax(0, 1fr); }
  .sc-pair__stack figure:nth-child(2) { width: 100%; margin-left: 0; }
  .sc-mosaic__grid { grid-template-columns: repeat(2, 1fr); }
  .sc-mosaic__grid figure,
  .sc-mosaic__grid figure:nth-child(4n + 1) { grid-column: span 1; }
  .sc-mosaic__grid figure:nth-child(4n + 1) img,
  .sc-mosaic__grid figure:nth-child(4n + 2) img { aspect-ratio: 4 / 3; }
  .sc-hero { min-height: min(78vh, 620px); }
  .sc-hero__copy { max-width: 100%; }
  .sc-nav__tel { display: none; }
}

@media (max-width: 520px) {
  body.tpl-showcase { font-size: 16px; }
  .sc-actions .sc-btn { flex: 1 1 auto; justify-content: center; }
  .sc-cta__in { flex-direction: column; align-items: flex-start; }
}

@media (prefers-reduced-motion: reduce) {
  .tpl-showcase *, .tpl-showcase *::before, .tpl-showcase *::after {
    transition-duration: 0.01ms !important; animation-duration: 0.01ms !important;
  }
}

.tpl-showcase a:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
.sc-feature a:focus-visible, .sc-cta a:focus-visible, .sc-foot a:focus-visible { outline-color: currentColor; }
`;
}
