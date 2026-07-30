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

export type ContentImage = {
  assetId: string;
  role: "logo" | "hero" | "gallery";
  widthPx: number;
  heightPx: number;
  flagged: boolean;
  flagReason?: string;
};
