import type { TemplateContent, TemplateImage } from "../types";
import { buildPalette } from "../../content/normalize-brand-colors";
import { byOrientation } from "../../content/content-guards";
import { escapeHtml as esc } from "../escape-html";
import { showcaseStyles } from "./styles";

// Face-forward crop instead of a dead-center one — the difference between a headshot
// cropped at the eyebrows and one that reads correctly. Only applied to subject:"people"
// images; a place/work/product photo has no face to protect and center-cropping is fine.
function imgAttrs(img: TemplateImage): string {
  return img.subject === "people" ? ' style="object-position:center 30%"' : "";
}

function splitTagline(tagline: string): { head: string; tail: string } {
  const t = (tagline || "").trim();
  if (!t) return { head: "", tail: "" };
  const dash = t.search(/\s[—–-]\s/);
  if (dash > 8 && dash < t.length - 8) return { head: t.slice(0, dash).trim(), tail: t.slice(dash + 3).trim() };
  const colon = t.indexOf(": ");
  if (colon > 8 && colon < t.length - 8) return { head: t.slice(0, colon).trim(), tail: t.slice(colon + 2).trim() };
  const words = t.split(/\s+/);
  if (words.length < 5) return { head: t, tail: "" };
  const cut = Math.ceil(words.length * 0.58);
  return { head: words.slice(0, cut).join(" "), tail: words.slice(cut).join(" ") };
}

function firstSentence(text: string): string {
  const t = (text || "").trim();
  if (!t) return "";
  const m = t.match(/^[\s\S]*?[.!?](\s|$)/);
  const s = (m ? m[0] : t).trim();
  return s.length > 220 ? s.slice(0, 217).trimEnd() + "…" : s;
}

function telHref(phone: string): string {
  return "tel:" + phone.replace(/[^\d+]/g, "");
}

/**
 * Distributes however many images exist across the layout's slots, in priority
 * order, never reusing one. This is the whole trick of the template: a prospect
 * with four photos and a prospect with fourteen both get a page that looks
 * intentional, because slots that can't be filled simply don't render.
 *
 * Priority is deliberate — the hero and the service tiles carry most of the
 * visual weight, so they're fed first. The mosaic is last because it's the
 * section a page can most comfortably do without.
 *
 * Orientation-aware, not just count-aware — confirmed live that Propell's portrait
 * headshots (1600×2000) forced into hero/tiles/feature's landscape-shaped slots
 * cropped a head off. hero/tiles/feature only draw from landscape+square; pair is the
 * one slot actually shaped for portraits (5/4 and 1/1, both close to square) and draws
 * from portrait first. Mosaic is the deliberate exception: one of its four repeating
 * slot shapes (nth-child(4n+2)) is itself portrait-ratio, so it's the only place a
 * leftover portrait is allowed to fill a landscape-preferring slot rather than being
 * left unplaced.
 */
type Slots = {
  hero: TemplateImage | null;
  feature: TemplateImage | null;
  about: TemplateImage[]; // 0–3
  cta: TemplateImage | null;
  mosaic: TemplateImage[]; // 0 or 3+
};

function allocateImages(hero: TemplateImage | null, gallery: TemplateImage[]): Slots {
  let pool: TemplateImage[] = [];
  const seen = new Set<string>();
  const push = (img: TemplateImage | null | undefined) => {
    if (img?.url && !seen.has(img.url)) {
      seen.add(img.url);
      pool.push(img);
    }
  };
  push(hero);
  for (const g of gallery) push(g);

  const drop = (imgs: TemplateImage[]) => {
    const urls = new Set(imgs.map((i) => i.url));
    pool = pool.filter((i) => !urls.has(i.url));
  };
  const wide = () => {
    const { landscape, square } = byOrientation(pool);
    return [...landscape, ...square];
  };

  const slots: Slots = { hero: null, feature: null, about: [], cta: null, mosaic: [] };

  const heroPick = wide();
  if (heroPick.length) {
    slots.hero = heroPick[0];
    drop([slots.hero]);
  }

  const featurePick = wide();
  if (featurePick.length) {
    slots.feature = featurePick[0];
    drop([slots.feature]);
  }

  // About takes portraits first — a tall photo has nowhere better to go, and
  // this section renders every image at its own proportions.
  const { portrait } = byOrientation(pool);
  const aboutPick = [...portrait, ...wide()];
  if (aboutPick.length) {
    slots.about = aboutPick.slice(0, 3);
    drop(slots.about);
  }

  // The closing band gets a photo before the gallery does — a bookend to the
  // hero is worth more than one more frame in a mosaic.
  const ctaPick = wide();
  if (ctaPick.length) {
    slots.cta = ctaPick[0];
    drop([slots.cta]);
  }

  if (pool.length >= 3) slots.mosaic = pool.slice(0, 7);

  return slots;
}

export function renderShowcase(c: TemplateContent): { body: string; css: string } {
  const p = buildPalette(c.brandColors || []);
  const { head, tail } = splitTagline(c.tagline);
  const services = c.services || [];
  const quotes = c.testimonials || [];
  const partners = c.partnerLogos || [];
  // galleryImages already includes whatever heroImageUrl points at (see
  // to-template-content.ts) — look it up there for its width/height/subject instead of
  // passing a bare URL, so allocateImages can weigh it by orientation like everything else.
  const heroCandidate = (c.galleryImages || []).find((i) => i.url === c.heroImageUrl) ?? null;
  const img = allocateImages(heroCandidate, c.galleryImages || []);

  const primaryCta = c.contactPhone
    ? `<a class="sc-btn sc-btn--solid" href="${esc(telHref(c.contactPhone))}">Call ${esc(c.contactPhone)}</a>`
    : c.contactEmail
      ? `<a class="sc-btn sc-btn--solid" href="mailto:${esc(c.contactEmail)}">Get in touch</a>`
      : "";
  const secondaryCta = services.length ? `<a class="sc-btn sc-btn--ghost" href="#services">What we do</a>` : "";

  // ---- nav
  const mark = c.logoUrl
    ? `<img class="sc-nav__logo" src="${esc(c.logoUrl)}" alt="${esc(c.businessName)}">`
    : `<span class="sc-nav__name">${esc(c.businessName)}</span>`;

  const navLinks: string[] = [];
  if (services.length) navLinks.push('<a href="#services">Services</a>');
  if (c.aboutCopy) navLinks.push('<a href="#about">About</a>');
  if (img.mosaic.length) navLinks.push('<a href="#work">Work</a>');
  if (quotes.length) navLinks.push('<a href="#reviews">Reviews</a>');
  navLinks.push('<a href="#contact">Contact</a>');

  const nav = `
<header class="sc-nav">
  <div class="sc-wrap sc-nav__in">
    <div class="sc-nav__mark">${mark}</div>
    <nav class="sc-nav__links" aria-label="Sections">${navLinks.join("")}</nav>
    <div class="sc-nav__side">
      ${c.contactPhone ? `<a class="sc-nav__tel" href="${esc(telHref(c.contactPhone))}">${esc(c.contactPhone)}</a>` : ""}
      <a class="sc-btn sc-btn--solid" href="#contact">Get in touch</a>
    </div>
  </div>
</header>`;

  // ---- hero
  const hero = `
<section class="sc-hero${img.hero ? "" : " sc-hero--noimg"}">
  ${img.hero ? `<div class="sc-hero__bg"><img src="${esc(img.hero.url)}" alt=""${imgAttrs(img.hero)}></div>` : ""}
  <div class="sc-wrap sc-hero__in">
    <div class="sc-hero__copy">
      <h1 class="sc-display">${esc(head)}${tail ? ` <span class="sc-em">${esc(tail)}</span>` : ""}</h1>
    </div>
    ${c.aboutCopy ? `<p class="sc-lede">${esc(firstSentence(c.aboutCopy))}</p>` : ""}
    <div class="sc-actions">${primaryCta}${secondaryCta}</div>
  </div>
</section>`;

  // Nav is sticky and translucent rather than overlaid, so it's just a sibling
  // of the hero now — no shared stacking context needed.
  const top = `${nav}${hero}`;

  // ---- services: no photographs, deliberately (see styles.ts)
  const servicesSection = services.length
    ? `
<section class="sc-svc" id="services">
  <div class="sc-wrap sc-svc__in">
    <div class="sc-svc__head">
      <p class="sc-eyebrow">What we do</p>
      <h2 class="sc-h2">Everything ${esc(c.businessName)} <span class="sc-em">looks after</span></h2>
    </div>
    <div class="sc-svc__list">${services
      .map(
        (s, i) => `<div class="sc-svc__row${i < 3 ? " sc-svc__row--lead" : ""}">
      <span class="sc-svc__no">${String(i + 1).padStart(2, "0")}</span>
      <h3 class="sc-svc__name">${esc(s.name)}</h3>
      ${s.description ? `<p>${esc(s.description)}</p>` : "<span></span>"}
    </div>`,
      )
      .join("")}</div>
  </div>
</section>`
    : "";

  // ---- feature band: a pull-quote over a full-bleed image
  const featureQuote = quotes.length
    ? { text: quotes[0].quote, cite: quotes[0].author }
    : c.tagline
      ? { text: c.tagline, cite: c.businessName }
      : null;

  const feature =
    img.feature && featureQuote
      ? `
<section class="sc-feature">
  <img src="${esc(img.feature.url)}" alt=""${imgAttrs(img.feature)}>
  <div class="sc-wrap sc-feature__in">
    <p class="sc-eyebrow">${quotes.length ? "In their words" : "Who we are"}</p>
    <blockquote>${esc(featureQuote.text)}</blockquote>
    <cite>${esc(featureQuote.cite)}</cite>
  </div>
</section>`
      : "";

  // ---- about: sticky label column, statement copy, offset photographs
  const about = c.aboutCopy
    ? `
<section class="sc-about" id="about">
  <div class="sc-wrap sc-about__in">
    <div class="sc-about__grid">
      <aside class="sc-about__aside">
        <p class="sc-eyebrow">About us</p>
        <p>${esc(c.businessName)}</p>
      </aside>
      <div>
        <p class="sc-about__lead">${esc(firstSentence(c.aboutCopy))}</p>
        <p class="sc-about__body">${esc(c.aboutCopy)}</p>
        ${
          img.about.length
            ? `<div class="sc-about__shots">${img.about
                .map(
                  (a) => `<figure>
          <img src="${esc(a.url)}" alt=""${imgAttrs(a)}>${a.caption ? `<figcaption>${esc(a.caption)}</figcaption>` : ""}
        </figure>`,
                )
                .join("")}</div>`
            : ""
        }
      </div>
    </div>
  </div>
</section>`
    : "";

  // ---- mosaic
  const mosaic = img.mosaic.length
    ? `
<section class="sc-mosaic" id="work">
  <div class="sc-wrap sc-mosaic__in">
    <div class="sc-mosaic__head">
      <p class="sc-eyebrow">A look around</p>
      <h2 class="sc-h2">See it <span class="sc-em">for yourself</span></h2>
    </div>
    <div class="sc-mosaic__grid">
      ${img.mosaic
        .map(
          (m) => `<figure><img src="${esc(m.url)}" alt=""${imgAttrs(m)}>${
            m.caption ? `<figcaption>${esc(m.caption)}</figcaption>` : ""
          }</figure>`,
        )
        .join("")}
    </div>
  </div>
</section>`
    : "";

  // ---- partner strip
  const strip = partners.length
    ? `
<section class="sc-strip">
  <div class="sc-wrap sc-strip__in">
    <p class="sc-strip__label">Trusted partners &amp; accreditations</p>
    <div class="sc-strip__row">${partners.map((l) => `<img src="${esc(l.url)}" alt="">`).join("")}</div>
  </div>
</section>`
    : "";

  // ---- testimonials: strongest quote at display size, the rest ruled
  const remaining = img.feature && quotes.length ? quotes.slice(1) : quotes;
  const lead = remaining[0];
  const rest = remaining.slice(1);

  const quotesSection = remaining.length
    ? `
<section class="sc-quotes" id="reviews">
  <div class="sc-wrap sc-quotes__in">
    <blockquote class="sc-quotes__lead">
      “${esc(lead.quote)}”
      <cite>${esc(lead.author)}${lead.role ? " — " + esc(lead.role) : ""}</cite>
    </blockquote>
    ${
      rest.length
        ? `<div class="sc-quotes__rest">${rest
            .slice(0, 8)
            .map(
              (q) => `<blockquote>
        <p>${esc(q.quote)}</p>
        <footer><b>${esc(q.author)}</b>${q.role ? " — " + esc(q.role) : ""}</footer>
      </blockquote>`,
            )
            .join("")}</div>`
        : ""
    }
  </div>
</section>`
    : "";

  // ---- cta
  const ctaFacts: string[] = [];
  if (c.contactPhone)
    ctaFacts.push(`<span><b>Call</b> <a href="${esc(telHref(c.contactPhone))}">${esc(c.contactPhone)}</a></span>`);
  if (c.contactEmail)
    ctaFacts.push(`<span><b>Email</b> <a href="mailto:${esc(c.contactEmail)}">${esc(c.contactEmail)}</a></span>`);
  if (c.contactAddress) ctaFacts.push(`<span><b>Find us</b> ${esc(c.contactAddress)}</span>`);

  const cta = `
<section class="sc-cta${img.cta ? "" : " sc-cta--plain"}" id="contact">
  ${img.cta ? `<div class="sc-cta__bg"><img src="${esc(img.cta.url)}" alt=""${imgAttrs(img.cta)}></div>` : ""}
  <div class="sc-wrap sc-cta__in">
    <p class="sc-eyebrow">Get in touch</p>
    <h2 class="sc-h2">Ready when <span class="sc-em">you are</span></h2>
    <div class="sc-actions">${primaryCta}${
      c.contactEmail
        ? `<a class="sc-btn sc-btn--ghost" href="mailto:${esc(c.contactEmail)}">Send us a message</a>`
        : ""
    }</div>
    ${ctaFacts.length ? `<div class="sc-cta__facts">${ctaFacts.join("")}</div>` : ""}
  </div>
</section>`;

  // ---- footer
  const hasContact = Boolean(c.contactPhone || c.contactEmail || c.contactAddress);
  const foot = `
<footer class="sc-foot">
  <div class="sc-wrap sc-foot__in">
    <div>
      <p class="sc-foot__name">${esc(c.businessName)}</p>
      ${c.tagline ? `<p>${esc(c.tagline)}</p>` : ""}
    </div>
    ${
      hasContact
        ? `<div>
      <h4>Get in touch</h4>
      ${c.contactPhone ? `<a href="${esc(telHref(c.contactPhone))}">${esc(c.contactPhone)}</a>` : ""}
      ${c.contactEmail ? `<a href="mailto:${esc(c.contactEmail)}">${esc(c.contactEmail)}</a>` : ""}
      ${c.contactAddress ? `<p>${esc(c.contactAddress)}</p>` : ""}
    </div>`
        : ""
    }
    ${
      services.length
        ? `<div><h4>Services</h4>${services.slice(0, 6).map((s) => `<p>${esc(s.name)}</p>`).join("")}</div>`
        : ""
    }
  </div>
</footer>`;

  return {
    css: showcaseStyles(p),
    body: [top, servicesSection, feature, about, mosaic, strip, quotesSection, cta, foot].join("\n"),
  };
}
