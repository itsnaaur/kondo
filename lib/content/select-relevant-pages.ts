import type { PageExtraction } from "@/lib/crawl/types";

// Replaces "first 15k characters in crawl order" — that was arbitrary and, on any site
// bigger than a handful of pages, meant the AI read whatever came first in BFS order
// (homepage + top nav links) and never reached the pages that actually matter: a service
// with its own detail page contributes only its homepage-menu name, never its
// description, once the budget runs out before reaching it. Confirmed live on Princeton
// Dental (92 pages crawled, 4% of the crawled text actually read) and CLaaS2SaaS (150
// pages, 2%).
//
// Selection over raw size is what actually matters — feeding hundreds of thousands of
// characters to Claude doesn't improve extraction, it drowns the signal and costs more.
// The budget below is deliberately not huge; it's picking the RIGHT characters (homepage
// always, then whichever crawled pages look like About/Services/Contact/Testimonials,
// then whichever individual pages those link to) that fixes the problem, not size alone.
//
// That said, once selection is trustworthy, a bigger budget buys something real rather
// than noise: confirmed live that Princeton Dental's 4 anchor pages (home/about/contact/
// services-index) alone consume ~13.7k of a 15k budget, leaving room for exactly one
// individual service page out of ~15 named services. 40k (~10k tokens, negligible cost)
// gives room for the anchors plus most individual service pages on a site this size.
// Selection-based ranking still matters at any budget — this raises the ceiling, it
// doesn't replace picking the right pages first.
export const ANALYSIS_CHAR_BUDGET = 40_000;

type Category = "services" | "testimonials" | "about" | "contact";

const CATEGORY_PATTERNS: { category: Category; pattern: RegExp; weight: number }[] = [
  // Deliberately just "services?|products?|what-we-do" — both "solutions?" and
  // "offerings?" were tried and dropped after confirming live they're common enough in
  // ordinary blog-post titles ("...Causes, Solutions, and Prevention", "Offering
  // family-friendly preventative measures...") to false-match as a services page.
  // "services"/"products"/"what-we-do" are structural/navigational phrasing in a way
  // ordinary gerunds like "solutions" and "offering" aren't.
  { category: "services", pattern: /\b(services?|products?|what-we-do)\b/i, weight: 10 },
  { category: "testimonials", pattern: /\b(testimonials?|reviews?|case-stud(y|ies)|success-stor(y|ies)|clients?)\b/i, weight: 8 },
  { category: "about", pattern: /\b(about|our-story|who-we-are|team|history)\b/i, weight: 7 },
  { category: "contact", pattern: /\b(contact|get-in-touch|reach-us|locations?)\b/i, weight: 5 },
];

// Boilerplate present on nearly every site, not landing-page content — excluded even
// when it coincidentally matches a category keyword (confirmed live:
// "/info/terms-of-service/" matches the services pattern on "service" alone).
const BOILERPLATE_PATH = /terms-of-service|terms-and-conditions|privacy-policy|cookie-policy|sitemap/i;

// A bare listing-root page (the feed itself, not a specific post) has almost no unique
// content and a very short slug — confirmed live it otherwise wins the word-count
// tiebreak below against genuine short-slugged service pages (general-dentistry,
// root-canal-treatment) purely for being even shorter, despite contributing nothing a
// landing page would use. Individual posts under these prefixes aren't excluded by this
// pattern (it only matches the bare root), just deprioritized by the tiebreak like any
// other article.
const LISTING_ROOT_PATH = /^\/(blog|news|press|articles|insights|resources|updates)\/?$/i;

// A page counts as a "category index" once it matches a pattern above — these are
// included unconditionally (like the homepage), not ranked against everything else,
// because the ranking pool below is specifically for pages that DON'T keyword-match
// (individual service/testimonial pages named after the specific thing, not the category
// word) and shouldn't be able to outrank the category hub they were found through.
const INDEX_PAGE_MIN_SCORE = 1;

// "Unconditional" means every anchor is always included, not that any one of them can be
// arbitrarily large — without a per-page cap, a single outlier anchor (an unusually large
// services-index page that dumps every product description inline, say) can alone consume
// the entire charBudget before rankedNonAnchors' loop below ever runs, silently dropping
// 100% of the individually-ranked pool this module exists to surface (see the module
// comment's Princeton Dental numbers). 12k is comfortably above what a normal anchor page
// needs — the same comment notes Princeton's 4 real anchors totalled ~13.7k *combined* —
// so this only ever bites the pathological single-page case, not ordinary sites.
const MAX_ANCHOR_PAGE_CHARS = 12_000;

// Applies only to pages with no keyword match of their own, competing against other such
// pages for remaining budget — deliberately modest, not larger than a real keyword match,
// so it can't outrank a genuine category-index page (confirmed live: a flat +20 let a
// junk page beat /our-services/ itself for a budget slot, dropping the index page
// entirely). It only needs to beat a page with no signal at all.
const LINKED_FROM_INDEX_BONUS = 6;

function pathOf(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

function normalizeForCompare(url: string): string {
  return pathOf(url).replace(/\/+$/, "").toLowerCase() || "/";
}

// A structural page named after one specific thing ("root-canal-treatment",
// "general-dentistry") has a short slug; a blog post/article almost always reads like a
// compressed sentence ("dont-miss-out-use-your-health-fund-benefits-before-years-end").
// Used only to break ties among pages that otherwise score identically (see
// LINKED_FROM_INDEX_BONUS below) — confirmed live this is exactly the signal missing when
// a genuine service page and an unrelated promo blog post both qualify for the same
// bonus: without it, whichever was crawled first wins by accident of BFS order.
const SLUG_WORD_PENALTY = 0.4;

function slugWordCount(url: string): number {
  const lastSegment = pathOf(url).replace(/\/+$/, "").split("/").filter(Boolean).pop() ?? "";
  return lastSegment.split("-").filter(Boolean).length;
}

function keywordScore(page: PageExtraction): number {
  const path = pathOf(page.url);
  if (BOILERPLATE_PATH.test(path) || LISTING_ROOT_PATH.test(path)) return -Infinity;

  const haystack = `${path} ${page.title ?? ""}`.toLowerCase();
  let score = 0;
  for (const { pattern, weight } of CATEGORY_PATTERNS) {
    if (pattern.test(haystack)) score += weight;
  }

  // Slight preference for shallower paths — a page one level deep (/services) is more
  // likely a real section than one four levels deep (/blog/2019/03/some-post), all else
  // equal. Small enough not to override an actual category match.
  const depth = path.split("/").filter(Boolean).length;
  score -= depth * 0.5;

  return score;
}

// The same content reachable at two different paths (confirmed live: one client's case-study
// section existed at both "/x-case-study/" and "/case-studies/x-case-study/" for every entry —
// 94 pages, 47 exact-duplicate pairs, 332k chars of pure duplication) wastes selection budget
// twice over and inflates that page's category score in aggregate with no signal gained.
// Anchors are unconditional (see below), so an unlucky client shaped like this could see its
// "40k budget" balloon past 200k on duplicate text alone before the budget check ever runs.
// Keeps the first-seen URL per distinct text block. pages[0] (the homepage) is always first in
// crawl order, so it can never be dropped as a "later duplicate" of itself.
function dedupeByContent(pages: PageExtraction[]): PageExtraction[] {
  const seen = new Set<string>();
  const out: PageExtraction[] = [];
  for (const page of pages) {
    const text = page.text.trim();
    // Below this length, treating two short pages (e.g. a bare "Coming soon") as duplicates
    // risks discarding a real distinct page that just happens to be thin, for no real budget
    // savings — the whole point is filtering out the big, wasteful chunks.
    if (text.length > 200) {
      if (seen.has(text)) continue;
      seen.add(text);
    }
    out.push(page);
  }
  return out;
}

// pages[0] is always the homepage — crawlClientSite (lib/crawl/crawler.ts) seeds its BFS
// queue with the start URL before anything else is discovered, so nothing else can ever
// be visited first.
export function selectRelevantPages(
  pages: PageExtraction[],
  charBudget: number = ANALYSIS_CHAR_BUDGET
): PageExtraction[] {
  if (pages.length === 0) return [];

  const deduped = dedupeByContent(pages);
  const [homepage, ...rest] = deduped;
  const keywordScored = rest.map((page) => ({ page, score: keywordScore(page) }));

  // Anchors — homepage plus every page that reads as a category hub by name — are
  // included unconditionally, same as the homepage, not competing for a budget slot
  // against the bonus-ranked pool below.
  const anchors = keywordScored.filter((s) => s.score >= INDEX_PAGE_MIN_SCORE).map((s) => s.page);
  const anchorUrls = new Set([homepage.url, ...anchors.map((p) => p.url)]);

  const linkedFromAnchor = new Set<string>();
  for (const anchor of [homepage, ...anchors]) {
    for (const link of anchor.links) linkedFromAnchor.add(normalizeForCompare(link));
  }

  // The bonus only ever applies to a page with no keyword match of its own — a page that
  // already reads as a category hub by name doesn't need (and shouldn't get) a second
  // boost on top, and a boilerplate page (-Infinity) can never cross back above zero.
  const rankedNonAnchors = keywordScored
    .filter((s) => !anchorUrls.has(s.page.url))
    .map(({ page, score }) => {
      const bonused = score <= 0 && linkedFromAnchor.has(normalizeForCompare(page.url)) ? score + LINKED_FROM_INDEX_BONUS : score;
      return { page, score: bonused - slugWordCount(page.url) * SLUG_WORD_PENALTY };
    })
    .sort((a, b) => b.score - a.score);

  const cappedAnchors = [homepage, ...anchors].map((page) =>
    page.text.length > MAX_ANCHOR_PAGE_CHARS ? { ...page, text: page.text.slice(0, MAX_ANCHOR_PAGE_CHARS) } : page
  );

  const selected: PageExtraction[] = cappedAnchors;
  let used = selected.reduce((sum, p) => sum + p.text.length, 0);

  if (used >= charBudget) {
    console.error(
      `[select-relevant-pages] anchor pages alone (${cappedAnchors.length}, ${used} chars) reached the ` +
        `${charBudget}-char budget even after the ${MAX_ANCHOR_PAGE_CHARS}-char per-page cap — no room left ` +
        `for any individually-ranked page this run.`
    );
  }

  for (const { page } of rankedNonAnchors) {
    if (used >= charBudget) break;
    selected.push(page);
    used += page.text.length;
  }

  return selected;
}
