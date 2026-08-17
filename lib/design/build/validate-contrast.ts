// Build-time gate, not runtime code — run by hand today (`npx tsx
// lib/design/build/validate-contrast.ts`), suitable for wiring into CI later (build plan
// §3.4 names this file as the re-import gate for lib/design/data/palettes.json).
//
// Asks one question: does buildPalette() (lib/content/normalize-brand-colors.ts) produce
// AA-passing output across the full range of real brand primaries the uupm corpus represents,
// not just the handful of hues this project has tested by hand so far? For every one of the
// 191 imported palettes, takes only its `primary` hex (nothing else from that row), derives a
// full Palette from it exactly the way production code does, and checks every text-on-
// background pair that Palette's own roles imply, using contrastRatio (lib/design/contrast.ts,
// Task 1.3's first non-test consumer alongside normalize-brand-colors.ts itself).
//
// On failure: does NOT patch normalize-brand-colors.ts to make a failing case pass. Logs the
// input hex, the exact failing pair, and the real ratio, then reports and exits non-zero. A
// failure here is evidence about the derivation's real behaviour across arbitrary hues, not a
// bug to silently work around — see this task's own log entry (1.6) in
// docs/kondo-v2-execution.md for why.

import { readFileSync } from "node:fs";
import path from "node:path";
import { buildPalette, type Palette } from "@/lib/content/normalize-brand-colors";
import { contrastRatio } from "@/lib/design/contrast";

const AA_NORMAL_TEXT_MINIMUM = 4.5;

// Every pair checked here is a real usage confirmed directly in at least one of the three
// shipped templates' CSS (lib/templates/{atlas,ledger,showcase}/styles.ts) — grepped for
// `background: var(--X)` and what colour renders as text inside that context — except
// `secondary`, which isn't consumed by any template yet (Task 1.5 added the role; nothing
// downstream uses it). `secondary` is checked against its own `onSecondary` (Task 1.6a — 1.5
// originally omitted this role and this file's first run caught it: `accentInk` on `secondary`
// failed AA on 62 of 191 corpus primaries, since accentInk is chosen for accent's lightness,
// not secondary's deliberately-lighter one. The audit's `On *` roles are a per-surface
// lookup, and secondary is a surface — accentInk on secondary is a pairing the system should
// never make, so it isn't checked here at all, not even as a "should fail" case).
//
// `ring` and `line` are deliberately excluded: `ring` is a focus-outline colour (WCAG SC
// 1.4.11 non-text UI-component contrast, not SC 1.4.3 text contrast — no text renders "on" a
// focus ring), and `line` is a decorative hairline separator, not a background anything sits
// on. Not oversights — see this task's log entry for the fuller reasoning.
const PAIRS: { fg: keyof Palette; bg: keyof Palette; label: string }[] = [
  { fg: "ink", bg: "paper", label: "ink on paper" },
  { fg: "inkMuted", bg: "paper", label: "inkMuted on paper" },
  { fg: "ink", bg: "mist", label: "ink on mist" },
  { fg: "inkMuted", bg: "mist", label: "inkMuted on mist" },
  { fg: "accent", bg: "mist", label: "accent on mist" },
  { fg: "ink", bg: "accentSoft", label: "ink on accentSoft" },
  { fg: "inkMuted", bg: "accentSoft", label: "inkMuted on accentSoft" },
  { fg: "accentInk", bg: "accent", label: "accentInk on accent" },
  { fg: "onSecondary", bg: "secondary", label: "onSecondary on secondary" },
  { fg: "paper", bg: "deep", label: "paper on deep" },
  { fg: "paper", bg: "deepSoft", label: "paper on deepSoft" },
  { fg: "onDestructive", bg: "destructive", label: "onDestructive on destructive" },
];

// Converts a Palette role's stored colour string to #RRGGBB. Roles are either already hex
// (paper, destructive, onDestructive — all literals or pickOnColor output) or
// `hsl(H S% L%)` strings (buildPalette's own hsl() helper, integers already rounded — reading
// them back out and converting is testing exactly what a browser would render from the same
// string, not a higher-precision value the app never actually produces).
function toHex(value: string): string {
  if (value.startsWith("#")) return value;
  const match = /^hsl\((\d+) (\d+)% (\d+)%\)$/.exec(value);
  if (!match) throw new Error(`Unrecognised colour format: ${value}`);
  const h = Number(match[1]);
  const s = Number(match[2]) / 100;
  const l = Number(match[3]) / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r1, g1, b1] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x]
    : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  const toByte = (v: number) => Math.round((v + m) * 255);
  const toHex2 = (n: number) => n.toString(16).padStart(2, "0");
  return `#${toHex2(toByte(r1))}${toHex2(toByte(g1))}${toHex2(toByte(b1))}`;
}

type Failure = { paletteId: number; primaryHex: string; pair: string; ratio: number };

function main() {
  const dataPath = path.resolve(__dirname, "../data/palettes.json");
  const palettes = JSON.parse(readFileSync(dataPath, "utf8")) as { id: number; primary: string }[];

  const failures: Failure[] = [];
  let passCount = 0;

  for (const row of palettes) {
    const derived = buildPalette([{ hex: row.primary }]);
    let paletteOk = true;

    for (const { fg, bg, label } of PAIRS) {
      const fgHex = toHex(derived[fg] as string);
      const bgHex = toHex(derived[bg] as string);
      const ratio = contrastRatio(fgHex, bgHex);
      if (ratio < AA_NORMAL_TEXT_MINIMUM) {
        paletteOk = false;
        failures.push({ paletteId: row.id, primaryHex: row.primary, pair: label, ratio });
      }
    }

    if (paletteOk) passCount++;
  }

  console.log(`Checked ${palettes.length} palettes, ${PAIRS.length} pairs each (${palettes.length * PAIRS.length} total checks), AA minimum ${AA_NORMAL_TEXT_MINIMUM}:1.`);

  if (failures.length > 0) {
    console.log(`\nFAILURES (${failures.length} pair-failures across ${new Set(failures.map((f) => f.paletteId)).size} of ${palettes.length} palettes):`);
    for (const f of failures) {
      console.log(`  palette #${f.paletteId} (primary ${f.primaryHex}): ${f.pair} — ratio ${f.ratio.toFixed(2)}:1 (needs ${AA_NORMAL_TEXT_MINIMUM}:1)`);
    }
  }

  console.log(`\nSUMMARY: ${passCount}/${palettes.length} palettes fully AA-passing across all ${PAIRS.length} checked pairs.`);

  if (failures.length > 0) {
    console.log("Not patched — see docs/kondo-v2-execution.md's 1.6 entry.");
    process.exitCode = 1;
  }
}

main();
