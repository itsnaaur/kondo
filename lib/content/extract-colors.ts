import sharp from "sharp";
import type { ContentColor } from "./types";

// Deterministic — no AI. Resizing to a small grid and bucketing pixel channels is cheap
// and good enough for "does this look like the brand," which is all a template hero/accent
// treatment needs; it doesn't need to be a perceptually-exact palette extraction.
const SAMPLE_SIZE = 24;
const BUCKET_SIZE = 32;

export const DEFAULT_NEUTRAL_PALETTE: ContentColor[] = [
  { hex: "#1f2937", role: "primary", confidence: "low", flagged: true },
  { hex: "#6b7280", role: "secondary", confidence: "low", flagged: true },
  { hex: "#3b82f6", role: "accent", confidence: "low", flagged: true },
];

function toHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

function quantize(v: number): number {
  return Math.min(255, Math.round(v / BUCKET_SIZE) * BUCKET_SIZE);
}

// Background/whitespace pixels dominate most logos and photos and are legitimate
// primary/secondary picks, but shouldn't be mistaken for the brand's actual accent color —
// so the accent role specifically skips very light, very dark, or greyscale buckets.
function isNearNeutral(c: { r: number; g: number; b: number }): boolean {
  const max = Math.max(c.r, c.g, c.b);
  const min = Math.min(c.r, c.g, c.b);
  return max > 235 || min < 20 || max - min < 12;
}

// Best-effort — extracts up to 3 dominant colors (primary/secondary/accent) from an image
// buffer (typically the logo, falling back to a hero image). Returns the neutral fallback
// palette, flagged and at "low" confidence, if extraction fails or the image yields no
// usable buckets — callers should never treat an empty result as "this client has no
// brand colors." Callers with no source image at all (no logo, no hero) should use
// DEFAULT_NEUTRAL_PALETTE directly rather than calling this with an empty buffer — sharp
// throws synchronously on empty input, which this catches, but it's a needless "error"
// log for what is actually the normal, expected no-photography case.
export async function extractDominantColors(buffer: Buffer): Promise<ContentColor[]> {
  try {
    const { data, info } = await sharp(buffer)
      .resize(SAMPLE_SIZE, SAMPLE_SIZE, { fit: "cover" })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const counts = new Map<string, { r: number; g: number; b: number; count: number }>();
    for (let i = 0; i + 2 < data.length; i += info.channels) {
      const r = quantize(data[i]);
      const g = quantize(data[i + 1]);
      const b = quantize(data[i + 2]);
      const key = `${r},${g},${b}`;
      const existing = counts.get(key);
      if (existing) existing.count++;
      else counts.set(key, { r, g, b, count: 1 });
    }

    const sorted = [...counts.values()].sort((a, b) => b.count - a.count);
    if (sorted.length === 0) return DEFAULT_NEUTRAL_PALETTE;

    const roles: ContentColor["role"][] = ["primary", "secondary", "accent"];
    const picked: typeof sorted = [];
    for (const role of roles) {
      const candidate =
        role === "accent"
          ? sorted.find((c) => !isNearNeutral(c) && !picked.includes(c))
          : sorted.find((c) => !picked.includes(c));
      if (candidate) picked.push(candidate);
    }

    if (picked.length === 0) return DEFAULT_NEUTRAL_PALETTE;

    return picked.map((c, i) => ({
      hex: toHex(c.r, c.g, c.b),
      role: roles[i],
      confidence: "medium",
      flagged: false,
    }));
  } catch (err) {
    console.error("[content] dominant color extraction failed:", err);
    return DEFAULT_NEUTRAL_PALETTE;
  }
}
