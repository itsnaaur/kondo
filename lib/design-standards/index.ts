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

// Patterns that signal the brief is explicitly rejecting the generic/default
// execution of a feeling word ("professional but not generic", "trustworthy
// but not boring/corporate", "avoid cookie-cutter", "without looking cold").
const GENERIC_NEGATION_PATTERNS = [
  /\bnot\s+(too\s+)?(generic|boring|corporate|bland|cold|sterile|cookie[\s-]?cutter|template[d]?|cliche|dated|stock|old[\s-]?fashioned)\b/i,
  /\bavoid(ing)?\s+(a\s+|the\s+|any\s+)?(generic|boring|corporate|bland|cold|sterile|cookie[\s-]?cutter|template[d]?|cliche|dated|stock)\b/i,
  /\bwithout\s+(being\s+|looking\s+|feeling\s+)?(too\s+)?(generic|boring|corporate|bland|cold|sterile|dated|stock)\b/i,
];

type BrandToneInput = {
  personality?: string[] | null;
  voice?: string | null;
  emotionalImpression?: string | null;
} | null;

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

// The brief describes what the client wants the site to become; the audit's
// detected brand tone describes what the old site currently is. When both
// suggest archetypes, the brief's explicit ask takes priority.
function selectArchetypes(brandTone: BrandToneInput, briefText: string | null): string[] {
  const briefMatches = findMatchingArchetypes(briefText ?? "");
  const brandToneMatches = findMatchingArchetypes(
    [
      ...(brandTone?.personality ?? []),
      brandTone?.voice ?? "",
      brandTone?.emotionalImpression ?? "",
    ].join(" ")
  );

  const combined = [...briefMatches, ...brandToneMatches.filter((a) => !briefMatches.includes(a))];

  return combined.length > 0 ? combined.slice(0, MAX_ARCHETYPES) : [DEFAULT_ARCHETYPE];
}

function briefWantsToAvoidGeneric(briefText: string | null): boolean {
  if (!briefText) return false;
  return GENERIC_NEGATION_PATTERNS.some((pattern) => pattern.test(briefText));
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
