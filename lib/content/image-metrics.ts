// Deterministic, per-image metrics — no model call anywhere in this file. Anything requiring
// judgement (is this a hero-worthy photo, is this a decorative icon, does this image belong
// in the gallery) is Task 1.8's vision call; this file only measures what's directly
// computable from the bytes plus the minimal page context the caller already has.
//
// Reuses lib/content/rank-brand-color-sources.ts's pixel-bucketing and the corrected HSL
// neutrality check (1.1b) rather than a second implementation of either — see that file's own
// comments on bucketImageColors/isNearNeutralHsl/rgbToHsl for why those exist as they do.

import sharp from "sharp";
import { bucketImageColors, isNearNeutralHsl, rgbToHsl, type PixelBucket } from "./rank-brand-color-sources";

export type Orientation = "landscape" | "portrait" | "square";

export type DominantColor = {
  hex: string;
  // Share of sampled (post-resize) pixels this bucket accounts for, 0–1 — not a share of the
  // original image's full pixel count, since bucketImageColors resizes before sampling (see
  // that function's own comment on why: cheap and good enough for "what colours dominate,"
  // not a perceptually-exact palette).
  share: number;
};

export type ImageMetrics = {
  width: number | null;
  height: number | null;
  aspectRatio: number | null; // width / height
  orientation: Orientation | null;
  fileSizeBytes: number;
  // Compression-quality proxy, not a quality score — a low value on a large image usually
  // means heavy compression artefacting; a photo and a flat-colour graphic at the same
  // resolution legitimately differ here even at identical "quality," so this is a signal to
  // feed into 1.9's role assignment alongside colorEntropy, not a standalone verdict.
  bytesPerPixel: number | null;
  hasAlpha: boolean | null;
  // Shannon entropy (bits) of the quantized-bucket pixel histogram — high for photos (many
  // buckets, gradual variation), low for flat graphics/icons/logos (few buckets, large flat
  // fills). Deliberately no pass/fail threshold here — see this task's own log entry
  // (docs/kondo-v2-execution.md, 1.7) for the real distribution observed on a real client and
  // why picking a cutoff belongs in 1.9, chosen from data, not guessed here.
  colorEntropy: number | null;
  // Saturation-filtered (isNearNeutralHsl), ranked by saturation descending, same discipline
  // as rank-brand-color-sources.ts's own rankLogoSource — a near-white/near-black/greyscale
  // bucket is filtered before ranking, not just ranked low.
  dominantColors: DominantColor[];
  // Index of this image within its source page's own <img> order (0 = first image found on
  // that page), supplied by the caller — image-metrics.ts has no page context of its own.
  // null for images with no single source-page position (the site logo, resolved from
  // logoCandidate/favicon/ogImage rather than a position in the images list).
  pagePosition: number | null;
  // Count of distinct crawled pages this asset's source URL was seen on, supplied by the
  // caller (lib/crawl/download-images.ts, which has access to every crawled page — this
  // module only ever sees one buffer at a time).
  crossPageFrequency: number;
};

const DOMINANT_COLOR_LIMIT = 5;

function toHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
}

function orientationOf(width: number, height: number): Orientation {
  if (width > height) return "landscape";
  if (width < height) return "portrait";
  return "square";
}

// Bits, over the non-empty buckets bucketImageColors already produced — no separate pixel
// pass. log2(0) is never evaluated: buckets with count 0 don't exist in the map this iterates.
function shannonEntropyBits(buckets: PixelBucket[], totalPixels: number): number {
  if (totalPixels === 0) return 0;
  let entropy = 0;
  for (const bucket of buckets) {
    const p = bucket.count / totalPixels;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

function dominantColorsOf(buckets: PixelBucket[], totalPixels: number): DominantColor[] {
  if (totalPixels === 0) return [];
  return buckets
    .filter((b) => !isNearNeutralHsl(b.r, b.g, b.b))
    .map((b) => ({ bucket: b, saturation: rgbToHsl(b.r, b.g, b.b).s }))
    .sort((a, b) => {
      const diff = b.saturation - a.saturation;
      // Explicit tiebreak, not array/Map-iteration order — same discipline as 0.1a/1.1b.
      return diff !== 0 ? diff : (a.bucket.r - b.bucket.r) || (a.bucket.g - b.bucket.g) || (a.bucket.b - b.bucket.b);
    })
    .slice(0, DOMINANT_COLOR_LIMIT)
    .map(({ bucket }) => ({ hex: toHex(bucket.r, bucket.g, bucket.b), share: bucket.count / totalPixels }));
}

const EMPTY_METRICS_BASE: Pick<
  ImageMetrics,
  "width" | "height" | "aspectRatio" | "orientation" | "bytesPerPixel" | "hasAlpha" | "colorEntropy" | "dominantColors"
> = {
  width: null,
  height: null,
  aspectRatio: null,
  orientation: null,
  bytesPerPixel: null,
  hasAlpha: null,
  colorEntropy: null,
  dominantColors: [],
};

// context carries what only the caller knows (which page, how many pages) — everything else
// is computed from buffer alone. Never throws: a corrupt or unsupported-format buffer (sharp
// can fail on some malformed SVGs/ICOs) degrades to null pixel-derived fields plus the real
// fileSizeBytes, the same "fails closed, not fatally" convention as extractDominantColors.
export async function computeImageMetrics(
  buffer: Buffer,
  context: { pagePosition: number | null; crossPageFrequency: number }
): Promise<ImageMetrics> {
  const fileSizeBytes = buffer.length;

  try {
    const [metadata, buckets] = await Promise.all([sharp(buffer).metadata(), bucketImageColors(buffer)]);
    const width = metadata.width ?? null;
    const height = metadata.height ?? null;
    const totalPixels = buckets.reduce((sum, b) => sum + b.count, 0);

    return {
      width,
      height,
      aspectRatio: width && height ? width / height : null,
      orientation: width && height ? orientationOf(width, height) : null,
      fileSizeBytes,
      bytesPerPixel: width && height ? fileSizeBytes / (width * height) : null,
      hasAlpha: metadata.hasAlpha ?? null,
      colorEntropy: shannonEntropyBits(buckets, totalPixels),
      dominantColors: dominantColorsOf(buckets, totalPixels),
      pagePosition: context.pagePosition,
      crossPageFrequency: context.crossPageFrequency,
    };
  } catch (err) {
    console.error("[content] image metrics computation failed:", err);
    return { ...EMPTY_METRICS_BASE, fileSizeBytes, pagePosition: context.pagePosition, crossPageFrequency: context.crossPageFrequency };
  }
}
