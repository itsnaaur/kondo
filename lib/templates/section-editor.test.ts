import { describe, expect, it } from "vitest";
import { listConceptSections, extractConceptSection, replaceConceptSection } from "./section-editor";
import { renderAtlas } from "./atlas/index";
import { renderLedger } from "./ledger/index";
import { renderShowcase } from "./showcase/index";
import type { TemplateContent } from "./types";

const CONTENT: TemplateContent = {
  businessName: "Acme Physio",
  tagline: "Get back to doing what you love — evidence-based physiotherapy for Brisbane",
  // Deliberately two sentences: all three templates reuse the About copy's first sentence
  // as the hero's own lede line (confirmed live, not a bug), so a test that wants text
  // unique to the About section specifically needs a second sentence the hero never sees.
  aboutCopy:
    "We've been helping the local community move better for over 15 years. " +
    "Every plan is built around your specific goals, not a generic program.",
  services: [{ name: "Sports Physio", description: "Injury rehab for athletes." }],
  testimonials: [{ quote: "Fantastic care.", author: "Jane D.", role: "Patient" }],
  differentiators: [{ title: "Same-day appointments", description: "Usually available." }],
  process: [{ title: "Assessment", description: "We start with a full assessment." }],
  stats: [{ value: "15+", label: "Years in business" }],
  faqs: [{ question: "Do I need a referral?", answer: "No, you can book directly." }],
  contactEmail: "hello@acmephysio.com.au",
  contactPhone: "07 3000 0000",
  contactAddress: "123 Example St, Brisbane QLD",
  logoUrl: null,
  brandColors: [{ hex: "#1c3d5a", role: "primary" }],
  heroImageUrl: null,
  heroImageSource: null,
  galleryImages: [],
  partnerLogos: [],
  detectedIndustry: "healthcare",
  ctaLabel: "Book an appointment",
  serviceAreas: ["Brisbane CBD"],
  hours: [{ days: "Mon–Fri", hours: "8:00am–5:00pm" }],
  offers: [{ name: "New patient check-up", price: "$99" }],
  credentials: ["AHPRA registered"],
};

const TEMPLATES = [
  { name: "atlas", render: renderAtlas },
  { name: "ledger", render: renderLedger },
  { name: "showcase", render: renderShowcase },
] as const;

describe.each(TEMPLATES)("$name — section editing", ({ render }) => {
  it("finds every marked section, each with real content", () => {
    const { body } = render(CONTENT);
    const sections = listConceptSections(body);

    expect(sections.length).toBeGreaterThan(5);
    // Every section found is well-formed: a real key, a human label, non-empty html that
    // actually starts with the opening tag carrying that key.
    for (const s of sections) {
      expect(s.key.length).toBeGreaterThan(0);
      expect(s.label.length).toBeGreaterThan(0);
      expect(s.html).toContain(`data-kondo-section="${s.key}"`);
    }
    // "about" and "services" exist on every template given this content.
    expect(sections.some((s) => s.key === "about")).toBe(true);
    expect(sections.some((s) => s.key === "services")).toBe(true);
  });

  it("extracts exactly one section's content, not the whole page", () => {
    const { body } = render(CONTENT);
    const about = extractConceptSection(body, "about");

    expect(about).not.toBeNull();
    // The second sentence only ever appears in the About section's own full body, never
    // in the hero's lede (which only ever quotes the first sentence) — so this is a safe
    // marker that the extracted fragment is really About's content, not a coincidence.
    expect(about).toContain("built around your specific goals");
    // Services content should NOT leak into the extracted About fragment.
    expect(about).not.toContain("Sports Physio");
  });

  it("replaces one section without touching sibling sections", () => {
    const { body } = render(CONTENT);
    const stub = '<section data-kondo-section="about"><p>REPLACED</p></section>';
    const updated = replaceConceptSection(body, "about", stub);

    expect(updated).toContain("REPLACED");
    expect(updated).not.toContain("built around your specific goals");
    // Every other section is byte-for-byte untouched.
    expect(updated).toContain("Sports Physio");
    expect(updated).toContain("Acme Physio");
    const otherSections = listConceptSections(body).filter((s) => s.key !== "about");
    for (const s of otherSections) expect(updated).toContain(s.html);
  });

  it("throws on an unknown section key rather than silently no-op'ing", () => {
    const { body } = render(CONTENT);
    expect(() => replaceConceptSection(body, "not-a-real-section", "<p>x</p>")).toThrow();
  });
});

describe("findMatchingClose depth handling", () => {
  it("correctly matches the outer closing tag even with a same-tag element nested inside", () => {
    const html = `
      <div>before</div>
      <section data-kondo-section="outer">
        <p>intro</p>
        <section><p>nested, not independently marked</p></section>
        <p>outro</p>
      </section>
      <div>after</div>
    `;
    const sections = listConceptSections(html);
    expect(sections).toHaveLength(1);
    expect(sections[0].key).toBe("outer");
    expect(sections[0].html).toContain("intro");
    expect(sections[0].html).toContain("nested, not independently marked");
    expect(sections[0].html).toContain("outro");
    expect(sections[0].html).not.toContain("before");
    expect(sections[0].html).not.toContain("after");
  });
});
