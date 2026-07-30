import { readFile } from "fs/promises";
import sharp from "sharp";

// Anthropic's vision API rejects any image with a dimension over 8000px. This bit us
// twice independently — once in lib/crawl/visual-shots.ts (a tall marketing page), and
// again in lib/audit/narrative.ts (a 92-page crawl's full-page homepage screenshot),
// because each call site read a file and base64-encoded it with no shared enforcement.
// Every image bound for the API — regardless of where it was captured, downloaded, or
// uploaded — should go through this so the constraint is enforced exactly once.
const MAX_API_IMAGE_DIMENSION = 7900;

export async function prepareImageBufferForApi(buffer: Buffer): Promise<string> {
  const { width, height } = await sharp(buffer).metadata();
  if (!width || !height || (width <= MAX_API_IMAGE_DIMENSION && height <= MAX_API_IMAGE_DIMENSION)) {
    return buffer.toString("base64");
  }

  // Downscale to fit, preserving aspect ratio and the original format — this is a
  // generic safety net for images of unknown provenance (a logo, a downloaded content
  // image), unlike visual-shots.ts's capped capture which controls the exact target
  // width because it already knows the source viewport.
  const resized = await sharp(buffer)
    .resize({
      width: Math.min(width, MAX_API_IMAGE_DIMENSION),
      height: Math.min(height, MAX_API_IMAGE_DIMENSION),
      fit: "inside",
      withoutEnlargement: true,
    })
    .toBuffer();
  return resized.toString("base64");
}

export async function prepareImageFileForApi(filePath: string): Promise<string> {
  return prepareImageBufferForApi(await readFile(filePath));
}
