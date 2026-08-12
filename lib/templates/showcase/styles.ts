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

/* ---------- nav ----------
   Sticky and translucent rather than absolutely positioned over the hero. The
   overlay version put the photo directly behind the links, so legibility
   depended entirely on what the crawl happened to return — a bright sky behind
   white nav text is unreadable and we can't control which image arrives.

   Now the bar holds its own ground at the top of the page and the hero begins
   beneath it. Scrolling moves content under a blurred bar, which is the
   behaviour you get from an overlay without the legibility gamble. */
.sc-nav {
  position: sticky;
  top: 0;
  z-index: 20;
  background: color-mix(in srgb, var(--paper) 76%, transparent);
  -webkit-backdrop-filter: blur(16px) saturate(160%);
  backdrop-filter: blur(16px) saturate(160%);
  border-bottom: 1px solid color-mix(in srgb, var(--line) 70%, transparent);
}
/* No backdrop-filter support — fall back to an opaque bar rather than a
   see-through one, which is the failure this change exists to avoid. */
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .sc-nav { background: var(--paper); }
}

/* ---------- hero: full-bleed photo ---------- */

.sc-hero {
  position: relative;
  display: grid;
  align-items: end;
  min-height: min(74vh, 660px);
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

/* ---------- services: type, not tiles ----------
   Photos are deliberately absent here. Setting a service name over an image
   claims that image illustrates that service, and subject classification is
   only confident on a minority of clients — so the claim is usually unfounded.
   The same failure as a cookie icon captioned "Entertainment Systems", just
   better dressed.

   The names themselves carry it instead: hanging numerals, large type, ruled
   rows. Holds from four services to nineteen because each entry is one row,
   and the first three get extra weight since extraction order roughly tracks
   how prominently a site features them. */

.sc-svc__in { padding-top: var(--band); padding-bottom: var(--band); }
.sc-svc__head { max-width: 40ch; margin-bottom: clamp(34px, 4.4vw, 62px); }

.sc-svc__list { border-top: 1px solid var(--line); }
.sc-svc__row {
  display: grid;
  grid-template-columns: clamp(48px, 6vw, 88px) minmax(0, 1fr) minmax(0, 1.15fr);
  gap: clamp(14px, 2.6vw, 46px);
  align-items: baseline;
  padding: clamp(18px, 2.2vw, 30px) 4px;
  border-bottom: 1px solid var(--line);
  transition: padding-left 0.22s cubic-bezier(0.2, 0, 0.1, 1);
}
.sc-svc__row:hover { padding-left: 16px; }
.sc-svc__no {
  font-size: 0.76rem; font-weight: 600; letter-spacing: 0.14em;
  color: var(--accent); font-variant-numeric: tabular-nums;
}
.sc-svc__name {
  margin: 0;
  font-size: clamp(1.16rem, 2vw, 1.6rem);
  font-weight: 600; letter-spacing: -0.03em; line-height: 1.12;
}
.sc-svc__row p { margin: 0; font-size: 0.95rem; line-height: 1.6; color: var(--ink-muted); }

/* The first three carry more weight — a flat list of nineteen equals reads as
   an inventory; a tapered one reads as a page. */
.sc-svc__row--lead .sc-svc__name { font-size: clamp(1.5rem, 3.1vw, 2.5rem); letter-spacing: -0.038em; }
.sc-svc__row--lead { padding-block: clamp(24px, 2.8vw, 40px); }
.sc-svc__row--lead p { font-size: 1.01rem; }

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

/* ---------- about: sticky label, statement copy ----------
   A label pinned in the margin while the copy scrolls past it — an editorial
   device rather than a card. The photographs sit beneath the text at their own
   proportions, offset from each other, which is the one place in this section
   an image makes no claim about what it depicts. */

.sc-about { background: var(--mist); }
.sc-about__in { padding-top: var(--band); padding-bottom: var(--band); }
.sc-about__grid {
  display: grid;
  grid-template-columns: clamp(120px, 16vw, 210px) minmax(0, 1fr);
  gap: clamp(24px, 4vw, 64px);
  align-items: start;
}
.sc-about__aside { position: sticky; top: 104px; }
.sc-about__aside .sc-eyebrow { margin-bottom: 12px; }
.sc-about__aside p { margin: 0; font-size: 0.85rem; line-height: 1.5; color: var(--ink-muted); }

.sc-about__lead {
  margin: 0;
  font-size: clamp(1.3rem, 2.9vw, 2.05rem);
  line-height: 1.26; letter-spacing: -0.03em; font-weight: 500;
  max-width: 30ch;
}
.sc-about__body {
  margin: clamp(20px, 2.4vw, 30px) 0 0;
  font-size: 1rem; line-height: 1.68; color: var(--ink-muted); max-width: 62ch;
}

.sc-about__shots {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(220px, 100%), 1fr));
  gap: clamp(14px, 1.8vw, 22px);
  margin-top: clamp(34px, 4.4vw, 58px);
  align-items: start;
}
.sc-about__shots figure {
  margin: 0; border-radius: 4px; overflow: hidden; background: var(--paper);
  box-shadow: 0 18px 40px -26px rgb(16 24 40 / 0.3);
}
/* Natural aspect — nothing cropped, whatever shape the crawl returns. */
.sc-about__shots img { width: 100%; height: auto; display: block; }
.sc-about__shots figure:nth-child(even) { margin-top: clamp(20px, 3.4vw, 46px); }
.sc-about__shots figcaption { padding: 11px 13px 13px; font-size: 0.8rem; line-height: 1.4; color: var(--ink-muted); }

/* ---------- mosaic ----------
   Was a six-column grid with nth-child rules assigning 16:9, 4:5 and 4:3 frames
   by position. Every image was cropped to whatever shape its index happened to
   land on, so a portrait in slot one lost its subject and a panorama in slot
   two became a square.

   Masonry columns instead: each photo keeps its own proportions and the column
   flow produces the varied rhythm the nth-child rules were faking. It also
   means a mixed set of portrait and landscape images reads as deliberate
   rather than mangled. */

.sc-mosaic { background: var(--mist); }
.sc-mosaic__in { padding-top: var(--band); padding-bottom: var(--band); }
.sc-mosaic__head { max-width: 34ch; margin-bottom: clamp(28px, 3.6vw, 46px); }
.sc-mosaic__grid {
  columns: 3;
  column-gap: clamp(12px, 1.6vw, 20px);
}
.sc-mosaic__grid figure {
  break-inside: avoid;
  margin: 0 0 clamp(12px, 1.6vw, 20px);
  border-radius: 4px;
  overflow: hidden;
  background: var(--paper);
  position: relative;
}
.sc-mosaic__grid img { width: 100%; height: auto; display: block; }
.sc-mosaic__grid figcaption {
  position: absolute;
  inset: auto 0 0 0;
  padding: 32px 14px 12px;
  font-size: 0.79rem;
  color: var(--paper);
  background: linear-gradient(to top, rgb(0 0 0 / 0.62), transparent);
}

/* ---------- testimonials: one large, the rest ruled ----------
   Was a grid of bordered cards, which is the shape three other sections
   already had. A client with sixteen quotes and a client with two need
   different things, so the strongest quote is set at display size on the bare
   page and the remainder run as ruled rows — no boxes anywhere. */

.sc-quotes__in { padding-top: var(--band); padding-bottom: var(--band); }
.sc-quotes__lead {
  margin: 0 auto;
  max-width: 24ch;
  text-align: center;
  font-size: clamp(1.5rem, 3.6vw, 2.7rem);
  line-height: 1.2; letter-spacing: -0.032em; font-weight: 500;
}
.sc-quotes__lead cite {
  display: block; margin-top: clamp(20px, 2.4vw, 30px);
  font-style: normal; font-size: 0.78rem; letter-spacing: 0.14em;
  text-transform: uppercase; color: var(--ink-muted);
}
.sc-quotes__rest {
  margin-top: clamp(44px, 5.4vw, 78px);
  border-top: 1px solid var(--line);
  columns: 2; column-gap: clamp(28px, 4.4vw, 64px);
}
.sc-quotes__rest blockquote {
  break-inside: avoid; margin: 0;
  padding: clamp(18px, 2.2vw, 26px) 2px;
  border-bottom: 1px solid var(--line);
}
.sc-quotes__rest p { margin: 0 0 10px; font-size: 0.98rem; line-height: 1.56; letter-spacing: -0.012em; }
.sc-quotes__rest footer { font-size: 0.84rem; color: var(--ink-muted); }
.sc-quotes__rest footer b { color: var(--ink); font-weight: 600; }

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
/* Text-form credentials ("AHPRA registered") for sites with no partner logos to crawl —
   same strip, a lighter-weight treatment than the logo row since there's no image to
   give the pill its own visual weight. */
.sc-credentials { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; }
.sc-credentials > span {
  font-size: 0.82rem; color: var(--ink-muted); padding: 8px 16px;
  border: 1px solid var(--line); border-radius: 999px;
}

/* ---------- cta ----------
   A flat accent stripe with a heading on one side and buttons on the other has
   no hierarchy, and on this template it sits directly above the dark footer —
   two heavy bands in a row to close the page.

   Showcase is the image-led template, so the CTA takes a photo when one is
   still unallocated: full-bleed, scrimmed, with the ask over it. That mirrors
   the hero and gives the page a bookend rather than a stripe. When no image is
   left it falls back to a deep gradient band, which is still a step up from
   flat colour. */

.sc-cta { position: relative; overflow: hidden; background: var(--deep); color: var(--paper); }
.sc-cta__bg { position: absolute; inset: 0; }
.sc-cta__bg img { width: 100%; height: 100%; object-fit: cover; }
.sc-cta__bg::after {
  content: "";
  position: absolute; inset: 0;
  background:
    linear-gradient(to top,
      color-mix(in srgb, var(--deep) 92%, transparent) 0%,
      color-mix(in srgb, var(--deep) 74%, transparent) 42%,
      color-mix(in srgb, var(--deep) 52%, transparent) 100%),
    radial-gradient(90% 80% at 50% 60%,
      color-mix(in srgb, var(--accent) 34%, transparent) 0%, transparent 72%);
}

/* No photo left — a designed band rather than a flat fill. */
.sc-cta--plain {
  background:
    radial-gradient(70% 90% at 88% 8%, color-mix(in srgb, var(--accent) 62%, transparent) 0%, transparent 62%),
    radial-gradient(60% 70% at 6% 96%, color-mix(in srgb, var(--accent) 38%, transparent) 0%, transparent 66%),
    var(--deep);
}

.sc-cta__in {
  position: relative; z-index: 1;
  padding-top: clamp(64px, 8.5vw, 118px); padding-bottom: clamp(64px, 8.5vw, 118px);
  text-align: center;
}
.sc-cta .sc-eyebrow { color: rgb(255 255 255 / 0.58); justify-content: center; }
.sc-cta .sc-h2 { max-width: 20ch; margin-inline: auto; }
.sc-cta .sc-em { color: var(--paper); opacity: 0.9; }
.sc-cta .sc-actions { justify-content: center; margin-top: 28px; }
.sc-cta .sc-btn--solid { background: var(--paper); color: var(--ink); }
.sc-cta .sc-btn--ghost { color: currentColor; border-color: rgb(255 255 255 / 0.4); }
.sc-cta .sc-btn--ghost:hover { background: var(--paper); color: var(--deep); border-color: var(--paper); }

/* Contact details beneath the buttons — one line, hairline-separated. Real
   extracted fields, so a client missing one simply has one fewer item. */
.sc-cta__facts {
  display: flex; flex-wrap: wrap; justify-content: center;
  gap: clamp(12px, 2.4vw, 34px);
  margin: clamp(30px, 3.6vw, 46px) auto 0;
  padding-top: clamp(22px, 2.6vw, 32px);
  border-top: 1px solid rgb(255 255 255 / 0.2);
  max-width: 860px;
}
.sc-cta__facts span { font-size: 0.9rem; color: rgb(255 255 255 / 0.78); }
.sc-cta__facts a { color: inherit; text-decoration: none; }
.sc-cta__facts a:hover { color: var(--paper); text-decoration: underline; }
.sc-cta__facts b { color: var(--paper); font-weight: 600; }

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

@media (max-width: 900px) {
  .sc-svc__row { grid-template-columns: 42px minmax(0, 1fr); gap: 6px 14px; }
  .sc-svc__row p { grid-column: 2; }
  .sc-about__grid { grid-template-columns: minmax(0, 1fr); gap: 22px; }
  .sc-about__aside { position: static; }
  .sc-quotes__rest { columns: 1; }
}

@media (max-width: 860px) {
  .sc-mosaic__grid { columns: 2; }
  .sc-hero { min-height: min(78vh, 620px); }
  .sc-hero__copy { max-width: 100%; }
  .sc-nav__tel { display: none; }
}

@media (max-width: 620px) {
  .sc-mosaic__grid { columns: 1; }
  }

@media (max-width: 520px) {
  body.tpl-showcase { font-size: 16px; }
  .sc-actions .sc-btn { flex: 1 1 auto; justify-content: center; }
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
