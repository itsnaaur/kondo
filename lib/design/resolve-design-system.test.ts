import { describe, it, expect } from "vitest";
import { resolveDesignSystem } from "./resolve-design-system";
import type { ContentCoverage } from "./pattern-eligibility";
import type { CapabilitySummary } from "@/lib/content/assign-image-roles";

// Task 3.2. Scoped to what resolve-design-system.ts and classify-vertical.ts actually do —
// vertical classification, the ok:true/ok:false union, and the real composition of palette/
// typography/tokens/pattern-eligibility. Deliberately NOT re-testing resolveTypography's 28
// mood/tier combinations or resolveTemplateTokens' 6 bundles — those are already frozen by
// resolve-tokens.test.ts (Task 2.5) and this file would only be duplicating them with extra
// steps. See resolve-design-system.ts's own header comment for why this is a new file rather
// than an extension of resolve-tokens.test.ts.

const EMPTY_CONTENT: ContentCoverage = {
  servicesCount: 0,
  testimonialsCount: 0,
  hasPhone: false,
  hasPricing: false,
  hasCredentials: false,
};

const NO_IMAGES: CapabilitySummary = {
  heroGrade: 0,
  sectionBackgroundGrade: 0,
  galleryGrade: 0,
  teamGrade: 0,
  featureInlineGrade: 0,
  unusable: 0,
  logoPresent: false,
};

const RICH_IMAGES: CapabilitySummary = {
  heroGrade: 1,
  sectionBackgroundGrade: 2,
  galleryGrade: 3,
  teamGrade: 2,
  featureInlineGrade: 1,
  unusable: 0,
  logoPresent: true,
};

const BASE_INPUT = {
  brandColors: [{ hex: "#2563eb" }],
  content: EMPTY_CONTENT,
  images: NO_IMAGES,
};

describe("resolveDesignSystem — the done-when: a deliberately unmatched business returns ok: false, and the type system forces callers to handle it", () => {
  it("a business whose detectedIndustry matches nothing in classify-vertical.ts's table resolves ok: false, reason 'no-vertical-match'", () => {
    const result = resolveDesignSystem({ ...BASE_INPUT, detectedIndustry: "artisanal candle subscription box curation" });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected ok: false");
    expect(result.reason).toBe("no-vertical-match");
    // The partial system is still real, not a stub — same buildPalette/resolveTypography/
    // resolveTemplateTokens/resolveStyleBundle calls a successful resolution would have made.
    expect(result.partial.palette.derivedFrom).toBe("brand");
    expect(result.partial.typography.pairingId).toBeTypeOf("number");
    expect(result.partial.tokens.fontBody).toContain("Inter");
    expect(result.partial.styleBundle.id).toBe("crisp-formal");
  });

  it("the type system rejects reading .system off an unnarrowed result — proves the union, not just the runtime branch", () => {
    const result = resolveDesignSystem({ ...BASE_INPUT, detectedIndustry: "artisanal candle subscription box curation" });
    // @ts-expect-error — `system` does not exist on the `{ ok: false }` branch of the union, and
    // TypeScript cannot know which branch `result` is without an `if (result.ok)` narrowing
    // first. If this line ever stops erroring, the discriminated union has been weakened
    // (e.g. `system` made optional on both branches instead of branch-exclusive) and this
    // test's own compile step (tsc --noEmit) will fail.
    const _unreachable = result.system;
    void _unreachable;
  });

  it("null detectedIndustry resolves ok: false the same way as unmatched text — both are 'nothing to classify', not different cases", () => {
    const result = resolveDesignSystem({ ...BASE_INPUT, detectedIndustry: null });
    expect(result.ok).toBe(false);
  });

  it("empty-string detectedIndustry resolves ok: false, same as null", () => {
    const result = resolveDesignSystem({ ...BASE_INPUT, detectedIndustry: "   " });
    expect(result.ok).toBe(false);
  });
});

describe("resolveDesignSystem — a matched business returns ok: true with every composed piece real", () => {
  it("a dental clinic resolves ok: true, vertical medical-dental, with a real patternEligibility verdict", () => {
    const result = resolveDesignSystem({
      ...BASE_INPUT,
      detectedIndustry: "General and cosmetic dental clinic",
      images: RICH_IMAGES,
      patternRequirements: { heroImage: true },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok: true");
    expect(result.system.vertical).toBe("medical-dental");
    expect(result.system.palette.derivedFrom).toBe("brand");
    expect(result.system.typography.pairingId).toBeTypeOf("number");
    expect(result.system.tokens.fontBody).toContain("Inter");
    expect(result.system.styleBundle.id).toBe("crisp-formal");
    // RICH_IMAGES has heroGrade: 1, so requiring heroImage: true is satisfied.
    expect(result.system.patternEligibility.status).not.toBe("not-suited");
  });

  it("patternEligibility genuinely reflects the caller's real requirements+content+images — not-suited when unmet", () => {
    const result = resolveDesignSystem({
      ...BASE_INPUT,
      detectedIndustry: "Family law firm",
      images: NO_IMAGES,
      patternRequirements: { heroImage: true },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok: true");
    expect(result.system.vertical).toBe("legal");
    // NO_IMAGES has heroGrade: 0, so requiring heroImage: true is unmet — this is the same
    // Allen Evans/BC Security routing Task 3.1 established: no hero-grade image means a
    // hero-image-requiring pattern is not-suited, full stop, regardless of vertical match.
    expect(result.system.patternEligibility.status).toBe("not-suited");
    expect(result.system.patternEligibility.reasons.some((r) => r.includes("hero"))).toBe(true);
  });

  it("no patternRequirements passed defaults to {} — always works/recommended, never not-suited, matching scorePatternEligibility's own contract", () => {
    const result = resolveDesignSystem({ ...BASE_INPUT, detectedIndustry: "Accounting and bookkeeping services" });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok: true");
    expect(result.system.vertical).toBe("financial-professional-services");
    expect(result.system.patternEligibility.status).not.toBe("not-suited");
  });
});

describe("resolveDesignSystem — classification defaulting (item 2 from this task's own log entry)", () => {
  it("omitting classification entirely resolves the same typography as resolveTemplateTokens' own no-input default (Minimal Swiss, mainstream)", () => {
    const result = resolveDesignSystem({ ...BASE_INPUT, detectedIndustry: "Dental clinic" });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok: true");
    expect(result.system.typography.slug).toBe("minimal-swiss");
    expect(result.system.typography.isDefault).toBe(true);
  });

  it("a real classification, once passed, changes the resolved typography exactly as resolveTypography would alone", () => {
    const result = resolveDesignSystem({
      ...BASE_INPUT,
      detectedIndustry: "Dental clinic",
      classification: { moodSignals: ["friendly"], positioningTier: "mainstream" },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok: true");
    expect(result.system.typography.slug).toBe("medical-clean");
    expect(result.system.typography.matchedMoodSignal).toBe("friendly");
  });
});

describe("classifyVertical priority order and null-handling, exercised through the resolver", () => {
  it("text matching multiple entries' keywords resolves to whichever VERTICAL_TABLE entry is listed first", () => {
    // "legal" (legal, listed first) and "accounting" (financial-professional-services, listed
    // second) both appear as real substrings — legal wins, by table order, not by any
    // specificity judgement. ("law and accounting firm" was tried first and rejected as a test
    // phrase: it doesn't actually contain the substring "law firm", only "accounting", so it
    // wasn't exercising the tie-break at all — caught by running this test, not assumed correct.)
    const result = resolveDesignSystem({ ...BASE_INPUT, detectedIndustry: "combined legal and accounting firm" });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok: true");
    expect(result.system.vertical).toBe("legal");
  });

  it("matching is case-insensitive and substring-based, not exact-token", () => {
    const result = resolveDesignSystem({ ...BASE_INPUT, detectedIndustry: "PREMIUM WATERPROOFING CONTRACTOR" });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok: true");
    expect(result.system.vertical).toBe("trades-construction");
  });
});
