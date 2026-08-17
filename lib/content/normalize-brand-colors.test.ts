import { describe, test, expect } from "vitest";
import { buildPalette } from "./normalize-brand-colors";
import { pickOnColor } from "@/lib/design/contrast";

// Independent of normalize-brand-colors.ts's own hslStringToHex — deliberately not imported
// and reused, so a bug in that helper wouldn't be hidden by the test using the same buggy
// conversion. Parses buildPalette's own hsl() output format exactly ("hsl(H S% L%)", integers
// already rounded).
function hslParts(value: string): { h: number; s: number; l: number } {
  const match = /^hsl\((\d+) (\d+)% (\d+)%\)$/.exec(value);
  if (!match) throw new Error(`not an hsl() string: ${value}`);
  return { h: Number(match[1]), s: Number(match[2]), l: Number(match[3]) };
}

function hslStringToHex(value: string): string {
  const { h, s, l } = hslParts(value);
  const S = s / 100, L = l / 100;
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

// Golden values captured from buildPalette as it existed immediately before Task 1.5 (git
// HEAD at the time this test was written — see docs/kondo-v2-execution.md's 1.5 entry for how
// they were captured: git show HEAD:lib/content/normalize-brand-colors.ts against a copy of
// the pre-edit file, run against these exact inputs). If any of these 11 fields (the 10
// original roles plus derivedFrom) ever changes for the same input, that is a real regression
// in the original derivation — the fix is to the code, not to these golden values.
//
// ONE EXCEPTION, REGENERATED IN TASK 1.6b, NOT SILENTLY UPDATED: greenClinic's `accent`
// changed from "hsl(161 58% 33%)" to "hsl(161 58% 31%)". This is a real, intended behaviour
// change, not a golden-test drift to paper over — 1.6b retargeted the AA-deepening loop from
// pure white to `mist` (1.6's validation gate found "accent on mist" failing AA on 41/191 real
// corpus primaries; #059669 is one of them), so #059669's accent now deepens one further -2
// step to clear the stricter, more realistic bar. Every other field, for every fixture, is
// unchanged — confirmed by re-running buildPalette against all 6 fixtures and diffing before
// regenerating this one value. See docs/kondo-v2-execution.md's 1.6b entry for the full
// before/after comparison across affected corpus palettes, not just this one fixture.
const GOLDEN: Record<string, { input: { hex: string }[]; original: Record<string, string> }> = {
  blueTech: {
    input: [{ hex: "#2563EB" }],
    original: {
      accent: "hsl(221 58% 41%)",
      accentInk: "#ffffff",
      accentSoft: "hsl(221 42% 95%)",
      deep: "hsl(221 28% 9%)",
      deepSoft: "hsl(221 20% 15%)",
      mist: "hsl(221 24% 97%)",
      ink: "hsl(221 12% 11%)",
      inkMuted: "hsl(221 8% 42%)",
      line: "hsl(221 14% 88%)",
      paper: "#ffffff",
      derivedFrom: "brand",
    },
  },
  greenClinic: {
    // Exercises the deepening loop (a high-luminance hue at the default accentL=41 fails AA
    // against the loop's target and accentL gets pulled down until it clears). accent's value
    // below was regenerated in Task 1.6b — see the GOLDEN comment above.
    input: [{ hex: "#059669" }],
    original: {
      accent: "hsl(161 58% 31%)",
      accentInk: "#ffffff",
      accentSoft: "hsl(161 42% 95%)",
      deep: "hsl(161 28% 9%)",
      deepSoft: "hsl(161 20% 15%)",
      mist: "hsl(161 24% 97%)",
      ink: "hsl(161 12% 11%)",
      inkMuted: "hsl(161 8% 42%)",
      line: "hsl(161 14% 88%)",
      paper: "#ffffff",
      derivedFrom: "brand",
    },
  },
  mixedWithNeutral: {
    // Exercises pickHue skipping a neutral candidate (#888888) in favour of a usable one.
    input: [{ hex: "#888888" }, { hex: "#DC2626" }],
    original: {
      accent: "hsl(0 58% 41%)",
      accentInk: "#ffffff",
      accentSoft: "hsl(0 42% 95%)",
      deep: "hsl(0 28% 9%)",
      deepSoft: "hsl(0 20% 15%)",
      mist: "hsl(0 24% 97%)",
      ink: "hsl(0 12% 11%)",
      inkMuted: "hsl(0 8% 42%)",
      line: "hsl(0 14% 88%)",
      paper: "#ffffff",
      derivedFrom: "brand",
    },
  },
  yellowish: {
    // Exercises the isYellowish branch (accentL starts at 32, not 41; accentS at 62, not 58).
    input: [{ hex: "#EAB308" }],
    original: {
      accent: "hsl(45 62% 32%)",
      accentInk: "#ffffff",
      accentSoft: "hsl(45 42% 95%)",
      deep: "hsl(45 28% 9%)",
      deepSoft: "hsl(45 20% 15%)",
      mist: "hsl(45 24% 97%)",
      ink: "hsl(45 12% 11%)",
      inkMuted: "hsl(45 8% 42%)",
      line: "hsl(45 14% 88%)",
      paper: "#ffffff",
      derivedFrom: "brand",
    },
  },
  nothingUsable: {
    // A single neutral candidate — pickHue finds nothing and falls back.
    input: [{ hex: "#888888" }],
    original: {
      accent: "hsl(222 58% 41%)",
      accentInk: "#ffffff",
      accentSoft: "hsl(222 42% 95%)",
      deep: "hsl(222 28% 9%)",
      deepSoft: "hsl(222 20% 15%)",
      mist: "hsl(222 24% 97%)",
      ink: "hsl(222 12% 11%)",
      inkMuted: "hsl(222 8% 42%)",
      line: "hsl(222 14% 88%)",
      paper: "#ffffff",
      derivedFrom: "fallback",
    },
  },
  empty: {
    input: [],
    original: {
      accent: "hsl(222 58% 41%)",
      accentInk: "#ffffff",
      accentSoft: "hsl(222 42% 95%)",
      deep: "hsl(222 28% 9%)",
      deepSoft: "hsl(222 20% 15%)",
      mist: "hsl(222 24% 97%)",
      ink: "hsl(222 12% 11%)",
      inkMuted: "hsl(222 8% 42%)",
      line: "hsl(222 14% 88%)",
      paper: "#ffffff",
      derivedFrom: "fallback",
    },
  },
};

describe("buildPalette — golden: original 10 roles + derivedFrom are byte-identical", () => {
  for (const [name, { input, original }] of Object.entries(GOLDEN)) {
    test(name, () => {
      const result = buildPalette(input);
      for (const [key, value] of Object.entries(original)) {
        expect(result[key as keyof typeof result]).toBe(value);
      }
    });
  }
});

describe("buildPalette — Task 1.5/1.6a's five new roles are present", () => {
  for (const [name, { input }] of Object.entries(GOLDEN)) {
    test(`${name}: secondary/onSecondary/ring/destructive/onDestructive are all set`, () => {
      const result = buildPalette(input);
      expect(typeof result.secondary).toBe("string");
      expect(typeof result.onSecondary).toBe("string");
      expect(typeof result.ring).toBe("string");
      expect(typeof result.destructive).toBe("string");
      expect(typeof result.onDestructive).toBe("string");
    });
  }

  test("ring always equals accent — the uupm audit's majority (161/192) invariant", () => {
    for (const { input } of Object.values(GOLDEN)) {
      const result = buildPalette(input);
      expect(result.ring).toBe(result.accent);
    }
  });

  test("secondary is a tint of accent — same hue and saturation, strictly lighter", () => {
    for (const { input } of Object.values(GOLDEN)) {
      const result = buildPalette(input);
      const accent = hslParts(result.accent);
      const secondary = hslParts(result.secondary);
      expect(secondary.h).toBe(accent.h);
      expect(secondary.s).toBe(accent.s);
      expect(secondary.l).toBeGreaterThan(accent.l);
    }
  });

  test("destructive is a fixed value, not derived from the brand hue", () => {
    const destructiveValues = new Set(Object.values(GOLDEN).map(({ input }) => buildPalette(input).destructive));
    expect(destructiveValues.size).toBe(1);
    expect([...destructiveValues][0]).toBe("#dc2626");
  });

  test("onDestructive is exactly pickOnColor(destructive) — Task 1.3's contrast.ts wired in", () => {
    const result = buildPalette(GOLDEN.blueTech.input);
    expect(result.onDestructive).toBe(pickOnColor(result.destructive));
  });

  test("onSecondary is exactly pickOnColor(secondary), not accentInk — Task 1.6a", () => {
    // 1.6's validation gate found accentInk-on-secondary failing AA on 62/191 real corpus
    // primaries, since accentInk is chosen for accent's lightness and secondary is
    // deliberately lighter. onSecondary must be its own pickOnColor call, not a copy of
    // accentInk — this test would pass even with a copy-paste bug (accentInk happens to equal
    // pickOnColor(accent), a different call) unless it specifically compares against
    // secondary, which it does below.
    for (const { input } of Object.values(GOLDEN)) {
      const result = buildPalette(input);
      expect(result.onSecondary).toBe(pickOnColor(hslStringToHex(result.secondary)));
    }
  });
});

describe("buildPalette — Princeton Dental carry-forward", () => {
  // The 1.2c carry-forward note flagged rankBrandColorSources' logo-tier output (#002000, a
  // near-black green) as a low-confidence value that might one day reach pickHue once a
  // future task wires that source in. This isn't wired in by Task 1.5 — buildPalette's input
  // is unchanged (still `{hex}[]` from the existing extraction pipeline) — but the question is
  // answered here because pickHue's own existing lightness filter (l < 26) already rejects a
  // colour this dark before hue-selection ever runs, independent of anything Task 1.5 added.
  test("a near-black candidate like #002000 falls back rather than deriving a near-black-hue palette", () => {
    const result = buildPalette([{ hex: "#002000" }]);
    expect(result.derivedFrom).toBe("fallback");
  });
});
