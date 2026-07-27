import path from "path";
import { mkdir, writeFile } from "fs/promises";
import { chromium } from "playwright";
import sharp from "sharp";

export type VisualShotSet = {
  url: string;
  desktopPath: string;
  mobilePath: string;
  heroPath: string;
  sectionPath: string;
  cookieBannerDismissed: boolean;
};

const DESKTOP_VIEWPORT = { width: 1440, height: 900 };
const MOBILE_VIEWPORT = { width: 390, height: 844 };
const NAV_TIMEOUT_MS = 20_000;
const LOAD_FALLBACK_TIMEOUT_MS = 5_000;
const POST_LOAD_SETTLE_MS = 1_000;
// Anthropic's vision API rejects any image with a dimension over 8000px. A long
// marketing page (found live on linear.app during verification — an ordinary SaaS
// site, not an edge case) easily produces a fullPage screenshot taller than that,
// which burned all 3 retries on an unrecoverable 400 rather than a transient failure.
const MAX_SHOT_DIMENSION = 7900;

async function captureCappedFullPage(
  page: import("playwright").Page,
  outPath: string,
  viewportWidth: number
): Promise<void> {
  const totalHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  const buffer = await page.screenshot({ fullPage: true });

  if (totalHeight <= MAX_SHOT_DIMENSION) {
    await writeFile(outPath, buffer);
    return;
  }

  // Downscale the whole composition to fit within the vision API's dimension limit,
  // rather than cropping. Cropping silently discards the bottom of the page — footer,
  // final sections — which is composition information Call 0A is meant to read; the
  // separate hero/section crops already provide native-resolution detail elsewhere, so
  // losing text legibility here in exchange for keeping the whole page in view is the
  // better trade for what this shot is for.
  const scale = MAX_SHOT_DIMENSION / totalHeight;
  const targetWidth = Math.round(viewportWidth * scale);
  await sharp(buffer)
    .resize({ width: targetWidth, height: MAX_SHOT_DIMENSION, fit: "fill" })
    .toFile(outPath);
}

// Best-effort — common "accept cookies" button patterns. If none match within the
// short timeout, we just note that in the result rather than blocking the capture.
const COOKIE_BANNER_SELECTORS = [
  "#onetrust-accept-btn-handler",
  ".cc-btn.cc-allow",
  "button[aria-label*='accept' i]",
  "button:has-text('Accept All')",
  "button:has-text('Accept all')",
  "button:has-text('Accept Cookies')",
  "button:has-text('I Agree')",
  "button:has-text('Got it')",
];

// networkidle is unreliable on any site with analytics beacons, chat-widget polling, or
// an open websocket — which is most commercial sites, and the direct cause of repeated
// capture timeouts hit during verification (mailchimp.com, oatly.com, duolingo.com,
// a16z.com all timed out waiting for it). domcontentloaded fires reliably and fast; the
// bounded wait for "load" catches most remaining images/fonts without inheriting
// networkidle's unbounded hang on sites that never go quiet.
async function gotoAndSettle(page: import("playwright").Page, url: string): Promise<void> {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT_MS });
  await page.waitForLoadState("load", { timeout: LOAD_FALLBACK_TIMEOUT_MS }).catch(() => {});
  await page.waitForTimeout(POST_LOAD_SETTLE_MS);
}

async function tryDismissCookieBanner(page: import("playwright").Page): Promise<boolean> {
  for (const selector of COOKIE_BANNER_SELECTORS) {
    try {
      const el = page.locator(selector).first();
      if (await el.isVisible({ timeout: 1_000 })) {
        await el.click({ timeout: 1_000 });
        return true;
      }
    } catch {
      // selector not present or not clickable — try the next one
    }
  }
  return false;
}

// Four shots per site: desktop full-page, mobile full-page ("not optional" — a lot of
// what dates a design only shows up at 390px), a viewport-only hero crop (above the
// fold, before scroll), and a viewport-only mid-section crop (after scrolling one
// viewport down). Used for both the client's existing site and each reference site —
// this is deliberately a different, richer capture than the single above-the-fold shot
// `screenshotReferenceSites` takes for brand-tone narrative analysis.
export async function captureSiteVisualShots(
  url: string,
  outDir: string,
  slug: string
): Promise<VisualShotSet | null> {
  await mkdir(outDir, { recursive: true });

  const browser = await chromium.launch();
  try {
    const desktopContext = await browser.newContext({ viewport: DESKTOP_VIEWPORT });
    const desktopPage = await desktopContext.newPage();

    await gotoAndSettle(desktopPage, url);
    const cookieBannerDismissed = await tryDismissCookieBanner(desktopPage);
    if (cookieBannerDismissed) {
      await desktopPage.waitForTimeout(300);
    }

    const heroPath = path.join(outDir, `${slug}-hero.png`);
    await desktopPage.screenshot({ path: heroPath, fullPage: false });

    await desktopPage.evaluate((h) => window.scrollTo(0, h), DESKTOP_VIEWPORT.height);
    await desktopPage.waitForTimeout(300);
    const sectionPath = path.join(outDir, `${slug}-section.png`);
    await desktopPage.screenshot({ path: sectionPath, fullPage: false });

    await desktopPage.evaluate(() => window.scrollTo(0, 0));
    const desktopPath = path.join(outDir, `${slug}-desktop.png`);
    await captureCappedFullPage(desktopPage, desktopPath, DESKTOP_VIEWPORT.width);

    await desktopContext.close();

    const mobileContext = await browser.newContext({ viewport: MOBILE_VIEWPORT });
    const mobilePage = await mobileContext.newPage();
    await gotoAndSettle(mobilePage, url);
    if (cookieBannerDismissed) {
      await tryDismissCookieBanner(mobilePage);
      await mobilePage.waitForTimeout(300);
    }
    const mobilePath = path.join(outDir, `${slug}-mobile.png`);
    await captureCappedFullPage(mobilePage, mobilePath, MOBILE_VIEWPORT.width);
    await mobileContext.close();

    return { url, desktopPath, mobilePath, heroPath, sectionPath, cookieBannerDismissed };
  } catch (err) {
    console.error(`[visual-shots] failed to capture ${url}:`, err);
    return null;
  } finally {
    await browser.close();
  }
}
