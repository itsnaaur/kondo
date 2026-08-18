// Task 3.10a. Task 3.5's own header comment named the tradeoff explicitly and chose against it:
// "Playwright would mean launching a browser per validation call" — true, and the reason
// validate-generated-html.ts uses parse5+cheerio for everything else. This task reverses that
// tradeoff for contrast specifically, because static analysis turned out to be the wrong tool for
// this one check: hand-composed CSS overwhelmingly nests selectors (a section's own background
// declared in a different rule than its heading's own colour), which Task 3.10's own same-rule
// parser cannot resolve without reimplementing real CSS cascade resolution. Confirmed directly
// against 3.9's own ten real free-CSS outputs: 20% coverage, 10/10 hard-failed under the static
// check — including a run 3.9's own independent analysis found completely clean. A validator that
// rejects a correct page is worse than none.
//
// This renders the real page in headless Chromium (Playwright — already a real dependency,
// already installed on the worker for lib/crawl/crawler.ts) and reads real, browser-computed
// styles. Inheritance, cascade, and gradients resolve correctly here BY CONSTRUCTION, because this
// is the same resolution engine a real browser uses to paint the page a real visitor sees — not an
// approximation of it, the way Task 3.10's own same-rule text scan was.

import { chromium } from "playwright";
import { contrastRatio } from "@/lib/design/contrast";
import type { ValidationFailure, ContrastCoverage } from "./validate-generated-html";

// WCAG 2.1 SC 1.4.3's own large-text exemption — >=18pt (24px) regular, or >=14pt (18.66px) bold,
// needs only 3:1, not 4.5:1. Not this check's own invention; the standard's, applied for real.
const LARGE_TEXT_MIN_PX = 24;
const LARGE_TEXT_BOLD_MIN_PX = 18.66;
const LARGE_TEXT_BOLD_WEIGHT = 700;
const NORMAL_TEXT_MIN_RATIO = 4.5;
const LARGE_TEXT_MIN_RATIO = 3;

// Minimal, self-contained full-document wrapper — deliberately NOT generate-page.ts's own
// wrapGeneratedPage. Importing that here would be a real circular import: generate-page.ts already
// imports validateGeneratedHtml from this file's own sibling module, and that module is about to
// import checkRenderedContrast from here. Nothing this check reads (real computed colour/
// background/font-size/weight) depends on the disclosure footer, meta viewport, or title
// wrapGeneratedPage's own real version adds — only the real <style> block and the real body
// markup matter for contrast measurement, so that's all this wrapper provides.
function buildRenderableDocument(html: string, css: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8" /><style>${css}</style></head><body>${html}</body></html>`;
}

type RawFinding =
  | { ok: true; selector: string; text: string; colorRgb: [number, number, number]; bgRgb: [number, number, number]; fontSizePx: number; fontWeight: number }
  | { ok: false; selector: string; text: string; reason: string };

// Runs INSIDE the page via page.evaluate — real DOM/CSSOM only, no access to anything outside the
// browser context (no Node imports reachable here, deliberately — this function is serialised and
// executed by Chromium itself, not by this process).
function collectFindings(): { findings: RawFinding[]; total: number } {
  function parseRgb(str: string): [number, number, number, number] | null {
    const m = /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+))?\s*\)/.exec(str);
    if (!m) return null;
    return [parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3]), m[4] !== undefined ? parseFloat(m[4]) : 1];
  }

  // A short, readable path (tag + id/first two classes, up to 4 ancestors) — enough to find the
  // real element in the markup, not a full unique CSS selector (not needed for an actionable
  // failure message, and a fully unique selector would be noisier to read).
  function buildSelector(el: Element): string {
    const parts: string[] = [];
    let node: Element | null = el;
    let depth = 0;
    while (node && node !== document.body && depth < 4) {
      let part = node.tagName.toLowerCase();
      if (node.id) part += `#${node.id}`;
      else if (node.classList.length > 0) part += `.${Array.from(node.classList).slice(0, 2).join(".")}`;
      parts.unshift(part);
      node = node.parentElement;
      depth++;
    }
    return parts.join(" > ");
  }

  // Walks up from an element to find the real, opaque, PAINTED background behind it — resolving
  // exactly the "nested inheritance" Task 3.10's own static check could not: a transparent
  // background just means "keep looking at the parent," which this loop does directly rather than
  // needing a name-based exemption list for known-safe shapes.
  type BackgroundResult =
    | { kind: "solid"; rgb: [number, number, number] }
    | { kind: "image"; rgb: null }
    | { kind: "none"; rgb: null };

  function effectiveBackground(el: Element): BackgroundResult {
    let node: Element | null = el;
    while (node) {
      const cs = getComputedStyle(node);
      if (cs.backgroundImage && cs.backgroundImage !== "none") return { kind: "image", rgb: null };
      const bg = parseRgb(cs.backgroundColor);
      if (bg && bg[3] >= 0.999) return { kind: "solid", rgb: [bg[0], bg[1], bg[2]] };
      node = node.parentElement;
    }
    return { kind: "none", rgb: null };
  }

  const findings: RawFinding[] = [];
  let total = 0;
  const all = document.body.querySelectorAll("*");
  for (const el of Array.from(all)) {
    // Only elements with their OWN direct text node children — an ancestor <div> wrapping a <p>
    // is not itself a text container, and would massively double-count every real finding if
    // included (el.textContent includes descendant text; direct childNodes does not).
    const directText = Array.from(el.childNodes)
      .filter((n) => n.nodeType === 3 && (n.textContent ?? "").trim().length > 0)
      .map((n) => (n.textContent ?? "").trim())
      .join(" ");
    if (!directText) continue;

    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden" || parseFloat(cs.opacity) === 0) continue;

    total++;
    const selector = buildSelector(el);
    const text = directText.slice(0, 60);

    const colorParsed = parseRgb(cs.color);
    if (!colorParsed) {
      findings.push({ ok: false, selector, text, reason: `could not parse computed colour "${cs.color}"` });
      continue;
    }

    const bg = effectiveBackground(el);
    if (bg.kind === "image") {
      findings.push({ ok: false, selector, text, reason: "effective background is an image/gradient, not a solid colour — real contrast varies by pixel position; cannot compute a single static ratio without sampling rendered pixels, out of this check's own scope" });
      continue;
    }
    if (bg.kind === "none") {
      findings.push({ ok: false, selector, text, reason: "no opaque background found walking the ancestor chain up to <body> — should not happen against real pipeline output, since body always sets one" });
      continue;
    }

    findings.push({
      ok: true,
      selector,
      text,
      colorRgb: [colorParsed[0], colorParsed[1], colorParsed[2]],
      bgRgb: bg.rgb,
      fontSizePx: parseFloat(cs.fontSize),
      fontWeight: cs.fontWeight === "bold" ? 700 : parseInt(cs.fontWeight, 10) || 400,
    });
  }
  return { findings, total };
}

function rgbToHex([r, g, b]: [number, number, number]): string {
  const toHex = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// `failures` is only genuine, computed, below-threshold contrast — the actual AA gate.
// `unresolved` is named separately (Task 3.10a instruction 4: "name it," distinct from
// instruction 2's "fail below 4.5:1") and does NOT gate validity on its own. Real investigation
// against 3.9's run 6 (see this task's own log entry) found gradient-scrim captions —
// `background:linear-gradient(...)` placed deliberately behind text for legibility, a real,
// common, correct pattern — are exactly the kind of "unresolvable" case a rendered check still
// cannot reduce to one ratio (real contrast varies by pixel position under a gradient). Gating
// validity on "could not measure" rather than "measured and failed" would re-create the same
// "rejects a correct page" problem Task 3.10's static check had, just from a different cause.
export type RenderedContrastResult = {
  failures: ValidationFailure[];
  unresolved: ValidationFailure[];
  coverage: ContrastCoverage;
  renderMs: number;
};

// One fresh browser per call, matching lib/crawl/crawler.ts's own real per-operation launch
// pattern — not reused across retries within one generatePageInBackground run. Real, measured
// cost (this task's own log entry): ~200ms launch alone, before rendering anything. Reusing one
// browser across generate-page.ts's own up-to-3 retry attempts is a real, disclosed optimisation
// this task did not implement — named for a future task if the added latency turns out to matter
// in production, not solved here.
//
// TWO REAL ROBUSTNESS ISSUES FOUND WHILE TESTING THIS FUNCTION, NOT ANTICIPATED IN THE FIRST
// DRAFT, FIXED BEFORE SHIPPING:
// 1. All real navigation/sub-resource requests are blocked (page.route below). The markup this
//    validates is untrusted model output — a real crafted-bad-input test using a genuinely banned
//    <meta http-equiv="refresh" content="0"> tag caused the page to actually reload mid-evaluate
//    ("Execution context was destroyed"), because a real browser really does execute a meta
//    refresh. checkBannedContent (lib/content/validate-generated-html.ts) already rejects this tag
//    independently, but this function must not CRASH just because it was handed something hostile
//    — text/background colour never depends on whether an <img>/@import/iframe sub-resource
//    actually loads, so blocking every real request costs nothing this check needs and closes a
//    real defense-in-depth gap (the same reasoning lib/crawl/crawler.ts's own real hostile-page
//    guard already uses).
// 2. waitUntil: "domcontentloaded", not "load" — an <iframe src="..."> genuinely hangs "load"
//    waiting for a sub-resource that (with requests blocked per #1) will never resolve; a crafted
//    bad-input test with a real iframe timed out against "load" before this fix.
export async function checkRenderedContrast(html: string, css: string): Promise<RenderedContrastResult> {
  const start = Date.now();
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.route("**/*", (route) => {
      if (route.request().url().startsWith("data:")) return route.continue();
      return route.abort();
    });

    let findings: RawFinding[];
    let total: number;
    try {
      await page.setContent(buildRenderableDocument(html, css), { waitUntil: "domcontentloaded" });
      // tsx (this repo's real script runner, incl. production's scripts/worker.ts) compiles this
      // file with esbuild's name-preservation transform, which rewrites every nested named
      // function declaration in collectFindings into `function foo(){...} __name(foo,"foo");` —
      // a call to a helper esbuild injects at MODULE scope in this process, not inside the
      // isolated string page.evaluate() serialises into the browser. Without this shim,
      // collectFindings throws "ReferenceError: __name is not defined" on every real render —
      // it did not surface in vitest (a different, non-esbuild-keepNames transform), only when
      // actually run the way production runs it, which is exactly why this was caught here and
      // not in the unit suite. Defining a harmless global identity function before evaluating
      // collectFindings satisfies every such call.
      await page.evaluate(() => {
        (globalThis as unknown as { __name?: unknown }).__name =
          (globalThis as unknown as { __name?: unknown }).__name ?? ((fn: unknown) => fn);
      });
      ({ findings, total } = await page.evaluate(collectFindings));
    } catch (err) {
      // A real navigation/reload during evaluation (e.g. a meta-refresh that fired anyway, or any
      // other hostile content this render couldn't survive) is itself a real, reportable failure —
      // not a crash callers of validateGeneratedHtml should have to handle specially. Coverage is
      // reported as 0/0 rather than guessed, since nothing was actually measured.
      return {
        failures: [{ check: "contrast", message: `Could not render the page to measure contrast: ${err instanceof Error ? err.message : String(err)}.` }],
        unresolved: [],
        coverage: { resolved: 0, total: 0 },
        renderMs: Date.now() - start,
      };
    }

    const failures: ValidationFailure[] = [];
    const unresolved: ValidationFailure[] = [];
    let resolved = 0;
    for (const f of findings) {
      if (!f.ok) {
        unresolved.push({ check: "contrast", message: `${f.selector} ("${f.text}"): ${f.reason}.` });
        continue;
      }
      resolved++;
      const isLarge = f.fontSizePx >= LARGE_TEXT_MIN_PX || (f.fontSizePx >= LARGE_TEXT_BOLD_MIN_PX && f.fontWeight >= LARGE_TEXT_BOLD_WEIGHT);
      const minRatio = isLarge ? LARGE_TEXT_MIN_RATIO : NORMAL_TEXT_MIN_RATIO;
      const fgHex = rgbToHex(f.colorRgb);
      const bgHex = rgbToHex(f.bgRgb);
      const ratio = contrastRatio(fgHex, bgHex);
      if (ratio < minRatio) {
        failures.push({
          check: "contrast",
          message: `${f.selector} ("${f.text}"): text ${fgHex} on background ${bgHex} contrasts at ${ratio.toFixed(2)}:1 — below the ${minRatio}:1 minimum${isLarge ? " (large-text exemption applied)" : ""}.`,
        });
      }
    }

    return { failures, unresolved, coverage: { resolved, total }, renderMs: Date.now() - start };
  } finally {
    await browser.close();
  }
}
