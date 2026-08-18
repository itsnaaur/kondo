import { describe, it, expect } from "vitest";
import { generateStylesheet, CLASS_VOCABULARY, type StylesheetInput } from "./generate-stylesheet";
import { buildPalette } from "@/lib/content/normalize-brand-colors";
import { resolveTemplateTokens } from "./resolve-tokens";
import { VALIDATED_TEXT_PAIRS, paletteColorToHex } from "./validated-text-pairs";
import { contrastRatio } from "./contrast";

// Task 3.3. A hue derived from a real, saturated, mid-lightness brand colour (clears
// pickHue's own s>=25/26<=l<=82 gates), so this exercises the same derivation path any real
// non-rejected client hits — not just the fallback slate-indigo.
const REAL_HUE_INPUT: StylesheetInput = {
  palette: buildPalette([{ hex: "#1d4ed8" }]),
  tokens: resolveTemplateTokens(),
  googleFontsUrl: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap",
};

// buildPalette([]) — the fallback path (pickHue finds nothing usable), same as what BC
// Security/Propell currently resolve to per this task's own pickHue carry-forward finding.
const FALLBACK_INPUT: StylesheetInput = {
  palette: buildPalette([]),
  tokens: resolveTemplateTokens({ styleBundleId: "trusted-established" }),
  googleFontsUrl: "https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;500;600;700&family=Lato:wght@300;400;700&display=swap",
};

describe("generateStylesheet — determinism (part of this task's own done-when)", () => {
  it("byte-identical output across 20 repeated calls with identical input", () => {
    const results = Array.from({ length: 20 }, () => generateStylesheet(REAL_HUE_INPUT));
    const first = results[0];
    for (const r of results) expect(r).toBe(first);
  });

  it("different inputs (different hue, different bundle) produce different output", () => {
    expect(generateStylesheet(REAL_HUE_INPUT)).not.toBe(generateStylesheet(FALLBACK_INPUT));
  });
});

// Every `color:` declaration in the generated CSS, and the selector of the rule it's declared
// in — a direct, structural test of constraint 1 (contrast guaranteed by construction), not
// just a claim in a comment. Parses `selector { ...declarations... }` blocks with a simple
// regex (the generated CSS is always this shape — no nested @media/@supports blocks, no
// pseudo-class-only rules with braces inside strings) and checks every selector that sets
// `color` is one of the two safe shapes constraint 1 describes.
function colorDeclaringSelectors(css: string): string[] {
  // Strip /* ... */ comments first — the naive rule regex below has no concept of comments,
  // so an uncommented CSS comment immediately before a selector was being swallowed into the
  // "selector" capture group (caught by running this test, not assumed correct on read).
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const selectors: string[] = [];
  const ruleRegex = /([^{}]+)\{([^{}]*)\}/g;
  let match: RegExpExecArray | null;
  while ((match = ruleRegex.exec(withoutComments)) !== null) {
    const [, selectorGroup, body] = match;
    if (/(?<![-a-z])color\s*:/.test(body)) {
      // A rule may declare a comma-separated selector list (e.g. the three .text-muted
      // selectors share one rule body) — each branch needs checking independently, not the
      // whole joined string as if it were one selector.
      for (const selector of selectorGroup.split(",")) selectors.push(selector.trim().replace(/\s+/g, " "));
    }
  }
  return selectors;
}

// Shape (a): a bare `.surface-*` selector, OR `.btn--solid`/`.btn--secondary` (both set
// background+color together, self-contained regardless of ambient surface — the button variant
// equivalent of a surface).
// Shape (b): `.surface-X .text-muted`/`.text-accent`/`.btn--outline` (nested, scoped to a
// validated surface). `a { color: inherit }` and `body` (checked separately below) are a third,
// trivially-safe shape — they declare no new colour pairing, just the page's own default.
const SAFE_UNSCOPED_SELECTOR = /^(\.surface-[a-z-]+|\.btn--solid|\.btn--secondary)$/;
const SAFE_NESTED_SELECTOR = /^\.surface-[a-z-]+ \.(text-muted|text-accent|btn--outline)$/;

describe("generateStylesheet — contrast guaranteed by construction (structural check on the actual CSS text)", () => {
  const css = generateStylesheet(REAL_HUE_INPUT);
  const selectors = colorDeclaringSelectors(css);

  it("every rule that sets `color` uses one of the two documented safe shapes", () => {
    for (const selector of selectors) {
      if (selector === "a") continue; // color: inherit — declares no new colour
      // `body` is the page-level default surface — background: paper, color: ink, the exact
      // same pair .surface-paper declares. A third, always-safe shape, not a gap in the rule.
      if (selector === "body") continue;
      const isSafe = SAFE_UNSCOPED_SELECTOR.test(selector) || SAFE_NESTED_SELECTOR.test(selector);
      expect(isSafe, `unexpected colour-declaring selector: "${selector}"`).toBe(true);
    }
  });

  it("no bare, unscoped colour utility exists (e.g. a top-level .text-accent with no .surface-mist ancestor)", () => {
    expect(css).not.toMatch(/(?<!\.surface-mist )\.text-accent\s*\{[^}]*color:/);
    expect(css).not.toMatch(/^\.text-muted\s*\{/m);
  });
});

// The load-bearing correspondence: every (fg, bg) pair this module's CSS actually emits a
// `color`+`background` rule for must be exactly one of Task 1.6/1.6a/1.6b's 12 validated
// pairs — no more, no fewer. Hand-derived from reading generate-stylesheet.ts's own rules (see
// this task's log entry for the full mapping), then cross-checked here against the canonical
// VALIDATED_TEXT_PAIRS list itself, so the two can never silently drift apart.
const EMITTED_PAIRS: { fg: string; bg: string }[] = [
  { fg: "ink", bg: "paper" }, // .surface-paper (also body's own default)
  { fg: "ink", bg: "mist" }, // .surface-mist
  { fg: "ink", bg: "accentSoft" }, // .surface-accent-soft
  { fg: "accentInk", bg: "accent" }, // .surface-accent / .btn--solid
  { fg: "onSecondary", bg: "secondary" }, // .surface-secondary / .btn--secondary
  { fg: "paper", bg: "deep" }, // .surface-deep
  { fg: "paper", bg: "deepSoft" }, // .surface-deep-soft
  { fg: "onDestructive", bg: "destructive" }, // .surface-destructive
  { fg: "inkMuted", bg: "paper" }, // .surface-paper .text-muted
  { fg: "inkMuted", bg: "mist" }, // .surface-mist .text-muted
  { fg: "inkMuted", bg: "accentSoft" }, // .surface-accent-soft .text-muted
  { fg: "accent", bg: "mist" }, // .surface-mist .text-accent / .surface-mist .btn--outline
];

describe("generateStylesheet — exactly the 12 validated pairs are emitted, no more, no fewer", () => {
  it("EMITTED_PAIRS is exactly VALIDATED_TEXT_PAIRS, as sets", () => {
    const emittedKeys = EMITTED_PAIRS.map((p) => `${p.fg}/${p.bg}`).sort();
    const validatedKeys = VALIDATED_TEXT_PAIRS.map((p) => `${p.fg}/${p.bg}`).sort();
    expect(emittedKeys).toEqual(validatedKeys);
  });

  it("every emitted pair is a real, currently-AA-passing pair for a real derived palette (not assumed — computed)", () => {
    const p = REAL_HUE_INPUT.palette;
    for (const { fg, bg } of EMITTED_PAIRS) {
      const fgHex = paletteColorToHex((p as unknown as Record<string, string>)[fg]);
      const bgHex = paletteColorToHex((p as unknown as Record<string, string>)[bg]);
      const ratio = contrastRatio(fgHex, bgHex);
      expect(ratio, `${fg} on ${bg}: ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("same check holds for the fallback (no-usable-brand-colour) palette", () => {
    const p = FALLBACK_INPUT.palette;
    for (const { fg, bg } of EMITTED_PAIRS) {
      const fgHex = paletteColorToHex((p as unknown as Record<string, string>)[fg]);
      const bgHex = paletteColorToHex((p as unknown as Record<string, string>)[bg]);
      const ratio = contrastRatio(fgHex, bgHex);
      expect(ratio, `${fg} on ${bg}: ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe("generateStylesheet — Task 3.5a: @import loads the resolved Google Font, closing the gap 3.5's validator found", () => {
  it("emits @import url(...) as the very first line, before :root", () => {
    const css = generateStylesheet(REAL_HUE_INPUT);
    expect(css.startsWith(`@import url("${REAL_HUE_INPUT.googleFontsUrl}");`)).toBe(true);
    expect(css.indexOf("@import")).toBeLessThan(css.indexOf(":root"));
  });

  it("the emitted URL matches the input's own googleFontsUrl exactly, for two different pairings", () => {
    expect(generateStylesheet(REAL_HUE_INPUT)).toContain(REAL_HUE_INPUT.googleFontsUrl);
    expect(generateStylesheet(FALLBACK_INPUT)).toContain(FALLBACK_INPUT.googleFontsUrl);
    expect(REAL_HUE_INPUT.googleFontsUrl).not.toBe(FALLBACK_INPUT.googleFontsUrl);
  });
});

describe("generateStylesheet — every CSS custom property referenced in :root has a real, non-empty value", () => {
  it("no `undefined` or empty interpolation leaked into :root", () => {
    const css = generateStylesheet(REAL_HUE_INPUT);
    const rootBlock = /:root\s*\{([^}]*)\}/.exec(css)?.[1] ?? "";
    expect(rootBlock).not.toMatch(/undefined/);
    for (const line of rootBlock.split("\n").map((l) => l.trim()).filter(Boolean)) {
      expect(line).toMatch(/^--[a-z-]+:\s*\S.*;$/);
    }
  });
});

describe("CLASS_VOCABULARY — the contract with Task 3.4", () => {
  it("every scope-limited colour utility documents where it is and isn't safe", () => {
    const scoped = CLASS_VOCABULARY.filter((c) => [".text-muted", ".text-accent", ".btn.btn--outline"].includes(c.className));
    expect(scoped).toHaveLength(3);
    for (const entry of scoped) {
      expect(entry.description.toLowerCase()).toContain("only");
    }
  });

  it("covers every class name the generated CSS actually defines", () => {
    const css = generateStylesheet(REAL_HUE_INPUT);
    const documented = new Set(CLASS_VOCABULARY.map((c) => c.className.split(".").filter(Boolean)[0]).map((s) => `.${s}`));
    for (const known of [".container", ".section", ".surface-paper", ".surface-mist", ".btn", ".card", ".img", ".pill"]) {
      expect(css).toContain(known);
      expect(documented.has(known)).toBe(true);
    }
  });
});
