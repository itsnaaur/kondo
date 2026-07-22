import path from "path";
import { mkdir } from "fs/promises";
import { chromium } from "playwright";
import { prisma } from "@/lib/prisma";
import { clientCrawlDir } from "@/lib/storage";
import { fetchRobotsDisallowPaths, isDisallowed } from "./robots";
import { normalizeUrl, isCrawlableLink, slugFor } from "./url-utils";
import { extractPageData } from "./extract";
import type { PageExtraction } from "./types";

const MAX_PAGES = 150;
const REQUEST_DELAY_MS = 400;
const PAGE_TIMEOUT_MS = 20_000;

export async function crawlClientSite(
  clientId: string,
  startUrl: string
): Promise<{ pages: PageExtraction[]; truncated: boolean }> {
  const origin = new URL(startUrl).origin;
  const disallowRules = await fetchRobotsDisallowPaths(origin);

  const screenshotsDir = path.join(clientCrawlDir(clientId), "screenshots");
  await mkdir(screenshotsDir, { recursive: true });

  const visited = new Set<string>();
  const queued = new Set<string>();
  const queue: string[] = [];

  const firstUrl = normalizeUrl(startUrl, startUrl) ?? startUrl;
  queue.push(firstUrl);
  queued.add(firstUrl);

  const pageRecords: PageExtraction[] = [];
  const browser = await chromium.launch();

  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

    while (queue.length > 0 && visited.size < MAX_PAGES) {
      const url = queue.shift()!;
      if (visited.has(url)) continue;
      visited.add(url);

      if (isDisallowed(new URL(url).pathname, disallowRules)) continue;

      const page = await context.newPage();
      try {
        await page.goto(url, { waitUntil: "networkidle", timeout: PAGE_TIMEOUT_MS });
        const extracted = await extractPageData(page);

        const slug = slugFor(url, visited.size);
        const screenshotPath = path.join(screenshotsDir, `${slug}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: true });

        const record: PageExtraction = { url, ...extracted, screenshotPath };
        pageRecords.push(record);

        await prisma.crawledPage.create({
          data: {
            clientId,
            url,
            title: extracted.title,
            textContent: extracted.text.slice(0, 20_000),
            screenshotPath: path.relative(process.cwd(), screenshotPath),
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
        console.error(`[crawl] failed to load ${url}:`, err);
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

  return { pages: pageRecords, truncated: visited.size >= MAX_PAGES && queue.length > 0 };
}
