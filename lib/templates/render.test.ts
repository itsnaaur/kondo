import { describe, expect, it } from "vitest";
import { renderAtlas } from "./atlas/index";
import { renderLedger } from "./ledger/index";
import { renderShowcase } from "./showcase/index";
import type { TemplateContent } from "./types";

const FULL_CONTENT: TemplateContent = {
  businessName: "Acme Physio",
  tagline: "Get back to doing what you love — evidence-based physiotherapy for Brisbane",
  aboutCopy: "We've been helping the local community move better for over 15 years.",
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
  serviceAreas: ["Brisbane CBD", "South Bank", "West End"],
  hours: [
    { days: "Mon–Fri", hours: "8:00am–5:00pm" },
    { days: "Sat", hours: "9:00am–1:00pm" },
  ],
  offers: [{ name: "New patient check-up", price: "$99" }],
  credentials: ["AHPRA registered", "Medicare provider"],
};

// The minimum a template must survive without throwing — a prospect with no photos, no
// testimonials, no differentiators, no reviewed extras at all is the normal case this tool
// exists for (see lib/templates/types.ts's heroImageUrl comment), not a rare edge case.
const MINIMAL_CONTENT: TemplateContent = {
  businessName: "Bare Bones Co",
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
  partnerLogos: [],
  detectedIndustry: null,
  ctaLabel: null,
  serviceAreas: [],
  hours: [],
  offers: [],
  credentials: [],
};

const TEMPLATES = [
  { name: "atlas", render: renderAtlas },
  { name: "ledger", render: renderLedger },
  { name: "showcase", render: renderShowcase },
] as const;

describe.each(TEMPLATES)("$name template", ({ render }) => {
  it("renders full content without throwing, as HTML with matching CSS", () => {
    const { body, css } = render(FULL_CONTENT);
    expect(body).toContain("Acme Physio");
    expect(css.length).toBeGreaterThan(0);
  });

  it("surfaces the second extraction-expansion fields (ctaLabel/hours/offers/serviceAreas/credentials)", () => {
    const { body } = render(FULL_CONTENT);
    expect(body).toContain("Book an appointment");
    expect(body).toContain("8:00am");
    expect(body).toContain("New patient check-up");
    expect(body).toContain("$99");
    expect(body).toContain("South Bank");
    expect(body).toContain("AHPRA registered");
  });

  it("renders minimal/empty content without throwing", () => {
    const { body } = render(MINIMAL_CONTENT);
    expect(body).toContain("Bare Bones Co");
  });

  it("escapes HTML in user-supplied content instead of injecting it raw", () => {
    const malicious: TemplateContent = {
      ...MINIMAL_CONTENT,
      businessName: '<script>alert(1)</script>',
    };
    const { body } = render(malicious);
    expect(body).not.toContain("<script>alert(1)</script>");
  });
});
