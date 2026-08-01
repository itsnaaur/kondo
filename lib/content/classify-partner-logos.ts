import type { ContentImage } from "./types";

// Deterministic — no AI. Runs during Analyse Site, after flagLowQualityImages() (needs
// widthPx/heightPx) and before the ContentRecord upsert. Only ever reclassifies images
// already marked "gallery" — logo and hero are assigned elsewhere and are never
// candidates here.

const MIN_ASPECT_RATIO = 2.0;
// 150, not the spec's original 120 — verified live against Princeton Dental's real
// health-fund logos (320×128 each): 128px missed a 120px cutoff by 8px and Signal A
// never fired. Raised to match MIN_DIMENSION_PX in assess-image-quality.ts (the same
// "too small to be a decent hero" threshold already used elsewhere), rather than picking
// an arbitrary new number — a real photo landing under both this height AND the 2.0
// aspect-ratio bar below is still a narrow, logo-shaped band, not a normal content photo.
const MAX_HEIGHT_PX = 150;
const ASPECT_SIMILARITY_TOLERANCE = 0.4; // "within roughly 40% of each other"
const MIN_COHORT_SIZE = 3;

const SURROUNDING_TEXT_PATTERN =
  /accepted|health fund|insurance|partner|accredit|member of|we work with|certified/i;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

// Signal A: partner logos almost always appear as a run of similarly-shaped small wide
// images (an "accepted here" strip) — three or more wide, short images whose aspect
// ratios cluster together. Clustered around the group's median aspect ratio rather than
// pairwise, so one oddly-shaped wide image doesn't split an otherwise-uniform row into
// two groups just under the threshold.
function findAspectCohort(candidates: { assetId: string; aspectRatio: number }[]): Set<string> {
  const wideAndShort = candidates.filter((c) => c.aspectRatio >= MIN_ASPECT_RATIO);
  if (wideAndShort.length < MIN_COHORT_SIZE) return new Set();

  const med = median(wideAndShort.map((c) => c.aspectRatio));
  const cohort = wideAndShort.filter(
    (c) => Math.abs(c.aspectRatio - med) / med <= ASPECT_SIMILARITY_TOLERANCE
  );
  return cohort.length >= MIN_COHORT_SIZE ? new Set(cohort.map((c) => c.assetId)) : new Set();
}

export function classifyPartnerLogos(
  images: ContentImage[],
  nearbyTextByAssetId: Map<string, string>
): ContentImage[] {
  const galleryImages = images.filter((img) => img.role === "gallery" && img.heightPx > 0);

  const aspectCandidates = galleryImages
    .filter((img) => img.heightPx <= MAX_HEIGHT_PX)
    .map((img) => ({ assetId: img.assetId, aspectRatio: img.widthPx / img.heightPx }));
  const aspectCohort = findAspectCohort(aspectCandidates);

  const textMatches = new Set(
    galleryImages
      .filter((img) => SURROUNDING_TEXT_PATTERN.test(nearbyTextByAssetId.get(img.assetId) ?? ""))
      .map((img) => img.assetId)
  );

  return images.map((img) => {
    if (img.role !== "gallery") return img;
    if (!aspectCohort.has(img.assetId) && !textMatches.has(img.assetId)) return img;

    // Clear flagged/flagReason on reclassification — "low-resolution, verify before
    // using as hero" is true but misleading here: this was never a hero candidate, and a
    // 300×70 partner logo at its native size is correct, not defective.
    return { ...img, role: "partner-logo" as const, flagged: false, flagReason: undefined };
  });
}
