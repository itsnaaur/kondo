import sharp from "sharp";

// Downsizes a candidate image before attaching it to the classification call —
// full-resolution source (some of these run 2000px+ on the long edge) costs more per call
// and classifies no more accurately than a much smaller version; "is this a photo of a
// person or a clip-art icon" doesn't need the original pixels. Standardizes on JPEG
// regardless of source format (PNG, WebP) since the model doesn't need transparency for
// classification and it keeps the payload smaller than PNG would.
const MAX_LONG_EDGE_PX = 512;
const JPEG_QUALITY = 80;

export async function resizeForVisionClassification(
  buffer: Buffer
): Promise<{ base64: string; mediaType: "image/jpeg" }> {
  const resized = await sharp(buffer)
    .resize({ width: MAX_LONG_EDGE_PX, height: MAX_LONG_EDGE_PX, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: JPEG_QUALITY })
    .toBuffer();

  return { base64: resized.toString("base64"), mediaType: "image/jpeg" };
}
