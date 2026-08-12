// A gallery/hero-pool image as templates see it — Asset ids and confidence are already
// resolved/stripped by to-template-content.ts. caption/subject/suitableAsHero come from
// the AI image-classification step (lib/content/structure-and-rewrite.ts) and are
// optional: the logo never goes through that classification, and a manually-uploaded
// replacement image may not have either.
export type TemplateImage = {
  url: string;
  widthPx?: number;
  heightPx?: number;
  caption?: string;
  subject?: "people" | "place" | "work" | "product" | "abstract" | "unknown";
  suitableAsHero?: boolean;
};

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
  // Extraction-expansion fields (lib/content/structure-and-rewrite.ts) — each defaults to
  // [] the same way services/testimonials do; an empty array is the normal, common
  // outcome for stats/faqs/differentiators/process, not a missing-data state.
  differentiators: { title: string; description: string }[];
  process: { title: string; description: string }[];
  stats: { value: string; label: string }[];
  faqs: { question: string; answer: string }[];
  contactEmail: string | null;
  contactPhone: string | null;
  contactAddress: string | null;
  logoUrl: string | null;
  brandColors: { hex: string; role: "primary" | "secondary" | "accent" }[];
  // null when neither an extracted hero candidate nor a promotable gallery photo
  // qualifies (see lib/content/to-template-content.ts's fallback chain) — a prospect with
  // no usable photography at all is the normal case this tool exists for, not a rare
  // failure. Every template must degrade gracefully here (a gradient/color-block
  // treatment built from brandColors), not assume a photo is always available. This is
  // the crawler's own best guess — a template that wants the AI's suitableAsHero
  // judgement instead (see lib/content/content-guards.ts::pickHero) can override it using
  // galleryImages, which now includes this same image as one of its candidates.
  heroImageUrl: string | null;
  // "extracted" = a real role:"hero" candidate; "promoted" = no hero candidate existed,
  // so the best qualifying gallery photo was promoted instead. null alongside
  // heroImageUrl: null. Templates don't read this — it's for the review screen and the
  // suitability scorer.
  heroImageSource: "extracted" | "promoted" | null;
  // Every non-logo, non-partner-logo image, hero-role included — deliberately NOT
  // deduplicated against heroImageUrl here, so a template can make its own hero decision
  // (e.g. by suitableAsHero) instead of inheriting the crawler's tier1/tier2 pick. A
  // template that just wants "the gallery, minus whatever I'm using as hero" filters
  // heroImageUrl out itself (see lib/templates/ledger/index.ts); one that builds its own
  // pool from hero + gallery already dedupes by URL (see lib/templates/showcase/index.ts).
  galleryImages: TemplateImage[];
  // Insurer/health-fund/partner logos — a distinct bucket from galleryImages, never a
  // hero candidate. Optional so a future template that has no use for a trust strip
  // doesn't need any changes; ledger, showcase, and atlas all read this directly.
  partnerLogos?: { url: string }[];
  // Carried through only for lib/templates/suitability.ts's "recommended" tier — no
  // template reads it for rendering, same as heroImageSource above. Kept here rather than
  // threading a second parameter through every scoreTemplate/pickDefaultTemplate call site.
  detectedIndustry: string | null;
  // The site's own recurring CTA phrase ("Book an appointment", "Get a quote") — null
  // when nothing recurs clearly enough to trust as their actual wording (see
  // lib/content/types.ts's FieldFlags comment). Every template substitutes this in place
  // of its own generic "Get in touch"/"Book a visit" button copy when present, and falls
  // back to that generic copy when null — never invents a CTA phrase itself.
  ctaLabel: string | null;
  // Second extraction-expansion fields (lib/content/structure-and-rewrite.ts) — same
  // "empty array is a normal, common outcome" convention as stats/faqs/differentiators
  // above, not a missing-data state. Confidence/flagged metadata is stripped like every
  // other field here; these are all forced flagged:true at extraction time (a human
  // always reviews them before they can reach a template), so a template never needs to
  // re-derive trust here.
  serviceAreas: string[];
  hours: { days: string; hours: string }[];
  offers: { name: string; price: string }[];
  credentials: string[];
};

// The content types a template has a section for at all — used only for the tie-break
// coverage score in lib/templates/registry.ts::pickDefaultTemplate, not for rendering
// itself (each template's own render function already checks its own content directly).
export type TemplateSection =
  | "services"
  | "testimonials"
  | "stats"
  | "differentiators"
  | "process"
  | "faqs"
  | "gallery"
  | "partnerLogos";

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
  // Which content types this template has a section for at all, regardless of whether
  // this specific client happens to have populated them. Drives the tie-break coverage
  // score: when two templates land on the same suitability status for a client, the one
  // that would actually show more of what that client has wins, rather than an arbitrary
  // priority order. See lib/templates/registry.ts::sectionCoverage.
  rendersSections?: TemplateSection[];
};

// Returns the <body> content as an HTML string, not JSX — react-dom/server can't be
// imported anywhere in Next's Server Component/Route Handler/Server Action module graph,
// so templates are plain string builders. Every interpolated value must go through
// lib/templates/escape-html.ts's escapeHtml().
export type TemplateComponent = (props: TemplateContent) => string;
