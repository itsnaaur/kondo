import path from "path";
import { mkdir } from "fs/promises";
import { chromium } from "playwright";

// Reference sites are only glanced at for visual/stylistic context, not crawled —
// a single above-the-fold screenshot of the homepage is enough for that purpose.
export async function screenshotReferenceSites(
  urls: string[],
  outDir: string
): Promise<Array<{ url: string; screenshotPath: string | null }>> {
  if (urls.length === 0) return [];

  await mkdir(outDir, { recursive: true });
  const results: Array<{ url: string; screenshotPath: string | null }> = [];

  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const page = await context.newPage();
      try {
        await page.goto(url, { waitUntil: "networkidle", timeout: 15_000 });
        const screenshotPath = path.join(outDir, `${String(i).padStart(2, "0")}.png`);
        await page.screenshot({ path: screenshotPath });
        results.push({ url, screenshotPath });
      } catch (err) {
        console.error(`[reference] failed to screenshot ${url}:`, err);
        results.push({ url, screenshotPath: null });
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }

  return results;
}
