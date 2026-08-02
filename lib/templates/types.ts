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
  // null when neither an extracted hero candidate nor a promotable gallery photo
  // qualifies (see lib/content/to-template-content.ts's fallback chain) — a prospect with
  // no usable photography at all is the normal case this tool exists for, not a rare
  // failure. Every template must degrade gracefully here (a gradient/color-block
  // treatment built from brandColors), not assume a photo is always available.
  heroImageUrl: string | null;
  // "extracted" = a real role:"hero" candidate; "promoted" = no hero candidate existed,
  // so the best qualifying gallery photo was promoted instead (and removed from
  // galleryImages so it doesn't render twice). null alongside heroImageUrl: null.
  // Templates don't read this — it's for the review screen and the suitability scorer.
  heroImageSource: "extracted" | "promoted" | null;
  // widthPx/heightPx let a template tell a landscape photo from a near-square one instead
  // of force-cropping every gallery image to the same ratio — optional since they're only
  // populated from crawl-derived images (a manually-uploaded replacement image may not
  // have gone through the same dimension check).
  galleryImages: { url: string; widthPx?: number; heightPx?: number }[];
  // Insurer/health-fund/partner logos — a distinct bucket from galleryImages, never a
  // hero candidate. Optional so a future template that has no use for a trust strip
  // doesn't need any changes; ledger and showcase both read this directly.
  partnerLogos?: { url: string }[];
  // Carried through only for lib/templates/suitability.ts's "recommended" tier — no
  // template reads it for rendering, same as heroImageSource above. Kept here rather than
  // threading a second parameter through every scoreTemplate/pickDefaultTemplate call site.
  detectedIndustry: string | null;
};

export type TemplateMeta = {
  key: string;
  label: string;
  // Matched (case-insensitively, substring) against ContentRecord.detectedIndustry to
  // pre-select a template in the gallery. See lib/templates/registry.ts::pickDefaultTemplate.
  industries: string[];
  // Things the template genuinely can't do well without — see lib/templates/suitability.ts.
  // Keep this list short: a requirement that's never violated in practice is noise, not
  // signal. Absent/false means "not required."
  requires?: { heroImage?: boolean; phone?: boolean; minServices?: number; minGallery?: number };
  // Things that make the template better but aren't blocking.
  prefers?: { testimonials?: boolean; minGallery?: number };
};

// Returns the <body> content as an HTML string, not JSX — react-dom/server can't be
// imported anywhere in Next's Server Component/Route Handler/Server Action module graph,
// so templates are plain string builders. Every interpolated value must go through
// lib/templates/escape-html.ts's escapeHtml().
export type TemplateComponent = (props: TemplateContent) => string;
