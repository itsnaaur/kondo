import type { TemplateContent } from "../types";
import { buildPalette } from "../../content/normalize-brand-colors";
import { escapeHtml as esc } from "../escape-html";
import { showcaseStyles } from "./styles";

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
 */
type Slots = {
  hero: string | null;
  tiles: string[]; // 0 or 3+
  feature: string | null;
  pair: string[]; // 0 or 2
  mosaic: string[]; // 0 or 3+
};

function allocateImages(hero: string | null, gallery: { url: string }[]): Slots {
  const pool: string[] = [];
  if (hero) pool.push(hero);
  for (const g of gallery) if (g.url && !pool.includes(g.url)) pool.push(g.url);

  const take = (n: number): string[] => pool.splice(0, n);
  const slots: Slots = { hero: null, tiles: [], feature: null, pair: [], mosaic: [] };

  slots.hero = pool.length ? take(1)[0] : null;

  // Tiles need at least 3 to read as a grid; with 1–2 spare the services
  // render as a ruled list instead, which looks deliberate rather than sparse.
  if (pool.length >= 3) slots.tiles = take(3);
  if (pool.length >= 1) slots.feature = take(1)[0];
  if (pool.length >= 2) slots.pair = take(2);
  if (pool.length >= 3) slots.mosaic = take(Math.min(pool.length, 7));

  return slots;
}

export function renderShowcase(c: TemplateContent): { body: string; css: string } {
  const p = buildPalette(c.brandColors || []);
  const { head, tail } = splitTagline(c.tagline);
  const services = c.services || [];
  const quotes = c.testimonials || [];
  const partners = c.partnerLogos || [];
  const img = allocateImages(c.heroImageUrl, c.galleryImages || []);

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
<header class="sc-nav${img.hero ? " sc-nav--over" : ""}">
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
  ${img.hero ? `<div class="sc-hero__bg"><img src="${esc(img.hero)}" alt=""></div>` : ""}
  <div class="sc-wrap sc-hero__in">
    <div class="sc-hero__copy">
      <h1 class="sc-display">${esc(head)}${tail ? ` <span class="sc-em">${esc(tail)}</span>` : ""}</h1>
    </div>
    ${c.aboutCopy ? `<p class="sc-lede">${esc(firstSentence(c.aboutCopy))}</p>` : ""}
    <div class="sc-actions">${primaryCta}${secondaryCta}</div>
  </div>
</section>`;

  // Nav overlays the hero photo, so the two ship as one block.
  const top = img.hero ? `<div class="sc-top">${nav}${hero}</div>` : `${nav}${hero}`;

  // ---- services: tiles for the first three, ruled list for the rest
  const tiled = img.tiles.length ? services.slice(0, 3) : [];
  const listed = services.slice(tiled.length);

  const servicesSection = services.length
    ? `
<section class="sc-tiles" id="services">
  <div class="sc-wrap sc-tiles__in">
    <div class="sc-tiles__head">
      <p class="sc-eyebrow">What we do</p>
      <h2 class="sc-h2">Everything ${esc(c.businessName)} <span class="sc-em">looks after</span></h2>
    </div>
    ${
      tiled.length
        ? `<div class="sc-tiles__grid">${tiled
            .map(
              (s, i) => `<article class="sc-tile">
        <div class="sc-tile__img"><img src="${esc(img.tiles[i])}" alt=""></div>
        <h3>${esc(s.name)}</h3>
        ${s.description ? `<p>${esc(s.description)}</p>` : ""}
      </article>`,
            )
            .join("")}</div>`
        : ""
    }
    ${
      listed.length
        ? `<div class="sc-grid">${listed
            .map(
              (s) => `<div class="sc-grid__cell">
        <h4>${esc(s.name)}</h4>
        ${s.description ? `<p>${esc(s.description)}</p>` : ""}
      </div>`,
            )
            .join("")}</div>`
        : ""
    }
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
  <img src="${esc(img.feature)}" alt="">
  <div class="sc-wrap sc-feature__in">
    <p class="sc-eyebrow">${quotes.length ? "In their words" : "Who we are"}</p>
    <blockquote>${esc(featureQuote.text)}</blockquote>
    <cite>${esc(featureQuote.cite)}</cite>
  </div>
</section>`
      : "";

  // ---- about + asymmetric image pair
  const about = c.aboutCopy
    ? `
<section class="sc-pair" id="about">
  <div class="sc-wrap sc-pair__in">
    <div class="sc-pair__grid">
      <div>
        <p class="sc-eyebrow">About us</p>
        <h2 class="sc-h2">A little more <span class="sc-em">about how we work</span></h2>
        <p class="sc-lede">${esc(c.aboutCopy)}</p>
      </div>
      ${
        img.pair.length === 2
          ? `<div class="sc-pair__stack">
        <figure><img src="${esc(img.pair[0])}" alt=""></figure>
        <figure><img src="${esc(img.pair[1])}" alt=""></figure>
      </div>`
          : ""
      }
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
      ${img.mosaic.map((u) => `<figure><img src="${esc(u)}" alt=""></figure>`).join("")}
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

  // ---- testimonials (the first is already used in the feature band)
  const remaining = img.feature && quotes.length ? quotes.slice(1) : quotes;
  const quotesSection = remaining.length
    ? `
<section class="sc-quotes" id="reviews">
  <div class="sc-wrap sc-quotes__in">
    <p class="sc-eyebrow">In their words</p>
    <h2 class="sc-h2">What people <span class="sc-em">tell us</span></h2>
    <div class="sc-quotes__grid">
      ${remaining
        .slice(0, 6)
        .map(
          (q) => `<blockquote class="sc-quote">
        <p>${esc(q.quote)}</p>
        <footer><b>${esc(q.author)}</b>${q.role ? esc(q.role) : ""}</footer>
      </blockquote>`,
        )
        .join("")}
    </div>
  </div>
</section>`
    : "";

  // ---- cta
  const cta = `
<section class="sc-cta" id="contact">
  <div class="sc-wrap sc-cta__in">
    <h2 class="sc-h2">Ready when you are.</h2>
    <div class="sc-actions">${primaryCta}${c.contactEmail ? `<a class="sc-btn sc-btn--ghost" href="mailto:${esc(c.contactEmail)}">Send us a message</a>` : ""}</div>
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
