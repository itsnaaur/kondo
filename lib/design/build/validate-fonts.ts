// Build-time gate, not runtime code — run by hand today (`npx tsx
// lib/design/build/validate-fonts.ts --source <path-to-uupm-clone-or-google-fonts.csv>`),
// suitable for wiring into CI later, same spirit as validate-contrast.ts (build plan §3.4 names
// this file as the re-import gate for lib/design/data/typography.json).
//
// Asks one question per imported pairing: does every Google Fonts family/weight combination its
// own `googleFontsUrl` actually requests exist in Google's real catalogue? Re-derives the check
// from typography.json's own recorded googleFontsUrl field — not from a separately-maintained
// list of "expected" families/weights — so a future re-import that changes what a pairing
// requests is checked against what it NOW requests, not a stale expectation.
//
// google-fonts.csv itself is never vendored into this repo (it's reference data used only to
// validate against, not data this project ships or reads at runtime) — read directly from a
// pinned uupm clone every time this script runs, the same read-only-reference discipline as
// import-uupm.ts's own --source argument.
//
// On failure: does not patch typography.csv or typography.json to make a failing case pass.
// Reports the exact pairing, family, and weight/style token that failed to resolve, then exits
// non-zero — a failure here means the import (or this script's own parsing) is wrong, not that
// upstream's data is wrong; the uupm port audit already reported zero unresolved families and
// zero missing weights across this same data.

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

type TypographyPairing = {
  id: number;
  name: string;
  headingFont: string;
  bodyFont: string;
  googleFontsUrl: string;
};

function parseArgs(argv: string[]): { source: string } {
  const args = new Map<string, string>();
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) {
      args.set(argv[i].slice(2), argv[i + 1]);
      i++;
    }
  }
  const source = args.get("source");
  if (!source) {
    throw new Error("Usage: npx tsx lib/design/build/validate-fonts.ts --source <path-to-uupm-clone-or-google-fonts.csv>");
  }
  return { source };
}

function resolveGoogleFontsCsvPath(source: string): string {
  const asFile = path.resolve(source);
  if (asFile.toLowerCase().endsWith(".csv")) return asFile;
  const insideClone = path.resolve(source, "src/ui-ux-pro-max/data/google-fonts.csv");
  if (existsSync(insideClone)) return insideClone;
  throw new Error(`Could not find google-fonts.csv at ${asFile} or ${insideClone}`);
}

function normalizeLineEndings(content: string): string {
  return content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

// Same direct RFC4180 parser as import-uupm.ts — google-fonts.csv's Keywords/Designers columns
// contain commas inside unquoted-looking text but the file itself quotes any field containing
// one, same convention as colors.csv/typography.csv.
function parseCsv(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  while (i < content.length) {
    const char = content[i];
    if (inQuotes) {
      if (char === '"' && content[i + 1] === '"') {
        field += '"';
        i += 2;
        continue;
      }
      if (char === '"') {
        inQuotes = false;
        i++;
        continue;
      }
      field += char;
      i++;
      continue;
    }
    if (char === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (char === ",") {
      row.push(field);
      field = "";
      i++;
      continue;
    }
    if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i++;
      continue;
    }
    field += char;
    i++;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

// Family -> set of style tokens Google actually serves for it, e.g. {"300","400","400i","700"}.
// google-fonts.csv's own Styles column already lists every discrete weight step for a variable
// family (confirmed by inspection: Outfit's wght axis is 100..900 and its Styles column lists
// all nine steps 100|200|...|900, not just the two endpoints) — so no separate variable-axis
// handling is needed here.
function loadGoogleFontsCatalogue(csvPath: string): Map<string, Set<string>> {
  const raw = normalizeLineEndings(readFileSync(csvPath, "utf8"));
  const rows = parseCsv(raw).filter((r) => r.length > 1 || r[0] !== "");
  const [header, ...dataRows] = rows;
  const famIdx = header.indexOf("Family");
  const stylesIdx = header.indexOf("Styles");
  if (famIdx === -1 || stylesIdx === -1) {
    throw new Error(`google-fonts.csv is missing expected "Family"/"Styles" columns. Got header: ${header.join(",")}`);
  }
  const byFamily = new Map<string, Set<string>>();
  for (const row of dataRows) {
    const family = row[famIdx];
    if (!family) continue;
    const styles = new Set(row[stylesIdx].split("|").map((s) => s.trim()).filter(Boolean));
    byFamily.set(family, styles);
  }
  return byFamily;
}

type WeightRequest = { weight: number; italic: boolean };
type FamilyRequest = { family: string; requests: WeightRequest[] };

// Parses one `family=Name[:AXES]` segment (already split out of the URL's query string) into
// the family name and the concrete weight/italic tokens it requests. Every format actually
// present across the 61 imported pairings' real googleFontsUrl values is handled:
//   family=Name                              -> weight 400, roman only (Google's own default)
//   family=Name:wght@W1;W2;...               -> each Wi, roman
//   family=Name:wght@W1..W2                  -> a variable-axis range; both endpoints checked
//   family=Name:ital,wght@0,W1;1,W2;...      -> italFlag,weight pairs
//   family=Name:ital@0;1                     -> italic toggle only, weight 400 both ways
// An axes form outside these five throws rather than silently skipping a check — the same
// "fail loudly on an unrecognised shape" discipline as import-uupm.ts's own header validation.
function parseFamilySegment(segment: string): FamilyRequest {
  const colonIdx = segment.indexOf(":");
  const namePart = colonIdx === -1 ? segment : segment.slice(0, colonIdx);
  const axes = colonIdx === -1 ? "" : segment.slice(colonIdx + 1);
  const family = decodeURIComponent(namePart.replace(/\+/g, " ")).trim();

  if (!axes) return { family, requests: [{ weight: 400, italic: false }] };

  if (axes.startsWith("wght@")) {
    const requests: WeightRequest[] = [];
    for (const token of axes.slice("wght@".length).split(";")) {
      if (token.includes("..")) {
        const [a, b] = token.split("..").map(Number);
        requests.push({ weight: a, italic: false }, { weight: b, italic: false });
      } else {
        requests.push({ weight: Number(token), italic: false });
      }
    }
    return { family, requests };
  }

  if (axes.startsWith("ital,wght@")) {
    const requests: WeightRequest[] = [];
    for (const token of axes.slice("ital,wght@".length).split(";")) {
      const [italFlag, w] = token.split(",");
      requests.push({ weight: Number(w), italic: italFlag === "1" });
    }
    return { family, requests };
  }

  if (axes.startsWith("ital@")) {
    return { family, requests: [{ weight: 400, italic: false }, { weight: 400, italic: true }] };
  }

  throw new Error(`Unrecognised Google Fonts URL axes segment: "${axes}" (from family segment "${segment}")`);
}

// Splits a full https://fonts.googleapis.com/css2?... URL into its family=... segments. Strips
// the shared &display=swap (and a bare display=swap on the last segment, which has no following
// &family= to delimit it) before splitting, so it never leaks into a family name.
function parseGoogleFontsUrl(url: string): FamilyRequest[] {
  const query = url.includes("css2?") ? url.split("css2?")[1] : url.split("css2")[1] ?? "";
  const cleaned = query.replace(/&?display=swap/g, "");
  const segments = cleaned
    .split("&family=")
    .map((seg, i) => (i === 0 ? seg.replace(/^family=/, "") : seg))
    .filter(Boolean);
  return segments.map(parseFamilySegment);
}

type Failure = { pairingId: number; pairingName: string; family: string; token: string; kind: "family" | "weight" };

function main() {
  const { source } = parseArgs(process.argv.slice(2));
  const googleFontsCsvPath = resolveGoogleFontsCsvPath(source);
  const catalogue = loadGoogleFontsCatalogue(googleFontsCsvPath);
  console.log(`Loaded ${catalogue.size} families from ${googleFontsCsvPath}.`);

  const typographyPath = path.resolve(__dirname, "../data/typography.json");
  const pairings = JSON.parse(readFileSync(typographyPath, "utf8")) as TypographyPairing[];

  const failures: Failure[] = [];
  let totalWeightChecks = 0;
  const familiesChecked = new Set<string>();

  for (const pairing of pairings) {
    let familyRequests: FamilyRequest[];
    try {
      familyRequests = parseGoogleFontsUrl(pairing.googleFontsUrl);
    } catch (err) {
      failures.push({
        pairingId: pairing.id,
        pairingName: pairing.name,
        family: "(unparseable URL)",
        token: (err as Error).message,
        kind: "family",
      });
      continue;
    }

    for (const { family, requests } of familyRequests) {
      familiesChecked.add(family);
      const styles = catalogue.get(family);
      if (!styles) {
        failures.push({ pairingId: pairing.id, pairingName: pairing.name, family, token: family, kind: "family" });
        continue;
      }
      for (const { weight, italic } of requests) {
        totalWeightChecks++;
        const token = italic ? `${weight}i` : String(weight);
        if (!styles.has(token)) {
          failures.push({ pairingId: pairing.id, pairingName: pairing.name, family, token, kind: "weight" });
        }
      }
    }
  }

  console.log(`Checked ${pairings.length} pairings, ${familiesChecked.size} distinct families referenced, ${totalWeightChecks} family/weight checks.`);

  if (failures.length > 0) {
    console.log(`\nFAILURES (${failures.length}):`);
    for (const f of failures) {
      if (f.kind === "family") {
        console.log(`  No.${f.pairingId} (${f.pairingName}): family "${f.family}" not found in google-fonts.csv`);
      } else {
        console.log(`  No.${f.pairingId} (${f.pairingName}): "${f.family}" weight/style token "${f.token}" not in its Styles list`);
      }
    }
  }

  console.log(`\nSUMMARY: ${familiesChecked.size - new Set(failures.filter((f) => f.kind === "family").map((f) => f.family)).size}/${familiesChecked.size} families resolved, ${totalWeightChecks - failures.filter((f) => f.kind === "weight").length}/${totalWeightChecks} weight/style checks passed.`);

  if (failures.length > 0) {
    console.log("Not patched — see docs/kondo-v2-execution.md's 2.1 entry.");
    process.exitCode = 1;
  }
}

main();
