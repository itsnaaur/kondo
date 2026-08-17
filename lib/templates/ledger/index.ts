import type { TemplateContent } from "../types";
import { buildPalette } from "../../content/normalize-brand-colors";
import { ledgerStyles } from "./styles";
import { resolveTemplateTokens, type TemplateTokens } from "../../design/resolve-tokens";
import type { ResolveTypographyInput } from "../../design/resolve-typography";

function esc(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * A punctuation split is only worth taking if it leaves a balanced headline.
 * Propell's tagline breaks on its em-dash into 4 words and 11, so the italic
 * clause ran four lines against a one-line head and stopped reading as an
 * accent — it swallowed the headline instead.
 */
function balanced(head: string, tail: string): boolean {
  return tail.split(/\s+/).length <= head.split(/\s+/).length * 1.6;
}

/**
 * Splits a tagline into a plain head and an italic tail.
 * Every prospect's own tagline becomes the display headline, with its
 * closing clause set in the serif italic — so the page reads as written
 * for them rather than filled in around them.
 */
function splitTagline(tagline: string): { head: string; tail: string } {
  const t = (tagline || "").trim();
  if (!t) return { head: "", tail: "" };

  const dash = t.search(/\s[—–-]\s/);
  if (dash > 8 && dash < t.length - 8) {
    const h = t.slice(0, dash).trim();
    const tl = t.slice(dash + 3).trim();
    if (balanced(h, tl)) return { head: h, tail: tl };
  }

  const colon = t.indexOf(": ");
  if (colon > 8 && colon < t.length - 8) {
    const h = t.slice(0, colon).trim();
    const tl = t.slice(colon + 2).trim();
    if (balanced(h, tl)) return { head: h, tail: tl };
  }

  const words = t.split(/\s+/);
  if (words.length < 5) return { head: t, tail: "" };
  const cut = Math.ceil(words.length * 0.58);
  return { head: words.slice(0, cut).join(" "), tail: words.slice(cut).join(" ") };
}

/** First sentence of the about copy, used as the hero sub-line. */
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

// Face-forward crop instead of a dead-center one — the difference between a headshot
// cropped at the eyebrows and one that reads correctly. Only applied to subject:"people"
// images; a place/work/product photo has no face to protect and center-cropping is fine.
function imgAttrs(img: { subject?: string } | null | undefined): string {
  return img?.subject === "people" ? ' style="object-position:center 30%"' : "";
}

// Task 2.4. See atlas/index.ts's renderAtlas for the full reasoning on designInput's default.
export function renderLedger(
  c: TemplateContent,
  designInput?: { typography?: ResolveTypographyInput; styleBundleId?: string }
): { body: string; css: string } {
  const p = buildPalette(c.brandColors || []);
  const tokens: TemplateTokens = resolveTemplateTokens(designInput);
  const { head, tail } = splitTagline(c.tagline);
  const services = c.services || [];
  const quotes = c.testimonials || [];
  // galleryImages now includes whatever heroImageUrl points at (see the field's comment
  // in lib/templates/types.ts) so a template can make its own hero decision — Ledger
  // doesn't, so it filters that one image back out to avoid showing it twice.
  const gallery = (c.galleryImages || []).filter((img) => img.url !== c.heroImageUrl);
  const heroImage = (c.galleryImages || []).find((img) => img.url === c.heroImageUrl) ?? null;
  const partners = (c as { partnerLogos?: { url: string }[] }).partnerLogos || [];
  const credentials = c.credentials || [];
  const hasHero = Boolean(c.heroImageUrl);
  // The client's own recurring CTA phrase, standing in for the generic scroll-to-contact
  // copy wherever nothing more specific (a phone number to call) is already in play.
  const ctaWord = c.ctaLabel || "Get in touch";

  const primaryCta = c.contactPhone
    ? `<a class="tl-btn tl-btn--solid" href="${esc(telHref(c.contactPhone))}">Call ${esc(c.contactPhone)}</a>`
    : c.contactEmail
      ? `<a class="tl-btn tl-btn--solid" href="mailto:${esc(c.contactEmail)}">${esc(ctaWord)}</a>`
      : "";

  const secondaryCta = `<a class="tl-btn tl-btn--ghost" href="#services">See what we do</a>`;

  // ---- nav
  const mark = c.logoUrl
    ? `<img class="tl-nav__logo" src="${esc(c.logoUrl)}" alt="${esc(c.businessName)}">`
    : `<span class="tl-nav__name">${esc(c.businessName)}</span>`;

  // Links point at sections that genuinely exist on the page — never a dead
  // link to a page that was never built.
  const navLinks: string[] = [];
  if (services.length) navLinks.push('<a href="#services">Services</a>');
  if (c.aboutCopy) navLinks.push('<a href="#about">About</a>');
  if (quotes.length) navLinks.push('<a href="#reviews">Reviews</a>');
  navLinks.push('<a href="#contact">Contact</a>');

  const nav = `
<header class="tl-nav" data-kondo-section="nav">
  <div class="tl-wrap tl-nav__in">
    <div class="tl-nav__mark">${mark}</div>
    <nav class="tl-nav__links" aria-label="Sections">${navLinks.join("")}</nav>
    <div class="tl-nav__side">
      ${c.contactPhone ? `<a class="tl-nav__tel" href="${esc(telHref(c.contactPhone))}">${esc(c.contactPhone)}</a>` : ""}
      <a class="tl-btn tl-btn--solid" href="#contact">${esc(c.ctaLabel || "Book a visit")}</a>
    </div>
  </div>
</header>`;

  // ---- hero
  const heroCopy = `
    <div class="tl-hero__copy">
      <h1 class="tl-display">${esc(head)}${tail ? ` <span class="tl-em">${esc(tail)}</span>` : ""}</h1>
      ${c.aboutCopy ? `<p class="tl-lede">${esc(firstSentence(c.aboutCopy))}</p>` : ""}
      <div class="tl-actions">${primaryCta}${secondaryCta}</div>
    </div>`;

  const hero = hasHero
    ? `<section class="tl-hero tl-hero--split" data-kondo-section="hero">
  ${heroCopy}
  <div class="tl-hero__media"><img src="${esc(c.heroImageUrl)}" alt=""${imgAttrs(heroImage)}></div>
</section>`
    : `<section class="tl-hero tl-hero--plain" data-kondo-section="hero">
  <div class="tl-hero__field"></div>
  <div class="tl-wrap tl-hero__in">${heroCopy}</div>
</section>`;

  // ---- trust strip (partner / accreditation logos)
  const strip = partners.length || credentials.length
    ? `
<section class="tl-strip" data-kondo-section="partners">
  <div class="tl-wrap tl-strip__in">
    <p class="tl-strip__label">Trusted partners &amp; accreditations</p>
    ${
      partners.length
        ? `<div class="tl-strip__row">
      ${partners.map((l) => `<span><img src="${esc(l.url)}" alt=""></span>`).join("")}
    </div>`
        : ""
    }
    ${
      credentials.length
        ? `<div class="tl-credentials"${partners.length ? ' style="margin-top:20px"' : ""}>${credentials
            .map((label) => `<span>${esc(label)}</span>`)
            .join("")}</div>`
        : ""
    }
  </div>
</section>`
    : "";

  // ---- statement band
  const statement = c.aboutCopy
    ? `
<section class="tl-statement" id="about" data-kondo-section="about">
  <div class="tl-wrap tl-statement__in tl-statement__grid">
    <div>
      <p class="tl-eyebrow">Who we are</p>
      <p class="tl-statement__body">${esc(firstSentence(c.aboutCopy))}</p>
    </div>
    <p class="tl-statement__aside">${esc(c.aboutCopy)}</p>
  </div>
</section>`
    : "";

  // ---- services ledger
  const servicesSection = services.length
    ? `
<section class="tl-services" id="services" data-kondo-section="services">
  <div class="tl-wrap tl-services__in">
    <div class="tl-services__head">
      <p class="tl-eyebrow">What we do</p>
      <h2 class="tl-h2">Everything ${esc(c.businessName)} <span class="tl-em">looks after</span></h2>
    </div>
    <div class="tl-ledger">
      ${services
        .map(
          (s) => `<div class="tl-row">
        <h3 class="tl-row__name">${esc(s.name)}</h3>
        ${s.description ? `<p class="tl-row__desc">${esc(s.description)}</p>` : "<span></span>"}
      </div>`,
        )
        .join("")}
    </div>
  </div>
</section>`
    : "";

  // ---- deep band: gallery, or contact facts when there are no images
  const facts: string[] = [];
  if (c.contactPhone)
    facts.push(
      `<div><dt>Phone</dt><dd><a href="${esc(telHref(c.contactPhone))}">${esc(c.contactPhone)}</a></dd></div>`,
    );
  if (c.contactEmail)
    facts.push(
      `<div><dt>Email</dt><dd><a href="mailto:${esc(c.contactEmail)}">${esc(c.contactEmail)}</a></dd></div>`,
    );
  if (c.contactAddress) facts.push(`<div><dt>Where to find us</dt><dd>${esc(c.contactAddress)}</dd></div>`);
  if (c.hours && c.hours.length)
    facts.push(
      `<div><dt>Hours</dt><dd>${c.hours.map((h) => `${esc(h.days)}: ${esc(h.hours)}`).join("<br>")}</dd></div>`
    );
  if (c.offers && c.offers.length)
    facts.push(
      `<div><dt>Current offer${c.offers.length > 1 ? "s" : ""}</dt><dd>${c.offers
        .map((o) => `${esc(o.name)} — ${esc(o.price)}`)
        .join("<br>")}</dd></div>`
    );
  if (c.serviceAreas && c.serviceAreas.length)
    facts.push(`<div><dt>Areas we serve</dt><dd>${esc(c.serviceAreas.join(", "))}</dd></div>`);

  const deep =
    gallery.length || facts.length
      ? `
<section class="tl-deep" id="contact" data-kondo-section="deep">
  <div class="tl-wrap tl-deep__in">
    <div class="tl-deep__head">
      <p class="tl-eyebrow">Come and see us</p>
      <h2 class="tl-h2">A practice built around <span class="tl-em">how you actually feel</span></h2>
      ${c.contactAddress ? `<p class="tl-lede">${esc(c.contactAddress)}</p>` : ""}
    </div>
    ${
      gallery.length
        ? `<div class="tl-gallery">${gallery
            .slice(0, 4)
            .map((g) => `<figure><img src="${esc(g.url)}" alt=""${imgAttrs(g)}></figure>`)
            .join("")}</div>`
        : ""
    }
    ${facts.length ? `<dl class="tl-facts" style="margin-top:${gallery.length ? "18px" : "0"}">${facts.join("")}</dl>` : ""}
  </div>
</section>`
      : "";

  // ---- testimonials: serif pull-quotes, no cards (see styles.ts)
  const quotesSection = quotes.length
    ? `
<section class="tl-quotes" id="reviews" data-kondo-section="reviews">
  <div class="tl-wrap tl-quotes__in">
    <p class="tl-eyebrow">In their words</p>
    <h2 class="tl-h2">What people <span class="tl-em">tell us</span></h2>
    <div class="tl-quotes__list">
      ${quotes
        .slice(0, 6)
        .map(
          (q) => `<blockquote class="tl-quote">
        <p>${esc(q.quote)}</p>
        <footer><b>${esc(q.author)}</b>${q.role ? " — " + esc(q.role) : ""}</footer>
      </blockquote>`,
        )
        .join("")}
    </div>
  </div>
</section>`
    : "";

  // ---- closing cta: the number is the action (see styles.ts)
  const cta = c.contactPhone
    ? `
<section class="tl-cta" data-kondo-section="cta">
  <div class="tl-wrap tl-cta__in">
    <p class="tl-eyebrow">Ready when you are</p>
    <a class="tl-cta__tel" href="${esc(telHref(c.contactPhone))}">${esc(c.contactPhone)}</a>
    <p class="tl-cta__note">${
      c.contactEmail
        ? `Or email <a href="mailto:${esc(c.contactEmail)}">${esc(c.contactEmail)}</a> — we'll come back to you the same day.`
        : "Give us a call and we'll take it from there."
    }</p>
  </div>
</section>`
    : `
<section class="tl-cta" data-kondo-section="cta">
  <div class="tl-wrap tl-cta__in">
    <p class="tl-eyebrow">Ready when you are</p>
    <h2 class="tl-h2">Let's talk about <span class="tl-em">what you need</span></h2>
    <div class="tl-actions">${
      c.contactEmail
        ? `<a class="tl-btn tl-btn--solid" href="mailto:${esc(c.contactEmail)}">Send us a message</a>`
        : ""
    }</div>
  </div>
</section>`;

  // ---- footer
  const hasContact = Boolean(c.contactPhone || c.contactEmail || c.contactAddress);
  const foot = `
<footer class="tl-foot" data-kondo-section="footer">
  <div class="tl-wrap tl-foot__in">
    <div>
      <p class="tl-foot__name">${esc(c.businessName)}</p>
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
        ? `<div>
      <h4>Services</h4>
      ${services
        .slice(0, 6)
        .map((s) => `<p>${esc(s.name)}</p>`)
        .join("")}
    </div>`
        : ""
    }
  </div>
</footer>`;

  return {
    css: ledgerStyles(p, tokens),
    body: [nav, hero, strip, statement, servicesSection, deep, quotesSection, cta, foot].join("\n"),
  };
}
