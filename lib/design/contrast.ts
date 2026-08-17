// WCAG 2.1 contrast ratio utilities. Standalone module — not wired into anything yet; Tasks
// 1.5 (pickHue) and 1.6 are the intended consumers. See contrast.test.ts for verification
// against published WCAG/WebAIM reference pairs, not self-computed values.

export type RGB = { r: number; g: number; b: number };

function hexToRgb(hex: string): RGB {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!match) throw new Error(`Invalid hex colour: ${hex}`);
  return { r: parseInt(match[1], 16), g: parseInt(match[2], 16), b: parseInt(match[3], 16) };
}

// WCAG 2.1's sRGB channel linearisation step. Uses the errata-corrected 0.04045 threshold,
// not the 0.03928 in the original published formula text — the W3C's own Relative Luminance
// wiki page notes the correction (https://www.w3.org/WAI/GL/wiki/Relative_luminance); the
// two thresholds only disagree in a narrow band that rounds to the same 8-bit channel value
// either way, so this doesn't change results, only matches the corrected formula.
function linearizeChannel(channel8Bit: number): number {
  const c = channel8Bit / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

// L = 0.2126*R + 0.7152*G + 0.0722*B, per WCAG 2.1's relative luminance definition.
export function relativeLuminance(rgb: RGB): number {
  return (
    0.2126 * linearizeChannel(rgb.r) +
    0.7152 * linearizeChannel(rgb.g) +
    0.0722 * linearizeChannel(rgb.b)
  );
}

// (L1 + 0.05) / (L2 + 0.05), where L1 is the lighter colour's luminance — per WCAG 2.1's
// contrast ratio definition. Symmetric in its two arguments by construction (lighter/darker
// are resolved internally, not by argument order).
export function contrastRatio(colorA: string, colorB: string): number {
  const luminanceA = relativeLuminance(hexToRgb(colorA));
  const luminanceB = relativeLuminance(hexToRgb(colorB));
  const lighter = Math.max(luminanceA, luminanceB);
  const darker = Math.min(luminanceA, luminanceB);
  return (lighter + 0.05) / (darker + 0.05);
}

// #0F172A is this codebase's own dark-slate design token (Tailwind's slate-900), not a
// generic dark grey — kept as a named candidate because pure black text on a saturated
// mid-tone background reads harsher than this codebase's own dark token in practice, per the
// design system it will feed into (Tasks 1.5/1.6). Order is the tie-break when two candidates
// land on the exact same ratio — explicit, not iteration-order-dependent.
const ON_COLOR_CANDIDATES = ["#FFFFFF", "#000000", "#0F172A"] as const;

// Best of white / black / #0F172A against a given background, by WCAG contrast ratio.
export function pickOnColor(background: string): string {
  let best: string = ON_COLOR_CANDIDATES[0];
  let bestRatio = contrastRatio(background, best);
  for (const candidate of ON_COLOR_CANDIDATES.slice(1)) {
    const ratio = contrastRatio(background, candidate);
    if (ratio > bestRatio) {
      best = candidate;
      bestRatio = ratio;
    }
  }
  return best;
}
