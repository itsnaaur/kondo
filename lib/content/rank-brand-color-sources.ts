import sharp from "sharp";
import type { ColorCandidate } from "@/lib/crawl/crawler";
import type { ConfidenceLevel } from "./types";
import { extractDominantColors } from "./extract-colors";

// Ranks candidate brand colours by SOURCE — computed styles first, logo second, imagery
// third — rather than picking whichever source happens to return something. Feeds
// lib/content/normalize-brand-colors.ts's pickHue with a single, better-evidenced hex value
// instead of the flat "whatever extractDominantColors found" input it gets today.
// Deliberately does NOT touch normalize-brand-colors.ts itself — that's Task 1.5.

export type BrandColorSource = "computed-styles" | "logo" | "imagery" | "none";

export type BrandColorRankingResult = {
  hex: string | null;
  source: BrandColorSource;
  confidence: ConfidenceLevel;
  // Raw evidence behind the confidence label — occurrence counts for computed styles,
  // saturation percentages for logo/imagery. Kept alongside the label, not folded away,
  // because "a 13-to-1 win" and "a sole survivor at count 4" both round to the same label
  // in a coarse system and the caller may want the actual margin, not just the tier.
  winnerScore: number | null;
  runnerUpScore: number | null;
  reason: string;
};

// --- colour math ---------------------------------------------------------------------
// Deliberately duplicated from lib/crawl/crawler.ts's 1.1b logic, not imported. crawler.ts
// doesn't export rgbToHsl/isNearNeutralOrTransparent, and reaching into lib/crawl from
// lib/content for ~15 lines of self-contained colour math felt like the wrong direction to
// couple these two areas over. Same formula, same reasoning — see crawler.ts's own comment
// on why min-channel<20 (the original lib/content/extract-colors.ts isNearNeutral rule) is
// wrong for arbitrary saturated brand colours.

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
    else if (max === gn) h = ((bn - rn) / d + 2) / 6;
    else h = ((rn - gn) / d + 4) / 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function isNearNeutralHsl(r: number, g: number, b: number): boolean {
  const { s, l } = rgbToHsl(r, g, b);
  // l >= 90, not 97 — found live against Downseal Solutions while verifying this task: its
  // theme's near-white page background, rgb(246, 243, 238), is l~=95%/s~=31%, so it
  // survived a 97%-lightness / 15%-saturation cutoff and won linkColor at count 1650 with
  // "high" confidence — visibly wrong, since it's the page background bleeding through, not
  // an intentional brand colour. HSL saturation is a noisy signal this close to the
  // lightness extremes: a faint warm/cool cast on an almost-white pixel reads as "30%
  // saturated" numerically without being a real, legible colour choice, and a link or
  // button actually coloured this close to white would have near-zero contrast against a
  // light background anyway. Raising the lightness floor closes a real failure mode found
  // by testing, not a threshold tuned to hit a target result.
  return l >= 90 || l <= 3 || s < 15;
}

function saturationOf(r: number, g: number, b: number): number {
  return rgbToHsl(r, g, b).s;
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([a-f\d]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const int = parseInt(m[1], 16);
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
}

// Same shape as the CSS colour strings getComputedStyle returns — rgb(r,g,b) or
// rgba(r,g,b,a) — since that's exactly what's stored in CrawledPage.computedStyles.
function parseCssColor(value: string): { r: number; g: number; b: number; a: number } | null {
  const match = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+))?\s*\)$/.exec(value);
  if (!match) return null;
  return {
    r: Number(match[1]),
    g: Number(match[2]),
    b: Number(match[3]),
    a: match[4] !== undefined ? Number(match[4]) : 1,
  };
}

// --- source 1: computed styles --------------------------------------------------------

function mergeColorCandidates(perPage: ColorCandidate[][]): ColorCandidate[] {
  const merged = new Map<string, { count: number; inMain: boolean }>();
  for (const page of perPage) {
    for (const c of page) {
      const existing = merged.get(c.color);
      if (existing) {
        existing.count += c.count;
        existing.inMain = existing.inMain || c.inMain;
      } else {
        merged.set(c.color, { count: c.count, inMain: c.inMain });
      }
    }
  }
  return [...merged.entries()]
    .map(([color, v]) => ({ color, count: v.count, inMain: v.inMain }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      if (a.inMain !== b.inMain) return a.inMain ? -1 : 1;
      return a.color.localeCompare(b.color);
    });
}

// computedStylesValues is the raw CrawledPage.computedStyles column value per crawled page —
// null for pages where capture threw, a real (possibly all-empty) object otherwise. Per
// 1.1c: these two cases are already structurally distinct at this boundary, and this
// function respects that distinction explicitly rather than treating a null the same as an
// empty array — a page whose capture failed contributes nothing to the aggregate; it is not
// evidence of "no brand colour here."
function rankComputedStylesSource(
  computedStylesValues: unknown[]
): { candidates: ColorCandidate[]; field: string } | null {
  const ran = computedStylesValues.filter(
    (v): v is Record<string, unknown> => v !== null && typeof v === "object"
  );

  // Specificity order within this one source, not a ranked list of independent fallbacks —
  // 1.2c fixed a real bug here. A filled button background is the strongest, most direct "this
  // is the brand's action colour" signal; buttonBorderColor exists specifically for the
  // Downseal case 1.1b found (a real button with a genuinely absent fill but a real border);
  // linkColor is weaker still, a text colour rather than a fill. Falling through to the next
  // field is only correct when the current one found NOTHING (an empty array — no non-neutral,
  // non-excluded candidate survived at all) — that's "this signal doesn't exist on this site,"
  // and the next, less specific signal is worth trying. It is NOT correct when the current
  // field found something but it was too WEAK to trust (rejected by
  // isWeakComputedStylesWinner) — that means computed styles as a whole don't carry a coherent
  // signal, and the fix is to hand off to the next SOURCE (logo, then imagery), not to keep
  // trying progressively less specific fields until one is generous enough to pass. 1.2b had
  // this backwards: Princeton Dental's primaryButtonBg correctly failed the weak-winner gate
  // (its real teal/green .btn colours are real but page-specific, not sitewide), and the old
  // "continue on weak, same as continue on empty" logic fell through to buttonBorderColor,
  // which happened to have a generic theme link-colour with just enough sitewide coverage to
  // pass — a second wrong, confident answer, not the abstention the gate was built for. See
  // 1.2c's log entry for the real before/after evidence.
  for (const field of ["primaryButtonBg", "buttonBorderColor", "linkColor"] as const) {
    const perPage = ran.map((cs) => {
      const v = cs[field];
      return Array.isArray(v) ? (v as ColorCandidate[]) : [];
    });
    const merged = mergeColorCandidates(perPage);
    if (merged.length === 0) continue; // nothing here at all — try the next, less specific field
    const [winner, runnerUp] = merged;
    if (isWeakComputedStylesWinner(winner, runnerUp, pageCoverageOf(perPage, winner.color))) {
      // Found something, but too thin to trust — this is a verdict on computed styles as a
      // whole, not just this field. End the source here; do not try buttonBorderColor/linkColor
      // as a way to still get an answer out of a source that just said it doesn't have one.
      return null;
    }
    return { candidates: merged, field };
  }
  return null;
}

function computedStylesConfidence(winner: number, runnerUp: number | null): ConfidenceLevel {
  if (runnerUp === null) {
    if (winner >= 5) return "high";
    if (winner >= 2) return "medium";
    return "low"; // a single, unopposed occurrence is still weak evidence on its own
  }
  const ratio = winner / runnerUp;
  if (ratio >= 3) return "high";
  if (ratio >= 1.5) return "medium";
  return "low"; // e.g. a close 4-to-3 race — a real result, not a confident one
}

// Task 1.2b. 1.2a found a real-count, real-margin winner can still be misleading: Princeton
// Dental's post-exclusion primaryButtonBg winner (its real teal `.btn`) won 13-to-3 by count —
// a "high" margin by computedStylesConfidence's own ratio test — but that 13 came from a
// single page out of 92 (a promo banner repeated on the homepage), not a sitewide element.
// Occurrence count alone can't distinguish "genuinely common across the site" from "repeated
// many times on one page." Page coverage can. Below 10% of crawled pages is treated as a
// page-specific design choice, not a persistent sitewide brand colour — checked against this
// task's five real clients: BC Security/Propell Property/Allen Evans Family Lawyers' real
// winners are all on 100% of pages, comfortably clear; Princeton Dental's post-exclusion
// candidates (1/92 and 3/92) both fall well under it.
const MIN_COMPUTED_STYLES_COVERAGE = 0.1;

function pageCoverageOf(perPage: ColorCandidate[][], color: string): number {
  if (perPage.length === 0) return 0;
  const pagesWithColor = perPage.filter((page) => page.some((c) => c.color === color)).length;
  return pagesWithColor / perPage.length;
}

// A winner this function rejects isn't wrong evidence, just evidence too thin to hand back as
// a source's answer — the caller falls through to the next field, then the next source
// (logo, then imagery), the same path a field that found literally nothing already takes.
// Reuses computedStylesConfidence's own "low" cutoffs for the count/margin half of this check
// rather than duplicating separate thresholds — anything that would have scored "low" now
// abstains instead of being returned as a low-confidence computed-styles pick.
function isWeakComputedStylesWinner(
  winner: ColorCandidate,
  runnerUp: ColorCandidate | undefined,
  coverage: number
): boolean {
  if (coverage < MIN_COMPUTED_STYLES_COVERAGE) return true;
  return computedStylesConfidence(winner.count, runnerUp?.count ?? null) === "low";
}

// --- source 2: logo (saturation ranked, not frequency ranked) -------------------------

const LOGO_SAMPLE_SIZE = 24;
const LOGO_BUCKET_SIZE = 32;

function quantize(v: number): number {
  return Math.min(255, Math.round(v / LOGO_BUCKET_SIZE) * LOGO_BUCKET_SIZE);
}

async function bucketImageColors(buffer: Buffer): Promise<{ r: number; g: number; b: number; count: number }[]> {
  const { data, info } = await sharp(buffer)
    .resize(LOGO_SAMPLE_SIZE, LOGO_SAMPLE_SIZE, { fit: "cover" })
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
  return [...counts.values()];
}

// A logo's brand colour is very often a small share of its total pixels — a wordmark on a
// large white/transparent field, say — so ranking by frequency (as extractDominantColors
// does for primary/secondary) systematically loses to the background. Filtering to
// non-neutral survivors and ranking what's left by saturation finds the colour a human eye
// is actually drawn to, not the one that covers the most area.
async function rankLogoSource(
  buffer: Buffer
): Promise<{ r: number; g: number; b: number; saturation: number }[]> {
  let buckets: { r: number; g: number; b: number; count: number }[];
  try {
    buckets = await bucketImageColors(buffer);
  } catch (err) {
    console.error("[content] logo bucketing failed:", err);
    return [];
  }
  return buckets
    .filter((c) => !isNearNeutralHsl(c.r, c.g, c.b))
    .map((c) => ({ r: c.r, g: c.g, b: c.b, saturation: saturationOf(c.r, c.g, c.b) }))
    .sort((a, b) => {
      const diff = b.saturation - a.saturation;
      // Explicit tiebreak, not array/Map-iteration order — same discipline as 0.1a/1.1b.
      return diff !== 0 ? diff : (a.r - b.r) || (a.g - b.g) || (a.b - b.b);
    });
}

function logoConfidence(winnerSat: number, runnerUpSat: number | null): ConfidenceLevel {
  // Capped below "high" deliberately — saturation-only ranking on one image has no
  // repeated-evidence backing the way computed styles' occurrence counts do, so even a
  // clean win here is weaker proof than this source's own best case.
  if (runnerUpSat === null) return winnerSat >= 40 ? "medium" : "low";
  return winnerSat - runnerUpSat >= 20 ? "medium" : "low";
}

// --- source 3: imagery (existing pixel-bucketing, with a saturation floor) ------------

const IMAGERY_SATURATION_FLOOR = 15;

// Reuses extractDominantColors as-is — no changes to lib/content/extract-colors.ts, and
// its existing callers (run-analysis.ts's own colour extraction) are unaffected. The
// saturation floor is applied here, on this function's output, not inside that file.
async function rankImagerySource(buffer: Buffer): Promise<{ hex: string; saturation: number }[]> {
  const roles = await extractDominantColors(buffer);

  // extractDominantColors' own fallback (DEFAULT_NEUTRAL_PALETTE) is a "nothing usable was
  // found" placeholder, not a real signal — every entry in it is confidence:"low",
  // flagged:true, which a genuine extraction never produces (extract-colors.ts:81-86).
  // Treating the fallback as a real imagery candidate would be exactly the "neutrals
  // winning" failure this task exists to close off.
  const isFallback = roles.length > 0 && roles.every((c) => c.confidence === "low" && c.flagged === true);
  if (isFallback) return [];

  return roles
    .map((c) => {
      const rgb = hexToRgb(c.hex);
      return rgb ? { hex: c.hex, saturation: saturationOf(rgb.r, rgb.g, rgb.b) } : null;
    })
    .filter((c): c is { hex: string; saturation: number } => c !== null && c.saturation >= IMAGERY_SATURATION_FLOOR)
    .sort((a, b) => b.saturation - a.saturation);
}

// --- entry point ------------------------------------------------------------------------

export async function rankBrandColorSources(input: {
  // Raw CrawledPage.computedStyles values across every crawled page for this client —
  // pass them all, null entries included; rankComputedStylesSource handles the filtering.
  computedStylesValues: unknown[];
  logoBuffer: Buffer | null;
  imageryBuffer: Buffer | null;
}): Promise<BrandColorRankingResult> {
  const computed = rankComputedStylesSource(input.computedStylesValues);
  if (computed) {
    const [winner, runnerUp] = computed.candidates;
    const rgb = parseCssColor(winner.color);
    if (rgb) {
      return {
        hex: rgbToHex(rgb.r, rgb.g, rgb.b),
        source: "computed-styles",
        confidence: computedStylesConfidence(winner.count, runnerUp?.count ?? null),
        winnerScore: winner.count,
        runnerUpScore: runnerUp?.count ?? null,
        reason: `computed styles (${computed.field}): ${winner.count}${
          runnerUp ? ` vs ${runnerUp.count}` : " (sole survivor)"
        }`,
      };
    }
    // A stored colour string that doesn't parse as rgb()/rgba() shouldn't happen — every
    // value here came from getComputedStyle() — but fails closed to the next source rather
    // than silently returning a null hex from a "found something" branch if it ever did.
  }

  if (input.logoBuffer) {
    const logoCandidates = await rankLogoSource(input.logoBuffer);
    if (logoCandidates.length > 0) {
      const [winner, runnerUp] = logoCandidates;
      return {
        hex: rgbToHex(winner.r, winner.g, winner.b),
        source: "logo",
        confidence: logoConfidence(winner.saturation, runnerUp?.saturation ?? null),
        winnerScore: Math.round(winner.saturation),
        runnerUpScore: runnerUp ? Math.round(runnerUp.saturation) : null,
        reason: `logo, ranked by saturation: ${winner.saturation.toFixed(0)}%${
          runnerUp ? ` vs ${runnerUp.saturation.toFixed(0)}%` : " (sole survivor)"
        }`,
      };
    }
  }

  if (input.imageryBuffer) {
    const imageryCandidates = await rankImagerySource(input.imageryBuffer);
    if (imageryCandidates.length > 0) {
      const [winner, runnerUp] = imageryCandidates;
      return {
        hex: winner.hex,
        source: "imagery",
        // Last-resort source, never above "low" — matches this pipeline's existing
        // skepticism of raw extracted colours (see normalize-brand-colors.ts's own header
        // comment on why raw hex values aren't trusted directly).
        confidence: "low",
        winnerScore: Math.round(winner.saturation),
        runnerUpScore: runnerUp ? Math.round(runnerUp.saturation) : null,
        reason: `imagery (pixel-bucketing, saturation floor ${IMAGERY_SATURATION_FLOOR}%): best saturation ${winner.saturation.toFixed(0)}%`,
      };
    }
  }

  return {
    hex: null,
    source: "none",
    confidence: "low",
    winnerScore: null,
    runnerUpScore: null,
    reason: "no non-neutral candidate survived in any source — an honest low-confidence result, not a forced pick",
  };
}
