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
