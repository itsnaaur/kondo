// Deterministic — runs before an image reaches the AI classification call, and before
// the URL check even reaches the network. Confirmed live: MTech's photo grid put a
// cookie-consent icon next to "Entertainment Systems" because nothing filtered it out
// before it reached gallery role — the AI captioning step (structure-and-rewrite.ts)
// would only compound the problem by inventing a plausible-sounding caption for it.
//
// Word-boundary matching so "icon" doesn't false-positive on "iconic" — the rest of the
// list is distinctive enough as plain substrings that boundaries aren't needed there, but
// costs nothing to apply uniformly.
const JUNK_TEXT_PATTERN =
  /\b(cookie|consent|gdpr|badge|icon|sprite|avatar|placeholder|social|facebook|instagram|linkedin|twitter|pixel|tracking)\b/i;

// Checked against both the image URL and its nearbyText (alt text + nearest-ancestor
// text, see lib/crawl/types.ts) — a tracking pixel's URL usually gives it away
// ("fls.doubleclick.net/pixel"), a cookie-banner icon's alt text usually does
// ("cookieyes-logo").
export function isJunkByUrlOrText(url: string, nearbyText: string): boolean {
  return JUNK_TEXT_PATTERN.test(url) || JUNK_TEXT_PATTERN.test(nearbyText);
}

const MAX_JUNK_DIMENSION_PX = 200;

// Distinct from assess-image-quality.ts's "too small to be a decent hero" flag, which
// fires when EITHER dimension is under 150px and still keeps the image as a flagged
// gallery item (a real but oddly-cropped or low-res photo). This fires only when BOTH
// dimensions are small — the signature of a square UI icon, not a photo — and excludes
// the image entirely rather than flagging it, so it never becomes a ContentImage at all.
export function isJunkBySize(widthPx: number, heightPx: number): boolean {
  return widthPx < MAX_JUNK_DIMENSION_PX && heightPx < MAX_JUNK_DIMENSION_PX;
}

// Runs later than the two filters above — these two signals (AI subject classification,
// and comparison against the logo's own dimensions) don't exist yet at crawl/download
// time, only once lib/content/to-template-content.ts assembles the full picture. This was
// originally a template-local guard (lib/content/content-guards.ts's sceneImages, built
// for Atlas) — moved here and applied to every template's galleryImages because it's a
// property of the data, not of any one template. Confirmed live across all 8 real
// clients: 3 have AI-classified "abstract" decorative images (brand SVGs, graphic
// patterns) and 4 have a "gallery" image whose dimensions exactly match the logo's —
// almost always the same logo image re-appearing in the crawled photo list, not a real
// second photo that coincidentally shares its exact pixel dimensions.
export function isDecorativePhoto(
  img: { subject?: "people" | "place" | "work" | "product" | "abstract" | "unknown"; widthPx: number; heightPx: number },
  isSvg: boolean,
  logo: { widthPx: number; heightPx: number } | null
): boolean {
  if (img.subject === "abstract") return true;
  if (isSvg) return true;
  if (logo && img.widthPx === logo.widthPx && img.heightPx === logo.heightPx) return true;
  return false;
}
