import { describe, test, expect } from "vitest";
import { contrastRatio, pickOnColor } from "./contrast";

// Reference pairs sourced externally, not values this implementation computed itself and
// then asserted against — per Task 1.3's own instruction: if a reference pair disagrees with
// this implementation, the implementation is wrong, not the reference.
//
// Sources:
// - W3C WAI wiki, "Relative Luminance" (https://www.w3.org/WAI/GL/wiki/Relative_luminance)
//   and the W3C's "Understanding Success Criterion 1.4.3" (contrast-minimum.html): the
//   formula itself, and the definitional identities that black-on-white is the maximum
//   possible ratio (21:1) and identical colours are the minimum (1:1) — contrast ratios
//   "range from 1 to 21" per the WCAG 2.1 spec's own stated bounds.
// - WebAIM, "Contrast and Color Accessibility" (https://webaim.org/articles/contrast/):
//   "#777777 — a commonly-used shade of gray with a 4.47:1 contrast ratio — does not meet
//   this requirement [4.5:1]" (quoted directly against white), plus pure red (#FF0000) "4:1"
//   and pure blue (#0000FF) "8.6:1" against white, both stated to one decimal there so
//   checked to the same precision here.
//
// #777777's exact figure is checked to a looser tolerance than the other pairs, and here's
// why: WebAIM's own prose says 4.47:1, but this implementation computes 4.478 (≈4.48), and a
// second, independent source (github.com/w3c/wcag issue #200, "Rounding and Color contrast")
// confirms this isn't a bug — it explicitly documents #777777 "is evaluated as 4.5:1 (pass)
// on some analyzer tools and 4.48:1 (fail) on others," i.e. correct implementations
// genuinely disagree at the second decimal depending on rounding mode, and 4.48 is one of the
// values other correct tools produce, not an outlier. What every source agrees on — the fact
// WebAIM's example was actually illustrating — is that it fails the 4.5:1 AA minimum; that's
// asserted as its own strict test below, not folded into the precision tolerance.

describe("contrastRatio — published reference pairs", () => {
  test("black on white is the maximum possible ratio, 21:1", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 5);
  });

  test("is symmetric in its arguments — white on black is also 21:1", () => {
    expect(contrastRatio("#FFFFFF", "#000000")).toBeCloseTo(21, 5);
  });

  test("identical colours are the minimum possible ratio, 1:1", () => {
    expect(contrastRatio("#3366CC", "#3366CC")).toBeCloseTo(1, 5);
  });

  test("#777777 on white is ~4.47-4.48:1, per WebAIM and the documented rounding dispute at that boundary", () => {
    expect(contrastRatio("#777777", "#FFFFFF")).toBeCloseTo(4.47, 1);
  });

  test("#777777 fails the 4.5:1 AA minimum by construction, not by rounding it up", () => {
    expect(contrastRatio("#777777", "#FFFFFF")).toBeLessThan(4.5);
  });

  test("pure red on white is approximately 4:1, per WebAIM", () => {
    expect(contrastRatio("#FF0000", "#FFFFFF")).toBeCloseTo(4, 1);
  });

  test("pure blue on white is approximately 8.6:1, per WebAIM", () => {
    expect(contrastRatio("#0000FF", "#FFFFFF")).toBeCloseTo(8.6, 1);
  });
});

describe("pickOnColor", () => {
  test("white background picks black — the WCAG-maximal 21:1 pairing", () => {
    expect(pickOnColor("#FFFFFF")).toBe("#000000");
  });

  test("black background picks white — the WCAG-maximal 21:1 pairing", () => {
    expect(pickOnColor("#000000")).toBe("#FFFFFF");
  });

  // Property test, not a magic-number assertion: pickOnColor's contract is "return whichever
  // of the three candidates has the highest contrastRatio against this background" — checked
  // here by re-deriving that maximum independently for a spread of backgrounds and comparing,
  // rather than hard-coding which candidate wins for each one.
  test("always returns the candidate with the highest contrast ratio against the background", () => {
    const candidates = ["#FFFFFF", "#000000", "#0F172A"];
    const backgrounds = [
      "#FFFFFF", "#000000", "#0F172A", "#808080", "#FF0000", "#00FF00", "#0000FF",
      "#767676", "#F5F5F5", "#1E293B", "#E0E0E0", "#4B5563",
    ];
    for (const background of backgrounds) {
      const picked = pickOnColor(background);
      const pickedRatio = contrastRatio(background, picked);
      for (const candidate of candidates) {
        expect(pickedRatio).toBeGreaterThanOrEqual(contrastRatio(background, candidate));
      }
    }
  });
});
