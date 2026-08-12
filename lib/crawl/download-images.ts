import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { uploadAssetToStorage } from "@/lib/storage/upload-asset";
import { AssetType, type Asset } from "@/app/generated/prisma/client";
import type { PageExtraction } from "./types";
import { checkUrlIsSafe } from "@/lib/security/ssrf";
import { isJunkByUrlOrText } from "@/lib/content/filter-junk-images";

type AssetTypeValue = (typeof AssetType)[keyof typeof AssetType];

export type DownloadedAsset = { asset: Asset; buffer: Buffer };
export type DownloadedCandidate = DownloadedAsset & { fromHomepage: boolean; nearbyText: string };

// Total across every source page combined, not per-page — previously this was "5 images
// from the homepage only," which meant a real hero photo living on an /about or
// /services page was never even a candidate. A slightly higher total gives the hero
// selection heuristic (lib/content/select-hero-image.ts) an actual pool to choose from.
const MAX_CANDIDATE_IMAGES = 10;
const FETCH_TIMEOUT_MS = 10_000;

const MIME_EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "image/gif": "gif",
  "image/x-icon": "ico",
  "image/vnd.microsoft.icon": "ico",
};

const MAX_IMAGE_REDIRECTS = 5;

async function downloadImage(
  url: string
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  try {
    let currentUrl = url;

    // Follow redirects manually, re-validating each hop — a plain fetch() with
    // redirect:"follow" would happily land on a blocked address after the original
    // URL passed its check.
    for (let hop = 0; hop <= MAX_IMAGE_REDIRECTS; hop++) {
      const check = await checkUrlIsSafe(currentUrl);
      if (!check.safe) {
        console.error(`[crawl] refusing to fetch image ${currentUrl}: ${check.reason}`);
        return null;
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      const res = await fetch(currentUrl, { signal: controller.signal, redirect: "manual" });
      clearTimeout(timeout);

      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get("location");
        if (!location) return null;
        currentUrl = new URL(location, currentUrl).toString();
        continue;
      }

      if (!res.ok) return null;

      const mimeType = res.headers.get("content-type")?.split(";")[0]?.trim() || "";
      if (!mimeType.startsWith("image/")) return null;

      const buffer = Buffer.from(await res.arrayBuffer());
      if (buffer.length === 0) return null;

      return { buffer, mimeType };
    }

    console.error(`[crawl] too many redirects fetching image ${url}`);
    return null;
  } catch (err) {
    console.error(`[crawl] failed to download image ${url}:`, err);
    return null;
  }
}

// The header/nav logo appears on every page, unlike content images which are
// page-specific — so the most-repeated candidate across pages is the strongest signal.
// Scans every crawled page (not just the ones selected for content analysis), since a
// logo can be identified from frequency alone regardless of which pages' text mattered.
function pickBestLogoCandidate(pages: PageExtraction[]): string | null {
  const counts = new Map<string, number>();
  for (const p of pages) {
    if (p.logoCandidate) counts.set(p.logoCandidate, (counts.get(p.logoCandidate) ?? 0) + 1);
  }
  if (counts.size > 0) {
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  }
  return pages[0]?.favicon ?? pages[0]?.ogImage ?? null;
}

async function saveAsset(
  clientId: string,
  type: AssetTypeValue,
  url: string,
  filenameHint: string
): Promise<DownloadedAsset | null> {
  const downloaded = await downloadImage(url);
  if (!downloaded) return null;

  const contentHash = createHash("sha256").update(downloaded.buffer).digest("hex");

  // Assets are deliberately append-only (never deleted or overwritten on re-analysis —
  // see the Asset model's own comment in prisma/schema.prisma), since already-published
  // Concept HTML has asset URLs baked in permanently. But that doesn't mean every
  // re-analysis of an unchanged site should re-download and re-upload byte-identical
  // photos and grow Storage/the Asset table without bound — if this exact image was
  // already saved for this client (same clientId + content hash) in an earlier run,
  // reuse that row instead of creating a new Storage object and a new Asset for it.
  const existing = await prisma.asset.findFirst({ where: { clientId, contentHash } });
  if (existing) return { asset: existing, buffer: downloaded.buffer };

  const ext = MIME_EXTENSIONS[downloaded.mimeType] ?? "bin";
  const filename = `${filenameHint}.${ext}`;

  // Uploads to Supabase Storage (not local disk) — this is what makes the resulting
  // public URL readable by both the worker process that downloaded it and the Vercel app
  // process that later serves a published concept referencing it. See
  // lib/storage/upload-asset.ts.
  const uploaded = await uploadAssetToStorage(clientId, downloaded.buffer, filename, downloaded.mimeType);

  const asset = await prisma.asset.create({
    data: {
      clientId,
      type,
      filename,
      url: uploaded.url,
      mimeType: downloaded.mimeType,
      size: downloaded.buffer.length,
      contentHash,
    },
  });

  return { asset, buffer: downloaded.buffer };
}

// Re-fetches an already-uploaded asset's bytes (e.g. a manually-uploaded logo, or one
// saved by an earlier analysis) so callers that need raw pixels — dominant-color
// extraction, image-quality flagging — don't have to special-case "asset already existed."
async function fetchExistingAssetBytes(asset: Asset): Promise<DownloadedAsset | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(asset.url, { signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    return { asset, buffer };
  } catch (err) {
    console.error(`[crawl] failed to re-fetch existing asset ${asset.id}:`, err);
    return null;
  }
}

// allPages: every crawled page, used for logo frequency detection only.
// candidateSourcePages: the pages selected for content analysis (see
// lib/content/select-relevant-pages.ts — homepage always first), used as the pool for
// hero/gallery image candidates. Sourcing from more than just the homepage is what makes
// "prefer the homepage" in the hero heuristic (lib/content/select-hero-image.ts) a real
// choice rather than a tie-break that never triggers.
export async function downloadCrawlImages(
  clientId: string,
  allPages: PageExtraction[],
  candidateSourcePages: PageExtraction[]
): Promise<{ logo: DownloadedAsset | null; candidates: DownloadedCandidate[] }> {
  // Respect a manually-uploaded logo (or one from a prior analysis — assets are
  // append-only, see lib/storage/upload-asset.ts) instead of overriding it with a guess.
  const existingLogo = await prisma.asset.findFirst({
    where: { clientId, type: AssetType.LOGO },
    orderBy: { createdAt: "desc" },
  });

  let logo: DownloadedAsset | null = null;
  if (existingLogo) {
    logo = await fetchExistingAssetBytes(existingLogo);
  } else {
    const logoUrl = pickBestLogoCandidate(allPages);
    if (logoUrl) {
      logo = await saveAsset(clientId, AssetType.LOGO, logoUrl, "logo-from-crawl");
    }
  }

  const homepageUrl = candidateSourcePages[0]?.url;
  const seen = new Set<string>();
  const orderedCandidateUrls: { url: string; fromHomepage: boolean; nearbyText: string }[] = [];
  for (const page of candidateSourcePages) {
    for (const img of page.images) {
      if (img.src.startsWith("data:") || seen.has(img.src)) continue;
      seen.add(img.src);
      // Rejected before download — a cookie-consent icon or tracking pixel costs a wasted
      // Supabase upload if this check runs after, not before. See filter-junk-images.ts.
      if (isJunkByUrlOrText(img.src, img.nearbyText)) continue;
      orderedCandidateUrls.push({
        url: img.src,
        fromHomepage: page.url === homepageUrl,
        nearbyText: img.nearbyText,
      });
      if (orderedCandidateUrls.length >= MAX_CANDIDATE_IMAGES) break;
    }
    if (orderedCandidateUrls.length >= MAX_CANDIDATE_IMAGES) break;
  }

  const candidates: DownloadedCandidate[] = [];
  for (let i = 0; i < orderedCandidateUrls.length; i++) {
    const { url, fromHomepage, nearbyText } = orderedCandidateUrls[i];
    const saved = await saveAsset(clientId, AssetType.IMAGE, url, `site-image-${i + 1}`);
    if (saved) candidates.push({ ...saved, fromHomepage, nearbyText });
  }

  return { logo, candidates };
}
