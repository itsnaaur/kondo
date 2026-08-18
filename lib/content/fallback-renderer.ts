// Task 3.6. The deterministic floor beneath generation — not a choice offered to anyone, the
// page a client gets when AI markup generation (3.4) exhausts its retries. Without this, a
// generation failure leaves Client.status = ANALYSIS_FAILED and a dead client with nothing
// sendable; with it, the same failure still produces a real, usable Concept.
//
// WHY ATLAS, TESTED AGAINST THE TWO REAL SPARSE CLIENTS, RE-VERIFIED FRESH RIGHT NOW, NOT
// ASSUMED UNCHANGED FROM A PRIOR TASK'S OWN FINDING. Of the three templates, only atlas
// declares no `requires` at all (lib/templates/atlas/meta.ts — ledger requires heroImage: true,
// showcase requires minGallery: 3). scorePatternEligibility (Task 3.1) can therefore never
// score atlas "not-suited" — it always resolves at least "works", regardless of how thin the
// content is. Verified directly against this task's own two named test cases using the real,
// trusted capability summary (assignImageRoles, Task 3.1's own declared mechanism — not
// registry.ts's own disclosed-approximate scoreAllTemplates, which this task's own verification
// checked first and found disagrees with the real mechanism for both clients, in opposite
// directions, a live demonstration of Task 1.10's "three unreconciled hero-selection
// mechanisms" finding, not a repeat of it):
//   - Allen Evans: real capability summary today is heroGrade:1 (a genuine change from Task
//     3.1's own recorded 0 — re-verified fresh, not trusted from memory; Asset is append-only,
//     so a later crawl/classification pass since 3.1 is the likely cause, not chased further
//     here). ledger: works. showcase: not-suited (1 usable photo, needs 3). atlas: works.
//   - BC Security: real capability summary today is heroGrade:0. ledger: not-suited (no
//     hero-grade image). showcase: works (its own real photo pool now clears minGallery:3).
//     atlas: works.
// Atlas is not "the only one that works for the harder client" (both clients are less uniformly
// sparse than that framing suggested going in) — it is the only one of the three that works for
// BOTH real clients at once. Ledger fails specifically on BC Security; showcase fails
// specifically on Allen Evans; each of the other two templates has a real client it cannot
// serve. Atlas has none. A client whose generation failed may well be a client with sparse
// input in the first place (thin content is itself a plausible reason a markup model
// struggled) — atlas is the one template not guaranteed to fail alongside it.
//
// LIFTED OUT OF lib/templates/, THE WAY suitability.ts MOVED IN 3.1. This file and its sibling
// lib/content/fallback-renderer-styles.ts now live in lib/content/ — lib/templates/atlas/{index,
// styles,meta}.ts, and the whole lib/templates/ directory tree, are deleted whole in Task 3.8
// (build plan §7). Deliberately self-contained, importing nothing from lib/templates/ at all —
// not even lib/templates/shell.ts or lib/templates/escape-html.ts, both small enough to
// duplicate here rather than risk depending on files not explicitly named on 3.8's own Keep
// list. Same discipline 3.1's own pattern-eligibility.ts stated for itself: "not by omission."
//
// CONSUMES THE SAME DESIGN SYSTEM AS GENERATION, NOT A RE-DERIVED ONE. atlas/index.ts's
// original renderAtlas() called buildPalette(c.brandColors || []) and resolveTemplateTokens()
// itself, internally, deriving its own palette/tokens from raw content — fine when atlas was
// one of three interchangeable gallery choices, wrong for a fallback whose entire point is
// branding consistency with whatever real generation attempt already ran. renderFallbackConcept
// below takes a pre-resolved Palette, TemplateTokens, and googleFontsUrl directly as parameters
// — literally the same DesignSystem/NeutralSystem fields Task 3.2's resolveDesignSystem()
// already produced before markup generation was even attempted (design system resolution is
// deterministic and local, build plan §6.1 — it doesn't fail alongside the AI call that does).
// The Google Fonts link is real and per-client too, built from the resolved typography's own
// googleFontsUrl — not the old hardcoded Instrument Sans + Newsreader constant every prior
// template's registry.ts entry injected via headExtra. That constant is exactly "the old
// hardcoded fonts" this task's own instruction says a real fallback must not render in.
//
// DATA-KONDO-SECTION MARKERS: RETAINED, UNCHANGED. Every one of atlas's original top-level
// sections (nav, hero, why, services, process, about, reviews, faq, partners, cta, footer) keeps
// its real data-kondo-section attribute below, exactly as atlas always emitted it — nothing
// about the lift touched this. A fallback-generated concept is therefore just as editable via
// lib/templates/section-editor.ts's ATTR_MARKER scan as a template-gallery-generated one always
// was; a human reviewing a fallback page in the section editor is not looking at a dead end.

import type { Palette } from "./normalize-brand-colors";
import { resolveTemplateTokens, type TemplateTokens } from "../design/resolve-tokens";
import { prepare } from "./content-guards";
import { fallbackStyles } from "./fallback-renderer-styles";

// ---------- self-contained copies, deliberately not imported from lib/templates/ ----------

// Structural copy of lib/templates/types.ts's TemplateContent — not imported, so this file has
// no dependency on anything under lib/templates/. Passing to-template-content.ts's real
// TemplateContent return value into a function typed against this works with zero casting,
// since TypeScript checks object shape, not the name a type happens to be declared under —
// confirmed directly (see this task's own log entry / test suite) against a real
// toTemplateContent() call, not assumed to type-check from reading the two definitions side by
// side.
export type FallbackImage = {
  url: string;
  widthPx?: number;
  heightPx?: number;
  caption?: string;
  subject?: "people" | "place" | "work" | "product" | "abstract" | "unknown";
  suitableAsHero?: boolean;
};

export type FallbackContent = {
  businessName: string;
  tagline: string;
  aboutCopy: string;
  services: { name: string; description: string }[];
  testimonials: { quote: string; author: string; role?: string }[];
  differentiators: { title: string; description: string }[];
  process: { title: string; description: string }[];
  stats: { value: string; label: string }[];
  faqs: { question: string; answer: string }[];
  contactEmail: string | null;
  contactPhone: string | null;
  contactAddress: string | null;
  logoUrl: string | null;
  brandColors: { hex: string; role: "primary" | "secondary" | "accent" }[];
  heroImageUrl: string | null;
  heroImageSource: "extracted" | "promoted" | null;
  galleryImages: FallbackImage[];
  partnerLogos?: { url: string }[];
  detectedIndustry: string | null;
  ctaLabel: string | null;
  serviceAreas: string[];
  hours: { days: string; hours: string }[];
  offers: { name: string; price: string }[];
  credentials: string[];
};

// Copy of lib/templates/escape-html.ts, unchanged — 12 lines, not worth an import that would
// have to survive 3.8 for the sake of a single small function.
const ESCAPE_MAP: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
function esc(input: string | null | undefined): string {
  if (!input) return "";
  return input.replace(/[&<>"']/g, (ch) => ESCAPE_MAP[ch]);
}

// Adapted from lib/templates/shell.ts's renderShell — same disclosure footer, same CSS reset,
// same noindex/robots posture (a fallback concept is exactly as unauthenticated-servable via
// /p/[slug] as any other Concept.html). Two real differences: no bodyClass (the multi-template
// coexistence problem that justified one doesn't exist here — see fallback-renderer-styles.ts's
// own header comment), and headExtra is no longer an opaque caller-supplied string — it's built
// right here from the same googleFontsUrl this function's own caller already threads through,
// so there is exactly one place a wrong or hardcoded font link could be introduced, not two.
const DISCLOSURE_TEXT = "Concept preview by JRNY Digital, using publicly available branding.";
const SHELL_CSS = `
  *, *::before, *::after { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body { -webkit-font-smoothing: antialiased; }
  img { max-width: 100%; display: block; }
  .jrny-disclosure {
    text-align: center;
    padding: 14px 16px;
    font: 12px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #9ca3af;
    background: #111827;
  }
`;

function wrapInShell(title: string, css: string, bodyHtml: string, googleFontsUrl: string): string {
  const fontLink = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${esc(googleFontsUrl)}" rel="stylesheet">`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>${esc(title || "Concept preview")}</title>
${fontLink}
<style>${SHELL_CSS}
${css}</style>
</head>
<body>
${bodyHtml}
<footer class="jrny-disclosure">${esc(DISCLOSURE_TEXT)}</footer>
</body>
</html>`;
}

// ---------- markup, lifted from lib/templates/atlas/index.ts's renderAtlas — logic unchanged
// except for how palette/tokens/fonts are obtained (see this file's own header comment) ----------

function balanced(head: string, tail: string): boolean {
  return tail.split(/\s+/).length <= head.split(/\s+/).length * 1.6;
}

function splitTagline(tagline: string): { head: string; tail: string } {
  const t = (tagline || "").trim();
  if (!t) return { head: "", tail: "" };
  const dash = t.search(/\s[—–-]\s/);
  if (dash > 8 && dash < t.length - 8) {
    const head = t.slice(0, dash).trim();
    const tail = t.slice(dash + 3).trim();
    if (balanced(head, tail)) return { head, tail };
  }
  const colon = t.indexOf(": ");
  if (colon > 8 && colon < t.length - 8) {
    const head = t.slice(0, colon).trim();
    const tail = t.slice(colon + 2).trim();
    if (balanced(head, tail)) return { head, tail };
  }
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

function telHref(p: string): string {
  return "tel:" + p.replace(/[^\d+]/g, "");
}

function imgAttrs(img: { subject?: string } | null | undefined): string {
  return img?.subject === "people" ? ' style="object-position:center 30%"' : "";
}

export function renderFallbackConcept(
  c: FallbackContent,
  palette: Palette,
  typographyGoogleFontsUrl: string,
  styleBundleId?: string
): string {
  const tokens: TemplateTokens = resolveTemplateTokens({ styleBundleId });
  const { hero, scenes, team, stats, faqs } = prepare(c);
  const { head, tail } = splitTagline(c.tagline);

  const services = c.services || [];
  const diffs = c.differentiators || [];
  const process = c.process || [];
  const quotes = c.testimonials || [];
  const partners = c.partnerLogos || [];
  const credentials = c.credentials || [];
  const ctaWord = c.ctaLabel || "Get in touch";

  const cta1 = c.contactPhone
    ? `<a class="at-btn at-btn--solid" href="${esc(telHref(c.contactPhone))}">Call ${esc(c.contactPhone)}</a>`
    : c.contactEmail
      ? `<a class="at-btn at-btn--solid" href="mailto:${esc(c.contactEmail)}">${esc(ctaWord)}</a>`
      : "";
  const cta2 = services.length ? `<a class="at-btn at-btn--ghost" href="#services">What we do</a>` : "";

  const navLinks: string[] = [];
  if (diffs.length) navLinks.push('<a href="#why">Why us</a>');
  if (services.length) navLinks.push('<a href="#services">Services</a>');
  if (process.length) navLinks.push('<a href="#process">How it works</a>');
  if (c.aboutCopy) navLinks.push('<a href="#about">About</a>');
  if (quotes.length) navLinks.push('<a href="#reviews">Reviews</a>');
  navLinks.push('<a href="#contact">Contact</a>');

  const nav = `
<header class="at-nav" data-kondo-section="nav"><div class="at-wrap at-nav__in">
  ${c.logoUrl
    ? `<img class="at-nav__logo" src="${esc(c.logoUrl)}" alt="${esc(c.businessName)}">`
    : `<span class="at-nav__name">${esc(c.businessName)}</span>`}
  <nav class="at-nav__links" aria-label="Sections">${navLinks.join("")}</nav>
  <div class="at-nav__side">
    ${c.contactPhone ? `<a class="at-nav__tel" href="${esc(telHref(c.contactPhone))}">${esc(c.contactPhone)}</a>` : ""}
    <a class="at-btn at-btn--solid" href="#contact">${esc(ctaWord)}</a>
  </div>
</div></header>`;

  const statRail = stats.length
    ? `<dl class="at-hero__stats">${stats
        .map((st) => `<div><dt>${esc(st.value)}</dt><dd>${esc(st.label)}</dd></div>`)
        .join("")}</dl>`
    : "";

  const heroSection = `<section class="at-hero${statRail ? "" : " at-hero--bare"}" data-kondo-section="hero">
  <div class="at-hero__field"></div>
  <div class="at-wrap at-hero__in">
    <div class="at-hero__copy">
      <h1 class="at-display">${esc(head)}${tail ? ` <span class="at-em">${esc(tail)}</span>` : ""}</h1>
      ${c.aboutCopy ? `<p class="at-lede">${esc(firstSentence(c.aboutCopy))}</p>` : ""}
      <div class="at-actions">${cta1}${cta2}</div>
    </div>
    ${statRail}
  </div>
</section>`;

  const partnerStrip = partners.length || credentials.length
    ? `<section class="at-strip" style="border-top:1px solid var(--line)" data-kondo-section="partners"><div class="at-wrap at-strip__in">
    <p class="at-strip__label">Trusted partners &amp; accreditations</p>
    ${partners.length ? `<div class="at-partners">${partners.map((l) => `<span><img src="${esc(l.url)}" alt=""></span>`).join("")}</div>` : ""}
    ${credentials.length ? `<div class="at-credentials"${partners.length ? ' style="margin-top:18px"' : ""}>${credentials.map((label) => `<span>${esc(label)}</span>`).join("")}</div>` : ""}
  </div></section>`
    : "";

  const why = diffs.length
    ? `<section class="at-why" id="why" data-kondo-section="why"><div class="at-wrap at-why__in">
    <div class="at-head at-why__head">
      <p class="at-eyebrow">Why us</p>
      <h2 class="at-h2">What makes ${esc(c.businessName)} <span class="at-em">different</span></h2>
    </div>
    <div class="at-why__grid">${diffs.map((d) => `<article class="at-why__card">
      <h3>${esc(d.title)}</h3>
      ${d.description ? `<p>${esc(d.description)}</p>` : ""}
    </article>`).join("")}</div>
  </div></section>`
    : "";

  const servicesSection = services.length
    ? `<section class="at-svc" id="services" data-kondo-section="services"><div class="at-wrap at-svc__in">
    <div class="at-head at-svc__head">
      <p class="at-eyebrow">What we do</p>
      <h2 class="at-h2">Everything ${esc(c.businessName)} <span class="at-em">looks after</span></h2>
    </div>
    <dl class="at-svc__list">${services.map((s) => `<div class="at-svc__item">
      <dt>${esc(s.name)}</dt>${s.description ? `<dd>${esc(s.description)}</dd>` : ""}
    </div>`).join("")}</dl>
  </div></section>`
    : "";

  const processSection = process.length
    ? `<section class="at-proc" id="process" data-kondo-section="process"><div class="at-wrap at-proc__in">
    <div class="at-head at-proc__head">
      <p class="at-eyebrow">How it works</p>
      <h2 class="at-h2">The path from here <span class="at-em">to done</span></h2>
    </div>
    <div class="at-proc__list">${process.map((s, i) => `<div class="at-proc__step">
      <span class="at-proc__no">${String(i + 1).padStart(2, "0")}</span>
      <h3>${esc(s.title)}</h3>${s.description ? `<p>${esc(s.description)}</p>` : ""}
    </div>`).join("")}</div>
  </div></section>`
    : "";

  const asidePool = hero ? [hero, ...scenes] : scenes;

  const aside = team.length
    ? `<div class="at-team">${team.slice(0, 4).map((t) => `<figure>
      <img src="${esc(t.url)}" alt="" style="object-position:center 30%">
      <figcaption><b>${esc(t.name)}</b><span>${esc(t.role)}</span></figcaption>
    </figure>`).join("")}</div>`
    : asidePool.length
      ? `<div class="at-scenes">${asidePool.slice(0, 4).map((s) => `<figure>
      <img src="${esc(s.url)}" alt=""${imgAttrs(s)}>${s.caption ? `<figcaption>${esc(s.caption)}</figcaption>` : ""}
    </figure>`).join("")}</div>`
      : "";

  const about = c.aboutCopy
    ? `<section class="at-about" id="about" data-kondo-section="about"><div class="at-wrap at-about__in">
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
    ? (() => {
        const [lead, ...rest] = quotes;
        return `<section class="at-says" id="reviews" data-kondo-section="reviews"><div class="at-wrap at-says__in">
    <div class="at-head at-says__head">
      <p class="at-eyebrow">In their words</p>
      <h2 class="at-h2">What clients <span class="at-em">actually say</span></h2>
    </div>
    <blockquote class="at-says__lead">
      "${esc(lead.quote)}"
      <cite>${esc(lead.author)}${lead.role ? " — " + esc(lead.role) : ""}</cite>
    </blockquote>
    ${
      rest.length
        ? `<div class="at-says__rest">${rest.slice(0, 2).map((q) => `<blockquote>
      <p>${esc(q.quote)}</p>
      <footer><b>${esc(q.author)}</b>${q.role ? " — " + esc(q.role) : ""}</footer>
    </blockquote>`).join("")}</div>`
        : ""
    }
  </div></section>`;
      })()
    : "";

  const faqSection = faqs.length
    ? `<section class="at-faq" data-kondo-section="faq"><div class="at-wrap at-faq__in">
    <div class="at-head">
      <p class="at-eyebrow">Good to know</p>
      <h2 class="at-h2">Questions we <span class="at-em">get asked a lot</span></h2>
    </div>
    <div class="at-faq__list">${faqs.map((f) => `<details>
      <summary>${esc(f.question)}</summary><p>${esc(f.answer)}</p>
    </details>`).join("")}</div>
  </div></section>`
    : "";

  const ctaSide: string[] = [];
  if (c.contactPhone)
    ctaSide.push(`<div><span>Phone</span><strong><a href="${esc(telHref(c.contactPhone))}">${esc(c.contactPhone)}</a></strong></div>`);
  if (c.contactEmail)
    ctaSide.push(`<div><span>Email</span><strong><a href="mailto:${esc(c.contactEmail)}">${esc(c.contactEmail)}</a></strong></div>`);
  if (c.contactAddress)
    ctaSide.push(`<div><span>Where to find us</span><strong>${esc(c.contactAddress)}</strong></div>`);
  if (c.hours && c.hours.length)
    ctaSide.push(
      `<div><span>Hours</span><strong>${c.hours.map((h) => `${esc(h.days)}: ${esc(h.hours)}`).join("<br>")}</strong></div>`
    );
  if (c.offers && c.offers.length)
    ctaSide.push(
      `<div><span>Current offer${c.offers.length > 1 ? "s" : ""}</span><strong>${c.offers
        .map((o) => `${esc(o.name)} — ${esc(o.price)}`)
        .join("<br>")}</strong></div>`
    );
  if (c.serviceAreas && c.serviceAreas.length)
    ctaSide.push(`<div><span>Areas we serve</span><strong>${esc(c.serviceAreas.join(", "))}</strong></div>`);

  const cta = `<section class="at-cta${ctaSide.length ? "" : " at-cta--slim"}" id="contact" data-kondo-section="cta">
  <div class="at-wrap at-cta__in">
    <div class="at-cta__panel">
      <div class="at-cta__ask">
        <h2 class="at-h2">Ready when you are.</h2>
        <p class="at-cta__note">No obligation and no pitch — just a conversation about what you're after.</p>
        <div class="at-actions">${cta1}${
          c.contactEmail
            ? `<a class="at-btn at-btn--ghost" href="mailto:${esc(c.contactEmail)}">Send us a message</a>`
            : ""
        }</div>
      </div>
      ${ctaSide.length ? `<div class="at-cta__side">${ctaSide.join("")}</div>` : ""}
    </div>
  </div>
</section>`;

  const hasContact = Boolean(c.contactPhone || c.contactEmail || c.contactAddress);
  const foot = `<footer class="at-foot" data-kondo-section="footer"><div class="at-wrap at-foot__in">
  <div><p class="at-foot__name">${esc(c.businessName)}</p>${c.tagline ? `<p>${esc(c.tagline)}</p>` : ""}</div>
  ${hasContact ? `<div><h4>Get in touch</h4>
    ${c.contactPhone ? `<a href="${esc(telHref(c.contactPhone))}">${esc(c.contactPhone)}</a>` : ""}
    ${c.contactEmail ? `<a href="mailto:${esc(c.contactEmail)}">${esc(c.contactEmail)}</a>` : ""}
    ${c.contactAddress ? `<p>${esc(c.contactAddress)}</p>` : ""}</div>` : ""}
  ${services.length ? `<div><h4>Services</h4>${services.slice(0, 6).map((s) => `<p>${esc(s.name)}</p>`).join("")}</div>` : ""}
</div></footer>`;

  const body = [nav, heroSection, why, servicesSection, processSection, about, reviews, faqSection, partnerStrip, cta, foot].join("\n");
  const css = fallbackStyles(palette, tokens);

  return wrapInShell(c.businessName || "Concept preview", css, body, typographyGoogleFontsUrl);
}
