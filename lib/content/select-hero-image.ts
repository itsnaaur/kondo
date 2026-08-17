import type { ContentImage } from "./types";

// Replaces "the first image found on the homepage" — that heuristic reliably picked
// wordmarks, icons, and banner strips over actual photos (confirmed live: BC Security's
// "hero" came back as the exact same 300×47 image as its logo, because that was simply
// the first <img> tag on the page). This operates on dimensions already computed by
// lib/content/assess-image-quality.ts — no second image decode.
const MIN_HERO_WIDTH_PX = 800;
const MIN_ASPECT = 0.5; // kills tall banner slivers
const MAX_ASPECT = 2.5; // kills wide wordmark/banner strips

export type HeroCandidate = { image: ContentImage; fromHomepage: boolean };

// Returns the assetId of the best hero candidate, or null if nothing qualifies — a
// prospect with no hero-worthy photo is the normal case this tool exists for (see
// lib/content/to-template-content.ts's null handling), not an error.
export function selectHeroAssetId(candidates: HeroCandidate[]): string | null {
  const eligible = candidates.filter(({ image }) => {
    if (image.widthPx < MIN_HERO_WIDTH_PX || image.heightPx <= 0) return false;
    const aspect = image.widthPx / image.heightPx;
    return aspect >= MIN_ASPECT && aspect <= MAX_ASPECT;
  });

  if (eligible.length === 0) return null;

  eligible.sort((a, b) => {
    if (a.fromHomepage !== b.fromHomepage) return a.fromHomepage ? -1 : 1;
    const areaDiff = b.image.widthPx * b.image.heightPx - a.image.widthPx * a.image.heightPx;
    // Tiebreak on assetId — two images tied on fromHomepage and area need a stable,
    // content-independent order, not whatever order they happened to arrive in.
    return areaDiff !== 0 ? areaDiff : a.image.assetId.localeCompare(b.image.assetId);
  });

  return eligible[0].image.assetId;
}
