import path from "path";
import { mkdir, writeFile } from "fs/promises";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { clientAssetsDir } from "@/lib/storage";
import { AssetType } from "@/app/generated/prisma/client";
import type { PageExtraction } from "./types";

type AssetTypeValue = (typeof AssetType)[keyof typeof AssetType];

const MAX_CONTENT_IMAGES = 5;
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

async function downloadImage(
  url: string
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) return null;

    const mimeType = res.headers.get("content-type")?.split(";")[0]?.trim() || "";
    if (!mimeType.startsWith("image/")) return null;

    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length === 0) return null;

    return { buffer, mimeType };
  } catch (err) {
    console.error(`[crawl] failed to download image ${url}:`, err);
    return null;
  }
}

// The header/nav logo appears on every page, unlike content images which are
// page-specific — so the most-repeated candidate across pages is the strongest signal.
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
) {
  const downloaded = await downloadImage(url);
  if (!downloaded) return null;

  const ext = MIME_EXTENSIONS[downloaded.mimeType] ?? "bin";
  const typeDir = clientAssetsDir(clientId, type);
  await mkdir(typeDir, { recursive: true });

  const storedName = `${randomUUID()}-${filenameHint}.${ext}`;
  const storagePath = path.join(typeDir, storedName);
  await writeFile(storagePath, downloaded.buffer);

  return prisma.asset.create({
    data: {
      clientId,
      type,
      filename: `${filenameHint}.${ext}`,
      storagePath: path.relative(process.cwd(), storagePath),
      mimeType: downloaded.mimeType,
      size: downloaded.buffer.length,
    },
  });
}

export async function downloadCrawlImages(
  clientId: string,
  pages: PageExtraction[]
): Promise<{ logoSaved: boolean; imagesSaved: number }> {
  // Respect a manually-uploaded logo instead of overriding it with a guess.
  const existingLogo = await prisma.asset.findFirst({
    where: { clientId, type: AssetType.LOGO },
  });

  let logoSaved = false;
  if (!existingLogo) {
    const logoUrl = pickBestLogoCandidate(pages);
    if (logoUrl) {
      logoSaved = !!(await saveAsset(clientId, AssetType.LOGO, logoUrl, "logo-from-crawl"));
    }
  }

  const homepage = pages[0];
  const contentImageUrls = homepage
    ? [...new Set(homepage.images)].filter((src) => !src.startsWith("data:")).slice(0, MAX_CONTENT_IMAGES)
    : [];

  let imagesSaved = 0;
  for (let i = 0; i < contentImageUrls.length; i++) {
    const saved = await saveAsset(
      clientId,
      AssetType.IMAGE,
      contentImageUrls[i],
      `site-image-${i + 1}`
    );
    if (saved) imagesSaved++;
  }

  return { logoSaved, imagesSaved };
}
