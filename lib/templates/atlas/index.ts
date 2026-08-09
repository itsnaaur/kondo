import type { TemplateContent } from "../types";
import { buildPalette } from "../../content/normalize-brand-colors";
import { prepare } from "../../content/content-guards";
import { escapeHtml as esc } from "../escape-html";
import { atlasStyles } from "./styles";

function splitTagline(tagline: string): { head: string; tail: string } {
  const t = (tagline || "").trim();
  if (!t) return { head: "", tail: "" };
  const dash = t.search(/\s[—–-]\s/);
  if (dash > 8 && dash < t.length - 8) return { head: t.slice(0, dash).trim(), tail: t.slice(dash + 3).trim() };
  const colon = t.indexOf(": ");
  if (colon > 8 && colon < t.length - 8) return { head: t.slice(0, colon).trim(), tail: t.slice(colon + 2).trim() };
  const w = t.split(/\s+/);
  if (w.length < 5) return { head: t, tail: "" };
  const cut = Math.ceil(w.length * 0.58);
  return { head: w.slice(0, cut).join(" "), tail: w.slice(cut).join(" ") };
}

function firstSentence(text: string): string {
  const t = (text || "").trim();
  if (!t) return "";
  const m = t.match(/^[\s\S]*?[.!?](\s|$)/);
  const s = (m ? m[0] : t).trim();
  return s.length > 230 ? s.slice(0, 227).trimEnd() + "…" : s;
}

function telHref(p: string): string { return "tel:" + p.replace(/[^\d+]/g, ""); }

export function renderAtlas(c: TemplateContent): { body: string; css: string } {
  const p = buildPalette(c.brandColors || []);
  const { hero, scenes, team, stats, faqs } = prepare(c);
  const { head, tail } = splitTagline(c.tagline);

  const services = c.services || [];
  const diffs = c.differentiators || [];
  const process = c.process || [];
  const quotes = c.testimonials || [];
  const partners = c.partnerLogos || [];

  const cta1 = c.contactPhone
    ? `<a class="at-btn at-btn--solid" href="${esc(telHref(c.contactPhone))}">Call ${esc(c.contactPhone)}</a>`
    : c.contactEmail
      ? `<a class="at-btn at-btn--solid" href="mailto:${esc(c.contactEmail)}">Get in touch</a>` : "";
  const cta2 = services.length ? `<a class="at-btn at-btn--ghost" href="#services">What we do</a>` : "";

  const navLinks: string[] = [];
  if (diffs.length) navLinks.push('<a href="#why">Why us</a>');
  if (services.length) navLinks.push('<a href="#services">Services</a>');
  if (process.length) navLinks.push('<a href="#process">How it works</a>');
  if (c.aboutCopy) navLinks.push('<a href="#about">About</a>');
  if (quotes.length) navLinks.push('<a href="#reviews">Reviews</a>');
  navLinks.push('<a href="#contact">Contact</a>');

  const nav = `
<header class="at-nav"><div class="at-wrap at-nav__in">
  ${c.logoUrl
    ? `<img class="at-nav__logo" src="${esc(c.logoUrl)}" alt="${esc(c.businessName)}">`
    : `<span class="at-nav__name">${esc(c.businessName)}</span>`}
  <nav class="at-nav__links" aria-label="Sections">${navLinks.join("")}</nav>
  <div class="at-nav__side">
    ${c.contactPhone ? `<a class="at-nav__tel" href="${esc(telHref(c.contactPhone))}">${esc(c.contactPhone)}</a>` : ""}
    <a class="at-btn at-btn--solid" href="#contact">Get in touch</a>
  </div>
</div></header>`;

  const heroCopy = `<div class="at-hero__copy">
    <h1 class="at-display">${esc(head)}${tail ? ` <span class="at-em">${esc(tail)}</span>` : ""}</h1>
    ${c.aboutCopy ? `<p class="at-lede">${esc(firstSentence(c.aboutCopy))}</p>` : ""}
    <div class="at-actions">${cta1}${cta2}</div>
  </div>`;

  const heroSection = hero
    ? `<section class="at-hero"><div class="at-wrap at-hero__in">
    ${heroCopy}
    <figure class="at-hero__shot" style="margin:0"><img src="${esc(hero.url)}" alt="">${
      hero.caption ? `<figcaption>${esc(hero.caption)}</figcaption>` : ""
    }</figure>
  </div></section>`
    : `<section class="at-hero at-hero--plain"><div class="at-hero__field"></div>
  <div class="at-wrap at-hero__in">${heroCopy}</div></section>`;

  // Stats sit directly under the hero; partner logos get their own strip lower
  // down. Both are trust signals but they aren't interchangeable — a dental
  // clinic's health-fund logos carry more weight than any number it publishes,
  // so suppressing one for the other loses the stronger signal.
  const strip = stats.length
    ? `<section class="at-strip"><div class="at-wrap at-strip__in">
    <dl class="at-stats">${stats.map((s) => `<div><dt>${esc(s.value)}</dt><dd>${esc(s.label)}</dd></div>`).join("")}</dl>
  </div></section>`
    : "";

  const partnerStrip = partners.length
    ? `<section class="at-strip" style="border-top:1px solid var(--line)"><div class="at-wrap at-strip__in">
    <p class="at-strip__label">Trusted partners &amp; accreditations</p>
    <div class="at-partners">${partners.map((l) => `<img src="${esc(l.url)}" alt="">`).join("")}</div>
  </div></section>`
    : "";

  const why = diffs.length
    ? `<section class="at-why" id="why"><div class="at-wrap at-why__in">
    <div class="at-head">
      <p class="at-eyebrow">Why us</p>
      <h2 class="at-h2">What makes ${esc(c.businessName)} <span class="at-em">different</span></h2>
    </div>
    <div class="at-why__grid">${diffs.map((d) => `<div class="at-why__cell">
      <h3>${esc(d.title)}</h3>${d.description ? `<p>${esc(d.description)}</p>` : ""}
    </div>`).join("")}</div>
  </div></section>`
    : "";

  // Seven or fewer reads well as cards; beyond that a two-column index, which
  // is what a long capability list actually is.
  const asCards = services.length > 0 && services.length <= 7;
  const servicesSection = services.length
    ? `<section class="at-svc" id="services"><div class="at-wrap at-svc__in">
    <div class="at-head">
      <p class="at-eyebrow">What we do</p>
      <h2 class="at-h2">Everything ${esc(c.businessName)} <span class="at-em">looks after</span></h2>
    </div>
    ${asCards
      ? `<div class="at-svc__cards">${services.map((s) => `<article class="at-svc__card">
      <h3>${esc(s.name)}</h3>${s.description ? `<p>${esc(s.description)}</p>` : ""}
    </article>`).join("")}</div>`
      : `<div class="at-svc__index">${services.map((s) => `<div class="at-svc__item">
      <h3>${esc(s.name)}</h3>${s.description ? `<p>${esc(s.description)}</p>` : ""}
    </div>`).join("")}</div>`}
  </div></section>`
    : "";

  const processSection = process.length
    ? `<section class="at-proc" id="process"><div class="at-wrap at-proc__in">
    <div class="at-head">
      <p class="at-eyebrow">How it works</p>
      <h2 class="at-h2">The path from here <span class="at-em">to done</span></h2>
    </div>
    <div class="at-proc__list">${process.map((s) => `<div class="at-proc__step">
      <h3>${esc(s.title)}</h3>${s.description ? `<p>${esc(s.description)}</p>` : "<span></span>"}
    </div>`).join("")}</div>
  </div></section>`
    : "";

  // The right column takes team cards when captions yielded names, otherwise
  // scene photos, otherwise nothing — and the grid collapses to one column.
  const aside = team.length
    ? `<div class="at-team">${team.slice(0, 4).map((t) => `<figure>
      <img src="${esc(t.url)}" alt="">
      <figcaption><b>${esc(t.name)}</b><span>${esc(t.role)}</span></figcaption>
    </figure>`).join("")}</div>`
    : scenes.length
      ? `<div class="at-scenes">${scenes.slice(0, 4).map((s) => `<figure>
      <img src="${esc(s.url)}" alt="">${s.caption ? `<figcaption>${esc(s.caption)}</figcaption>` : ""}
    </figure>`).join("")}</div>`
      : "";

  const about = c.aboutCopy
    ? `<section class="at-about" id="about"><div class="at-wrap at-about__in">
    <div class="at-about__grid"${aside ? "" : ' style="grid-template-columns:minmax(0,1fr)"'}>
      <div>
        <p class="at-eyebrow">${team.length ? "The people behind it" : "About us"}</p>
        <h2 class="at-h2">A little more <span class="at-em">about how we work</span></h2>
        <p class="at-about__body" style="margin-top:22px">${esc(c.aboutCopy)}</p>
      </div>
      ${aside}
    </div>
  </div></section>`
    : "";

  const reviews = quotes.length
    ? `<section class="at-says" id="reviews"><div class="at-wrap at-says__in">
    <div class="at-head">
      <p class="at-eyebrow">In their words</p>
      <h2 class="at-h2">What clients <span class="at-em">actually say</span></h2>
    </div>
    <div class="at-says__grid">${quotes.slice(0, 9).map((q) => `<blockquote class="at-quote">
      <p>${esc(q.quote)}</p>
      <footer><b>${esc(q.author)}</b>${q.role ? " — " + esc(q.role) : ""}</footer>
    </blockquote>`).join("")}</div>
  </div></section>`
    : "";

  const faqSection = faqs.length
    ? `<section class="at-faq"><div class="at-wrap at-faq__in">
    <div class="at-head">
      <p class="at-eyebrow">Good to know</p>
      <h2 class="at-h2">Questions we <span class="at-em">get asked a lot</span></h2>
    </div>
    <div class="at-faq__list">${faqs.map((f) => `<details>
      <summary>${esc(f.question)}</summary><p>${esc(f.answer)}</p>
    </details>`).join("")}</div>
  </div></section>`
    : "";

  const cta = `<section class="at-cta" id="contact"><div class="at-wrap at-cta__in">
  <h2 class="at-h2">Ready when you are.</h2>
  <div class="at-actions">${cta1}${c.contactEmail ? `<a class="at-btn at-btn--ghost" href="mailto:${esc(c.contactEmail)}">Send us a message</a>` : ""}</div>
</div></section>`;

  const hasContact = Boolean(c.contactPhone || c.contactEmail || c.contactAddress);
  const foot = `<footer class="at-foot"><div class="at-wrap at-foot__in">
  <div><p class="at-foot__name">${esc(c.businessName)}</p>${c.tagline ? `<p>${esc(c.tagline)}</p>` : ""}</div>
  ${hasContact ? `<div><h4>Get in touch</h4>
    ${c.contactPhone ? `<a href="${esc(telHref(c.contactPhone))}">${esc(c.contactPhone)}</a>` : ""}
    ${c.contactEmail ? `<a href="mailto:${esc(c.contactEmail)}">${esc(c.contactEmail)}</a>` : ""}
    ${c.contactAddress ? `<p>${esc(c.contactAddress)}</p>` : ""}</div>` : ""}
  ${services.length ? `<div><h4>Services</h4>${services.slice(0, 6).map((s) => `<p>${esc(s.name)}</p>`).join("")}</div>` : ""}
</div></footer>`;

  return {
    css: atlasStyles(p),
    body: [nav, heroSection, strip, why, servicesSection, processSection, about, reviews, faqSection, partnerStrip, cta, foot].join("\n"),
  };
}
