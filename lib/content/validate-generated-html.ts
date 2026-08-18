// Task 3.5. Build plan §6.5's validation gate — every one of its 8 checks, implemented as the
// real thing, not `generate-markup.ts` (Task `3.4`)'s own `auditMarkup`. That function is a
// regex heuristic over the raw HTML string, explicitly disclosed there as a reporting aid, not a
// validator — it cannot distinguish a genuinely top-level `<section>` from one nested three
// levels deep inside an FAQ accordion, which is exactly the ambiguity `3.4`'s own log entry
// named as unresolved in its one real finding. This file exists to remove that ambiguity for
// real, using a real HTML5 parser and a real DOM.
//
// PARSER CHOICE, AND WHY: `parse5` (the WHATWG-spec-compliant HTML5 parsing algorithm — the
// same algorithm every real browser implements) plus `cheerio` (a jQuery-style query API built
// on top of parse5's own tree). Two libraries doing two different jobs, not one library doing
// both by coincidence:
//   - `parse5.parseFragment(html, { onParseError })` is the actual answer to "does this parse as
//     well-formed HTML" — it reports real, spec-defined parse errors (confirmed directly before
//     writing this file: a genuine `duplicate-attribute` or `unexpected-null-character` fires a
//     real, named error; see this task's own test suite for both). It also proved, empirically,
//     that HTML5's own error-recovery algorithm silently repairs almost everything else a human
//     might call "malformed" (mismatched closing tags, a block element nested somewhere odd,
//     even a stray `<!DOCTYPE>` mid-fragment) without ever raising a parse error at all — that
//     is not a limitation of this check, it is what "well-formed per the HTML5 spec" actually
//     means; browsers are deliberately, famously lenient. Stated here so this check's real,
//     narrower scope isn't oversold as "catches anything a human would call malformed."
//   - `cheerio.load(html)` gives a queryable DOM for every other check (`$('body').children()`
//     for genuine top-level elements, `$('[data-kondo-section]')`, `$('img')`, attribute
//     inspection) — real ancestor/descendant relationships, not string proximity. Both libraries
//     parse the same input independently (a small, accepted double-parse cost, not shared
//     infrastructure) — simpler and clearer than threading one parse's tree through two
//     different consumer APIs.
// Both are new dependencies this task added (`package.json`), not already present in this
// codebase — a disclosed, deliberate choice, not an incidental one. No existing dependency
// (React/ReactDOM need a browser `document`; Playwright would mean launching a browser per
// validation call) does this job.
//
// THE INTERFACE FOR 3.4'S RETRY (constraint 3). `validateGeneratedHtml` returns
// `{ valid: true } | { valid: false; failures: ValidationFailure[] }`. Each `ValidationFailure`
// carries `check` (a stable machine identifier, e.g. `"section-markers"`) and `message` (a
// specific, human-readable, actionable sentence — not a category name). `formatFailuresForRetry`
// joins every failure's message into one string, in exactly the shape `generate-markup.ts`'s own
// `correctionNote` mechanism already expects (see that file's retry loop: `IMPORTANT: your
// previous attempt was rejected: ${correctionNote}. Try again, following every rule.`). Wiring
// this validator's output into that retry loop for real is later work — `3.4`'s own log entry
// already named "no real caller wired in yet" as out of scope for that task, and this task
// doesn't attempt that wiring either; it only defines the interface the wiring would use.
//
// SCOPE: implements every one of build plan §6.5's 8 checks. One (Google Fonts import) can only
// be implemented as a pure, testable function today — see `checkGoogleFontsImport`'s own comment
// for why nothing in the current real pipeline (`3.2`→`3.3`→`3.4`) yet produces an import for it
// to check against, and why that's a real, named gap rather than a silently dropped check.

import { parseFragment, type ParserError } from "parse5";
import * as cheerio from "cheerio";
import type { Palette } from "@/lib/content/normalize-brand-colors";
import { relativeLuminance } from "@/lib/design/contrast";
import { VALIDATED_TEXT_PAIRS, paletteColorToHex } from "@/lib/design/validated-text-pairs";
import { contrastRatio } from "@/lib/design/contrast";

export type ValidationFailure = { check: string; message: string };
export type ValidationResult = { valid: true } | { valid: false; failures: ValidationFailure[] };

export type ValidateGeneratedHtmlInput = {
  html: string;
  // The exact whitelist 3.4's own buildImageManifest() produces — already excludes any asset
  // with role "unusable", so "nothing marked unusable" (build plan §6.5's own third sub-clause
  // of the image check) is satisfied by construction of the whitelist itself, not a separate
  // check re-deriving role data this validator has no other reason to see.
  allowedImageUrls: string[];
  palette: Palette;
  styleBundleMode: "light" | "dark";
  typographyGoogleFontsUrl: string;
};

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!m) throw new Error(`Invalid hex colour: ${hex}`);
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
}

// ---------- 1. Parses as well-formed HTML ----------

function checkWellFormed(html: string): ValidationFailure[] {
  const errors: ParserError[] = [];
  parseFragment(html, {
    sourceCodeLocationInfo: true,
    onParseError: (err) => errors.push(err),
  });
  return errors.map((err) => ({
    check: "well-formed-html",
    message: `HTML5 parse error "${err.code}" at line ${err.startLine}, column ${err.startCol}.`,
  }));
}

// ---------- 2. Every data-kondo-section marker present ----------

// Real top-level, not a regex guess — cheerio wraps any parsed fragment in an implicit
// <html><body> (confirmed empirically before writing this), so $('body').children() is every
// genuinely top-level element of the markup 3.4 actually wrote, and only those — a nested
// <section> three levels deep inside an FAQ accordion is correctly excluded, which is exactly
// what 3.4's own regex-based auditMarkup could not do.
function topLevelElements($: cheerio.CheerioAPI) {
  return $("body").children().toArray();
}

function checkSectionMarkers($: cheerio.CheerioAPI): ValidationFailure[] {
  const failures: ValidationFailure[] = [];
  const elements = topLevelElements($);
  elements.forEach((el, index) => {
    const $el = $(el);
    const marker = $el.attr("data-kondo-section");
    if (!marker || !marker.trim()) {
      const tagName = (el as unknown as { tagName?: string }).tagName ?? "unknown";
      failures.push({
        check: "section-markers",
        message: `Top-level element ${index + 1} of ${elements.length} (<${tagName}>) has no data-kondo-section attribute.`,
      });
    }
  });
  return failures;
}

// ---------- 3. Banned tags, inline handlers, javascript:/data: URIs ----------

const BANNED_TAGS = ["script", "iframe", "object", "embed", "form"];
const DANGEROUS_URI_SCHEME = /^\s*(javascript|data):/i;

function checkBannedContent($: cheerio.CheerioAPI): ValidationFailure[] {
  const failures: ValidationFailure[] = [];

  for (const tag of BANNED_TAGS) {
    const count = $(tag).length;
    if (count > 0) failures.push({ check: "banned-content", message: `Found ${count} banned <${tag}> element(s).` });
  }

  const metaHttpEquivCount = $("meta[http-equiv]").length;
  if (metaHttpEquivCount > 0) {
    failures.push({ check: "banned-content", message: `Found ${metaHttpEquivCount} <meta http-equiv> element(s).` });
  }

  $("*").each((_, el) => {
    const attribs = (el as unknown as { attribs?: Record<string, string> }).attribs ?? {};
    for (const [name, value] of Object.entries(attribs)) {
      if (/^on/i.test(name)) {
        failures.push({ check: "banned-content", message: `Element has an inline event handler attribute "${name}".` });
      }
      if (DANGEROUS_URI_SCHEME.test(value)) {
        failures.push({ check: "banned-content", message: `Attribute "${name}" has a javascript:/data: URI value.` });
      }
    }
  });

  return failures;
}

// ---------- 4. Every image is one we supplied; none reused ----------

function checkImages($: cheerio.CheerioAPI, allowedImageUrls: string[]): ValidationFailure[] {
  const failures: ValidationFailure[] = [];
  const allowed = new Set(allowedImageUrls);
  const seen = new Set<string>();

  $("img").each((_, el) => {
    const src = $(el).attr("src");
    if (!src) {
      failures.push({ check: "image-provenance", message: "An <img> element has no src attribute." });
      return;
    }
    if (!allowed.has(src)) {
      failures.push({ check: "image-provenance", message: `Image "${src}" is not in the supplied image manifest.` });
      return;
    }
    if (seen.has(src)) {
      failures.push({ check: "image-provenance", message: `Image "${src}" is used more than once — each supplied image may appear at most once.` });
      return;
    }
    seen.add(src);
  });

  return failures;
}

// ---------- 5. Contrast >= 4.5:1 on every text/background pair used ----------

// Mirrors generate-stylesheet.ts's own CSS exactly — one entry per .surface-* class, each
// naming the Palette role pair that class's real CSS rule sets background+color to. Cross-
// checked directly against VALIDATED_TEXT_PAIRS (Task 1.6/3.3's own canonical list) in this
// file's own test suite, so this table cannot silently name a pair 1.6 never validated.
const SURFACE_CLASS_PAIRS: Record<string, { bg: keyof Palette; fg: keyof Palette }> = {
  "surface-paper": { bg: "paper", fg: "ink" },
  "surface-mist": { bg: "mist", fg: "ink" },
  "surface-accent-soft": { bg: "accentSoft", fg: "ink" },
  "surface-accent": { bg: "accent", fg: "accentInk" },
  "surface-secondary": { bg: "secondary", fg: "onSecondary" },
  "surface-deep": { bg: "deep", fg: "paper" },
  "surface-deep-soft": { bg: "deepSoft", fg: "paper" },
  "surface-destructive": { bg: "destructive", fg: "onDestructive" },
};

export { SURFACE_CLASS_PAIRS };

const INLINE_COLOR_STYLE = /\b(color|background(-color)?)\s*:/i;

function checkContrast($: cheerio.CheerioAPI, palette: Palette): ValidationFailure[] {
  const failures: ValidationFailure[] = [];

  // Any inline colour-setting style bypasses the class system 3.3 built the whole guarantee
  // on — there is no principled way to trust it, so it's an automatic failure regardless of
  // what the actual computed ratio would be, not a value this check tries to compute and pass.
  $("[style]").each((_, el) => {
    const style = $(el).attr("style") ?? "";
    if (INLINE_COLOR_STYLE.test(style)) {
      failures.push({ check: "contrast", message: `Inline style="${style}" sets a colour/background — colour must come only from the class vocabulary.` });
    }
  });

  // For every real .surface-* class actually present, independently recompute contrast against
  // this concept's REAL resolved palette — not trusting that 3.3's CSS is safe, verifying it,
  // for this exact palette, right now.
  $("[class]").each((_, el) => {
    const classes = ($(el).attr("class") ?? "").split(/\s+/).filter(Boolean);
    for (const cls of classes) {
      const pair = SURFACE_CLASS_PAIRS[cls];
      if (!pair) continue;
      const fgHex = paletteColorToHex(palette[pair.fg] as string);
      const bgHex = paletteColorToHex(palette[pair.bg] as string);
      const ratio = contrastRatio(fgHex, bgHex);
      if (ratio < 4.5) {
        failures.push({
          check: "contrast",
          message: `.${cls} (${pair.fg} on ${pair.bg}) contrasts at ${ratio.toFixed(2)}:1 for this palette — below the 4.5:1 minimum.`,
        });
      }
    }
  });

  return failures;
}

// ---------- 6. Mode coherence ----------

// Task 3.5. Build plan's own framing: "Upstream computes _palette_is_dark and never asserts it
// — that is precisely the optometry bug." This function is the assertion. See this task's log
// entry for whether it is currently reachable against real data (short answer: no, on both
// sides of the comparison, for reasons independent of each other — named there, not hidden).
const DARK_LUMINANCE_THRESHOLD = 0.5;

export function isDarkColor(hex: string): boolean {
  return relativeLuminance(hexToRgb(hex)) < DARK_LUMINANCE_THRESHOLD;
}

export function checkModeCoherence(palette: Palette, styleBundleMode: "light" | "dark"): ValidationFailure[] {
  const paperIsDark = isDarkColor(paletteColorToHex(palette.paper));
  const bundleIsDark = styleBundleMode === "dark";
  if (paperIsDark !== bundleIsDark) {
    return [
      {
        check: "mode-coherence",
        message: `Palette's base surface (paper) reads as ${paperIsDark ? "dark" : "light"}, but the style bundle declares mode "${styleBundleMode}" — the optometry-bug mismatch this check exists to catch.`,
      },
    ];
  }
  return [];
}

// ---------- 7. No empty sections ----------

function checkNoEmptySections($: cheerio.CheerioAPI): ValidationFailure[] {
  const failures: ValidationFailure[] = [];
  $("[data-kondo-section]").each((_, el) => {
    const $el = $(el);
    const hasText = $el.text().trim().length > 0;
    const hasImage = $el.find("img").length > 0;
    if (!hasText && !hasImage) {
      failures.push({ check: "empty-sections", message: `Section "${$el.attr("data-kondo-section")}" has no visible text or image content.` });
    }
  });
  return failures;
}

// ---------- 8. Google Fonts import matches the chosen pairing ----------

// Task 3.5. Implemented as specified — a pure comparison between whatever markup this function
// is given and the resolved typography's own googleFontsUrl — but named honestly: nothing in
// the CURRENT real pipeline produces a Google Fonts <link> for this to check against anywhere.
// 3.4's own system prompt forbids head-level content in the model's markup (body-only, by
// design). generate-stylesheet.ts (3.3) emits --font-body/--font-heading as CSS custom
// properties holding font-family NAMES, but never a <link>/@import to actually load the font
// files — the old, now-3.8-doomed templates solved this via registry.ts's own hardcoded
// GOOGLE_FONT_LINKS constant injected through renderShell's headExtra parameter; nothing in the
// new 3.2->3.3->3.4 pipeline has an equivalent yet. This function is real and tested against
// crafted HTML containing a <link>, but calling it against 3.4's actual real output today will
// always report "missing" — a real, disclosed pipeline gap, not a check quietly dropped or
// silently softened to always pass.
function checkGoogleFontsImport(html: string, expectedUrl: string): ValidationFailure[] {
  const $ = cheerio.load(html);
  const links = $('link[href*="fonts.googleapis.com"]');
  if (links.length === 0) {
    return [{ check: "google-fonts-import", message: `No Google Fonts <link> found; expected one matching "${expectedUrl}".` }];
  }
  const hrefs = links.toArray().map((el) => $(el).attr("href"));
  if (!hrefs.includes(expectedUrl)) {
    return [
      {
        check: "google-fonts-import",
        message: `Google Fonts <link> href(s) [${hrefs.join(", ")}] do not match the resolved typography's googleFontsUrl "${expectedUrl}".`,
      },
    ];
  }
  return [];
}

// ---------- top-level entry point ----------

export function validateGeneratedHtml(input: ValidateGeneratedHtmlInput): ValidationResult {
  const $ = cheerio.load(input.html);

  const failures: ValidationFailure[] = [
    ...checkWellFormed(input.html),
    ...checkSectionMarkers($),
    ...checkBannedContent($),
    ...checkImages($, input.allowedImageUrls),
    ...checkContrast($, input.palette),
    ...checkModeCoherence(input.palette, input.styleBundleMode),
    ...checkNoEmptySections($),
    ...checkGoogleFontsImport(input.html, input.typographyGoogleFontsUrl),
  ];

  if (failures.length === 0) return { valid: true };
  return { valid: false, failures };
}

// The interface constraint 3 asks for, made concrete: one string, in exactly the shape
// generate-markup.ts's own correctionNote mechanism already expects to receive.
export function formatFailuresForRetry(failures: ValidationFailure[]): string {
  return failures.map((f) => `[${f.check}] ${f.message}`).join(" ");
}
