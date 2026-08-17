// Task 2.4. Combines Task 2.2's typography resolver and Task 2.3's style bundles into the one
// set of concrete CSS custom property values a template needs — the same "resolve to final
// strings in JS, hand the template plain values" shape `buildPalette` (lib/content/
// normalize-brand-colors.ts) already uses, not a second architecture.
//
// Both inputs this function needs are, like Task 2.2's own inputs, not really available yet:
// there is no real per-client moodSignals[]/positioningTier (Task 5.4, Phase 3) and no
// bundle-selection resolver (not built by Task 2.3, which only authored the data). Both are
// optional here and default internally — the same pattern `buildPalette(c.brandColors || [])`
// already uses for a missing/empty input — so every existing caller of a template's render
// function keeps working unchanged, while a caller that DOES have real inputs (or wants to
// exercise a specific combination, e.g. for verification) can pass them through.

import { resolveTypography, type ResolveTypographyInput } from "./resolve-typography";
import styleBundlesData from "./data/style-bundles.json";

export type StyleBundle = (typeof styleBundlesData)[number];

// Placeholder default, not a resolved decision — Task 2.3 built 6 bundles but no selector.
// Chosen as the closest match to what the three templates already rendered before this task
// (small non-zero radii, a restrained shadow only on the one already-elevated panel each
// template has), to minimise how much changes for a caller that passes nothing. Real
// bundle-selection is Phase 3 work, same status as 2.2's typography default.
const DEFAULT_STYLE_BUNDLE_ID = "crisp-formal";

export function resolveStyleBundle(id?: string): StyleBundle {
  const targetId = id ?? DEFAULT_STYLE_BUNDLE_ID;
  const bundle = (styleBundlesData as StyleBundle[]).find((b) => b.id === targetId);
  if (!bundle) {
    throw new Error(`Unknown style bundle id "${targetId}" — not in lib/design/data/style-bundles.json.`);
  }
  return bundle;
}

// A single neutral system-sans fallback for BOTH roles, deliberately not "serif" for the
// heading/accent role — the pre-2.4 templates hardcoded a serif fallback because Newsreader was
// always serif, but a resolved pairing's heading font can just as easily be sans (e.g. the
// no-mood-match default, Minimal Swiss, is Inter for both roles) or mono. A generic sans fallback
// only matters if the Google Font itself fails to load, and is a reasonable, always-safe default
// regardless of the resolved font's own category — simpler than threading typography.json's
// Category column through just for this, and correct where a serif-specific fallback would not
// have been for a sans-headed pairing.
const GENERIC_FONT_FALLBACK = 'ui-sans-serif, system-ui, -apple-system, sans-serif';

function fontStack(fontName: string): string {
  return `"${fontName}", ${GENERIC_FONT_FALLBACK}`;
}

export type TemplateTokens = {
  fontBody: string;
  fontHeading: string;
  radiusBtn: string;
  radiusCard: string;
  radiusImage: string;
  radiusPill: string;
  shadowCard: string;
  shadowElevated: string;
  borderWeight: string;
  surfaceBlur: string;
  focusRingWidth: string;
  // Multiplies each template's own --band clamp() breakpoints (min, preferred-vw, max) by this
  // factor at generation time — same "resolve to a final number, don't hand the browser a calc()
  // of unresolved pieces" convention as everything else here.
  bandMultiplier: number;
};

export function resolveTemplateTokens(input?: {
  typography?: ResolveTypographyInput;
  styleBundleId?: string;
}): TemplateTokens {
  const typography = resolveTypography(input?.typography ?? { moodSignals: [], positioningTier: "mainstream" });
  const bundle = resolveStyleBundle(input?.styleBundleId);
  const t = bundle.tokens;
  return {
    fontBody: fontStack(typography.bodyFont),
    fontHeading: fontStack(typography.headingFont),
    radiusBtn: t.radius.button,
    radiusCard: t.radius.card,
    radiusImage: t.radius.image,
    radiusPill: t.radius.pill,
    shadowCard: t.shadow.card,
    shadowElevated: t.shadow.elevated,
    borderWeight: t.borderWeight,
    surfaceBlur: t.blur,
    // Only clinical-precise declares this; every other bundle falls back to the pre-2.4
    // hardcoded value (2px) so its removal isn't itself a visible change for bundles that never
    // asked for a different one.
    focusRingWidth: "focusRingWidth" in t ? (t as { focusRingWidth: string }).focusRingWidth : "2px",
    bandMultiplier: t.sectionRhythmMultiplier,
  };
}

// Scales one template's own clamp(minPx, coefficient vw, maxPx) --band breakpoints by the
// resolved bundle's sectionRhythmMultiplier, preserving the clamp's internal proportions exactly
// (scaling only the endpoints and leaving the vw coefficient fixed would let the preferred value
// drift outside the scaled range at extreme viewports).
export function scaledBand(minPx: number, vwCoefficient: number, maxPx: number, multiplier: number): string {
  const scaledMin = Math.round(minPx * multiplier);
  const scaledMax = Math.round(maxPx * multiplier);
  const scaledVw = Math.round(vwCoefficient * multiplier * 100) / 100;
  return `clamp(${scaledMin}px, ${scaledVw}vw, ${scaledMax}px)`;
}
