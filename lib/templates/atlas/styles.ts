import type { Palette } from "../../content/normalize-brand-colors";
import { type TemplateTokens, scaledBand } from "../../design/resolve-tokens";

export function atlasStyles(p: Palette, tokens: TemplateTokens): string {
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
  --secondary: ${p.secondary};
  --on-secondary: ${p.onSecondary};
  --ring: ${p.ring};
  --destructive: ${p.destructive};
  --on-destructive: ${p.onDestructive};
  --font-body: ${tokens.fontBody};
  --font-heading: ${tokens.fontHeading};
  --radius-btn: ${tokens.radiusBtn};
  --radius-card: ${tokens.radiusCard};
  --radius-image: ${tokens.radiusImage};
  --radius-pill: ${tokens.radiusPill};
  --shadow-card: ${tokens.shadowCard};
  --shadow-elevated: ${tokens.shadowElevated};
  --border-weight: ${tokens.borderWeight};
  --surface-blur: ${tokens.surfaceBlur};
  --focus-ring-width: ${tokens.focusRingWidth};
  --maxw: 1240px;
  --gutter: clamp(18px, 3.4vw, 46px);
  --band: ${scaledBand(62, 8, 118, tokens.bandMultiplier)};
}

*, *::before, *::after { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; scroll-behavior: smooth; }

body.tpl-atlas {
  margin: 0;
  background: var(--paper);
  color: var(--ink);
  font-family: var(--font-body);
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
  font-family: var(--font-heading);
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
  padding: 15px 26px; border-radius: var(--radius-btn);
  font-size: 0.95rem; font-weight: 600; letter-spacing: -0.01em;
  text-decoration: none; border: var(--border-weight) solid transparent;
  transition: transform 0.15s ease, background-color 0.15s ease, color 0.15s ease;
}
.at-btn:hover { transform: translateY(-1px); }
.at-btn--solid { background: var(--accent); color: var(--accent-ink); }
.at-btn--ghost { border-color: currentColor; opacity: 0.9; }
.at-btn--ghost:hover { background: var(--ink); color: var(--paper); border-color: var(--ink); }
.at-actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 30px; }

/* ---------- nav ---------- */

.at-nav { border-bottom: var(--border-weight) solid var(--line); background: var(--paper); }
.at-nav__in { display: flex; align-items: center; gap: 18px; min-height: 76px; padding-block: 14px; }
.at-nav__logo { max-height: 40px; width: auto; }
.at-nav__name { font-weight: 600; font-size: 1.06rem; letter-spacing: -0.02em; white-space: nowrap; }
.at-nav__links { display: flex; align-items: center; gap: clamp(16px, 2vw, 32px); margin-left: auto; }
.at-nav__links a {
  font-size: 0.93rem; font-weight: 500; letter-spacing: -0.012em;
  text-decoration: none; padding: 6px 0;
  border-bottom: var(--border-weight) solid transparent; transition: border-color 0.15s ease; white-space: nowrap;
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
  border-top: var(--border-weight) solid var(--line);
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

.at-strip { border-bottom: var(--border-weight) solid var(--line); background: var(--paper); }
.at-strip__in { padding-block: clamp(40px, 4.6vw, 64px); }
.at-partners {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(146px, 100%), 1fr));
  gap: 1px;
  background: var(--line);
  border: var(--border-weight) solid var(--line);
}
.at-partners > span {
  background: var(--paper);
  display: grid; place-items: center;
  padding: clamp(18px, 2.2vw, 28px) clamp(12px, 1.6vw, 20px);
  min-height: 100px;
  transition: background-color 0.18s ease;
}
.at-partners > span:hover { background: var(--mist); }
/* Full colour and roughly double the old size. These are health funds and
   accreditations — a prospect checking whether their insurer is accepted has
   to be able to read them, and desaturating is what stops a Bupa logo looking
   like Bupa. */
.at-partners img { max-height: 58px; max-width: 100%; width: auto; height: auto; object-fit: contain; }
.at-strip__label {
  font-size: 0.7rem; letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--ink-muted); margin: 0 0 18px; text-align: center;
}
/* Text-form credentials ("AHPRA registered") for sites with no partner logos to crawl —
   same strip, a lighter-weight treatment than the logo tiles since there's no image to
   give the pill its own visual weight. */
.at-credentials { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; }
.at-credentials > span {
  font-size: 0.82rem; color: var(--on-secondary); padding: 8px 16px;
  border: var(--border-weight) solid var(--line); border-radius: var(--radius-pill); background: var(--secondary);
}

/* ---------- differentiators: the strongest reliable content ---------- */

/* ---------- differentiators: the page's one card section ----------
   Every section can't be ruled rows any more than every section can be a grid.
   This is where boxes earn their place: short punchy titles with a sentence
   each, four to eight of them, no natural order. Cards suit that.

   Deliberately unnumbered. Counting implies an order, and these have none —
   the same reason a services list isn't numbered. The numerals belong to the
   process band, where the sequence is the point; using them in both places
   made two sections read as the same object. What stops this reading as a
   lattice is the stagger and the rule, not a figure. */

.at-why { background: var(--deep); color: var(--paper); }
.at-why__in { padding-block: var(--band); }
.at-why .at-eyebrow { color: rgb(255 255 255 / 0.55); }
.at-why .at-em { color: var(--paper); opacity: 0.9; }
.at-why__head { max-width: 44ch; margin-bottom: clamp(34px, 4.4vw, 62px); }

.at-why__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(276px, 100%), 1fr));
  gap: clamp(16px, 2vw, 26px);
  align-items: start;
}
.at-why__card {
  position: relative;
  background: var(--deep-soft);
  border: var(--border-weight) solid rgb(255 255 255 / 0.12);
  border-radius: var(--radius-card);
  padding: clamp(26px, 2.6vw, 34px) clamp(24px, 2.4vw, 32px);
  transition: transform 0.22s ease, border-color 0.22s ease;
}
.at-why__card:hover { transform: translateY(-4px); border-color: color-mix(in srgb, var(--accent) 60%, transparent); }
/* Stagger, so a row of four doesn't read as a spec-sheet lattice. */
.at-why__card:nth-child(even) { margin-top: clamp(18px, 2.6vw, 40px); }
/* A short accent rule instead of a number — it marks the card without
   claiming a position in a sequence. */
.at-why__card::before {
  content: "";
  display: block;
  width: 26px; height: 2px;
  background: var(--accent);
  margin-bottom: clamp(18px, 2vw, 24px);
  transition: width 0.28s cubic-bezier(0.2, 0, 0.1, 1);
}
.at-why__card:hover::before { width: 48px; }
.at-why__card h3 {
  margin: 0 0 10px;
  font-size: clamp(1.06rem, 1.7vw, 1.24rem);
  font-weight: 600; letter-spacing: -0.026em; line-height: 1.22;
}
.at-why__card p { margin: 0; font-size: 0.95rem; line-height: 1.62; color: rgb(255 255 255 / 0.66); }

/* ---------- services: a glossary, not cards ----------
   Was cards below seven services and a two-column index above — two layouts,
   so a client never knew which page they'd get, and the switch point was
   arbitrary. One treatment instead: a definition list flowing across two
   columns, name in the accent and description running on beneath. Reads like
   an index in a book, holds identically at four services and nineteen. */

.at-svc__in { padding-block: var(--band); }
.at-svc__head { max-width: 40ch; margin-bottom: clamp(30px, 4vw, 54px); }

.at-svc__list {
  columns: 2;
  column-gap: clamp(30px, 5vw, 76px);
  margin: 0;
}
.at-svc__item {
  break-inside: avoid;
  padding-block: clamp(13px, 1.5vw, 19px);
  border-bottom: var(--border-weight) solid var(--line);
}
.at-svc__item:first-child { border-top: var(--border-weight) solid var(--line); }
.at-svc__item dt {
  font-size: 1.02rem; font-weight: 600;
  letter-spacing: -0.024em; line-height: 1.25;
  color: var(--ink);
}
.at-svc__item dd {
  margin: 5px 0 0;
  font-size: 0.9rem; line-height: 1.56; color: var(--ink-muted);
}

/* ---------- process: numerals across ----------
   A vertical timeline is still a list, and this page already has one. Here the
   numbers themselves are the structure — set large in the brand colour,
   wrapping across the band with the step beneath each. No rail, no rules, no
   boxes. Reads as a sequence because the figures count up, not because a line
   says so. */

.at-proc { background: var(--mist); }
.at-proc__in { padding-block: var(--band); }
.at-proc__head { max-width: 40ch; margin-bottom: clamp(34px, 4.4vw, 60px); }

.at-proc__list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(196px, 100%), 1fr));
  gap: clamp(26px, 3.4vw, 48px) clamp(20px, 2.6vw, 38px);
}
.at-proc__step { position: relative; }
.at-proc__no {
  display: block;
  font-size: clamp(2.2rem, 4.2vw, 3.4rem);
  font-weight: 600; letter-spacing: -0.055em; line-height: 0.9;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
  margin-bottom: clamp(12px, 1.4vw, 18px);
}
.at-proc__step h3 { margin: 0 0 7px; font-size: 1.04rem; font-weight: 600; letter-spacing: -0.024em; line-height: 1.2; }
.at-proc__step p { margin: 0; font-size: 0.92rem; line-height: 1.58; color: var(--ink-muted); }

/* ---------- about + team ---------- */

.at-about__in { padding-block: var(--band); }
.at-about__grid {
  display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: clamp(30px, 4.5vw, 70px); align-items: start;
}
.at-about__body { font-size: clamp(1.02rem, 1.7vw, 1.2rem); line-height: 1.6; margin: 0; letter-spacing: -0.012em; }

/* Team photographs run as a filmstrip — images and names, no frames. The
   differentiator section already owns cards; repeating them here would make
   two of nine sections identical in construction. */
.at-team { display: flex; flex-wrap: wrap; gap: clamp(14px, 2vw, 26px); }
.at-team figure { margin: 0; flex: 1 1 clamp(130px, 15vw, 180px); max-width: 200px; }
.at-team img { width: 100%; aspect-ratio: 3 / 4; object-fit: cover; border-radius: var(--radius-image); }
.at-team figcaption { padding-top: 12px; }
.at-team b { display: block; font-size: 1rem; font-weight: 600; letter-spacing: -0.02em; }
.at-team span { display: block; margin-top: 3px; font-size: 0.86rem; color: var(--ink-muted); line-height: 1.4; }

.at-scenes { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(240px, 100%), 1fr)); gap: clamp(12px, 1.6vw, 18px); }
.at-scenes figure { margin: 0; overflow: hidden; border-radius: var(--radius-image); background: var(--mist); position: relative; }
.at-scenes img { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; }
.at-scenes figcaption {
  position: absolute; left: 0; right: 0; bottom: 0;
  padding: 34px 16px 13px; font-size: 0.79rem; color: var(--paper);
  background: linear-gradient(to top, rgb(0 0 0 / 0.6), transparent);
}

/* ---------- testimonials: one statement, three supporting ----------
   A column of twelve quotes is a list, and the page has its list already. One
   quote gets real size and three sit beneath it in a single row, hairline
   separated. Capping at three is the point — a prospect reads one testimonial
   properly or twelve not at all. */

.at-says { background: var(--accent); color: var(--accent-ink); }
.at-says__in { padding-block: var(--band); }
.at-says .at-eyebrow { color: color-mix(in srgb, var(--accent-ink) 60%, transparent); justify-content: center; }
.at-says__head { text-align: center; max-width: 34ch; margin-inline: auto; margin-bottom: clamp(34px, 4.2vw, 56px); }
.at-says .at-em { color: currentColor; opacity: 0.82; }

.at-says__lead {
  margin: 0 auto;
  max-width: 24ch;
  text-align: center;
  font-size: clamp(1.5rem, 3.6vw, 2.7rem);
  line-height: 1.2; letter-spacing: -0.032em; font-weight: 500;
}
.at-says__lead cite {
  display: block; margin-top: clamp(20px, 2.4vw, 30px);
  font-style: normal; font-size: 0.76rem; letter-spacing: 0.14em;
  text-transform: uppercase; opacity: 0.72;
}
/* Two supporting quotes at unequal widths, the second dropped — the process
   band above is already an even row of items, so this can't be one too. */
.at-says__rest {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
  gap: clamp(24px, 4vw, 64px);
  margin-top: clamp(44px, 5.4vw, 78px);
  padding-top: clamp(28px, 3.4vw, 42px);
  border-top: var(--border-weight) solid color-mix(in srgb, var(--accent-ink) 28%, transparent);
}
.at-says__rest blockquote { margin: 0; }
.at-says__rest blockquote:nth-child(2) { margin-top: clamp(18px, 2.4vw, 34px); }
.at-says__rest p { margin: 0 0 10px; font-size: 0.95rem; line-height: 1.56; letter-spacing: -0.012em; }
.at-says__rest footer { font-size: 0.78rem; letter-spacing: 0.06em; opacity: 0.74; }
.at-says__rest footer b { font-weight: 600; opacity: 1; }

/* ---------- faq ---------- */

.at-faq__in { padding-block: var(--band); }
.at-faq__list { border-top: var(--border-weight) solid var(--line); max-width: min(100%, 860px); }
.at-faq details { border-bottom: var(--border-weight) solid var(--line); }
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

/* ---------- cta: a split panel ----------
   The contact rows were a ruled definition list — structurally the same object
   as the services glossary. Two panels side by side instead: the ask on the
   accent, the details on paper, forming one block rather than a band with a
   list in it. */

.at-cta { background: var(--mist); }
.at-cta__in { padding-block: clamp(52px, 6.5vw, 92px); }
.at-cta__panel {
  display: grid;
  grid-template-columns: minmax(0, 1.06fr) minmax(0, 0.94fr);
  border-radius: var(--radius-card);
  overflow: hidden;
  box-shadow: var(--shadow-elevated);
}
.at-cta__ask {
  background: var(--accent); color: var(--accent-ink);
  padding: clamp(34px, 4vw, 58px) clamp(28px, 3.4vw, 48px);
}
.at-cta__ask .at-h2 { max-width: 16ch; }
.at-cta__note { margin: 16px 0 0; max-width: 38ch; opacity: 0.84; font-size: 0.97rem; line-height: 1.58; }
.at-cta__ask .at-actions { margin-top: 28px; }
.at-cta__ask .at-btn--solid { background: var(--paper); color: var(--ink); }
.at-cta__ask .at-btn--ghost { color: currentColor; border-color: color-mix(in srgb, var(--accent-ink) 46%, transparent); }
.at-cta__ask .at-btn--ghost:hover { background: var(--accent-ink); color: var(--accent); border-color: var(--accent-ink); }

.at-cta__side {
  background: var(--paper);
  padding: clamp(34px, 4vw, 58px) clamp(28px, 3.4vw, 48px);
  display: grid; align-content: center; gap: clamp(18px, 2.2vw, 28px);
}
.at-cta__side div > span {
  display: block; font-size: 0.72rem; letter-spacing: 0.13em;
  text-transform: uppercase; color: var(--ink-muted); margin-bottom: 6px;
}
.at-cta__side strong { font-size: 1.04rem; font-weight: 600; letter-spacing: -0.018em; line-height: 1.45; }
.at-cta__side a { text-decoration: none; }
.at-cta__side a:hover { color: var(--accent); }

/* No contact details at all — the ask fills the panel on its own. */
.at-cta--slim .at-cta__panel { grid-template-columns: minmax(0, 1fr); }

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
}
@media (max-width: 860px) {
  .at-cta__panel { grid-template-columns: minmax(0, 1fr); }
  .at-says__rest { grid-template-columns: minmax(0, 1fr); }
  .at-says__rest blockquote:nth-child(2) { margin-top: 0; }
  .at-why__card:nth-child(even) { margin-top: 0; }
  .at-svc__list { columns: 1; }
  .at-about__grid { grid-template-columns: minmax(0, 1fr); }
  .at-nav__tel { display: none; }
}
@media (max-width: 520px) {
  body.tpl-atlas { font-size: 16px; }
  .at-actions .at-btn { flex: 1 1 auto; justify-content: center; }
}
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  .tpl-atlas *, .tpl-atlas *::before { transition-duration: 0.01ms !important; }
}
.tpl-atlas a:focus-visible, .tpl-atlas summary:focus-visible { outline: var(--focus-ring-width) solid var(--ring); outline-offset: 3px; }
.at-why a:focus-visible, .at-cta a:focus-visible, .at-foot a:focus-visible { outline-color: currentColor; }
`;
}
