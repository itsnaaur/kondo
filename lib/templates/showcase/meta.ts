import type { TemplateMeta } from "../types";

export const meta: TemplateMeta = {
  key: "showcase",
  label: "Showcase — Image-Led",
  // For prospects whose sites carry real photography. The layout distributes
  // images across differently-shaped slots rather than one uniform grid, so a
  // handful of photos reads as a portfolio instead of a stock library.
  //
  // Below 3 usable images (hero + gallery combined — see suitability.ts) the
  // tiles/feature/pair/mosaic sections can't fill, and Ledger is the better
  // pick — enforced below, not just in this comment.
  industries: [
    "hospitality",
    "restaurant",
    "cafe",
    "hotel",
    "venue",
    "construction",
    "trade",
    "landscaping",
    "interior design",
    "architecture",
    "real estate",
    "property",
    "automotive",
    "marine",
    "manufacturing",
    "fitness",
    "salon",
    "beauty",
    "wedding",
    "photography",
    "events",
    "tourism",
  ],
  requires: { minGallery: 3 },
  // No stats/differentiators/process/faqs section exists in this template at all — see
  // lib/templates/registry.ts::sectionCoverage.
  rendersSections: ["services", "testimonials", "gallery", "partnerLogos"],
};
