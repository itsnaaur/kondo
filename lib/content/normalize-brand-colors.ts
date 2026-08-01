/**
 * Turns an unreliable list of extracted brand colours into a usable palette.
 *
 * Extracted colours are frequently unusable as-is: Princeton Dental came back
 * as black + two near-identical greens, BC Security as black + two greys.
 * Using those raw produces a black-to-grey "gradient" that reads as broken
 * rather than deliberate.
 *
 * So we don't use the raw hex. We pick the single most usable HUE from what
 * was extracted, then derive every colour in the template from it at
 * lightness/saturation values we control. The client's colour still drives
 * the page — a green clinic looks green, a blue firm looks blue — but the
 * palette is always well-formed.
 */

export type Palette = {
  accent: string; // primary action colour
  accentInk: string; // text colour that sits on accent
  accentSoft: string; // pale tint for fills
  deep: string; // dark band background
  deepSoft: string; // slightly lifted dark, for cards on deep
  mist: string; // pale band background
  ink: string; // body text
  inkMuted: string; // secondary text
  line: string; // hairline rules
  paper: string;
  derivedFrom: "brand" | "fallback";
};

const FALLBACK_HUE = 222; // a designed slate-indigo, used when nothing extracted is usable

function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  const m = /^#?([a-f\d]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const int = parseInt(m[1], 16);
  const r = ((int >> 16) & 255) / 255;
  const g = ((int >> 8) & 255) / 255;
  const b = (int & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hsl(h: number, s: number, l: number): string {
  return `hsl(${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}%)`;
}

/**
 * Pick the most usable hue from the extracted colours.
 * A colour is usable if it carries real chroma and isn't nearly black or white.
 * Among candidates, the most saturated wins.
 */
function pickHue(colors: { hex: string }[]): { hue: number; source: "brand" | "fallback" } {
  let best: { hue: number; sat: number } | null = null;

  for (const c of colors) {
    const parsed = hexToHsl(c.hex);
    if (!parsed) continue;
    // Reject greys/near-black/near-white: they carry no hue worth building on.
    if (parsed.s < 25) continue;
    // A dark muddy tint (BC Security's #402020, L=19%) is a shadow, not a brand
    // colour. Building a whole palette on it produces a red security company.
    if (parsed.l < 26 || parsed.l > 82) continue;
    if (!best || parsed.s > best.sat) best = { hue: parsed.h, sat: parsed.s };
  }

  if (!best) return { hue: FALLBACK_HUE, source: "fallback" };
  return { hue: best.hue, source: "brand" };
}

export function buildPalette(brandColors: { hex: string }[]): Palette {
  const { hue, source } = pickHue(brandColors ?? []);

  // Yellows and yellow-greens read as low-contrast at mid lightness, so they
  // get pulled darker. Everything else sits in a consistent band.
  const isYellowish = hue >= 45 && hue <= 95;
  const accentL = isYellowish ? 32 : 41;
  const accentS = isYellowish ? 62 : 58;

  return {
    accent: hsl(hue, accentS, accentL),
    accentInk: "#ffffff",
    accentSoft: hsl(hue, 42, 95),
    deep: hsl(hue, 28, 9),
    deepSoft: hsl(hue, 20, 15),
    mist: hsl(hue, 24, 97),
    ink: hsl(hue, 12, 11),
    inkMuted: hsl(hue, 8, 42),
    line: hsl(hue, 14, 88),
    paper: "#ffffff",
    derivedFrom: source,
  };
}
