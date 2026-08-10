import type { Palette } from "../../content/normalize-brand-colors";

export function atlasStyles(p: Palette): string {
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
  --maxw: 1240px;
  --gutter: clamp(18px, 3.4vw, 46px);
  --band: clamp(62px, 8vw, 118px);
}

*, *::before, *::after { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; scroll-behavior: smooth; }

body.tpl-atlas {
  margin: 0;
  background: var(--paper);
  color: var(--ink);
  font-family: "Instrument Sans", ui-sans-serif, system-ui, -apple-system, sans-serif;
  font-size: 17px; line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}
.tpl-atlas img { max-width: 100%; display: block; }
.tpl-atlas a { color: inherit; }

.at-wrap { width: 100%; max-width: var(--maxw); margin: 0 auto; padding-inline: var(--gutter); }

/* ---------- type ---------- */

.at-display {
  font-size: clamp(2.3rem, 5.4vw, 4.1rem);
  line-height: 1.03; letter-spacing: -0.032em; font-weight: 600;
  margin: 0; text-wrap: balance;
}
.at-h2 {
  font-size: clamp(1.7rem, 3.4vw, 2.6rem);
  line-height: 1.1; letter-spacing: -0.027em; font-weight: 600;
  margin: 0; text-wrap: balance;
}
.at-em {
  font-family: "Newsreader", Georgia, serif;
  font-style: italic; font-weight: 400; letter-spacing: -0.008em;
  color: var(--accent);
}
.at-eyebrow {
  font-size: 0.71rem; font-weight: 600; letter-spacing: 0.15em;
  text-transform: uppercase; color: var(--ink-muted);
  margin: 0 0 16px; display: flex; align-items: center; gap: 12px;
}
.at-eyebrow::before {
  content: ""; width: 24px; height: 1px;
  background: currentColor; opacity: 0.5; flex: none;
}
.at-lede {
  font-size: clamp(1rem, 1.55vw, 1.16rem); line-height: 1.62;
  color: var(--ink-muted); max-width: min(100%, 620px); margin: 18px 0 0;
}
.at-head { max-width: min(100%, 620px); margin-bottom: clamp(30px, 4vw, 54px); }

/* ---------- buttons ---------- */

.at-btn {
  display: inline-flex; align-items: center; gap: 9px;
  padding: 15px 26px; border-radius: 2px;
  font-size: 0.95rem; font-weight: 600; letter-spacing: -0.01em;
  text-decoration: none; border: 1px solid transparent;
  transition: transform 0.15s ease, background-color 0.15s ease, color 0.15s ease;
}
.at-btn:hover { transform: translateY(-1px); }
.at-btn--solid { background: var(--accent); color: var(--accent-ink); }
.at-btn--ghost { border-color: currentColor; opacity: 0.9; }
.at-btn--ghost:hover { background: var(--ink); color: var(--paper); border-color: var(--ink); }
.at-actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 30px; }

/* ---------- nav ---------- */

.at-nav { border-bottom: 1px solid var(--line); background: var(--paper); }
.at-nav__in { display: flex; align-items: center; gap: 18px; min-height: 76px; padding-block: 14px; }
.at-nav__logo { max-height: 40px; width: auto; }
.at-nav__name { font-weight: 600; font-size: 1.06rem; letter-spacing: -0.02em; white-space: nowrap; }
.at-nav__links { display: flex; align-items: center; gap: clamp(16px, 2vw, 32px); margin-left: auto; }
.at-nav__links a {
  font-size: 0.93rem; font-weight: 500; letter-spacing: -0.012em;
  text-decoration: none; padding: 6px 0;
  border-bottom: 1px solid transparent; transition: border-color 0.15s ease; white-space: nowrap;
}
.at-nav__links a:hover { border-bottom-color: var(--accent); }
.at-nav__side { display: flex; align-items: center; gap: 18px; flex: none; margin-left: clamp(18px, 2.6vw, 40px); }
.at-nav__tel { font-weight: 600; font-size: 0.94rem; text-decoration: none; }

/* ---------- hero ----------
   No photograph. A hero image only works when someone chose it to be one — we
   pick the widest unflagged file a crawl happened to return, which on one
   client was a team photo in football jerseys and on another a reception desk.
   Neither said anything about the business. The tagline does, so it leads, and
   the stat rail that used to sit lonely in its own strip below now anchors the
   same band. */

.at-hero { background: var(--mist); position: relative; overflow: hidden; }
.at-hero__in { padding-block: clamp(58px, 7.5vw, 104px) 0; position: relative; z-index: 1; }
.at-hero__copy { max-width: min(100%, 940px); }
.at-hero .at-display { max-width: min(100%, 880px); }
.at-hero .at-lede { max-width: min(100%, 620px); }
.at-hero__field {
  position: absolute; inset: 0; pointer-events: none;
  background:
    radial-gradient(58% 62% at 88% 6%, color-mix(in srgb, var(--accent) 22%, transparent) 0%, transparent 64%),
    radial-gradient(44% 50% at 4% 92%, color-mix(in srgb, var(--accent) 13%, transparent) 0%, transparent 68%);
}

/* Stat rail anchored to the base of the hero band. Oversized numerals on the
   bare ground — no cards, hairline dividers only. */
.at-hero__stats {
  margin-top: clamp(44px, 5.5vw, 78px);
  border-top: 1px solid var(--line);
  display: grid; grid-template-columns: repeat(auto-fit, minmax(min(180px, 100%), 1fr));
}
.at-hero__stats > div { padding: clamp(24px, 3vw, 38px) clamp(14px, 1.8vw, 26px) clamp(28px, 3.4vw, 44px); position: relative; }
.at-hero__stats > div:first-child { padding-left: 0; }
.at-hero__stats > div + div::before {
  content: ""; position: absolute; left: 0; top: 22%; bottom: 26%; width: 1px; background: var(--line);
}
.at-hero__stats dt {
  font-size: clamp(2rem, 4vw, 3rem); font-weight: 600;
  letter-spacing: -0.042em; line-height: 0.96; color: var(--accent);
}
.at-hero__stats dd { margin: 12px 0 0; font-size: 0.87rem; color: var(--ink-muted); line-height: 1.42; max-width: 24ch; }

/* No stats — the band simply ends after the buttons. */
.at-hero--bare .at-hero__in { padding-bottom: clamp(58px, 7.5vw, 104px); }

/* ---------- stat / partner strip ---------- */

.at-strip { border-bottom: 1px solid var(--line); background: var(--paper); }
.at-strip__in { padding-block: clamp(30px, 3.6vw, 46px); }
.at-partners { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: clamp(24px, 5vw, 56px); }
.at-partners img { max-height: 34px; width: auto; filter: grayscale(1); opacity: 0.6; }
.at-strip__label {
  font-size: 0.7rem; letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--ink-muted); margin: 0 0 18px; text-align: center;
}

/* ---------- differentiators: the strongest reliable content ---------- */

.at-why { background: var(--deep); color: var(--paper); }
.at-why__in { padding-block: var(--band); }
.at-why .at-eyebrow { color: rgb(255 255 255 / 0.55); }
.at-why .at-em { color: var(--paper); opacity: 0.9; }
.at-why__grid {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%), 1fr));
  gap: 1px; background: rgb(255 255 255 / 0.14);
  border: 1px solid rgb(255 255 255 / 0.14);
}
.at-why__cell {
  background: var(--deep); padding: clamp(26px, 2.6vw, 34px) clamp(22px, 2.2vw, 30px);
  transition: background-color 0.22s ease;
}
.at-why__cell:hover { background: var(--deep-soft); }
.at-why__cell h3 {
  margin: 0 0 10px; font-size: 1.06rem; font-weight: 600;
  letter-spacing: -0.022em; line-height: 1.28;
}
.at-why__cell p { margin: 0; font-size: 0.94rem; line-height: 1.6; color: rgb(255 255 255 / 0.64); }

/* ---------- services ---------- */

.at-svc__in { padding-block: var(--band); }

/* Few services: cards with room to breathe. */
.at-svc__cards {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(min(300px, 100%), 1fr));
  gap: clamp(16px, 2vw, 26px);
}
.at-svc__card {
  border: 1px solid var(--line); padding: clamp(26px, 2.6vw, 34px);
  transition: border-color 0.2s ease, transform 0.2s ease;
}
.at-svc__card:hover { border-color: var(--accent); transform: translateY(-2px); }
.at-svc__card h3 {
  margin: 0 0 10px; font-size: 1.16rem; font-weight: 600;
  letter-spacing: -0.024em; line-height: 1.24;
}
.at-svc__card p { margin: 0; color: var(--ink-muted); font-size: 0.96rem; line-height: 1.58; }
.at-svc__card::before {
  content: ""; display: block; width: 24px; height: 2px;
  background: var(--accent); margin-bottom: 18px;
  transition: width 0.25s cubic-bezier(0.2, 0, 0.1, 1);
}
.at-svc__card:hover::before { width: 44px; }

/* Many services: a two-column index. Sixteen cards is a wall; sixteen index
   entries is a capability list, which is what a long service list actually is. */
.at-svc__index {
  columns: 2; column-gap: clamp(26px, 4vw, 64px);
  border-top: 1px solid var(--line);
}
.at-svc__item {
  break-inside: avoid; padding: 17px 2px;
  border-bottom: 1px solid var(--line);
}
.at-svc__item h3 {
  margin: 0 0 5px; font-size: 1rem; font-weight: 600;
  letter-spacing: -0.02em; line-height: 1.25;
}
.at-svc__item p { margin: 0; color: var(--ink-muted); font-size: 0.9rem; line-height: 1.5; }

/* ---------- process ---------- */

.at-proc { background: var(--mist); }
.at-proc__in { padding-block: var(--band); }
.at-proc__list { counter-reset: step; border-top: 1px solid var(--line); }
.at-proc__step {
  counter-increment: step;
  display: grid; grid-template-columns: 62px minmax(0, 0.7fr) minmax(0, 1.3fr);
  gap: clamp(12px, 2.5vw, 36px);
  align-items: baseline;
  padding: 20px 2px;
  border-bottom: 1px solid var(--line);
}
.at-proc__step::before {
  content: counter(step, decimal-leading-zero);
  font-size: 0.86rem; font-weight: 600; letter-spacing: 0.04em;
  color: var(--accent); font-variant-numeric: tabular-nums;
}
.at-proc__step h3 { margin: 0; font-size: 1.06rem; font-weight: 600; letter-spacing: -0.022em; }
.at-proc__step p { margin: 0; color: var(--ink-muted); font-size: 0.95rem; line-height: 1.55; }

/* ---------- about + team ---------- */

.at-about__in { padding-block: var(--band); }
.at-about__grid {
  display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: clamp(30px, 4.5vw, 70px); align-items: start;
}
.at-about__body { font-size: clamp(1.02rem, 1.7vw, 1.2rem); line-height: 1.6; margin: 0; letter-spacing: -0.012em; }

.at-team { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(200px, 100%), 1fr)); gap: clamp(14px, 1.8vw, 22px); }
.at-team figure { margin: 0; }
.at-team img { width: 100%; aspect-ratio: 4 / 5; object-fit: cover; border-radius: 3px; }
.at-team figcaption { padding-top: 14px; }
.at-team b { display: block; font-size: 1rem; font-weight: 600; letter-spacing: -0.02em; }
.at-team span { display: block; margin-top: 3px; font-size: 0.86rem; color: var(--ink-muted); line-height: 1.4; }

.at-scenes { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(240px, 100%), 1fr)); gap: clamp(12px, 1.6vw, 18px); }
.at-scenes figure { margin: 0; overflow: hidden; border-radius: 3px; background: var(--mist); position: relative; }
.at-scenes img { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; }
.at-scenes figcaption {
  position: absolute; left: 0; right: 0; bottom: 0;
  padding: 34px 16px 13px; font-size: 0.79rem; color: var(--paper);
  background: linear-gradient(to top, rgb(0 0 0 / 0.6), transparent);
}

/* ---------- testimonials ---------- */

.at-says { background: var(--mist); }
.at-says__in { padding-block: var(--band); }
.at-says__grid { columns: 3; column-gap: clamp(14px, 1.8vw, 22px); }
.at-quote {
  break-inside: avoid; margin: 0 0 clamp(14px, 1.8vw, 22px);
  background: var(--paper); border: 1px solid var(--line);
  padding: clamp(24px, 2.4vw, 30px);
}
.at-quote p { margin: 0 0 16px; font-size: 1rem; line-height: 1.54; letter-spacing: -0.013em; }
.at-quote footer { font-size: 0.86rem; color: var(--ink-muted); }
.at-quote footer b { color: var(--ink); font-weight: 600; }

/* ---------- faq ---------- */

.at-faq__in { padding-block: var(--band); }
.at-faq__list { border-top: 1px solid var(--line); max-width: min(100%, 860px); }
.at-faq details { border-bottom: 1px solid var(--line); }
.at-faq summary {
  cursor: pointer; list-style: none; padding: 22px 40px 22px 2px;
  font-size: 1.04rem; font-weight: 600; letter-spacing: -0.02em;
  position: relative;
}
.at-faq summary::-webkit-details-marker { display: none; }
.at-faq summary::after {
  content: ""; position: absolute; right: 8px; top: 50%;
  width: 10px; height: 10px; margin-top: -6px;
  border-right: 1.5px solid var(--accent); border-bottom: 1.5px solid var(--accent);
  transform: rotate(45deg); transition: transform 0.2s ease;
}
.at-faq details[open] summary::after { transform: rotate(-135deg); margin-top: -2px; }
.at-faq details p { margin: 0 0 24px; color: var(--ink-muted); font-size: 0.97rem; line-height: 1.62; max-width: 70ch; }

/* ---------- cta + footer ----------
   The CTA carries the contact details rather than a heading and two buttons on
   a colour stripe. Everything in it comes from extracted fields, so the band
   ends up being the section a prospect actually needs instead of decoration
   before the footer. */

.at-cta { background: var(--accent); color: var(--accent-ink); }
.at-cta__in {
  padding-block: clamp(50px, 6.5vw, 88px);
  display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 0.92fr);
  gap: clamp(30px, 4.5vw, 64px); align-items: start;
}
.at-cta .at-h2 { max-width: 15ch; }
.at-cta__note { margin: 16px 0 0; max-width: 42ch; opacity: 0.82; font-size: 0.96rem; line-height: 1.58; }
.at-cta .at-actions { margin-top: 26px; }
.at-cta .at-btn--solid { background: var(--paper); color: var(--ink); }
.at-cta .at-btn--ghost { color: currentColor; }
.at-cta .at-btn--ghost:hover { background: var(--accent-ink); color: var(--accent); border-color: var(--accent-ink); }

/* Contact facts, ruled rather than boxed — the accent ground is already doing
   enough work without cards on top of it. */
.at-cta__facts { margin: 0; }
.at-cta__facts > div {
  display: grid; grid-template-columns: 82px minmax(0, 1fr); gap: 16px;
  padding: 14px 0; border-top: 1px solid color-mix(in srgb, var(--accent-ink) 26%, transparent);
}
.at-cta__facts > div:last-child {
  border-bottom: 1px solid color-mix(in srgb, var(--accent-ink) 26%, transparent);
}
.at-cta__facts dt { font-size: 0.78rem; opacity: 0.66; letter-spacing: 0.04em; padding-top: 2px; }
.at-cta__facts dd { margin: 0; font-size: 0.95rem; font-weight: 500; line-height: 1.5; }
.at-cta__facts a { text-decoration: none; }
.at-cta__facts a:hover { text-decoration: underline; }

/* Only a heading and buttons survive — centre it rather than leaving a hole
   where the facts column would have been. */
.at-cta--slim .at-cta__in { grid-template-columns: minmax(0, 1fr); justify-items: start; }

.at-foot { background: var(--deep); color: rgb(255 255 255 / 0.72); }
.at-foot__in {
  padding-top: 58px; padding-bottom: 32px;
  display: grid; grid-template-columns: repeat(auto-fit, minmax(min(220px, 100%), 1fr)); gap: 32px;
}
.at-foot__name { color: var(--paper); font-weight: 600; font-size: 1.16rem; letter-spacing: -0.02em; margin: 0 0 10px; }
.at-foot h4 {
  font-size: 0.7rem; letter-spacing: 0.13em; text-transform: uppercase;
  color: rgb(255 255 255 / 0.45); margin: 0 0 12px; font-weight: 600;
}
.at-foot p, .at-foot a { margin: 0 0 7px; font-size: 0.94rem; line-height: 1.55; }
.at-foot a { text-decoration: none; display: block; }
.at-foot a:hover { color: var(--paper); }

/* ---------- responsive ---------- */

@media (max-width: 1040px) {
  .at-nav__links { display: none; }
  .at-says__grid { columns: 2; }
}
@media (max-width: 860px) {
  .at-about__grid { grid-template-columns: minmax(0, 1fr); }
  .at-svc__index { columns: 1; }
  .at-says__grid { columns: 1; }
  .at-proc__step { grid-template-columns: 42px minmax(0, 1fr); }
  .at-proc__step p { grid-column: 2; }
  .at-nav__tel { display: none; }
}
@media (max-width: 860px) {
  .at-cta__in { grid-template-columns: minmax(0, 1fr); gap: 30px; }
}
@media (max-width: 520px) {
  body.tpl-atlas { font-size: 16px; }
  .at-actions .at-btn { flex: 1 1 auto; justify-content: center; }
  .at-cta__facts > div { grid-template-columns: minmax(0, 1fr); gap: 4px; }
}
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  .tpl-atlas *, .tpl-atlas *::before { transition-duration: 0.01ms !important; }
}
.tpl-atlas a:focus-visible, .tpl-atlas summary:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
.at-why a:focus-visible, .at-cta a:focus-visible, .at-foot a:focus-visible { outline-color: currentColor; }
`;
}
