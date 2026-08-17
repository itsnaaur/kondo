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

import { pickOnColor } from "@/lib/design/contrast";

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
  // Task 1.5 — four roles from the uupm audit's role invariants (191 real palettes,
  // docs/uupm-port-audit.md §8.4), not four new independent design decisions:
  secondary: string; // a tint of accent — the audit found Secondary is the same hue as
  // Primary in the source data (median 4° hue delta — noise around "same hue" in
  // hand-picked palettes, not a deliberate offset), differing mainly in lightness.
  onSecondary: string; // text/icon colour on secondary — via pickOnColor (Task 1.3). Added in
  // 1.6a: 1.5 omitted this. The audit's `On *` roles are a per-surface lookup, and `secondary`
  // is a surface — `accentInk` (chosen for accent's lightness, not secondary's, which is
  // always lighter by construction) is a pairing the system should never make. `1.6` found
  // this the hard way: 62 of 191 corpus primaries failed AA on accentInk-on-secondary.
  ring: string; // focus ring — the audit found Ring equals Primary in 161/192 (84%) of
  // source palettes, the clear majority pattern, so ring is exactly accent, not derived
  // separately.
  destructive: string; // error/destructive action colour — see DESTRUCTIVE below.
  onDestructive: string; // text/icon colour on destructive — via pickOnColor (Task 1.3).
};

const FALLBACK_HUE = 222; // a designed slate-indigo, used when nothing extracted is usable

// Task 1.5. The uupm audit's controlled vocabulary for Destructive is only 3 hex values
// across 192 source palettes (docs/uupm-port-audit.md §2.2) — that's a designed constant in
// every one of those design systems, not a value derived from the brand hue (an error red
// stays legible and recognisable as "error" regardless of what colour the brand is). Fixed
// here for the same reason. #DC2626 (Tailwind red-600) is the actual majority choice in the
// imported corpus — 172 of 191 rows (90%), paired with #FFFFFF onDestructive 172/172 times
// — not picked from taste; see lib/design/data/palettes.json.
const DESTRUCTIVE = "#dc2626";

// How much lighter, in HSL lightness points, secondary sits above accent. The uupm audit
// found Secondary is a tint of Primary — same hue, differing mainly in lightness — with a
// median lightness delta of +9 points and secondary lighter than primary in 87% of the 191
// imported palettes (computed directly from lib/design/data/palettes.json, not estimated).
// Saturation delta was negligible (median +2.2) and isn't varied separately here.
const SECONDARY_LIGHTNESS_DELTA = 9;

// Task 1.6b. mist's own saturation/lightness — pulled out as named constants, not left as
// magic numbers duplicated between the deepening loop below and mist's own hsl(hue, MIST_S,
// MIST_L) in buildPalette's return, so the two can't silently drift apart.
const MIST_S = 24;
const MIST_L = 97;

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

// Task 1.6a. pickOnColor (lib/design/contrast.ts, Task 1.3) only accepts #RRGGBB — its own
// contract, not something to widen just because this file mostly deals in hsl() strings.
// destructive is a hex literal, so onDestructive's pickOnColor(DESTRUCTIVE) call never hit
// this; secondary is an hsl() string like every hue-derived role, so onSecondary needs a
// conversion first. Takes the already-rounded hsl() *string* (not raw h/s/l floats) so
// onSecondary is picked against the exact colour secondary actually renders as, not a
// hypothetical higher-precision variant that never ships. Same h-branch structure as
// luminance() above, producing RGB bytes instead of a luminance value.
function hslStringToHex(value: string): string {
  const match = /^hsl\((\d+) (\d+)% (\d+)%\)$/.exec(value);
  if (!match) throw new Error(`Not an hsl() string: ${value}`);
  const h = Number(match[1]);
  const S = Number(match[2]) / 100;
  const L = Number(match[3]) / 100;
  const c = (1 - Math.abs(2 * L - 1)) * S;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = L - c / 2;
  const [r1, g1, b1] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x]
    : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  const toByte = (v: number) => Math.round((v + m) * 255);
  const toHex2 = (n: number) => n.toString(16).padStart(2, "0");
  return `#${toHex2(toByte(r1))}${toHex2(toByte(g1))}${toHex2(toByte(b1))}`;
}

/** WCAG relative luminance, from HSL. */
function luminance(h: number, s: number, l: number): number {
  const S = s / 100, L = l / 100;
  const c = (1 - Math.abs(2 * L - 1)) * S;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = L - c / 2;
  const [r1, g1, b1] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x]
    : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  const lin = (v: number) => {
    const n = v + m;
    return n <= 0.03928 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r1) + 0.7152 * lin(g1) + 0.0722 * lin(b1);
}

function contrast(a: number, b: number): number {
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
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
    // Reject greys/near-white: they carry no hue worth building on.
    if (parsed.s < 25) continue;
    // Task 3.3a. Lowered from 26 to 10 — the 26 floor rejected genuine, high-confidence dark
    // brand colours, not just noise. BC Security's real brand colour is #024470 (a saturated
    // navy, L≈22%) and Propell Property's is #0e1e39 (L≈14%) — both real, sitewide-consistent,
    // high-confidence extractions (see docs/kondo-v2-execution.md's Phase 1 sign-off, item 3),
    // both rejected outright by the old 26 floor even though buildPalette never actually uses
    // the INPUT colour's own lightness for anything downstream — accentL is always one of two
    // fixed constants (32 or 41, set a few lines below), independent of how dark or light the
    // extracted colour was. Rejecting on lightness was filtering for "is this hue reliable,"
    // not "is this the right lightness to render at" — the palette is always re-lightened to a
    // controlled value regardless, so a dark-but-real hue was never actually unusable, only
    // treated as if it were.
    //
    // Still rejects genuine near-black: Princeton Dental's #002000 (a near-black green, L≈6.3%)
    // stays rejected — pinned directly by this file's own test
    // (normalize-brand-colors.test.ts's "Princeton Dental carry-forward" describe block). 10 was
    // chosen with real margin on both sides of the two real cases it has to separate: comfortably
    // above Princeton's 6.3% (near-black — at this lightness a colour reads as black to the eye
    // regardless of hue, independent of what the saturation formula computes) and comfortably
    // below Propell's 14% (a colour genuinely perceptible, and describable, as navy). Not derived
    // from the 191-palette corpus like MIST_S/SECONDARY_LIGHTNESS_DELTA/DESTRUCTIVE above — the
    // corpus is pre-designed "good" primaries, not raw noisy extractions, so it has no examples
    // of this specific near-black-vs-dark-navy boundary to derive a number from. A disclosed
    // design judgement, not a corpus-derived constant.
    //
    // Downseal Solutions' #606040 (a low-saturation olive, S≈20%) is unaffected by this change —
    // it was already, and remains, rejected by the `s < 25` check above, untouched here.
    if (parsed.l < 10 || parsed.l > 82) continue;
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
  let accentL = isYellowish ? 32 : 41;
  const accentS = isYellowish ? 62 : 58;
  const darkInk = hsl(hue, 24, 12);

  // Task 1.6b — deepen against mist, not pure white. High-luminance hues (greens) at L≈41
  // fail AA against the lightest surface accent actually renders on, and picking dark ink
  // instead produces dark-on-dark buttons — deepen the fill until that clears, rather than
  // flipping the text colour. Originally targeted pure white (luminance 1) — 1.6's validation
  // gate found 41 of 191 real corpus primaries then failed AA on "accent on mist" (a real,
  // confirmed template usage — lib/templates/atlas/styles.ts's `.at-hero__stats dt`/
  // `.at-proc__no`), because mist (hsl(hue, 24, 97), a tinted near-white) has measurably lower
  // luminance than true white, so a hue that barely cleared the old white-only bar predictably
  // failed the harder mist bar. mist is the lightest surface with confirmed accent-as-text
  // usage — paper (pure white) is literally lighter, but no template renders accent-coloured
  // text directly on paper; accentSoft (L=95) is darker than mist (L=97). Deepening against
  // mist is therefore both the correct fix and, by construction, at least as strict as the old
  // white-only check (mist's lower luminance can only demand an accentL equal to or darker
  // than what clearing white alone required), so this cannot make accentInk-on-accent (a
  // separately, already-passing pair) worse.
  if (!isYellowish) {
    while (contrast(luminance(hue, accentS, accentL), luminance(hue, MIST_S, MIST_L)) < 4.5 && accentL > 24) {
      accentL -= 2;
    }
  }

  const onWhite = contrast(luminance(hue, accentS, accentL), 1);
  const accentInk = onWhite >= 4.5 ? "#ffffff" : darkInk;

  // Task 1.5 — secondary is a tint of accent (same hue/saturation, lighter), per the audit's
  // Secondary-is-a-tint-of-Primary finding. Clamped so an already-light accentL (the
  // yellowish branch starts at 32, everything else at 41, though the AA-contrast loop above
  // can push accentL as low as 24) can't push secondary past white.
  const secondary = hsl(hue, accentS, Math.min(accentL + SECONDARY_LIGHTNESS_DELTA, 92));
  // Task 1.6a — secondary's own ink, not accentInk. See the Palette type's onSecondary comment.
  const onSecondary = pickOnColor(hslStringToHex(secondary));
  // Task 1.5 — ring equals accent, the audit's majority (161/192) Ring-equals-Primary pattern.
  const ring = hsl(hue, accentS, accentL);
  const onDestructive = pickOnColor(DESTRUCTIVE);

  return {
    accent: hsl(hue, accentS, accentL),
    accentInk,
    accentSoft: hsl(hue, 42, 95),
    deep: hsl(hue, 28, 9),
    deepSoft: hsl(hue, 20, 15),
    mist: hsl(hue, 24, 97),
    ink: hsl(hue, 12, 11),
    inkMuted: hsl(hue, 8, 42),
    line: hsl(hue, 14, 88),
    paper: "#ffffff",
    derivedFrom: source,
    secondary,
    onSecondary,
    ring,
    destructive: DESTRUCTIVE,
    onDestructive,
  };
}
