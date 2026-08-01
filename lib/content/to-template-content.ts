import type { Asset, ContentRecord } from "@/app/generated/prisma/client";
import type { ContentColor, ContentImage, ContentService, ContentTestimonial } from "./types";
import type { TemplateContent } from "@/lib/templates/types";

// Resolves a ContentRecord + its Client's Assets into the flat, template-author-facing
// shape — Asset ids become URLs, and all confidence/flagged review metadata is stripped
// (templates never see it). Called once per render by both the Choose Template gallery
// and the full Generate & Preview page, so trying every template costs nothing beyond
// this cheap in-memory mapping plus a string-template render.
export function toTemplateContent(contentRecord: ContentRecord, assets: Asset[]): TemplateContent {
  const assetById = new Map(assets.map((a) => [a.id, a]));

  const services = (contentRecord.services as unknown as ContentService[] | null) ?? [];
  const testimonials = (contentRecord.testimonials as unknown as ContentTestimonial[] | null) ?? [];
  const brandColors = (contentRecord.brandColors as unknown as ContentColor[] | null) ?? [];
  const images = (contentRecord.images as unknown as ContentImage[] | null) ?? [];

  const logoUrl = contentRecord.logoAssetId ? (assetById.get(contentRecord.logoAssetId)?.url ?? null) : null;

  // The hero is the one place flagged images are excluded even from approved content —
  // a low-res photo blown up to hero size looks broken regardless of whether a human
  // got around to removing it during review, so this always prefers the gradient/color-
  // block fallback (heroImageUrl: null) over a flagged candidate.
  const heroCandidate = images.find((img) => img.role === "hero" && !img.flagged) ?? null;
  const heroImageUrl = heroCandidate ? (assetById.get(heroCandidate.assetId)?.url ?? null) : null;

  // widthPx/heightPx pass through so a template can distinguish a landscape photo from a
  // near-square one instead of force-cropping every gallery image to the same ratio.
  const galleryImages = images
    .filter((img) => img.role === "gallery")
    .flatMap((img) => {
      const url = assetById.get(img.assetId)?.url;
      return url ? [{ url, widthPx: img.widthPx, heightPx: img.heightPx }] : [];
    });

  // Partner/insurer logos are their own bucket, never hero and never gallery — they were
  // never eligible for either once lib/content/classify-partner-logos.ts assigns this role
  // (both those filters check for "hero"/"gallery" specifically), so no separate exclusion
  // check is needed here beyond the role filter itself.
  const partnerLogos = images
    .filter((img) => img.role === "partner-logo")
    .flatMap((img) => {
      const url = assetById.get(img.assetId)?.url;
      return url ? [{ url }] : [];
    });

  return {
    businessName: contentRecord.businessName ?? "",
    tagline: contentRecord.tagline ?? "",
    aboutCopy: contentRecord.aboutCopy ?? "",
    services: services.map((s) => ({ name: s.name, description: s.description })),
    testimonials: testimonials.map((t) => ({ quote: t.quote, author: t.author, role: t.role })),
    contactEmail: contentRecord.contactEmail,
    contactPhone: contentRecord.contactPhone,
    contactAddress: contentRecord.contactAddress,
    logoUrl,
    brandColors: brandColors.map((c) => ({ hex: c.hex, role: c.role })),
    heroImageUrl,
    galleryImages,
    partnerLogos,
  };
}
