import type { Page } from "playwright";

const LOAD_FALLBACK_TIMEOUT_MS = 5_000;
const POST_LOAD_SETTLE_MS = 1_000;

// networkidle is unreliable on any site with analytics beacons, chat-widget polling, or
// an open websocket — which is most commercial sites, and the direct cause of repeated
// capture/crawl timeouts (mailchimp.com, oatly.com, duolingo.com, a16z.com, and
// princetondental.com.au have all hit this live). domcontentloaded fires reliably and
// fast; the bounded wait for "load" catches most remaining images/fonts without
// inheriting networkidle's unbounded hang on sites that never go quiet. This was fixed
// once already in lib/crawl/visual-shots.ts but two other call sites (lib/crawl/
// crawler.ts, lib/crawl/reference-screenshot.ts) still had their own copy of the old
// strategy — sharing this helper is what keeps that from happening a third time.
export async function gotoAndSettle(page: Page, url: string, navTimeoutMs: number): Promise<void> {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: navTimeoutMs });
  await page.waitForLoadState("load", { timeout: LOAD_FALLBACK_TIMEOUT_MS }).catch(() => {});
  await page.waitForTimeout(POST_LOAD_SETTLE_MS);
}
