import { describe, it, expect } from "vitest";
import { renderFallbackConcept, type FallbackContent } from "./fallback-renderer";
import { buildPalette } from "./normalize-brand-colors";

// Task 3.6. Tests the lifted, standalone fallback renderer directly — not through
// lib/templates/registry.ts (doomed in 3.8, and this module deliberately has no dependency on
// it or anything else under lib/templates/).

const REAL_PALETTE = buildPalette([{ hex: "#2563eb" }]);
const GOOGLE_FONTS_URL = "https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap";

const RICH_CONTENT: FallbackContent = {
  businessName: "Acme Dental",
  tagline: "Gentle, modern dentistry for the whole family",
  aboutCopy: "We've been caring for smiles in this neighbourhood for over twenty years.",
  services: [{ name: "Check-ups", description: "Regular preventative care." }],
  testimonials: [{ quote: "Best dentist I've ever had.", author: "Jane D." }],
  differentiators: [{ title: "Same-day appointments", description: "Book today, seen today." }],
  process: [{ title: "Book online", description: "Pick a time that suits you." }],
  stats: [{ value: "20+", label: "Years serving families" }],
  faqs: [{ question: "Do you take walk-ins?", answer: "Yes, subject to availability on the day." }],
  contactEmail: "hello@acmedental.example",
  contactPhone: "+61 2 5555 5555",
  contactAddress: "12 High St, Sometown",
  logoUrl: "https://example.com/logo.png",
  brandColors: [{ hex: "#2563eb", role: "primary" }],
  heroImageUrl: null,
  heroImageSource: null,
  galleryImages: [],
  partnerLogos: [{ url: "https://example.com/partner.png" }],
  detectedIndustry: "medical/clinic",
  ctaLabel: "Book now",
  serviceAreas: ["Sometown", "Nexttown"],
  hours: [{ days: "Mon-Fri", hours: "9am-5pm" }],
  offers: [{ name: "New patient exam", price: "$99" }],
  credentials: ["AHPRA registered"],
};

// The maximally thin case — every optional-content field empty. Mirrors what a client with
// genuinely sparse extraction (the scenario this whole task exists for) actually looks like.
const THIN_CONTENT: FallbackContent = {
  businessName: "Bare Co",
  tagline: "",
  aboutCopy: "",
  services: [],
  testimonials: [],
  differentiators: [],
  process: [],
  stats: [],
  faqs: [],
  contactEmail: null,
  contactPhone: null,
  contactAddress: null,
  logoUrl: null,
  brandColors: [],
  heroImageUrl: null,
  heroImageSource: null,
  galleryImages: [],
  detectedIndustry: null,
  ctaLabel: null,
  serviceAreas: [],
  hours: [],
  offers: [],
  credentials: [],
};

describe("renderFallbackConcept — produces a complete, self-contained HTML document", () => {
  it("returns a full <!DOCTYPE html> document, not a body fragment", () => {
    const html = renderFallbackConcept(RICH_CONTENT, REAL_PALETTE, GOOGLE_FONTS_URL);
    expect(html.startsWith("<!DOCTYPE html>")).toBe(true);
    expect(html).toContain("<html");
    expect(html).toContain("</html>");
  });

  it("does not crash on the maximally thin content case — this is the whole point of the task", () => {
    expect(() => renderFallbackConcept(THIN_CONTENT, REAL_PALETTE, GOOGLE_FONTS_URL)).not.toThrow();
  });
});

describe("renderFallbackConcept — consumes the real design system, not hardcoded fonts (the task's own explicit bar)", () => {
  it("the emitted stylesheet's --accent matches the REAL resolved palette passed in, not a fixed value", () => {
    const blue = buildPalette([{ hex: "#2563eb" }]);
    const green = buildPalette([{ hex: "#059669" }]);
    const htmlBlue = renderFallbackConcept(RICH_CONTENT, blue, GOOGLE_FONTS_URL);
    const htmlGreen = renderFallbackConcept(RICH_CONTENT, green, GOOGLE_FONTS_URL);
    expect(htmlBlue).toContain(`--accent: ${blue.accent};`);
    expect(htmlGreen).toContain(`--accent: ${green.accent};`);
    expect(htmlBlue).not.toBe(htmlGreen);
  });

  it("the Google Fonts <link> href is the real resolved typography's own googleFontsUrl, not a hardcoded constant", () => {
    const interUrl = "https://fonts.googleapis.com/css2?family=Inter:wght@400&display=swap";
    const playfairUrl = "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600&display=swap";
    const htmlInter = renderFallbackConcept(RICH_CONTENT, REAL_PALETTE, interUrl);
    const htmlPlayfair = renderFallbackConcept(RICH_CONTENT, REAL_PALETTE, playfairUrl);
    // & is correctly HTML-escaped to &amp; inside the href attribute value — the safe, correct
    // behaviour esc() already applies everywhere else — so the assertion checks for that
    // escaped form, not the raw URL string.
    expect(htmlInter).toContain(`href="${interUrl.replace(/&/g, "&amp;")}"`);
    expect(htmlPlayfair).toContain(`href="${playfairUrl.replace(/&/g, "&amp;")}"`);
    // Confirms this isn't the old hardcoded Instrument Sans + Newsreader constant every prior
    // template's registry.ts entry injected — that literal string never appears here at all.
    expect(htmlInter).not.toContain("Instrument+Sans");
    expect(htmlInter).not.toContain("Newsreader");
  });

  it("a real styleBundleId changes the emitted radius/shadow tokens", () => {
    const crisp = renderFallbackConcept(RICH_CONTENT, REAL_PALETTE, GOOGLE_FONTS_URL, "crisp-formal");
    const structural = renderFallbackConcept(RICH_CONTENT, REAL_PALETTE, GOOGLE_FONTS_URL, "structural-industrial");
    expect(crisp).not.toBe(structural);
  });
});

describe("renderFallbackConcept — data-kondo-section markers survive the lift, unchanged (the task's own final question)", () => {
  it("rich content: every section atlas would render carries its real marker", () => {
    const html = renderFallbackConcept(RICH_CONTENT, REAL_PALETTE, GOOGLE_FONTS_URL);
    for (const key of ["nav", "hero", "why", "services", "process", "about", "reviews", "faq", "partners", "cta", "footer"]) {
      expect(html, key).toContain(`data-kondo-section="${key}"`);
    }
  });

  it("thin content: the four unconditional sections (nav, hero, cta, footer) still carry their markers — a fallback page is never a dead, unmarked page even at minimum content", () => {
    const html = renderFallbackConcept(THIN_CONTENT, REAL_PALETTE, GOOGLE_FONTS_URL);
    for (const key of ["nav", "hero", "cta", "footer"]) {
      expect(html, key).toContain(`data-kondo-section="${key}"`);
    }
    // Content-gated sections correctly absent, not present-but-empty — no data-kondo-section for
    // a section that was never rendered at all.
    for (const key of ["why", "services", "process", "about", "reviews", "faq", "partners"]) {
      expect(html, key).not.toContain(`data-kondo-section="${key}"`);
    }
  });
});

describe("renderFallbackConcept — the disclosure footer and safe defaults every Concept.html carries", () => {
  it("includes the JRNY disclosure footer, same text as every other template", () => {
    const html = renderFallbackConcept(RICH_CONTENT, REAL_PALETTE, GOOGLE_FONTS_URL);
    expect(html).toContain("Concept preview by JRNY Digital, using publicly available branding.");
  });

  it("sets noindex/nofollow, matching every other Concept.html's real posture", () => {
    const html = renderFallbackConcept(RICH_CONTENT, REAL_PALETTE, GOOGLE_FONTS_URL);
    expect(html).toContain('<meta name="robots" content="noindex, nofollow" />');
  });

  it("escapes business content in the title — no raw HTML injection via businessName", () => {
    const evil: FallbackContent = { ...THIN_CONTENT, businessName: `<script>alert(1)</script>` };
    const html = renderFallbackConcept(evil, REAL_PALETTE, GOOGLE_FONTS_URL);
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
