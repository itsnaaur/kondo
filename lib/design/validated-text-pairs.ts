// Task 3.3. Extracted from lib/design/build/validate-contrast.ts (Task 1.6/1.6a/1.6b) so the
// canonical list of AA-validated text-on-surface Palette pairs has exactly one source of truth,
// consumed by both that build-time gate AND lib/design/generate-stylesheet.ts's runtime CSS
// emission — not hand-copied into a second list that could silently drift out of sync with what
// 1.6's own 191/191-palette corpus run actually confirmed. Content is byte-identical to what
// validate-contrast.ts declared inline before this task moved it here; that script was re-run
// after the move to confirm its own 191/191 result is unchanged (see this task's log entry).
//
// See validate-contrast.ts's own header comment for the full reasoning behind this exact list —
// which pairs are real, confirmed template usage (grepped from the three now-3.8-doomed
// templates' own CSS), why `onSecondary`/`secondary` was added in 1.6a (replacing an originally
// inferred, unconfirmed `accentInk`/`secondary` pairing that failed AA on 62/191 corpus
// primaries), and why `ring`/`line` are deliberately excluded (non-text WCAG criteria — a focus
// ring and a decorative hairline are never "text on a background").

import type { Palette } from "@/lib/content/normalize-brand-colors";

export type ValidatedTextPair = { fg: keyof Palette; bg: keyof Palette; label: string };

export const VALIDATED_TEXT_PAIRS: ValidatedTextPair[] = [
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
// (paper, destructive, onDestructive — literals or pickOnColor output) or `hsl(H S% L%)`
// strings (buildPalette's own hsl() helper, integers already rounded — reading them back out
// and converting tests exactly what a browser would render from the same string). Identical
// logic to normalize-brand-colors.ts's own private hslStringToHex and validate-contrast.ts's
// own former local toHex — duplicated rather than imported, since neither is exported and this
// task didn't want to widen either file's public surface just to share a few lines of well-
// defined HSL-to-hex arithmetic; all three are the same conversion, not independent guesses.
export function paletteColorToHex(value: string): string {
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
