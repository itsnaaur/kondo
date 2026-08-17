// Task 3.2. The explicit keyword→vertical table build plan §5.5 calls for, replacing the
// killed BM25-snap-to-uupm-category approach (no stemming, no field weighting, our own
// vocabulary scores zero against theirs — §5.5's own stated reason). Small and hand-written,
// same "author it, read it start to finish, reason about it by hand" discipline as
// resolve-typography.ts's 13-row TABLE (Task 2.2) — NOT the 192-row uupm ui-reasoning.csv
// re-key, which build plan §3.3 defers deliberately and this file does not attempt.
//
// Input is detectedIndustry: string | null — confirmed free text with no enum, no fixed
// taxonomy, by execution-log Task 0.5 (a plain nullable Prisma String? column, the only
// existing constraint is non-emptiness at extraction time). This function's whole job is
// turning that free text into one of a small number of verticals, or honestly failing to.
//
// The 10 verticals below are informed by real, existing vocabulary already in this codebase —
// the three templates' own hand-authored TemplateMeta.industries[] lists (ledger/showcase/
// atlas meta.ts) — merged and deduplicated into one list, not invented from nothing. Those
// three lists die with lib/templates/ in Task 3.8; borrowing their WORDS here (not importing
// their code) is a legitimate, disclosed source, not a coincidence. This is still a starter
// list, not a validated taxonomy — no real pattern library exists yet (Task 3.1's own
// disclosure) for these verticals to route to, so "is this the right set of 10" has not been,
// and cannot yet be, tested against real pattern definitions.
export type Vertical =
  | "medical-dental"
  | "legal"
  | "financial-professional-services"
  | "real-estate-property"
  | "hospitality-food"
  | "trades-construction"
  | "beauty-wellness-fitness"
  | "automotive"
  | "technology-saas"
  | "education";

type VerticalKeywordEntry = { vertical: Vertical; keywords: string[] };

// Deterministic priority order = array order, checked top to bottom, first match wins — build
// plan §5.5's "deterministic priority order" requirement. A detectedIndustry matching more than
// one entry's keywords (e.g. "law and accounting firm" matches both legal and
// financial-professional-services) resolves to whichever entry is listed first, always, not to
// whichever is "more specific" — there is no specificity scoring here, on purpose, for the same
// reason resolveTypography's MOOD_SIGNAL_PRIORITY is a fixed hand-ordered list rather than a
// fuzzy score: a fixed order is auditable by reading it, a score is not.
const VERTICAL_TABLE: VerticalKeywordEntry[] = [
  {
    vertical: "medical-dental",
    keywords: ["medical", "dental", "dentist", "clinic", "health", "physio", "physiotherapy", "optometry", "optometrist", "chiropractic"],
  },
  {
    vertical: "legal",
    keywords: ["legal", "law firm", "lawyer", "attorney", "solicitor"],
  },
  {
    vertical: "financial-professional-services",
    keywords: ["accounting", "accountant", "bookkeeping", "financial advisory", "finance", "consulting", "consultant", "professional services", "advisory"],
  },
  {
    vertical: "real-estate-property",
    keywords: ["real estate", "realty", "realtor", "property"],
  },
  {
    vertical: "hospitality-food",
    keywords: ["restaurant", "cafe", "hotel", "hospitality", "venue", "catering", "bar", "bakery"],
  },
  {
    vertical: "trades-construction",
    keywords: ["construction", "contractor", "trade", "plumbing", "electrical", "landscaping", "roofing", "hvac", "builder", "waterproofing", "security systems", "engineering"],
  },
  {
    vertical: "beauty-wellness-fitness",
    keywords: ["salon", "spa", "beauty", "fitness", "gym", "yoga", "wellness"],
  },
  {
    vertical: "automotive",
    keywords: ["automotive", "auto repair", "car dealer", "mechanic", "marine"],
  },
  {
    vertical: "technology-saas",
    keywords: ["saas", "software", "technology", "tech startup", "app development"],
  },
  {
    vertical: "education",
    keywords: ["education", "school", "academy", "tutoring", "training"],
  },
];

// Matched case-insensitively via substring containment against detectedIndustry's free text —
// same matching style as resolveTypography's requested.has(candidateSignal), adjusted for
// substring rather than exact-token matching since detectedIndustry is a free-text descriptor
// ("residential and commercial dental clinic"), not a single normalized token.
//
// null is a first-class return, never a guess and never a sentinel value standing in for a
// real vertical — build plan §5.5's central point, restated here at the one function that
// actually produces it: a null detectedIndustry, an empty string, or real text matching none of
// VERTICAL_TABLE's keywords all return null, indistinguishably, because none of those cases
// give this function grounds to claim a specific vertical.
export function classifyVertical(detectedIndustry: string | null): Vertical | null {
  if (!detectedIndustry || !detectedIndustry.trim()) return null;

  const normalized = detectedIndustry.toLowerCase();
  for (const entry of VERTICAL_TABLE) {
    if (entry.keywords.some((kw) => normalized.includes(kw))) return entry.vertical;
  }
  return null;
}

// Exported for tests / a future admin view — every vertical this table can produce, in table
// order (not a claim about priority beyond what's already documented above).
export function listVerticals(): Vertical[] {
  return VERTICAL_TABLE.map((entry) => entry.vertical);
}
