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
// equivalent of a surface). Task 3.7g adds four more self-contained pairs to this same shape:
// `.card`/`.card--dark` (mist/ink and paper/deepSoft — both already-validated pairs, reused, not
// new) and `.pill--accent`/`.tile-accent` (accentInk/accent, same pair `.btn--solid` already
// emits).
// Shape (b): `.surface-X .text-muted`/`.text-accent`/`.btn--outline` (nested, scoped to a
// validated surface). `a { color: inherit }` and `body` (checked separately below) are a third,
// trivially-safe shape — they declare no new colour pairing, just the page's own default.
const SAFE_UNSCOPED_SELECTOR = /^(\.surface-[a-z-]+|\.btn--solid|\.btn--secondary|\.card|\.card--dark|\.pill--accent|\.tile-accent)$/;
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
  { fg: "ink", bg: "mist" }, // .surface-mist, .card (Task 3.7g)
  { fg: "ink", bg: "accentSoft" }, // .surface-accent-soft
  { fg: "accentInk", bg: "accent" }, // .surface-accent / .btn--solid / .pill--accent / .tile-accent (3.7g)
  { fg: "onSecondary", bg: "secondary" }, // .surface-secondary / .btn--secondary
  { fg: "paper", bg: "deep" }, // .surface-deep
  { fg: "paper", bg: "deepSoft" }, // .surface-deep-soft, .card--dark (Task 3.7g)
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

// Task 3.7c — composition vocabulary harvested from lib/templates/{atlas,ledger,showcase}/
// styles.ts before 3.8 deletes them. Grid, split, stat, media-*, obj-* are all new; none of them
// may declare `color` or `background`, per this task's own guard ("stays at 191/191" / 3.5's own
// colour-safety test) — verified directly here, not just inferred from the shared
// colorDeclaringSelectors scan above (which would already catch a violation, but a class-specific
// check pins down exactly which new rule would be at fault if one ever regressed).
describe("generateStylesheet — Task 3.7c: harvested composition vocabulary", () => {
  const css = generateStylesheet(REAL_HUE_INPUT);
  const NEW_CLASSES = [
    ".grid", ".split", ".stat",
    ".media-16-9", ".media-4-3", ".media-1-1", ".media-3-4",
    ".obj-top", ".obj-bottom", ".obj-left", ".obj-right",
  ];

  it("every new class is documented in CLASS_VOCABULARY", () => {
    const documented = new Set(CLASS_VOCABULARY.map((c) => c.className));
    for (const cls of NEW_CLASSES) expect(documented.has(cls), `${cls} not documented`).toBe(true);
  });

  it("every new class's CSS rule is present in the generated stylesheet", () => {
    for (const cls of NEW_CLASSES) {
      const selector = cls.replace(".", "\\.");
      expect(new RegExp(`${selector}[\\s,{]`).test(css), `${cls} rule not found`).toBe(true);
    }
  });

  it("none of the new classes declare `color` or `background` — pure layout/shape/position modifiers", () => {
    // Scoped to just this task's own new block, not the whole file (the pre-existing .card/.pill/
    // .img section above this one already proves the same property for the older classes).
    const block = css.slice(css.indexOf("Task 3.7c: composition vocabulary harvested"));
    expect(block).not.toMatch(/(?<![-a-z])color\s*:/);
    expect(block).not.toMatch(/(?<![-a-z])background\s*:/);
  });

  it(".media-* classes each set a distinct aspect-ratio and read the shared --obj-x/--obj-y position", () => {
    expect(css).toMatch(/\.media-16-9\s*\{\s*aspect-ratio:\s*16\s*\/\s*9;\s*\}/);
    expect(css).toMatch(/\.media-4-3\s*\{\s*aspect-ratio:\s*4\s*\/\s*3;\s*\}/);
    expect(css).toMatch(/\.media-1-1\s*\{\s*aspect-ratio:\s*1\s*\/\s*1;\s*\}/);
    expect(css).toMatch(/\.media-3-4\s*\{\s*aspect-ratio:\s*3\s*\/\s*4;\s*\}/);
    expect(css).toMatch(/object-position:\s*var\(--obj-x\)\s*var\(--obj-y\)/);
  });

  it("--obj-x/--obj-y default to centred (50% 50%) in :root, moved only by the .obj-* modifiers", () => {
    const rootBlock = /:root\s*\{([^}]*)\}/.exec(css)?.[1] ?? "";
    expect(rootBlock).toMatch(/--obj-x:\s*50%;/);
    expect(rootBlock).toMatch(/--obj-y:\s*50%;/);
    expect(css).toMatch(/\.obj-top\s*\{\s*--obj-y:\s*18%;\s*\}/);
    expect(css).toMatch(/\.obj-bottom\s*\{\s*--obj-y:\s*82%;\s*\}/);
    expect(css).toMatch(/\.obj-left\s*\{\s*--obj-x:\s*18%;\s*\}/);
    expect(css).toMatch(/\.obj-right\s*\{\s*--obj-x:\s*82%;\s*\}/);
  });
});

// Task 3.7g — a real type scale, filled cards, and more accent presence. The human's own review
// named four gaps in real rendered output; each block below is a direct, structural check against
// one of them, not a general smoke test.
describe("generateStylesheet — Task 3.7g: real type scale (gap 1)", () => {
  const css = generateStylesheet(REAL_HUE_INPUT);

  function ruleFor(selector: string): string {
    const re = new RegExp(`(?:^|[,}])\\s*${selector.replace(/[.]/g, "\\.")}\\s*\\{([^}]*)\\}`, "m");
    return re.exec(css)?.[1] ?? "";
  }
  function fontSizePx(rule: string): number {
    // Every level here is either a bare rem value or a clamp(...) — the PREFERRED (middle) value
    // is what a real mid-size viewport renders, so that's what orders the scale for this test.
    const clampMatch = /font-size:\s*clamp\([^,]+,\s*[^,]+,\s*([\d.]+)rem\)/.exec(rule);
    if (clampMatch) return parseFloat(clampMatch[1]) * 16;
    const remMatch = /font-size:\s*([\d.]+)rem/.exec(rule);
    return remMatch ? parseFloat(remMatch[1]) * 16 : 0;
  }

  it("h1 > h2 > h3 > h4 > body, strictly decreasing — the exact ordering that was missing before", () => {
    const h1 = fontSizePx(ruleFor("h1"));
    const h2 = fontSizePx(ruleFor("h2"));
    const h3 = fontSizePx(ruleFor("h3"));
    const h4 = fontSizePx(ruleFor("h4"));
    const bodyPx = 17; // body's own font-size: 17px, unchanged by this task
    expect(h1).toBeGreaterThan(h2);
    expect(h2).toBeGreaterThan(h3);
    expect(h3).toBeGreaterThan(h4);
    expect(h4).toBeGreaterThan(bodyPx);
  });

  it("h3 (a real card/subsection heading size) is meaningfully bigger than body, not near-identical", () => {
    const h3 = fontSizePx(ruleFor("h3"));
    // The bug this fixes: h3 used to fall back to the browser's own ~1.17em default (~19.9px),
    // barely distinguishable from 17px body copy. Real minimum bar: at least 20% larger.
    expect(h3).toBeGreaterThanOrEqual(17 * 1.2);
  });

  it("h1/h2 are heavier (700) than h3-h6 (600) — real weight differentiation, not one flat 600 everywhere", () => {
    expect(ruleFor("h1")).toMatch(/font-weight:\s*700/);
    expect(ruleFor("h2")).toMatch(/font-weight:\s*700/);
    expect(ruleFor("h3")).toMatch(/font-weight:\s*600/);
  });

  it("h1-h6 still declare no colour of their own — the type scale is size/weight only", () => {
    for (const level of ["h1", "h2", "h3", "h4"]) {
      expect(ruleFor(level)).not.toMatch(/(?<![-a-z])color\s*:/);
    }
  });

  it(".lede and .caption exist, are bigger/smaller than body respectively, and declare no colour", () => {
    const lede = ruleFor(".lede");
    const caption = ruleFor(".caption");
    expect(fontSizePx(lede)).toBeGreaterThan(17);
    expect(caption).toMatch(/font-size:\s*0\.8125rem/);
    expect(lede).not.toMatch(/(?<![-a-z])color\s*:/);
    expect(caption).not.toMatch(/(?<![-a-z])color\s*:/);
  });
});

describe("generateStylesheet — Task 3.7g: filled cards (gap 2)", () => {
  const css = generateStylesheet(REAL_HUE_INPUT);

  it(".card sets a real, self-contained background+colour pair (mist/ink) instead of none", () => {
    expect(css).toMatch(/\.card\s*\{[^}]*background:\s*var\(--mist\);[^}]*color:\s*var\(--ink\);/);
  });

  it(".card--dark sets the dark-context pair (paper/deep-soft) and a translucent-white border, not --line", () => {
    const rule = /\.card--dark\s*\{([^}]*)\}/.exec(css)?.[1] ?? "";
    expect(rule).toMatch(/background:\s*var\(--deep-soft\);/);
    expect(rule).toMatch(/color:\s*var\(--paper\);/);
    expect(rule).toMatch(/border-color:\s*rgb\(255 255 255 \/ 0\.14\);/);
  });

  it(".card keeps its real shape properties (radius/shadow/border) alongside the new fill", () => {
    const rule = /\.card\s*\{([^}]*)\}/.exec(css)?.[1] ?? "";
    expect(rule).toMatch(/border-radius:\s*var\(--radius-card\);/);
    expect(rule).toMatch(/box-shadow:\s*var\(--shadow-card\);/);
  });
});

describe("generateStylesheet — Task 3.7g: accent presence beyond buttons (gap 3)", () => {
  const css = generateStylesheet(REAL_HUE_INPUT);

  it(".eyebrow::before is an unconditional, always-safe accent marker — a decoration, not text colour", () => {
    const rule = /\.eyebrow::before\s*\{([^}]*)\}/.exec(css)?.[1] ?? "";
    expect(rule).toMatch(/background:\s*var\(--accent\);/);
    // Decoration only — must never declare `color`, which would need scoping like .text-accent does.
    expect(rule).not.toMatch(/(?<![-a-z])color\s*:/);
  });

  it(".pill--accent and .tile-accent are self-contained accentInk-on-accent pairs, safe anywhere", () => {
    expect(css).toMatch(/\.pill--accent\s*\{\s*background:\s*var\(--accent\);\s*color:\s*var\(--accent-ink\);\s*\}/);
    const tile = /\.tile-accent\s*\{([^}]*)\}/.exec(css)?.[1] ?? "";
    expect(tile).toMatch(/background:\s*var\(--accent\);/);
    expect(tile).toMatch(/color:\s*var\(--accent-ink\);/);
  });

  it(".section--accent-top uses border-top, never `color`/`background` — a divider, not a surface", () => {
    const rule = /\.section--accent-top\s*\{([^}]*)\}/.exec(css)?.[1] ?? "";
    expect(rule).toMatch(/border-top:\s*3px solid var\(--accent\);/);
    expect(rule).not.toMatch(/(?<![-a-z])(color|background)\s*:/);
  });
});

describe("generateStylesheet — Task 3.7g: CLASS_VOCABULARY stays the contract with 3.4", () => {
  it("every new 3.7g class is documented", () => {
    const documented = new Set(CLASS_VOCABULARY.map((c) => c.className));
    for (const cls of [".card--dark", ".pill--accent", ".tile-accent", ".lede", ".eyebrow", ".caption", ".section--accent-top"]) {
      expect(documented.has(cls), `${cls} not documented`).toBe(true);
    }
  });

  it(".section's own description now instructs alternating surfaces between sections", () => {
    const section = CLASS_VOCABULARY.find((c) => c.className === ".section");
    expect(section?.description.toLowerCase()).toContain("alternate");
  });
});
