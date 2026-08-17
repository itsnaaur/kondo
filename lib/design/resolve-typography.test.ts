import { describe, it, expect } from "vitest";
import { resolveTypography, listTableEntries, type PositioningTier } from "./resolve-typography";
import typographyData from "./data/typography.json";

const ALL_TIERS: PositioningTier[] = ["accessible", "mainstream", "premium", "luxury"];

describe("resolveTypography — determinism (this task's own done-when)", () => {
  it("returns identical output across 100 repeated calls with identical input", () => {
    const input = { moodSignals: ["professional", "modern"], positioningTier: "mainstream" as const };
    const results = Array.from({ length: 100 }, () => resolveTypography(input));
    const first = JSON.stringify(results[0]);
    for (const r of results) {
      expect(JSON.stringify(r)).toBe(first);
    }
    // Not just "all equal to each other" — pinned to the one real, verified answer, so a change
    // to TABLE or MOOD_SIGNAL_PRIORITY that still happens to be internally consistent (100
    // identical results) but wrong gets caught here too.
    expect(results[0].slug).toBe("corporate-trust");
  });

  it("is deterministic across 100 calls for a tier that forces the tie-break to actually run", () => {
    // professional matches 5 of the 13 TABLE entries; premium narrows that to exactly two
    // (legal-professional, financial-trust) — a real tie the slug sort has to resolve every
    // single call, not just once.
    const input = { moodSignals: ["professional"], positioningTier: "premium" as const };
    const results = Array.from({ length: 100 }, () => resolveTypography(input));
    for (const r of results) expect(r.slug).toBe("financial-trust");
  });

  it("is deterministic for the no-match default across 100 calls", () => {
    const input = { moodSignals: ["nonsense-token-not-in-any-table-entry"], positioningTier: "luxury" as const };
    const results = Array.from({ length: 100 }, () => resolveTypography(input));
    for (const r of results) {
      expect(r.slug).toBe("minimal-swiss");
      expect(r.isDefault).toBe(true);
      expect(r.matchedMoodSignal).toBeNull();
    }
  });
});

describe("resolveTypography — mood/tier coverage (every combination TABLE supports, real verified output)", () => {
  // Every value here was produced by actually running the resolver (scripts/_tmp-2.2-probe.ts,
  // deleted after use — see this task's log entry) and read off directly, not hand-predicted
  // from the table and assumed correct.
  const EXPECTED: Record<string, Record<PositioningTier, string>> = {
    professional: { accessible: "corporate-trust", mainstream: "corporate-trust", premium: "financial-trust", luxury: "corporate-trust" },
    traditional: { accessible: "legal-professional", mainstream: "legal-professional", premium: "legal-professional", luxury: "real-estate-luxury" },
    elegant: { accessible: "classic-elegant", mainstream: "classic-elegant", premium: "classic-elegant", luxury: "classic-elegant" },
    bold: { accessible: "bold-statement", mainstream: "bold-statement", premium: "bold-statement", luxury: "bold-statement" },
    friendly: { accessible: "accessibility-first", mainstream: "medical-clean", premium: "accessibility-first", luxury: "accessibility-first" },
    modern: { accessible: "modern-professional", mainstream: "geometric-modern", premium: "geometric-modern", luxury: "geometric-modern" },
    minimal: { accessible: "accessibility-first", mainstream: "minimal-swiss", premium: "accessibility-first", luxury: "accessibility-first" },
  };

  for (const [mood, byTier] of Object.entries(EXPECTED)) {
    for (const tier of ALL_TIERS) {
      it(`${mood} + ${tier} -> ${byTier[tier]}`, () => {
        const result = resolveTypography({ moodSignals: [mood], positioningTier: tier });
        expect(result.slug).toBe(byTier[tier]);
        expect(result.isDefault).toBe(false);
        expect(result.matchedMoodSignal).toBe(mood);
      });
    }
  }

  it("prefers a tier-matching entry over a mood-only match when both exist in the pool", () => {
    // "professional" alone matches 5 entries; only legal-professional and financial-trust
    // declare "premium" — the resolver must narrow to that pair, not just take the whole pool.
    const result = resolveTypography({ moodSignals: ["professional"], positioningTier: "premium" });
    expect(["legal-professional", "financial-trust"]).not.toContain("corporate-trust"); // sanity on the fixture itself
    expect(result.slug).toBe("financial-trust");
  });

  it("falls through to the full mood pool when no entry for that mood covers the requested tier", () => {
    // "elegant" entries (classic-elegant: luxury/premium; real-estate-luxury: luxury) declare
    // no "accessible"/"mainstream" tier at all — every elegant+{accessible,mainstream} case above
    // still resolves to classic-elegant (via slug tie-break across the full elegant pool), not to
    // the no-match default. Confirms "mood match beats tier match" is real, not just documented.
    const accessible = resolveTypography({ moodSignals: ["elegant"], positioningTier: "accessible" });
    const mainstream = resolveTypography({ moodSignals: ["elegant"], positioningTier: "mainstream" });
    expect(accessible.slug).toBe("classic-elegant");
    expect(mainstream.slug).toBe("classic-elegant");
    expect(accessible.isDefault).toBe(false);
  });
});

describe("resolveTypography — mood signal priority order", () => {
  it("resolves via the higher-priority signal when the input contains more than one recognised token", () => {
    // MOOD_SIGNAL_PRIORITY ranks "professional" above "modern" — an input naming both should
    // resolve as if only "professional" were present.
    const both = resolveTypography({ moodSignals: ["modern", "professional"], positioningTier: "mainstream" });
    const professionalOnly = resolveTypography({ moodSignals: ["professional"], positioningTier: "mainstream" });
    expect(both.slug).toBe(professionalOnly.slug);
    expect(both.matchedMoodSignal).toBe("professional");
  });

  it("is insensitive to the order moodSignals[] happens to list its entries in", () => {
    const forward = resolveTypography({ moodSignals: ["modern", "professional"], positioningTier: "mainstream" });
    const reversed = resolveTypography({ moodSignals: ["professional", "modern"], positioningTier: "mainstream" });
    expect(forward.slug).toBe(reversed.slug);
    expect(forward.matchedMoodSignal).toBe(reversed.matchedMoodSignal);
  });

  it("matches case-insensitively and trims whitespace, since 5.4's real output shape is unknown", () => {
    const messy = resolveTypography({ moodSignals: ["  Professional  ", "MODERN"], positioningTier: "mainstream" });
    expect(messy.slug).toBe("corporate-trust");
    expect(messy.matchedMoodSignal).toBe("professional");
  });
});

describe("resolveTypography — no-match default", () => {
  it("returns the neutral default when moodSignals is empty", () => {
    const result = resolveTypography({ moodSignals: [], positioningTier: "premium" });
    expect(result.slug).toBe("minimal-swiss");
    expect(result.isDefault).toBe(true);
  });

  it("returns the neutral default when every signal is unrecognised", () => {
    const result = resolveTypography({ moodSignals: ["synergistic", "disruptive"], positioningTier: "luxury" });
    expect(result.slug).toBe("minimal-swiss");
    expect(result.isDefault).toBe(true);
    expect(result.matchedMoodSignal).toBeNull();
  });

  it("the default pairing is single-family (Inter/Inter) — the least that can go visually wrong", () => {
    const result = resolveTypography({ moodSignals: [], positioningTier: "accessible" });
    expect(result.headingFont).toBe("Inter");
    expect(result.bodyFont).toBe("Inter");
  });
});

describe("TABLE integrity", () => {
  it("every table entry references a pairing id that actually exists in typography.json", () => {
    const validIds = new Set((typographyData as { id: number }[]).map((p) => p.id));
    for (const entry of listTableEntries()) {
      expect(validIds.has(entry.pairingId)).toBe(true);
    }
  });

  it("every table entry has a unique slug", () => {
    const slugs = listTableEntries().map((e) => e.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("covers exactly 13 pairings, as decided and stated in this task's log entry", () => {
    expect(listTableEntries().length).toBe(13);
  });
});
