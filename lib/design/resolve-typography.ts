// Task 2.2. Maps a business's mood signals and positioning tier to one typography pairing from
// the 61 rows lib/design/data/typography.json actually imported (Task 2.1). An explicit,
// hand-authored table — not BM25, not a fuzzy score over the full 61-row corpus. The uupm audit
// found the upstream retrieval layer fails against our verticals (build plan §3.3/§6.1); we are
// not porting it, we're replacing it with a small table we author and can reason about by
// reading it.
//
// THE PRODUCER OF THIS FUNCTION'S INPUTS DOES NOT EXIST YET. `moodSignals[]` and
// `positioningTier` are named in the build plan (§5.4) as fields of an extraction-call
// `classification` object that Phase 3's Task 5.4 has not been built. `MoodSignal` (a loose
// string, matched case-insensitively) and `PositioningTier` (the closed union below) are THIS
// task's own invented stand-in types, not 5.4's real contract — informed by real frequency
// analysis of typography.json's own moodKeywords/bestFor text (see this task's log entry,
// docs/kondo-v2-execution.md, 2.2, for the actual word-frequency data behind every canonical
// signal chosen below), not by guessing at what 5.4 will eventually emit. When 5.4 lands, either
// it needs to emit these tokens, or a translation layer needs to sit between it and this
// function — an open question, not resolved here, and not something an invented substitute data
// source should paper over.
//
// Table size: 13 of the 61 imported pairings, not all 61. Build plan §6.1 calls this "an
// explicit table from the imported pairings" — small enough to read start to finish and reason
// about, each entry checked by hand against MoodSignal/PositioningTier coverage rather than
// algorithmically generated. The other 48 rows are real, licensed, validated pairings this
// function simply doesn't route to yet — many (the CJK/Arabic/Hebrew/Thai multilingual rows,
// the crypto/web3/gaming/cyberpunk rows, the academic-archival and wedding-invitation rows) have
// no realistic path to an Australian SME service business (the five real clients this session
// has worked with throughout: a dental clinic, a security systems company, a family law firm, a
// property advisory, a waterproofing contractor) — see the log entry for the full list and why
// each was left out, not silently dropped.

import typographyData from "./data/typography.json";

type TypographyPairing = {
  id: number;
  name: string;
  category: string;
  headingFont: string;
  bodyFont: string;
  singleFamily: boolean;
  moodKeywords: string;
  bestFor: string;
  googleFontsUrl: string;
  cssImport: string;
  tailwindConfig: string;
  notes: string;
};

const PAIRINGS = typographyData as TypographyPairing[];

// This task's own invented stand-in for 5.4's classification.positioningTier — a closed union,
// unlike MoodSignal below, because "tier" reads as an inherently small ordered set (the same
// shape as this codebase's existing ConfidenceLevel low/medium/high), not an open descriptive
// vocabulary. Ordered low to high; the resolver doesn't currently use adjacency (a "premium"
// request that finds no premium-tagged entry for its matched mood falls through to ANY tier for
// that mood, not specifically to "luxury" or "mainstream" as a nearest neighbour — see
// resolveTypography's own comment on why).
export type PositioningTier = "accessible" | "mainstream" | "premium" | "luxury";

// A caller's raw mood signal, matched case-insensitively against TABLE entries' own declared
// MOOD_SIGNAL tokens below. Deliberately not a closed TS union (unlike PositioningTier) — this
// project has no evidence yet of what vocabulary 5.4 will actually emit, and a closed union
// would assert a false certainty about that. Unrecognised tokens are simply skipped during
// matching, never a type error.
export type MoodSignal = string;

export type ResolveTypographyInput = {
  moodSignals: MoodSignal[];
  positioningTier: PositioningTier;
};

export type TypographyResolution = {
  pairingId: number;
  slug: string;
  name: string;
  headingFont: string;
  bodyFont: string;
  googleFontsUrl: string;
  // The canonical mood signal that produced this match, or null when no input signal matched
  // anything in the table and the neutral default fired instead.
  matchedMoodSignal: string | null;
  isDefault: boolean;
};

type TableEntry = {
  pairingId: number;
  // Hand-authored, stable, kebab-case — the tie-break key build plan §6.1 requires ("keyed on
  // mood and tier, tie-broken by slug, never array order"). Never derived from the pairing's own
  // name or from this array's position, so reordering TABLE below (e.g. to group entries
  // differently) can never change which entry a tie resolves to.
  slug: string;
  moodSignals: MoodSignal[];
  positioningTiers: PositioningTier[];
};

// The canonical mood vocabulary this table actually covers, in a fixed, hand-chosen priority
// order — which signal wins when a caller's moodSignals[] contains more than one this table
// recognises. Not derived from word frequency automatically; chosen because "what a business
// literally sells itself as" (professional/legal/medical framing) should outrank a softer,
// more atmospheric adjective ("modern", "bold") when both are present, and "minimal" is the
// catch-all fallback family, checked last on purpose. This ordering is itself explicit and
// documented, not incidental array order — the "never array order" constraint is about
// TIE-BREAKING within an equally-good candidate pool (handled by slug below), not about this
// deliberate, stated precedence between different moods.
const MOOD_SIGNAL_PRIORITY: MoodSignal[] = [
  "professional",
  "traditional",
  "elegant",
  "bold",
  "friendly",
  "modern",
  "minimal",
];

// Chosen from real frequency data in typography.json's own moodKeywords/bestFor text (see this
// task's log entry) — not all 61 imported pairings are candidates, only these 13. Each entry's
// moodSignals/positioningTiers are a judgement call checked by hand against the pairing's own
// Notes/Best For columns, not re-derived from them programmatically.
const TABLE: TableEntry[] = [
  { pairingId: 2, slug: "modern-professional", moodSignals: ["professional", "modern"], positioningTiers: ["mainstream", "accessible"] },
  { pairingId: 29, slug: "legal-professional", moodSignals: ["traditional", "professional"], positioningTiers: ["premium", "mainstream"] },
  { pairingId: 30, slug: "medical-clean", moodSignals: ["friendly", "professional"], positioningTiers: ["accessible", "mainstream"] },
  { pairingId: 16, slug: "corporate-trust", moodSignals: ["professional"], positioningTiers: ["accessible", "mainstream"] },
  { pairingId: 31, slug: "financial-trust", moodSignals: ["professional", "bold"], positioningTiers: ["premium", "mainstream"] },
  { pairingId: 1, slug: "classic-elegant", moodSignals: ["elegant"], positioningTiers: ["luxury", "premium"] },
  { pairingId: 32, slug: "real-estate-luxury", moodSignals: ["elegant", "traditional"], positioningTiers: ["luxury"] },
  { pairingId: 8, slug: "wellness-calm", moodSignals: ["friendly"], positioningTiers: ["accessible", "mainstream"] },
  { pairingId: 11, slug: "geometric-modern", moodSignals: ["modern"], positioningTiers: ["mainstream"] },
  { pairingId: 5, slug: "minimal-swiss", moodSignals: ["minimal"], positioningTiers: ["accessible", "mainstream"] },
  { pairingId: 48, slug: "accessibility-first", moodSignals: ["minimal", "friendly"], positioningTiers: ["accessible"] },
  { pairingId: 7, slug: "bold-statement", moodSignals: ["bold"], positioningTiers: ["mainstream", "premium"] },
  { pairingId: 3, slug: "tech-startup", moodSignals: ["modern", "bold"], positioningTiers: ["mainstream"] },
];

// No-mood-match default. Same principle as build plan §5.5's "null as a first-class return" for
// vertical classification, but the resolution is different — a page has to render SOME font
// pairing (unlike a wrongly-derived brand colour, blank typography isn't a real option), so a
// forced neutral pick is the right call here in a way an abstention wasn't for 1.2's brand
// colour, and isn't for §5.5's own vertical resolver either. "Minimal Swiss" (pairing #5, Inter
// for both heading and body) is chosen specifically because its own moodKeywords column
// literally contains the word "neutral" (the only pairing in the whole 61-row imported set that
// does) — not picked for being first, smallest, or most boring, but because it is upstream's own
// stated description of itself as a safe, competent, non-committal choice. Single-family (Inter
// twice) is a feature here, not a shortcut: one font family is the least that can go visually
// wrong when nothing else is known about the business.
const DEFAULT_SLUG = "minimal-swiss";

function pairingFor(pairingId: number): TypographyPairing {
  const pairing = PAIRINGS.find((p) => p.id === pairingId);
  if (!pairing) {
    throw new Error(
      `resolve-typography.ts's TABLE references pairing id ${pairingId}, which is not in typography.json — table entry or import is out of sync.`
    );
  }
  return pairing;
}

function toResolution(entry: TableEntry, matchedMoodSignal: string | null): TypographyResolution {
  const pairing = pairingFor(entry.pairingId);
  return {
    pairingId: pairing.id,
    slug: entry.slug,
    name: pairing.name,
    headingFont: pairing.headingFont,
    bodyFont: pairing.bodyFont,
    googleFontsUrl: pairing.googleFontsUrl,
    matchedMoodSignal,
    isDefault: entry.slug === DEFAULT_SLUG && matchedMoodSignal === null,
  };
}

// Deterministic across repeated calls with identical input (this task's own done-when) — a pure
// function over TABLE/MOOD_SIGNAL_PRIORITY constants and the caller's input, no Date.now(), no
// Math.random(), no reliance on object/array iteration order beyond the explicit slug sort below.
export function resolveTypography(input: ResolveTypographyInput): TypographyResolution {
  const requested = new Set(input.moodSignals.map((s) => s.trim().toLowerCase()));

  for (const candidateSignal of MOOD_SIGNAL_PRIORITY) {
    if (!requested.has(candidateSignal)) continue;

    const pool = TABLE.filter((entry) => entry.moodSignals.includes(candidateSignal));
    if (pool.length === 0) continue; // unreachable given MOOD_SIGNAL_PRIORITY only lists tokens TABLE covers, kept as a fail-closed guard

    const tierMatched = pool.filter((entry) => entry.positioningTiers.includes(input.positioningTier));
    // Mood match matters more than tier match — an entry for the right mood but a tier it
    // doesn't explicitly cover is still a better answer than falling through to a different
    // mood entirely. Tier only narrows the pool when it can (tierMatched.length > 0); otherwise
    // every entry for this mood stays in contention.
    const candidates = tierMatched.length > 0 ? tierMatched : pool;

    // Tie-break by slug, never array order (build plan §6.1) — sorted explicitly every call,
    // not relying on TABLE's own declared order or Array.prototype.find's first-match behaviour.
    const winner = [...candidates].sort((a, b) => a.slug.localeCompare(b.slug))[0];
    return toResolution(winner, candidateSignal);
  }

  const fallback = TABLE.find((entry) => entry.slug === DEFAULT_SLUG);
  if (!fallback) throw new Error(`DEFAULT_SLUG "${DEFAULT_SLUG}" is not in TABLE — resolver misconfigured.`);
  return toResolution(fallback, null);
}

// Exported for tests / a future admin view — every pairing id TABLE references, in table order
// (not a claim about priority; just the literal list for iteration).
export function listTableEntries(): { pairingId: number; slug: string; name: string }[] {
  return TABLE.map((entry) => ({ pairingId: entry.pairingId, slug: entry.slug, name: pairingFor(entry.pairingId).name }));
}
