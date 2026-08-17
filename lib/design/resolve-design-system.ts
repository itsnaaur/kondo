// Task 3.2. Composes the pieces build plan §6.1 names for "design system resolution" that
// actually exist today — palette (buildPalette, Task 1.5), typography (resolveTypography, Task
// 2.2), style bundle (resolveTemplateTokens/resolveStyleBundle, Task 2.4, wrapping Task 2.3's
// data), and pattern eligibility (scorePatternEligibility, Task 3.1) — into one discriminated
// union. §6.1 also names "anti-patterns from the canonical enum"; that enum is out of this
// task's scope (it wasn't in the four modules this task was told to compose, and the canonical
// anti-pattern enum itself hasn't been authored by any prior task) and is not attempted here.
//
// The discriminated union itself, and its reasoning, is build plan §5.5's, restated at the top
// of this file because it is the one thing this task must not get wrong:
//
//   { ok: true;  system: DesignSystem }
// | { ok: false; reason: "no-vertical-match"; partial: NeutralSystem }
//
// null vertical classification is a first-class outcome, never a guess and never a sentinel —
// §5.5's own framing: three of five uupm upstream failures were silent, and the optometry case
// shipped a dark-mode dev-tool palette to an eye clinic while reporting success. A system that
// cannot say "I don't know" ships wrong design at batch scale and never tells you. The TS
// compiler enforces this at every call site: TypeScript will not let a caller read
// `result.system` without first narrowing on `result.ok`, and `ok: false`'s branch has no
// `system` field to (mis)read at all — see this file's own test for a `// @ts-expect-error`
// proving the compiler actually rejects the unnarrowed access, not just a runtime check.
//
// Two things stated rather than assumed, per this task's own instruction:
//
// 1. Do 2.5's goldens extend to cover this file? No — NOT by adding to
// lib/design/resolve-tokens.test.ts, despite that file's own header comment (written at Task
// 2.5 time) anticipating exactly that. resolve-tokens.test.ts freezes a narrower surface than
// this file's actual composition — typography + bundle selection only, nothing about palette,
// pattern eligibility, or vertical classification/the ok:true/ok:false union — and folding four
// more concerns into a file whose own header explicitly scopes itself to two would break that
// file's stated purpose. This task adds a new, separate golden file instead:
// resolve-design-system.test.ts, scoped to what THIS file actually does.
//
// 2. How does this resolver get moodSignals/positioningTier without a real Task 5.4 producer?
// It doesn't invent a substitute source. It takes them as an OPTIONAL `classification` input
// field, defaulting to `{ moodSignals: [], positioningTier: "mainstream" }` when the caller has
// nothing to pass — the exact same default resolveTemplateTokens (Task 2.4) already established
// one level down, threaded through unchanged rather than re-decided here. Every existing caller
// (there are none yet for this new file, but the pattern matters for 5.4's eventual arrival)
// keeps working with no signature change: when 5.4 ships, a caller with real classification data
// passes it through this same field, and this resolver's typography/tokens output changes to
// reflect it automatically, because it was always just forwarding, never fabricating.

import { buildPalette, type Palette } from "@/lib/content/normalize-brand-colors";
import {
  resolveTypography,
  type PositioningTier,
  type ResolveTypographyInput,
  type TypographyResolution,
} from "./resolve-typography";
import { resolveTemplateTokens, resolveStyleBundle, type TemplateTokens, type StyleBundle } from "./resolve-tokens";
import {
  scorePatternEligibility,
  type PatternRequirements,
  type ContentCoverage,
  type EligibilityResult,
} from "./pattern-eligibility";
import type { CapabilitySummary } from "@/lib/content/assign-image-roles";
import { classifyVertical, type Vertical } from "./classify-vertical";

// The full, successful resolution — every piece this task was told to compose, real and
// present. patternEligibility is scored against whatever PatternRequirements the caller passes
// (defaulting to {}, which scorePatternEligibility's own tests already prove always resolves
// "works" or "recommended", never "not-suited" — see pattern-eligibility.test.ts). This is NOT a
// resolved, chosen pattern: no real pattern library exists yet (Task 3.1's own disclosure,
// unchanged by this task), so there is nothing here to select FROM. What this field genuinely
// proves is that the composition wire from a caller's real requirements through to a real
// eligibility verdict works end to end, ready for a real pattern library to drive it once one
// exists — not a placeholder pretending to be a finished feature.
export type DesignSystem = {
  vertical: Vertical;
  palette: Palette;
  typography: TypographyResolution;
  tokens: TemplateTokens;
  styleBundle: StyleBundle;
  patternEligibility: EligibilityResult;
};

// The ok:false partial — everything resolvable WITHOUT a vertical (palette from brand colour
// alone, typography/tokens from classification-or-default, exactly like a DesignSystem's own
// corresponding fields), so a caller with an unmatched business still gets a real, competent,
// neutral design rather than nothing at all. Deliberately has no `vertical` and no
// `patternEligibility` field — both genuinely depend on knowing the vertical (eligibility's
// `industryMatches` argument, omitted here entirely rather than defaulted to false, since there
// is no vertical to have matched or not matched against).
export type NeutralSystem = {
  palette: Palette;
  typography: TypographyResolution;
  tokens: TemplateTokens;
  styleBundle: StyleBundle;
};

export type ResolveDesignSystemResult =
  | { ok: true; system: DesignSystem }
  | { ok: false; reason: "no-vertical-match"; partial: NeutralSystem };

export type ResolveDesignSystemInput = {
  detectedIndustry: string | null;
  brandColors: { hex: string }[];
  content: ContentCoverage;
  images: CapabilitySummary;
  // See header comment item 2 — optional, defaults to the same neutral values
  // resolveTemplateTokens already defaults to internally.
  classification?: { moodSignals?: string[]; positioningTier?: PositioningTier };
  styleBundleId?: string;
  // See DesignSystem's own comment — scored, not used to select a pattern (none exist yet).
  patternRequirements?: PatternRequirements;
};

export function resolveDesignSystem(input: ResolveDesignSystemInput): ResolveDesignSystemResult {
  const typographyInput: ResolveTypographyInput = {
    moodSignals: input.classification?.moodSignals ?? [],
    positioningTier: input.classification?.positioningTier ?? "mainstream",
  };

  // Resolved unconditionally, before the vertical check — both branches of the union need them,
  // and neither actually depends on knowing the vertical (buildPalette reads brand colour,
  // resolveTypography/resolveTemplateTokens read classification/styleBundleId; vertical is a
  // wholly separate axis, per build plan §5.5's own framing of it as a routing concern, not a
  // design-token input).
  const palette = buildPalette(input.brandColors);
  const typography = resolveTypography(typographyInput);
  const tokens = resolveTemplateTokens({ typography: typographyInput, styleBundleId: input.styleBundleId });
  const styleBundle = resolveStyleBundle(input.styleBundleId);

  const vertical = classifyVertical(input.detectedIndustry);
  if (vertical === null) {
    return {
      ok: false,
      reason: "no-vertical-match",
      partial: { palette, typography, tokens, styleBundle },
    };
  }

  const patternEligibility = scorePatternEligibility(input.patternRequirements ?? {}, input.content, input.images);

  return {
    ok: true,
    system: { vertical, palette, typography, tokens, styleBundle, patternEligibility },
  };
}
