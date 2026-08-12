const SKIP_EXTENSIONS =
  /\.(pdf|jpg|jpeg|png|gif|svg|webp|zip|rar|mp4|mp3|wav|doc|docx|xls|xlsx|ppt|pptx|css|js|ico|woff|woff2|ttf|eot|xml|json)$/i;

// Extension-based filtering misses download endpoints that serve a file with no
// extension in the path at all — confirmed live on K&L Gates, where every attorney bio
// links a vCard exporter ("/bio/vcard/175811?LangCode=en-US") that triggers a browser
// download instead of rendering a page. This pattern is common to professional-services
// sites generally (attorney/staff directories almost always ship a vCard export), not
// specific to this one CMS, so it's worth matching by path shape rather than by this
// site's exact route.
const LIKELY_DOWNLOAD_PATH_PATTERN = /\/vcard(\/|$)|\.ashx(\/|$)|\/download(\/|$)/i;

// Analytics/tracking params never change what a page actually shows — the same
// /services page linked internally (or from an old campaign) with a different utm_*
// suffix is the same page, not a distinct one, but without this it's a distinct entry in
// the crawler's visited/queued sets (lib/crawl/crawler.ts) and burns a slot out of
// MAX_PAGES on a duplicate. Deliberately only known tracking-only params, not every query
// string — a site that genuinely encodes distinct content in a query param (rare for the
// small-business sites this tool targets, but not impossible) keeps working exactly as
// before; this only ever removes params that are provably never content-bearing.
const TRACKING_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utm_id",
  "fbclid",
  "gclid",
  "gclsrc",
  "mc_cid",
  "mc_eid",
  "igshid",
]);

export function normalizeUrl(href: string, base: string): string | null {
  try {
    const url = new URL(href, base);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    url.hash = "";
    for (const param of TRACKING_PARAMS) url.searchParams.delete(param);
    return url.toString();
  } catch {
    return null;
  }
}

export function isCrawlableLink(url: string, origin: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.origin !== origin) return false;
    if (SKIP_EXTENSIONS.test(parsed.pathname)) return false;
    if (LIKELY_DOWNLOAD_PATH_PATTERN.test(parsed.pathname)) return false;
    return true;
  } catch {
    return false;
  }
}
