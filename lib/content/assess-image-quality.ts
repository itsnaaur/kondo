import sharp from "sharp";
import type { ContentImage } from "./types";

// Deterministic — no AI needed to know an image is too small to be a decent hero. This
// flag is what both the Review Extraction screen and the template's hero-image selection
// (lib/content/to-template-content.ts) key off.
const MIN_DIMENSION_PX = 150;

async function assessOne(
  assetId: string,
  role: ContentImage["role"],
  buffer: Buffer
): Promise<ContentImage> {
  try {
    const meta = await sharp(buffer).metadata();
    const widthPx = meta.width ?? 0;
    const heightPx = meta.height ?? 0;
    const tooSmall = widthPx < MIN_DIMENSION_PX || heightPx < MIN_DIMENSION_PX;
    return {
      assetId,
      role,
      widthPx,
      heightPx,
      flagged: tooSmall,
      flagReason: tooSmall
        ? `low-resolution (${widthPx}×${heightPx}) — verify before using as hero`
        : undefined,
    };
  } catch (err) {
    console.error(`[content] image quality check failed for asset ${assetId}:`, err);
    return {
      assetId,
      role,
      widthPx: 0,
      heightPx: 0,
      flagged: true,
      flagReason: "could not read image dimensions",
    };
  }
}

export async function flagLowQualityImages(
  images: Array<{ assetId: string; role: ContentImage["role"]; buffer: Buffer }>
): Promise<ContentImage[]> {
  return Promise.all(images.map((img) => assessOne(img.assetId, img.role, img.buffer)));
}
