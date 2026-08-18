import { describe, it, expect } from "vitest";
import { resolveTypography, type PositioningTier } from "./resolve-typography";
import { resolveTemplateTokens } from "./resolve-tokens";
import bundles from "./data/style-bundles.json";

// Task 2.5. Named for what it actually covers — resolve-typography.ts (Task 2.2) plus
// style-bundle selection (Task 2.4's resolveTemplateTokens/resolveStyleBundle, wrapping Task
// 2.3's style-bundles.json) — NOT lib/design/resolve-design-system.ts, which does not exist yet.
// That file is Task 3.2's discriminated-union resolver (palette + typography + style bundle +
// pattern + anti-patterns, per build plan §6.1), and it does not yet consume anything built here.
// When 3.2 lands, these goldens will need extending to cover its own new surface (palette
// resolution, pattern eligibility, the ok:true/ok:false union) — this file freezes only the two
// pieces that exist today.
//
// GOLDEN VALUES GENERATED FROM THE CURRENT IMPLEMENTATION ON 2026-08-18 (Task 2.5), NOT
// HAND-PREDICTED — same discipline as Task 1.6b's regenerated golden
// (lib/content/normalize-brand-colors.test.ts): run the real resolver against every case below,
// capture its real output, freeze that. If any of these values ever changes for the same input,
// that is either a real, intended behaviour change (regenerate the golden and say so in the
// execution log, per 1.6b's own precedent) or a real regression (fix the code) — never a silent
// update to make a failing test pass.
//
// blur IS DELIBERATELY EXCLUDED FROM EVERY GOLDEN BELOW — not an oversight. All 6 of Task 2.3's
// style bundles declare blur: "0px", but not because six independent design judgements agreed on
// "no blur" — none of the six bundles actually explored blur as a design axis at all (2.3-CARRY-
// FORWARD). Freezing "0px" now would create a diff this task already knows is coming the moment
// 2.3's bundles are revisited — noise, not the reviewed-diff signal goldens exist to provide.
//
// 2.3-CARRY-FORWARD RESOLVED IN TASK 3.7D, BOTH ITEMS, NOT THE SAME WAY. Radius/shadow/border-
// weight were re-audited against a real render of real client content (BC Security, through
// lib/design/generate-stylesheet.ts's own real .card/.card--elevated output) and found genuinely
// differentiated, not placeholder — kept unchanged; see style-bundles.json's own per-bundle
// harvestedFrom entries for the specific reasoning. sectionRhythmMultiplier WAS a real placeholder
// (six values clustered in a narrow 0.9-1.1 band, not a considered per-bundle spacing choice) and
// was widened to 0.78-1.25 — the golden values below are regenerated to match. blur stays "0px"
// for all six, still not a considered per-bundle choice, but now for a stated reason rather than
// silence: lib/design/generate-stylesheet.ts has no CSS rule that reads --surface-blur at all
// (confirmed by grep) — its only prior consumer was lib/templates/showcase/styles.ts's own sticky-
// nav backdrop-filter, deleted in 3.8. Authoring six different blur values now would be six
// invisible, unverifiable numbers, which is worse than the honest "not yet a real axis" this
// comment already stated — deferred to whenever a real translucent-surface consumer exists in the
// surviving system, not fixed by inventing one for this task alone.

type TypographyGolden = {
  pairingId: number;
  slug: string;
  name: string;
  headingFont: string;
  bodyFont: string;
  googleFontsUrl: string;
  matchedMoodSignal: string | null;
  isDefault: boolean;
};

const ALL_TIERS: PositioningTier[] = ["accessible", "mainstream", "premium", "luxury"];

// All 28 mood/tier combinations Task 2.2's TABLE supports (7 canonical moods x 4 tiers) — full
// resolution objects, not just .slug, so a change to googleFontsUrl/name/etc is caught here even
// if resolve-typography.test.ts's own narrower .slug-only assertions wouldn't catch it.
const GOLDEN_TYPOGRAPHY: Record<string, Record<PositioningTier, TypographyGolden>> = {
  professional: {
    accessible: { pairingId: 16, slug: "corporate-trust", name: "Corporate Trust", headingFont: "Lexend", bodyFont: "Source Sans 3", googleFontsUrl: "https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600;700&family=Source+Sans+3:wght@300;400;500;600;700&display=swap", matchedMoodSignal: "professional", isDefault: false },
    mainstream: { pairingId: 16, slug: "corporate-trust", name: "Corporate Trust", headingFont: "Lexend", bodyFont: "Source Sans 3", googleFontsUrl: "https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600;700&family=Source+Sans+3:wght@300;400;500;600;700&display=swap", matchedMoodSignal: "professional", isDefault: false },
    premium: { pairingId: 31, slug: "financial-trust", name: "Financial Trust", headingFont: "IBM Plex Sans", bodyFont: "IBM Plex Sans", googleFontsUrl: "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&display=swap", matchedMoodSignal: "professional", isDefault: false },
    luxury: { pairingId: 16, slug: "corporate-trust", name: "Corporate Trust", headingFont: "Lexend", bodyFont: "Source Sans 3", googleFontsUrl: "https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600;700&family=Source+Sans+3:wght@300;400;500;600;700&display=swap", matchedMoodSignal: "professional", isDefault: false },
  },
  traditional: {
    accessible: { pairingId: 29, slug: "legal-professional", name: "Legal Professional", headingFont: "EB Garamond", bodyFont: "Lato", googleFontsUrl: "https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;500;600;700&family=Lato:wght@300;400;700&display=swap", matchedMoodSignal: "traditional", isDefault: false },
    mainstream: { pairingId: 29, slug: "legal-professional", name: "Legal Professional", headingFont: "EB Garamond", bodyFont: "Lato", googleFontsUrl: "https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;500;600;700&family=Lato:wght@300;400;700&display=swap", matchedMoodSignal: "traditional", isDefault: false },
    premium: { pairingId: 29, slug: "legal-professional", name: "Legal Professional", headingFont: "EB Garamond", bodyFont: "Lato", googleFontsUrl: "https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;500;600;700&family=Lato:wght@300;400;700&display=swap", matchedMoodSignal: "traditional", isDefault: false },
    luxury: { pairingId: 32, slug: "real-estate-luxury", name: "Real Estate Luxury", headingFont: "Cinzel", bodyFont: "Josefin Sans", googleFontsUrl: "https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700&family=Josefin+Sans:wght@300;400;500;600;700&display=swap", matchedMoodSignal: "traditional", isDefault: false },
  },
  elegant: {
    accessible: { pairingId: 1, slug: "classic-elegant", name: "Classic Elegant", headingFont: "Playfair Display", bodyFont: "Inter", googleFontsUrl: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@400;500;600;700&display=swap", matchedMoodSignal: "elegant", isDefault: false },
    mainstream: { pairingId: 1, slug: "classic-elegant", name: "Classic Elegant", headingFont: "Playfair Display", bodyFont: "Inter", googleFontsUrl: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@400;500;600;700&display=swap", matchedMoodSignal: "elegant", isDefault: false },
    premium: { pairingId: 1, slug: "classic-elegant", name: "Classic Elegant", headingFont: "Playfair Display", bodyFont: "Inter", googleFontsUrl: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@400;500;600;700&display=swap", matchedMoodSignal: "elegant", isDefault: false },
    luxury: { pairingId: 1, slug: "classic-elegant", name: "Classic Elegant", headingFont: "Playfair Display", bodyFont: "Inter", googleFontsUrl: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@400;500;600;700&display=swap", matchedMoodSignal: "elegant", isDefault: false },
  },
  bold: {
    accessible: { pairingId: 7, slug: "bold-statement", name: "Bold Statement", headingFont: "Bebas Neue", bodyFont: "Source Sans 3", googleFontsUrl: "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Source+Sans+3:wght@300;400;500;600;700&display=swap", matchedMoodSignal: "bold", isDefault: false },
    mainstream: { pairingId: 7, slug: "bold-statement", name: "Bold Statement", headingFont: "Bebas Neue", bodyFont: "Source Sans 3", googleFontsUrl: "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Source+Sans+3:wght@300;400;500;600;700&display=swap", matchedMoodSignal: "bold", isDefault: false },
    premium: { pairingId: 7, slug: "bold-statement", name: "Bold Statement", headingFont: "Bebas Neue", bodyFont: "Source Sans 3", googleFontsUrl: "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Source+Sans+3:wght@300;400;500;600;700&display=swap", matchedMoodSignal: "bold", isDefault: false },
    luxury: { pairingId: 7, slug: "bold-statement", name: "Bold Statement", headingFont: "Bebas Neue", bodyFont: "Source Sans 3", googleFontsUrl: "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Source+Sans+3:wght@300;400;500;600;700&display=swap", matchedMoodSignal: "bold", isDefault: false },
  },
  friendly: {
    accessible: { pairingId: 48, slug: "accessibility-first", name: "Accessibility First", headingFont: "Atkinson Hyperlegible", bodyFont: "Atkinson Hyperlegible", googleFontsUrl: "https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&display=swap", matchedMoodSignal: "friendly", isDefault: false },
    mainstream: { pairingId: 30, slug: "medical-clean", name: "Medical Clean", headingFont: "Figtree", bodyFont: "Noto Sans", googleFontsUrl: "https://fonts.googleapis.com/css2?family=Figtree:wght@300;400;500;600;700&family=Noto+Sans:wght@300;400;500;700&display=swap", matchedMoodSignal: "friendly", isDefault: false },
    premium: { pairingId: 48, slug: "accessibility-first", name: "Accessibility First", headingFont: "Atkinson Hyperlegible", bodyFont: "Atkinson Hyperlegible", googleFontsUrl: "https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&display=swap", matchedMoodSignal: "friendly", isDefault: false },
    luxury: { pairingId: 48, slug: "accessibility-first", name: "Accessibility First", headingFont: "Atkinson Hyperlegible", bodyFont: "Atkinson Hyperlegible", googleFontsUrl: "https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&display=swap", matchedMoodSignal: "friendly", isDefault: false },
  },
  modern: {
    accessible: { pairingId: 2, slug: "modern-professional", name: "Modern Professional", headingFont: "Poppins", bodyFont: "Open Sans", googleFontsUrl: "https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;500;600;700&family=Poppins:wght@400;500;600;700&display=swap", matchedMoodSignal: "modern", isDefault: false },
    mainstream: { pairingId: 11, slug: "geometric-modern", name: "Geometric Modern", headingFont: "Outfit", bodyFont: "Work Sans", googleFontsUrl: "https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Work+Sans:wght@300;400;500;600;700&display=swap", matchedMoodSignal: "modern", isDefault: false },
    premium: { pairingId: 11, slug: "geometric-modern", name: "Geometric Modern", headingFont: "Outfit", bodyFont: "Work Sans", googleFontsUrl: "https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Work+Sans:wght@300;400;500;600;700&display=swap", matchedMoodSignal: "modern", isDefault: false },
    luxury: { pairingId: 11, slug: "geometric-modern", name: "Geometric Modern", headingFont: "Outfit", bodyFont: "Work Sans", googleFontsUrl: "https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Work+Sans:wght@300;400;500;600;700&display=swap", matchedMoodSignal: "modern", isDefault: false },
  },
  minimal: {
    accessible: { pairingId: 48, slug: "accessibility-first", name: "Accessibility First", headingFont: "Atkinson Hyperlegible", bodyFont: "Atkinson Hyperlegible", googleFontsUrl: "https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&display=swap", matchedMoodSignal: "minimal", isDefault: false },
    mainstream: { pairingId: 5, slug: "minimal-swiss", name: "Minimal Swiss", headingFont: "Inter", bodyFont: "Inter", googleFontsUrl: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap", matchedMoodSignal: "minimal", isDefault: false },
    premium: { pairingId: 48, slug: "accessibility-first", name: "Accessibility First", headingFont: "Atkinson Hyperlegible", bodyFont: "Atkinson Hyperlegible", googleFontsUrl: "https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&display=swap", matchedMoodSignal: "minimal", isDefault: false },
    luxury: { pairingId: 48, slug: "accessibility-first", name: "Accessibility First", headingFont: "Atkinson Hyperlegible", bodyFont: "Atkinson Hyperlegible", googleFontsUrl: "https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&display=swap", matchedMoodSignal: "minimal", isDefault: false },
  },
};

const GOLDEN_DEFAULT_TYPOGRAPHY: TypographyGolden = {
  pairingId: 5,
  slug: "minimal-swiss",
  name: "Minimal Swiss",
  headingFont: "Inter",
  bodyFont: "Inter",
  googleFontsUrl: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap",
  matchedMoodSignal: null,
  isDefault: true,
};

describe("golden: resolveTypography — all 28 mood/tier combinations", () => {
  for (const [mood, byTier] of Object.entries(GOLDEN_TYPOGRAPHY)) {
    for (const tier of ALL_TIERS) {
      it(`${mood} + ${tier}`, () => {
        const result = resolveTypography({ moodSignals: [mood], positioningTier: tier });
        expect(result).toEqual(byTier[tier]);
      });
    }
  }
});

describe("golden: resolveTypography — no-match neutral default", () => {
  it("empty moodSignals returns the frozen default", () => {
    expect(resolveTypography({ moodSignals: [], positioningTier: "mainstream" })).toEqual(GOLDEN_DEFAULT_TYPOGRAPHY);
  });
});

// Fixed typography input (the no-match default) across all 6, so only the bundle axis varies —
// isolates what each bundle actually changes. surfaceBlur is intentionally absent from every
// entry — see this file's header comment — asserted with toMatchObject, not toEqual, so its
// absence here means "not checked," not "expected to be undefined."
// Task 3.7d — bandMultiplier values regenerated from the real resolver after re-authoring
// sectionRhythmMultiplier (0.9-1.1 -> 0.78-1.25 spread); radius/shadow/borderWeight/focusRingWidth
// unchanged, re-audited against a real render and kept — see style-bundles.json's own per-bundle
// harvestedFrom entries.
const GOLDEN_BUNDLE_TOKENS: Record<string, Record<string, string | number>> = {
  "crisp-formal": { radiusBtn: "2px", radiusCard: "2px", radiusImage: "2px", radiusPill: "999px", shadowCard: "none", shadowElevated: "0 20px 40px -28px rgba(16, 24, 40, 0.16)", borderWeight: "1px", focusRingWidth: "2px", bandMultiplier: 1.25 },
  "warm-approachable": { radiusBtn: "10px", radiusCard: "12px", radiusImage: "14px", radiusPill: "999px", shadowCard: "0 8px 20px -10px rgba(16, 24, 40, 0.14)", shadowElevated: "0 14px 32px -16px rgba(16, 24, 40, 0.18)", borderWeight: "1px", focusRingWidth: "2px", bandMultiplier: 0.88 },
  "trusted-established": { radiusBtn: "3px", radiusCard: "4px", radiusImage: "4px", radiusPill: "999px", shadowCard: "0 12px 28px -14px rgba(16, 24, 40, 0.24)", shadowElevated: "0 22px 46px -20px rgba(16, 24, 40, 0.28)", borderWeight: "1.5px", focusRingWidth: "2px", bandMultiplier: 0.92 },
  "clinical-precise": { radiusBtn: "6px", radiusCard: "6px", radiusImage: "6px", radiusPill: "999px", shadowCard: "0 4px 12px -6px rgba(16, 24, 40, 0.10)", shadowElevated: "0 10px 24px -12px rgba(16, 24, 40, 0.14)", borderWeight: "1px", focusRingWidth: "3px", bandMultiplier: 1.1 },
  "grounded-property": { radiusBtn: "3px", radiusCard: "8px", radiusImage: "8px", radiusPill: "999px", shadowCard: "0 18px 40px -22px rgba(16, 24, 40, 0.20)", shadowElevated: "0 26px 52px -24px rgba(16, 24, 40, 0.24)", borderWeight: "1px", focusRingWidth: "2px", bandMultiplier: 1.2 },
  "structural-industrial": { radiusBtn: "2px", radiusCard: "2px", radiusImage: "2px", radiusPill: "4px", shadowCard: "none", shadowElevated: "none", borderWeight: "1.5px", focusRingWidth: "2px", bandMultiplier: 0.78 },
};

describe("golden: resolveTemplateTokens — each of the six style bundles (blur excluded, see header)", () => {
  const FIXED_TYPOGRAPHY = { moodSignals: [], positioningTier: "mainstream" as const };

  for (const bundle of bundles) {
    it(bundle.id, () => {
      const tokens = resolveTemplateTokens({ typography: FIXED_TYPOGRAPHY, styleBundleId: bundle.id });
      expect(tokens).toMatchObject(GOLDEN_BUNDLE_TOKENS[bundle.id]);
    });
  }

  it("covers exactly the 6 bundles in style-bundles.json — fails loudly if one is added/removed without updating this file", () => {
    expect(bundles.map((b) => b.id).sort()).toEqual(Object.keys(GOLDEN_BUNDLE_TOKENS).sort());
  });
});

describe("golden: resolveTemplateTokens — full default (no input at all, the exact call registry.ts makes)", () => {
  it("resolves to the no-match typography default plus the crisp-formal bundle default", () => {
    const tokens = resolveTemplateTokens();
    expect(tokens).toMatchObject({
      fontBody: '"Inter", ui-sans-serif, system-ui, -apple-system, sans-serif',
      fontHeading: '"Inter", ui-sans-serif, system-ui, -apple-system, sans-serif',
      ...GOLDEN_BUNDLE_TOKENS["crisp-formal"],
    });
  });
});

// Deliberately separate from the golden comparisons above, not silently omitted — see this
// file's header comment for why blur isn't frozen. This proves today's real value directly
// (currently uniform across every bundle) without asserting it's the value future bundles should
// keep.
describe("blur — current value, explicitly not part of the frozen goldens", () => {
  it("every bundle resolves blur to 0px today (2.3-CARRY-FORWARD: not a considered per-bundle choice)", () => {
    for (const bundle of bundles) {
      const tokens = resolveTemplateTokens({ styleBundleId: bundle.id });
      expect(tokens.surfaceBlur).toBe("0px");
    }
  });
});

describe("determinism", () => {
  it("resolveTemplateTokens is deterministic across 20 repeated calls with identical input", () => {
    const input = { typography: { moodSignals: ["elegant"], positioningTier: "luxury" as const }, styleBundleId: "grounded-property" };
    const results = Array.from({ length: 20 }, () => resolveTemplateTokens(input));
    const first = JSON.stringify(results[0]);
    for (const r of results) expect(JSON.stringify(r)).toBe(first);
  });
});
