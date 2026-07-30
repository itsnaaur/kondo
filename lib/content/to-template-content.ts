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

  const galleryImages = images
    .filter((img) => img.role === "gallery")
    .map((img) => assetById.get(img.assetId)?.url)
    .filter((url): url is string => !!url)
    .map((url) => ({ url }));

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
  };
}
