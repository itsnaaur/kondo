import { readFileSync } from "fs";
import path from "path";

const STANDARDS_DIR = path.join(process.cwd(), "lib", "design-standards");

const ARCHETYPE_KEYWORDS: Record<string, string[]> = {
  "Professional / trustworthy / corporate": [
    "professional",
    "trustworthy",
    "corporate",
    "formal",
    "reliable",
    "credible",
    "established",
    "authoritative",
    "business",
  ],
  "Modern / tech / innovative": [
    "modern",
    "tech",
    "innovative",
    "cutting-edge",
    "digital",
    "futuristic",
    "sleek",
    "startup",
  ],
  "Playful / friendly / approachable": [
    "playful",
    "friendly",
    "approachable",
    "fun",
    "casual",
    "welcoming",
    "cheerful",
    "lighthearted",
  ],
  "Luxurious / elegant / premium": [
    "luxurious",
    "luxury",
    "elegant",
    "premium",
    "sophisticated",
    "upscale",
    "refined",
    "exclusive",
    "high-end",
  ],
  "Bold / energetic / confident": [
    "bold",
    "energetic",
    "confident",
    "dynamic",
    "vibrant",
    "powerful",
    "assertive",
    "striking",
  ],
  "Calm / wellness / minimal": [
    "calm",
    "wellness",
    "minimal",
    "peaceful",
    "serene",
    "soothing",
    "gentle",
    "tranquil",
    "relaxed",
  ],
  "Warm / organic / natural": [
    "warm",
    "organic",
    "natural",
    "earthy",
    "authentic",
    "handcrafted",
    "grounded",
    "wholesome",
  ],
  "Creative / artistic / expressive": [
    "creative",
    "artistic",
    "expressive",
    "imaginative",
    "quirky",
    "eclectic",
    "unconventional",
    "whimsical",
  ],
};

const DEFAULT_ARCHETYPE = "Professional / trustworthy / corporate";
const MAX_ARCHETYPES = 2;

// Words that signal the generic/default execution of a feeling — flagged when a
// negation appears anywhere in the text *before* one of these within a short window,
// e.g. "professional but not generic", "not in the generic color", "avoid cookie-cutter",
// "without looking cold". Deliberately window-based rather than a strict adjacent-word
// regex, since real phrasing often has filler words between the negation and the target
// ("not in the generic color" — "not" and "generic" are 3 words apart).
const GENERIC_DESCRIPTORS = [
  "generic",
  "boring",
  "corporate",
  "bland",
  "cold",
  "sterile",
  "cookie-cutter",
  "cookie cutter",
  "templated",
  "template",
  "cliche",
  "dated",
  "stock",
  "old-fashioned",
  "old fashioned",
];
const GENERIC_NEGATION_WINDOW_CHARS = 30;

type BrandToneInput = {
  personality?: string[] | null;
  voice?: string | null;
  emotionalImpression?: string | null;
  designArchetype?: string | null;
} | null;

const KNOWN_ARCHETYPES = new Set(Object.keys(ARCHETYPE_KEYWORDS));

const NEGATION_WINDOW_CHARS = 20;
const NEGATION_WORDS = /\b(not|avoid|avoiding|without|never|no|non)\b/;

// A keyword only counts as a positive signal if it isn't immediately preceded
// by a negation ("avoid a corporate look" should not itself trigger the
// Professional/corporate archetype).
function hasUnnegatedMatch(haystack: string, keyword: string): boolean {
  let searchFrom = 0;
  while (true) {
    const index = haystack.indexOf(keyword, searchFrom);
    if (index === -1) return false;
    const window = haystack.slice(Math.max(0, index - NEGATION_WINDOW_CHARS), index);
    if (!NEGATION_WORDS.test(window)) return true;
    searchFrom = index + keyword.length;
  }
}

function findMatchingArchetypes(text: string): string[] {
  const haystack = text.toLowerCase();
  const matched: string[] = [];
  for (const [archetype, keywords] of Object.entries(ARCHETYPE_KEYWORDS)) {
    if (keywords.some((kw) => hasUnnegatedMatch(haystack, kw))) {
      matched.push(archetype);
    }
  }
  return matched;
}

// Priority: (1) explicit feeling-words in the brief's own text — always checked
// directly so a second, blended feeling isn't lost even if the narrative call
// only names one archetype; (2) the narrative analysis's own archetype pick —
// Claude reasoning over the actual screenshots/content/brief together, which
// covers far more real-world phrasing than a fixed keyword list ever can;
// (3) keyword-matching the detected brand tone, as a fallback when narrative
// analysis wasn't available (e.g. it failed, or ANTHROPIC_API_KEY was unset).
function selectArchetypes(brandTone: BrandToneInput, briefText: string | null): string[] {
  const briefMatches = findMatchingArchetypes(briefText ?? "");

  const narrativePick =
    brandTone?.designArchetype && KNOWN_ARCHETYPES.has(brandTone.designArchetype)
      ? [brandTone.designArchetype]
      : [];

  const brandToneMatches = findMatchingArchetypes(
    [
      ...(brandTone?.personality ?? []),
      brandTone?.voice ?? "",
      brandTone?.emotionalImpression ?? "",
    ].join(" ")
  );

  const combined = [...briefMatches, ...narrativePick, ...brandToneMatches].filter(
    (archetype, index, all) => all.indexOf(archetype) === index
  );

  return combined.length > 0 ? combined.slice(0, MAX_ARCHETYPES) : [DEFAULT_ARCHETYPE];
}

function briefWantsToAvoidGeneric(briefText: string | null): boolean {
  if (!briefText) return false;
  const haystack = briefText.toLowerCase();
  return GENERIC_DESCRIPTORS.some((word) => {
    let searchFrom = 0;
    while (true) {
      const index = haystack.indexOf(word, searchFrom);
      if (index === -1) return false;
      const window = haystack.slice(Math.max(0, index - GENERIC_NEGATION_WINDOW_CHARS), index);
      if (NEGATION_WORDS.test(window)) return true;
      searchFrom = index + word.length;
    }
  });
}

function extractSection(markdown: string, heading: string): string | null {
  const lines = markdown.split("\n");
  const startIndex = lines.findIndex((line) => line.trim() === heading);
  if (startIndex === -1) return null;

  const endIndex = lines
    .slice(startIndex + 1)
    .findIndex((line) => line.startsWith("## "));

  const section =
    endIndex === -1
      ? lines.slice(startIndex)
      : lines.slice(startIndex, startIndex + 1 + endIndex);

  return section.join("\n").trim();
}

function extractSections(markdown: string, headings: string[]): string[] {
  return headings
    .map((heading) => extractSection(markdown, heading))
    .filter((section): section is string => section !== null);
}

let cachedFiles: {
  color: string;
  typography: string;
  layout: string;
  antiPatterns: string;
  briefInterpretation: string;
} | null = null;

function loadFiles() {
  if (cachedFiles) return cachedFiles;
  cachedFiles = {
    color: readFileSync(path.join(STANDARDS_DIR, "color-palettes.md"), "utf-8"),
    typography: readFileSync(path.join(STANDARDS_DIR, "typography.md"), "utf-8"),
    layout: readFileSync(path.join(STANDARDS_DIR, "layout-patterns.md"), "utf-8"),
    antiPatterns: readFileSync(path.join(STANDARDS_DIR, "anti-patterns.md"), "utf-8"),
    briefInterpretation: readFileSync(
      path.join(STANDARDS_DIR, "brief-interpretation.md"),
      "utf-8"
    ),
  };
  return cachedFiles;
}

function stripTitle(markdown: string): string {
  const lines = markdown.split("\n");
  return lines.slice(1).join("\n").trim();
}

export function buildDesignStandardsSection(
  brandTone: BrandToneInput,
  briefText: string | null = null
): string {
  const archetypes = selectArchetypes(brandTone, briefText);
  const avoidGeneric = briefWantsToAvoidGeneric(briefText);
  const files = loadFiles();

  const archetypeHeadings = archetypes.map((name) => `## Archetype: ${name}`);

  const colorSections = extractSections(files.color, archetypeHeadings);
  const typographySections = extractSections(files.typography, archetypeHeadings);
  const layoutSections = extractSections(files.layout, archetypeHeadings);

  const universalTypography = extractSections(files.typography, [
    "## General rules (all archetypes)",
  ]);
  const universalLayout = extractSections(files.layout, [
    "## Motion guidance (all archetypes)",
    "## Spacing scale (all archetypes)",
    "## Responsive & mobile behavior (all archetypes)",
    "## Images & imagery treatment (all archetypes)",
    "## Page transitions (all archetypes)",
    "## Dark mode",
    "## Section arrangement checklist",
  ]);

  const lines: string[] = [
    "\n## Design standards to apply",
    `Matched archetype(s), from the brief's own words where it expressed a feeling and` +
      ` otherwise from the audit's detected brand tone: ${archetypes.join(", ")}. Use these as` +
      " the concrete starting point for color, type, and layout decisions instead of generic" +
      " defaults — evolve them to fit the client's actual detected brand where the audit found" +
      " one.",
  ];

  if (avoidGeneric) {
    lines.push(
      "",
      "**The brief explicitly asked to avoid the generic/default version of the feeling it" +
        " described** (e.g. \"professional but not generic\"). Treat this as a hard constraint:" +
        " do not use the \"Example instance\" color/type combinations below verbatim — pick a" +
        " different, still-valid instance of the same structure. See the \"Handling explicit" +
        " negations\" section under brief interpretation below."
    );
  }

  lines.push(
    "",
    "### Interpreting feeling-words in the brief",
    stripTitle(files.briefInterpretation),
    "",
    "### Habits to avoid",
    "Read this before laying out the page. Do not reach for these by default just because" +
      " they are the most common pattern — only use them when this specific client's content" +
      " actually justifies it.",
    stripTitle(files.antiPatterns),
    "",
    "### Color",
    ...colorSections,
    "",
    "### Typography",
    ...typographySections,
    ...universalTypography,
    "",
    "### Layout & interaction",
    ...layoutSections,
    ...universalLayout
  );

  return lines.join("\n");
}
