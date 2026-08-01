// The flat, template-author-facing content shape — deliberately separate from the Prisma
// ContentRecord/Json shapes in lib/content/types.ts. Template authors never touch
// confidence/flagged metadata or Asset ids; lib/content/to-template-content.ts resolves
// all of that before a template ever sees it.
export type TemplateContent = {
  businessName: string;
  tagline: string;
  aboutCopy: string;
  services: { name: string; description: string }[];
  testimonials: { quote: string; author: string; role?: string }[];
  contactEmail: string | null;
  contactPhone: string | null;
  contactAddress: string | null;
  logoUrl: string | null;
  brandColors: { hex: string; role: "primary" | "secondary" | "accent" }[];
  // null when no unflagged "hero"-role image qualifies — a prospect with no usable
  // photography is the normal case this tool exists for, not a rare failure. Every
  // template must degrade gracefully here (a gradient/color-block treatment built from
  // brandColors), not assume a photo is always available.
  heroImageUrl: string | null;
  // widthPx/heightPx let a template tell a landscape photo from a near-square one instead
  // of force-cropping every gallery image to the same ratio — optional since they're only
  // populated from crawl-derived images (a manually-uploaded replacement image may not
  // have gone through the same dimension check).
  galleryImages: { url: string; widthPx?: number; heightPx?: number }[];
  // Insurer/health-fund/partner logos — a distinct bucket from galleryImages, never a
  // hero candidate. Optional so saas/local-service (which don't render it) don't need any
  // changes; a template that wants the "accepted here" trust strip reads this directly.
  partnerLogos?: { url: string }[];
};

export type TemplateMeta = {
  key: string;
  label: string;
  // Matched (case-insensitively, substring) against ContentRecord.detectedIndustry to
  // pre-select a template in the gallery. See lib/templates/registry.ts::pickDefaultTemplate.
  industries: string[];
};

// Returns the <body> content as an HTML string, not JSX — react-dom/server can't be
// imported anywhere in Next's Server Component/Route Handler/Server Action module graph,
// so templates are plain string builders. Every interpolated value must go through
// lib/templates/escape-html.ts's escapeHtml().
export type TemplateComponent = (props: TemplateContent) => string;
