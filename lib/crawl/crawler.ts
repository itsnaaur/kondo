import { chromium } from "playwright";
import type { Page } from "playwright";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/app/generated/prisma/client";
import { fetchRobotsDisallowPaths, isDisallowed } from "./robots";
import { normalizeUrl, isCrawlableLink } from "./url-utils";
import { extractPageData } from "./extract";
import type { PageExtraction } from "./types";
import { checkUrlIsSafe, installSsrfGuard } from "@/lib/security/ssrf";
import { gotoAndSettle } from "./goto-and-settle";
import { isLikelyChallengePage } from "./detect-challenge-page";

const MAX_PAGES = 150;
const REQUEST_DELAY_MS = 400;
const PAGE_TIMEOUT_MS = 20_000;
// Defensive only — a design system with hundreds of custom properties is unusual, and this
// exists purely so a pathological page can't balloon the stored JSON, not because normal
// sites get anywhere close.
const MAX_CUSTOM_PROPERTIES = 100;

// A ranked survivor of the neutral filter below — count is how many matched elements shared
// this exact colour, inMain is whether at least one of those elements sat inside <main>. Best
// candidate first. An empty array is the honest result when nothing non-neutral was found,
// not a sentinel to special-case.
export type ColorCandidate = { color: string; count: number; inMain: boolean };

type RawColorSample = { color: string; inMain: boolean };

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
    else if (max === gn) h = ((bn - rn) / d + 2) / 6;
    else h = ((rn - gn) / d + 4) / 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

// Deliberately NOT lib/content/extract-colors.ts's isNearNeutral (max > 235 || min < 20 ||
// max - min < 12) — that was tried first, and rejected after testing against real data (see
// 1.1b's log). Its min-channel<20 check flags a legitimate, highly-saturated dark colour like
// rgb(2, 68, 112) — BC Security's actual brand navy, 96% saturated — as neutral, because ONE
// channel (red) happens to be near zero. That's fine for extract-colors.ts's narrower job
// (ranking the accent role among a logo's dominant pixel buckets, where this edge case is
// rare); it silently zeroed out multiple real sites' correct answer here, where a brand
// colour being a dark, punchy, one-channel-near-zero hue (navy, forest green, deep red) is
// completely ordinary. HSL saturation/lightness is the correct test for "does this colour
// carry a usable hue at all" — true near-white, true near-black, and true low-saturation
// grey are the only things this should reject, regardless of which raw channel is small.
function isNearNeutralOrTransparent(rgb: { r: number; g: number; b: number; a: number }): boolean {
  if (rgb.a < 0.5) return true;
  const { s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b);
  // l >= 90, not 97 — refined during Task 1.2, found live against Downseal Solutions'
  // linkColor: its theme's near-white page background, rgb(246, 243, 238), is l~=95%/
  // s~=31%, so it survived a 97%-lightness / 15%-saturation cutoff and won that field at a
  // count in the thousands with "high" confidence — the page background bleeding through a
  // link's inherited colour, not an intentional brand choice. HSL saturation is a noisy
  // signal this close to the lightness extremes: a faint warm/cool cast on an almost-white
  // pixel reads as "30% saturated" numerically without being a real, legible colour, and
  // text actually coloured this close to white would have near-zero contrast against a
  // light background anyway. See lib/content/rank-brand-color-sources.ts for the sibling
  // fix and docs/kondo-v2-execution.md's 1.2 entry for the full finding.
  return l >= 90 || l <= 3 || s < 15;
}

function parseComputedColor(value: string): { r: number; g: number; b: number; a: number } | null {
  const match = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+))?\s*\)$/.exec(value);
  if (!match) return null;
  return {
    r: Number(match[1]),
    g: Number(match[2]),
    b: Number(match[3]),
    a: match[4] !== undefined ? Number(match[4]) : 1,
  };
}

// Filters near-neutral/transparent samples, then ranks the survivors by how often each exact
// colour recurred — 1.1a found the real brand colour is consistently the most-repeated
// non-neutral value across a page's buttons/links, not the first one in document order.
// <main> is a soft tiebreak only, per the same investigation: Princeton Dental's real CTAs
// are all outside <main> (the site has no <main> landmark at all), so treating "inside main"
// as a hard requirement would have discarded the correct answer entirely, not just ranked it
// lower. Final tiebreak is the colour string itself — explicit, not array-position-dependent,
// same discipline as the sort fixes in 0.1a.
function rankColorCandidates(samples: RawColorSample[]): ColorCandidate[] {
  const counts = new Map<string, { count: number; inMain: boolean }>();
  for (const sample of samples) {
    const rgb = parseComputedColor(sample.color);
    if (!rgb || isNearNeutralOrTransparent(rgb)) continue;
    const existing = counts.get(sample.color);
    if (existing) {
      existing.count++;
      existing.inMain = existing.inMain || sample.inMain;
    } else {
      counts.set(sample.color, { count: 1, inMain: sample.inMain });
    }
  }
  return [...counts.entries()]
    .map(([color, v]) => ({ color, count: v.count, inMain: v.inMain }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      if (a.inMain !== b.inMain) return a.inMain ? -1 : 1;
      return a.color.localeCompare(b.color);
    });
}

// Captured in the same page visit extractPageData already uses — no second navigation. Every
// field is independently allowed to come back empty: a site with no visible button, no
// <nav>/<header>, or no <h1> is a normal case, not a defect in this function. The whole call
// is wrapped by its caller so a thrown evaluation (a detached frame, a weird page state)
// degrades to `null` for the page rather than failing the crawl.
//
// The evaluate callback below only collects raw samples (button/link elements, their computed
// colour, whether they're inside <main>) — parsing, neutral-filtering and frequency-ranking
// happen afterward in rankColorCandidates, in ordinary Node-side TypeScript, not inside the
// browser closure. Doing the ranking logic as real named functions was worth the one extra
// round trip of plain data across the evaluate boundary, rather than fighting the
// no-named-functions-inside-evaluate constraint (see the note below) for something this
// involved.
//
// No named function declarations/consts inside the evaluate callback itself — see the
// identical note in extract.ts: esbuild's name-preservation transform wraps them in a
// __name() call that doesn't exist inside the browser context page.evaluate() serializes
// this into.
export function captureComputedStyles(page: Page) {
  return page.evaluate((maxCustomProperties) => {
    const buttonEls = Array.from(
      document.querySelectorAll('button, a[class*="btn"], a[class*="button"], input[type="submit"], input[type="button"]')
    );
    const buttonBackgroundSamples = buttonEls.map((el) => ({
      color: getComputedStyle(el).backgroundColor,
      inMain: !!el.closest("main"),
    }));
    const buttonBorderSamples = buttonEls.map((el) => ({
      color: getComputedStyle(el).borderColor,
      inMain: !!el.closest("main"),
    }));

    const linkSamples = Array.from(document.querySelectorAll("a")).map((el) => ({
      color: getComputedStyle(el).color,
      inMain: !!el.closest("main"),
    }));

    const navEl = document.querySelector("nav, header");
    const navBackground = navEl ? getComputedStyle(navEl).backgroundColor : null;

    const h1El = document.querySelector("h1");
    const h1Color = h1El ? getComputedStyle(h1El).color : null;

    const rootStyle = getComputedStyle(document.documentElement);
    const customProperties: Record<string, string> = {};
    for (let i = 0; i < rootStyle.length && Object.keys(customProperties).length < maxCustomProperties; i++) {
      const prop = rootStyle[i];
      if (!prop.startsWith("--")) continue;
      const value = rootStyle.getPropertyValue(prop).trim();
      if (value) customProperties[prop] = value;
    }

    return { buttonBackgroundSamples, buttonBorderSamples, linkSamples, navBackground, h1Color, customProperties };
  }, MAX_CUSTOM_PROPERTIES).then((raw) => ({
    primaryButtonBg: rankColorCandidates(raw.buttonBackgroundSamples),
    buttonBorderColor: rankColorCandidates(raw.buttonBorderSamples),
    linkColor: rankColorCandidates(raw.linkSamples),
    navBackground: raw.navBackground,
    h1Color: raw.h1Color,
    customProperties: raw.customProperties,
  }));
}

export async function crawlClientSite(
  clientId: string,
  startUrl: string
): Promise<{ pages: PageExtraction[]; truncated: boolean }> {
  const startUrlCheck = await checkUrlIsSafe(startUrl);
  if (!startUrlCheck.safe) {
    throw new Error(`Refusing to crawl ${startUrl}: ${startUrlCheck.reason}`);
  }

  const origin = new URL(startUrl).origin;
  const disallowRules = await fetchRobotsDisallowPaths(origin);

  const visited = new Set<string>();
  const queued = new Set<string>();
  const queue: string[] = [];

  const firstUrl = normalizeUrl(startUrl, startUrl) ?? startUrl;
  queue.push(firstUrl);
  queued.add(firstUrl);

  const pageRecords: PageExtraction[] = [];
  let challengePagesSkipped = 0;
  const browser = await chromium.launch();

  try {
    // A link that slips past the download-path filter (isCrawlableLink) still shouldn't
    // be able to hang navigation waiting on a download that will never render a page —
    // this makes Playwright abort the navigation immediately instead.
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      acceptDownloads: false,
    });
    // One guard for every page this crawl session creates — a hostile page discovered
    // mid-crawl (a link, a redirect, a resource fetch) is checked exactly like the
    // original start URL, not just validated once up front.
    await installSsrfGuard(context);

    while (queue.length > 0 && visited.size < MAX_PAGES) {
      const url = queue.shift()!;
      if (visited.has(url)) continue;
      visited.add(url);

      if (isDisallowed(new URL(url).pathname, disallowRules)) continue;

      const page = await context.newPage();
      try {
        const { status } = await gotoAndSettle(page, url, PAGE_TIMEOUT_MS);
        // page.goto() doesn't throw on a non-2xx response — a 403/429/503 bot-block or
        // rate-limit page loads exactly like a real page and, left unchecked, gets
        // extracted and stored as if it were genuine content (its "Attention Required" or
        // "Access Denied" copy becoming the client's businessName/tagline on a small,
        // low-word-count site — the kind possibleExtractionCollapse's 20k-char threshold
        // is too coarse to catch). Treated the same as any other page-level failure below:
        // skip, don't record, don't extract its links, keep crawling the rest of the site.
        // Deliberately not a `continue` here — this is still inside the try/finally that
        // closes the page, and skipping past the crawlPagesDone update and
        // REQUEST_DELAY_MS below it would both blur the progress indicator and hammer an
        // already-blocking site with back-to-back requests instead of backing off.
        if (status !== null && status >= 400) {
          console.error(`[crawl] skipped ${url}: server responded ${status}`);
        } else {
          const extracted = await extractPageData(page);

          // A 200-status bot/security challenge page (Cloudflare's "Just a moment...",
          // a "Robot Challenge Screen", a cookie-verification gate) loads exactly like a
          // real page — the status check above does nothing for it. Confirmed live on
          // offrisklegaltemplates.com.au: a page titled "Robot Challenge Screen" whose
          // entire body is "Checking the site connection security" / "requires cookies
          // to be enabled", well under possibleExtractionCollapse's 20k-char threshold
          // too, so nothing else downstream would have caught it either. Same treatment
          // as the status-code case: skip, don't record, don't extract its links.
          if (isLikelyChallengePage(extracted.title, extracted.text)) {
            challengePagesSkipped++;
            console.error(`[crawl] skipped ${url}: looks like a bot/security challenge page, not real content`);
          } else {
            const record: PageExtraction = { url, ...extracted };
            pageRecords.push(record);

            // Own try/catch, deliberately separate from the one around gotoAndSettle above —
            // a style-capture failure (a detached frame, an unusual page state) must not be
            // treated as a failed page load. Same page, no second navigation.
            let computedStyles: Awaited<ReturnType<typeof captureComputedStyles>> | null = null;
            try {
              computedStyles = await captureComputedStyles(page);
            } catch (err) {
              console.error(`[crawl] failed to capture computed styles for ${url}:`, err);
            }

            await prisma.crawledPage.create({
              data: {
                clientId,
                url,
                title: extracted.title,
                textContent: extracted.text.slice(0, 20_000),
                // Prisma.DbNull, not plain null or Prisma.JsonNull — a real SQL NULL when
                // capture failed or found nothing, not a stored JSON "null" literal.
                computedStyles: computedStyles ?? Prisma.DbNull,
              },
            });

            for (const link of extracted.links) {
              const normalized = normalizeUrl(link, url);
              if (!normalized) continue;
              if (!isCrawlableLink(normalized, origin)) continue;
              if (!visited.has(normalized) && !queued.has(normalized)) {
                queued.add(normalized);
                queue.push(normalized);
              }
            }
          }
        }
      } catch (err) {
        // A download-triggering link (vCard exporters, direct file downloads) throws
        // here even with acceptDownloads: false and the isCrawlableLink pre-filter — a
        // link neither catches can still slip through. This is an expected, page-level
        // skip, not a crawl failure, so it gets a one-line log instead of the full
        // Playwright call-log dump every other page-load error gets.
        const message = err instanceof Error ? err.message : String(err);
        if (/download is starting/i.test(message)) {
          console.error(`[crawl] skipped ${url}: triggers a download, not a page`);
        } else {
          console.error(`[crawl] failed to load ${url}:`, err);
        }
      } finally {
        await page.close();
      }

      await prisma.client.update({
        where: { id: clientId },
        data: { crawlPagesDone: visited.size, crawlPagesTotal: visited.size + queue.length },
      });

      await new Promise((resolve) => setTimeout(resolve, REQUEST_DELAY_MS));
    }
  } finally {
    await browser.close();
  }

  // A per-page failure (one bad URL) is expected and handled above by skipping that
  // page and continuing. Zero pages captured means even the start URL never loaded —
  // that's a total failure, not a small/empty site, and letting it through silently
  // would produce a "successful" analysis with no content and no indication anything
  // was wrong. Throwing here routes it through the same failure path as any other
  // analysis failure (status -> ANALYSIS_FAILED).
  if (pageRecords.length === 0) {
    // A more specific, actionable message when we know why — this is exactly what shows
    // up as Job.lastError in the client's "Analysis failed" banner (see
    // app/(app)/clients/[id]/page.tsx), so the difference between "the URL was wrong" and
    // "the site is blocking automated visits" matters to whoever reads it.
    if (challengePagesSkipped > 0) {
      throw new Error(
        `Crawl failed: every page loaded was a bot/security challenge screen, not ${startUrl}'s real content ` +
          `— this site appears to actively block automated visits.`
      );
    }
    throw new Error(`Crawl failed: could not successfully load any page from ${startUrl}`);
  }

  return { pages: pageRecords, truncated: visited.size >= MAX_PAGES && queue.length > 0 };
}
