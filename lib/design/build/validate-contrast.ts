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
import { buildPalette } from "@/lib/content/normalize-brand-colors";
import { contrastRatio } from "@/lib/design/contrast";
import { VALIDATED_TEXT_PAIRS as PAIRS, paletteColorToHex as toHex } from "@/lib/design/validated-text-pairs";

const AA_NORMAL_TEXT_MINIMUM = 4.5;

// Task 3.3 moved the PAIRS list and the hex-conversion helper out to
// lib/design/validated-text-pairs.ts (imported above, aliased back to this file's original
// names) so lib/design/generate-stylesheet.ts's own CSS emission can share the exact same
// canonical list this script validates, rather than a second, hand-copied one that could drift.
// The list and its reasoning are unchanged — see that file's own header comment for the full
// "why these 12, why not ring/line" explanation this file used to carry inline.

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
