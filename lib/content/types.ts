// The shapes stored in ContentRecord's Json columns (services/testimonials/brandColors/
// images) — every array item carries its own confidence/flagged inline, which is what the
// Review Extraction screen (ContentReviewForm/ConfidenceBadge) renders against.

export type ConfidenceLevel = "low" | "medium" | "high";

export type FieldFlag = { confidence: ConfidenceLevel; reason: string };

// ContentRecord.fieldFlags shape, for the scalar fields that don't have their own array
// item to carry confidence on. contactEmail/contactPhone get "high" when a mailto:/tel:
// anchor href matched, "low" when only a loose text regex matched (see
// lib/content/contact-extraction.ts); the rest come from the one Claude structuring call.
export type FieldFlags = Partial<
  Record<
    "businessName" | "tagline" | "aboutCopy" | "contactAddress" | "contactEmail" | "contactPhone",
    FieldFlag
  >
>;

export type ContentService = {
  id: string;
  name: string;
  description: string;
  confidence: ConfidenceLevel;
  flagged: boolean;
  flagReason?: string;
};

export type ContentTestimonial = {
  id: string;
  quote: string;
  author: string;
  role?: string;
  confidence: ConfidenceLevel;
  flagged: boolean;
  flagReason?: string;
};

export type ContentColor = {
  hex: string;
  role: "primary" | "secondary" | "accent";
  confidence: ConfidenceLevel;
  flagged: boolean;
};

// AI-classified from alt text + nearest-ancestor text (lib/crawl/types.ts's nearbyText),
// never from pixels — there's no vision model in this pipeline. "people" -> about/team
// bands, "place" -> hero-shaped, "work" -> gallery/portfolio, "product" -> service tiles,
// "abstract" -> stock/decorative. Templates don't consume this yet (see
// lib/content/structure-and-rewrite.ts's extraction-expansion note) — it's captured now
// so the suitability numbers exist before any template is designed against them.
export type ImageSubject = "people" | "place" | "work" | "product" | "abstract" | "unknown";

export type ContentImage = {
  assetId: string;
  role: "logo" | "hero" | "gallery" | "partner-logo";
  widthPx: number;
  heightPx: number;
  flagged: boolean;
  flagReason?: string;
  // Optional: the logo never goes through AI image classification (see
  // lib/content/structure-and-rewrite.ts), and anything the deterministic junk filter
  // (lib/content/filter-junk-images.ts) rejected never reaches the AI call to begin with.
  caption?: string;
  subject?: ImageSubject;
  suitableAsHero?: boolean;
  subjectConfidence?: ConfidenceLevel;
};

// "How many years", "how many clients" — the trust-band numbers. Defaults to
// flagged: true regardless of confidence (see structure-and-rewrite.ts's system prompt) —
// a wrong number in a prospect-facing mockup damages credibility more than a missing one,
// so every stat gets a human's eyes before it's trusted, not just the low-confidence ones.
export type ContentStat = {
  id: string;
  value: string;
  label: string;
  confidence: ConfidenceLevel;
  flagged: boolean;
  flagReason?: string;
};

export type ContentFaq = {
  id: string;
  question: string;
  answer: string;
  confidence: ConfidenceLevel;
  flagged: boolean;
  flagReason?: string;
};

// The "why choose us" points — distinct from services (what they offer) and about copy
// (who they are). Previously these got mashed into aboutCopy and lost.
export type ContentDifferentiator = {
  id: string;
  title: string;
  description: string;
  confidence: ConfidenceLevel;
  flagged: boolean;
  flagReason?: string;
};

// "How it works" / "Our approach" — less universal than the other extractions (maybe half
// of sites have one), so an empty array here is a normal outcome, not a missed extraction.
export type ContentProcessStep = {
  id: string;
  title: string;
  description: string;
  confidence: ConfidenceLevel;
  flagged: boolean;
  flagReason?: string;
};
