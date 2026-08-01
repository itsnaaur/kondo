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
  --gutter: clamp(20px, 5vw, 64px);
  --band: clamp(64px, 9vw, 128px);
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
  max-width: 1160px;
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
.tl-nav__side { display: flex; align-items: center; gap: 20px; flex: none; }
.tl-nav__tel {
  font-weight: 600;
  font-size: 0.95rem;
  text-decoration: none;
  letter-spacing: -0.01em;
}

/* ---------- hero ---------- */

.tl-hero { position: relative; overflow: hidden; background: var(--mist); }
.tl-hero__in { padding-top: clamp(58px, 8vw, 104px); padding-bottom: clamp(58px, 8vw, 104px); }
.tl-hero__copy { max-width: 22ch; }
.tl-hero .tl-lede { max-width: 52ch; }

.tl-hero--split .tl-hero__in {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
  gap: clamp(32px, 5vw, 72px);
  align-items: center;
}
.tl-hero--split .tl-hero__copy { max-width: none; }

.tl-hero__shot {
  border-radius: 3px;
  overflow: hidden;
  border: 1px solid var(--line);
  box-shadow: 0 30px 60px -30px rgb(0 0 0 / 0.3);
}
.tl-hero__shot img { width: 100%; height: 100%; object-fit: cover; aspect-ratio: 4 / 3; }

/* No-photo fallback. Most prospects have no usable hero image — this has to
   read as a deliberate treatment, not a hole. Concentric arcs in the brand hue. */
.tl-hero--plain { background: var(--deep); color: var(--paper); }
.tl-hero--plain .tl-lede { color: rgb(255 255 255 / 0.62); }
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
.tl-hero--plain .tl-hero__in { position: relative; z-index: 1; }

/* ---------- trust strip ---------- */

.tl-strip { border-bottom: 1px solid var(--line); background: var(--paper); }
.tl-strip__in { padding-top: 34px; padding-bottom: 34px; }
.tl-strip__label {
  font-size: 0.72rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ink-muted);
  margin: 0 0 20px;
  text-align: center;
}
.tl-strip__row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: clamp(24px, 5vw, 56px);
}
.tl-strip__row img {
  max-height: 34px;
  width: auto;
  filter: grayscale(1);
  opacity: 0.62;
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

.tl-gallery {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(240px, 100%), 1fr));
  gap: 14px;
}
.tl-gallery figure {
  margin: 0;
  border-radius: 3px;
  overflow: hidden;
  background: var(--deep-soft);
}
.tl-gallery img { width: 100%; height: 100%; object-fit: cover; aspect-ratio: 4 / 3; }

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

/* ---------- testimonials ---------- */

.tl-quotes__in { padding-top: var(--band); padding-bottom: var(--band); }
.tl-quotes__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(300px, 100%), 1fr));
  gap: 20px;
  margin-top: clamp(30px, 4vw, 48px);
}
.tl-quote {
  border: 1px solid var(--line);
  border-top: 3px solid var(--accent);
  padding: 30px 28px;
  background: var(--paper);
}
.tl-quote p {
  margin: 0 0 20px;
  font-size: 1.03rem;
  line-height: 1.55;
  letter-spacing: -0.012em;
}
.tl-quote footer { font-size: 0.86rem; color: var(--ink-muted); }
.tl-quote footer b { display: block; color: var(--ink); font-weight: 600; }

/* ---------- closing cta ---------- */

.tl-cta { background: var(--accent); color: var(--accent-ink); }
.tl-cta__in {
  padding-top: clamp(52px, 7vw, 92px);
  padding-bottom: clamp(52px, 7vw, 92px);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 28px;
}
.tl-cta .tl-h2 { max-width: 18ch; }
.tl-cta .tl-btn--solid { background: var(--paper); color: var(--ink); }
.tl-cta .tl-btn--ghost { color: currentColor; }
.tl-cta .tl-btn--ghost:hover { background: var(--accent-ink); color: var(--accent); border-color: var(--accent-ink); }
.tl-cta .tl-actions { margin-top: 0; }

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

@media (max-width: 860px) {
  .tl-hero--split .tl-hero__in { grid-template-columns: minmax(0, 1fr); }
  .tl-hero--split .tl-hero__shot { order: -1; }
  .tl-statement__grid { grid-template-columns: minmax(0, 1fr); }
  .tl-statement__body { max-width: none; }
  .tl-row { grid-template-columns: minmax(0, 1fr); gap: 7px; padding: 20px 4px; }
  .tl-nav__tel { display: none; }
}

@media (max-width: 520px) {
  body.tpl-ledger { font-size: 16px; }
  .tl-actions .tl-btn { flex: 1 1 auto; justify-content: center; }
  .tl-cta__in { flex-direction: column; align-items: flex-start; }
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
