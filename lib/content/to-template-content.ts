import type { Asset, ContentRecord } from "@/app/generated/prisma/client";
import type {
  ContentColor,
  ContentImage,
  ContentService,
  ContentTestimonial,
  ContentStat,
  ContentFaq,
  ContentDifferentiator,
  ContentProcessStep,
} from "./types";
import type { TemplateContent } from "@/lib/templates/types";
import { isDecorativePhoto } from "./filter-junk-images";

// Resolves a ContentRecord + its Client's Assets into the flat, template-author-facing
// shape — Asset ids become URLs, and all confidence/flagged review metadata is stripped
// (templates never see it). Called once per render by both the Choose Template gallery
// and the full Generate & Preview page, so trying every template costs nothing beyond
// this cheap in-memory mapping plus a string-template render.
export function toTemplateContent(contentRecord: ContentRecord, assets: Asset[]): TemplateContent {
  const assetById = new Map(assets.map((a) => [a.id, a]));

  const services = (contentRecord.services as unknown as ContentService[] | null) ?? [];
  const testimonials = (contentRecord.testimonials as unknown as ContentTestimonial[] | null) ?? [];
  const stats = (contentRecord.stats as unknown as ContentStat[] | null) ?? [];
  const faqs = (contentRecord.faqs as unknown as ContentFaq[] | null) ?? [];
  const differentiators = (contentRecord.differentiators as unknown as ContentDifferentiator[] | null) ?? [];
  const process = (contentRecord.process as unknown as ContentProcessStep[] | null) ?? [];
  const brandColors = (contentRecord.brandColors as unknown as ContentColor[] | null) ?? [];
  const images = (contentRecord.images as unknown as ContentImage[] | null) ?? [];

  const logoUrl = contentRecord.logoAssetId ? (assetById.get(contentRecord.logoAssetId)?.url ?? null) : null;

  // Real photos only, for every hero/gallery decision below — this used to be a
  // template-local guard (built for Atlas, see lib/content/content-guards.ts's
  // sceneImages) before confirming live that Showcase and Ledger had the identical bug:
  // Propell's brand SVGs rendering as garbled tiles, Princeton's logo re-appearing as a
  // "gallery" photo. Presentability is a property of the data, not of any one template,
  // so this runs once here instead of once per template. logo/partner-logo roles are
  // untouched — an SVG logo is exactly what it should be, just never eligible to become a
  // hero or gallery photo in the first place.
  const logoImage = images.find((img) => img.role === "logo") ?? null;
  const realImages = images.filter((img) => {
    if (img.role !== "gallery" && img.role !== "hero") return true;
    const isSvg = assetById.get(img.assetId)?.mimeType === "image/svg+xml";
    return !isDecorativePhoto(img, isSvg, logoImage);
  });

  // Hero fallback chain. Tier 1 (extracted): the one place flagged images are excluded
  // even from approved content — a low-res photo blown up to hero size looks broken
  // regardless of whether a human got around to removing it during review, so this always
  // prefers falling through rather than using a flagged candidate.
  //
  // MIN_HERO_ASPECT matches pickHero's own "wideEnough" threshold (content-guards.ts) —
  // until this existed, tier1 had no aspect (or subject) gate at all, unlike tier2 below
  // and unlike pickHero. Confirmed live on CL Financial: a 2318x2318 image tagged
  // role:"hero" by the crawler's own heuristic was actually a blown-up brand wordmark —
  // square, so it fails this gate, but it isn't SVG, isn't subject:"abstract", and doesn't
  // match the logo's own dimensions, so isDecorativePhoto above let it through and tier1
  // promoted it with nothing else to catch it.
  const MIN_HERO_ASPECT = 1.25;
  const tier1 =
    realImages.find(
      (img) => img.role === "hero" && !img.flagged && img.heightPx > 0 && img.widthPx / img.heightPx >= MIN_HERO_ASPECT
    ) ?? null;

  let heroImageUrl: string | null = null;
  let heroImageSource: "extracted" | "promoted" | null = null;

  if (tier1) {
    const url = assetById.get(tier1.assetId)?.url;
    if (url) {
      heroImageUrl = url;
      heroImageSource = "extracted";
    }
  }

  if (!heroImageUrl) {
    // Tier 2 (promoted): no extracted hero candidate — confirmed live on BC Security that
    // this left three genuinely good, unflagged 980×500 photos sitting unused in
    // galleryImages while the page rendered with no hero at all, because the role:"hero"
    // candidate was a flagged 300×47 wordmark the picker never looked past. Aspect range
    // 1.2–2.6 excludes squares/avatars at the low end and wide banner strips at the high
    // end; among survivors, largest area wins.
    const MIN_PROMOTABLE_WIDTH_PX = 800;
    const MIN_PROMOTABLE_ASPECT = 1.2;
    const MAX_PROMOTABLE_ASPECT = 2.6;

    const promotable = realImages
      .filter((img) => img.role === "gallery" && !img.flagged && img.widthPx >= MIN_PROMOTABLE_WIDTH_PX)
      .filter((img) => {
        if (img.heightPx <= 0) return false;
        const ratio = img.widthPx / img.heightPx;
        return ratio >= MIN_PROMOTABLE_ASPECT && ratio <= MAX_PROMOTABLE_ASPECT;
      })
      .sort((a, b) => b.widthPx * b.heightPx - a.widthPx * a.heightPx);

    const best = promotable[0];
    const url = best ? assetById.get(best.assetId)?.url : undefined;
    if (best && url) {
      heroImageUrl = url;
      heroImageSource = "promoted";
    }
  }
  // Tier 3: heroImageUrl/heroImageSource stay null — templates' existing gradient/
  // color-block fallback is the safety net, not something this chain replaces.

  // WARNING for whoever adds template #4: galleryImages below DOES include whatever
  // heroImageUrl points at above — deliberately not deduplicated here. This is what lets
  // a template make its own hero decision (e.g. lib/content/content-guards.ts::pickHero,
  // keyed off suitableAsHero) instead of inheriting the crawler's tier1/tier2 pick, which
  // is exactly what atlas does. But it means every template is responsible for its OWN
  // dedup: either filter out `img.url === c.heroImageUrl` before rendering a gallery grid
  // (see lib/templates/ledger/index.ts), or build your own hero+gallery pool that dedupes
  // by URL as it goes (see lib/templates/showcase/index.ts's allocateImages). Skip this
  // and the hero photo renders twice on the page.
  const galleryImages = realImages
    .filter((img) => img.role === "gallery" || img.role === "hero")
    .flatMap((img) => {
      const url = assetById.get(img.assetId)?.url;
      if (!url) return [];
      return [
        {
          url,
          widthPx: img.widthPx,
          heightPx: img.heightPx,
          caption: img.caption,
          subject: img.subject,
          suitableAsHero: img.suitableAsHero,
        },
      ];
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
    differentiators: differentiators.map((d) => ({ title: d.title, description: d.description })),
    process: process.map((p) => ({ title: p.title, description: p.description })),
    stats: stats.map((s) => ({ value: s.value, label: s.label })),
    faqs: faqs.map((f) => ({ question: f.question, answer: f.answer })),
    contactEmail: contentRecord.contactEmail,
    contactPhone: contentRecord.contactPhone,
    contactAddress: contentRecord.contactAddress,
    logoUrl,
    brandColors: brandColors.map((c) => ({ hex: c.hex, role: c.role })),
    heroImageUrl,
    heroImageSource,
    galleryImages,
    partnerLogos,
    detectedIndustry: contentRecord.detectedIndustry,
  };
}
