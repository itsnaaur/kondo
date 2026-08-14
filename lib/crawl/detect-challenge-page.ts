// Catches a bot/security challenge interstitial that loads with a normal 200 status — the
// non-2xx check in crawler.ts (403/429/503) only catches a block that announces itself at
// the HTTP layer; a JS "checking your browser" or cookie-verification screen loads exactly
// like a real page to Playwright and returns 200, so it needs a content-based check
// instead. Confirmed live: offrisklegaltemplates.com.au serves a page titled "Robot
// Challenge Screen" with "Checking the site connection security" / "requires cookies to be
// enabled" as its entire body — nothing about that trips the status-code check, and at
// under a thousand characters it's also well under possibleExtractionCollapse's 20k-char
// threshold, so nothing else in the pipeline would have caught it either. Deliberately
// does NOT attempt to get past this kind of page (solve it, wait it out, spoof a browser
// fingerprint) — only to recognize one and fail the analysis honestly instead of quietly
// extracting "Checking your browser..." as the client's about copy.
//
// Title patterns are the primary, high-confidence signal — real business homepages are
// essentially never titled anything like this. Body-text patterns are a secondary signal,
// only trusted on a short page (a legitimate long page mentioning "cookies" in a privacy
// section shouldn't trip this).
const TITLE_PATTERNS = [
  /robot challenge screen/i,
  /just a moment/i,
  /attention required.*cloudflare/i,
  /checking your browser/i,
  /ddos protection by/i,
  /please wait.*cloudflare/i,
  /pardon our interruption/i,
  /are you a human/i,
  /verify you are human/i,
  /access denied/i,
];

const BODY_TEXT_PATTERNS = [
  /checking the site connection security/i,
  /checking your browser before accessing/i,
  /enable javascript and cookies to continue/i,
  /requires cookies to be enabled/i,
  /ray id:\s*\S+/i, // Cloudflare's own diagnostic ID, printed verbatim on its challenge pages
  /incapsula incident id/i,
];

// A real interstitial is short by nature — nothing to read past the challenge itself.
// Guards the body-text patterns against a false-positive match buried in an otherwise
// substantial, genuine page (e.g. a privacy policy section mentioning cookie consent).
const SHORT_PAGE_CHAR_LIMIT = 2_000;

export function isLikelyChallengePage(title: string, text: string): boolean {
  if (TITLE_PATTERNS.some((p) => p.test(title))) return true;
  if (text.trim().length > SHORT_PAGE_CHAR_LIMIT) return false;
  return BODY_TEXT_PATTERNS.some((p) => p.test(text));
}
