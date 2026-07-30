import { chromium } from "playwright";
import { prisma } from "@/lib/prisma";
import { fetchRobotsDisallowPaths, isDisallowed } from "./robots";
import { normalizeUrl, isCrawlableLink } from "./url-utils";
import { extractPageData } from "./extract";
import type { PageExtraction } from "./types";
import { checkUrlIsSafe, installSsrfGuard } from "@/lib/security/ssrf";
import { gotoAndSettle } from "./goto-and-settle";

const MAX_PAGES = 150;
const REQUEST_DELAY_MS = 400;
const PAGE_TIMEOUT_MS = 20_000;

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
        await gotoAndSettle(page, url, PAGE_TIMEOUT_MS);
        const extracted = await extractPageData(page);

        const record: PageExtraction = { url, ...extracted };
        pageRecords.push(record);

        await prisma.crawledPage.create({
          data: {
            clientId,
            url,
            title: extracted.title,
            textContent: extracted.text.slice(0, 20_000),
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
    throw new Error(`Crawl failed: could not successfully load any page from ${startUrl}`);
  }

  return { pages: pageRecords, truncated: visited.size >= MAX_PAGES && queue.length > 0 };
}
