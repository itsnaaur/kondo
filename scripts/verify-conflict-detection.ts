// Persistent regression + calibration test for Call 0B's conflict detection
// (lib/generation/brief-synthesis.ts). Run manually with:
//   npx tsx --env-file=.env scripts/verify-conflict-detection.ts
//
// Two things have to stay true at once, so this keeps both test sets rather than
// picking one:
//   - REGRESSION_CASES pair a brief against a genuinely incompatible reference (calm/
//     minimal brief, loud/maximalist reference). These must keep producing non-empty
//     conflicts — if narrowing the conflict criteria ever drives this to zero, real
//     contradictions are being smoothed over again.
//   - CALIBRATION_CASES pair a brief against a reference the business would plausibly
//     and genuinely choose (same industry, same mood). These should land at zero (or
//     close to it) conflicts, with any residual tension routed to `resolved` (settled by
//     an evidence-weighting rule) or `confidence.gaps` (missing information) instead —
//     if this set keeps producing conflicts, the BRIEF_REVIEW checkpoint is effectively
//     unconditional and gets rubber-stamped rather than actually reviewed.
//
// A prior run (2026-07-27) found the first cut of REGRESSION_CASES (Oatly, Basecamp
// against a security-hardware brief) correctly produced 2 conflicts each. The first cut
// of CALIBRATION_CASES incorrectly also produced conflicts every time (2, 2, 3) — root
// cause was the conflicts field absorbing tensions that were actually gaps (missing
// assets) or already resolved by the existing evidence-weighting rules (non-locked
// equity colour losing to a chosen reference). Fixed by splitting the schema into three
// buckets (gap / resolved / conflict) instead of two. Re-run this script after any future
// change to brief-synthesis.ts's prompt or schema.

import { readFile, rm } from "fs/promises";
import { captureSiteVisualShots } from "@/lib/crawl/visual-shots";
import { analyzeVisualRead } from "@/lib/generation/visual-read";
import { synthesizeInterpretedBrief, type BriefSynthesisInput } from "@/lib/generation/brief-synthesis";
import type { VisualRead } from "@/lib/generation/visual-read-types";

const OUT_DIR = "C:\\Users\\acer\\AppData\\Local\\Temp\\claude\\verify-conflict-detection";

const BC_SECURITY_EXISTING_SITE_READ: VisualRead = {
  mode: "EXISTING_SITE",
  url: "https://bcsecurity.co.nz",
  first_impression: {
    word: "Generic",
    elaboration:
      "It reads as a competent but unremarkable installer brochure — a template stretched over a real business, not a considered identity.",
  },
  mechanism: [
    "Stock-feeling hero photo with a heavy dark overlay and a centred quote modal that blocks it immediately on load",
    "Flat navy full-width band under the hero used as the only structural separator between sections",
    "Uniform sans-serif headings at similar weight/size with no real scale differentiation",
    "Three product tiles with mismatched image styles sitting side by side, undermining consistency",
  ],
  hierarchy: {
    order: ["Get-a-quote modal (forced)", "Hero headline/CTA behind it", "Products", "Partners", "Clients"],
    appropriate: false,
    note: "A blocking quote modal fires before the visitor has seen anything.",
  },
  type_read: {
    families: ["A generic system/UI sans for body and nav", "A slightly bolder sans for headings, same family"],
    has_real_scale: false,
    character: "Utilitarian and default.",
  },
  spacing: { systematic: false, density: "airy", rhythm_note: "Large unexplained blank gaps suggest broken content." },
  colour: {
    working_palette: [
      { hex: "#0d2b4e", role: "primary navy" },
      { hex: "#ffffff", role: "background" },
    ],
    accent: "Navy blue (#0d2b4e)",
    accent_discipline: "restrained",
  },
  mobile: { survives: false, issues: ["Product tile images fail to render"] },
  era: { reads_as: "Mid-2010s small-business WordPress template", dating_signals: ["Full-width flat-colour bands"] },
  identity: { default_family: "Generic WordPress business theme", deliberate: false },
  failures: [{ issue: "Get-a-quote modal auto-opens over the hero", kind: "function", cost: "high" }],
  equity: [{ asset: "Navy blue as primary brand colour", why_keep: "Reads as trustworthy/institutional" }],
};

const GENERIC_TEMPLATE_EXISTING_SITE_READ: VisualRead = {
  mode: "EXISTING_SITE",
  url: "https://example-client-site.test",
  first_impression: {
    word: "Generic",
    elaboration: "Reads like an off-the-shelf template that was never fully customised for this business.",
  },
  mechanism: [
    "Stock icon set paired with generic feature-card layout, repeated identically across sections",
    "No real type scale — headings and body copy sit at near-identical weight and size",
    "Inconsistent spacing rhythm between sections, some cramped and some oddly empty",
  ],
  hierarchy: {
    order: ["Hero headline/CTA", "Feature grid", "Social proof strip", "Footer CTA"],
    appropriate: true,
    note: "Hierarchy is conventional but flat — nothing signals what actually matters most.",
  },
  type_read: {
    families: ["A default system/UI sans used for both headings and body"],
    has_real_scale: false,
    character: "Utilitarian, template-default.",
  },
  spacing: { systematic: false, density: "balanced", rhythm_note: "Section spacing is inconsistent rather than deliberate." },
  colour: {
    working_palette: [
      { hex: "#1c2b3a", role: "primary dark" },
      { hex: "#ffffff", role: "background" },
      { hex: "#f4f4f4", role: "light grey section fill" },
    ],
    accent: "Mid-blue",
    accent_discipline: "scattered",
  },
  mobile: { survives: true, issues: ["Feature grid stacks awkwardly, large gaps between cards"] },
  era: { reads_as: "Generic 2020s SaaS-template feel", dating_signals: ["Repeated identical feature-card pattern", "Default icon set"] },
  identity: { default_family: "Generic template, no deliberate visual identity", deliberate: false },
  failures: [{ issue: "No real typographic hierarchy across sections", kind: "taste", cost: "medium" }],
  equity: [{ asset: "Primary dark blue colour", why_keep: "Already associated with the brand in existing materials" }],
};

type Case = {
  label: string;
  expect: "conflict" | "quiet";
  businessName: string;
  industry: string;
  positioning: string;
  audience: string;
  goal: string;
  existingSiteRead: VisualRead;
  referenceCandidates: string[];
  rawBriefText: string;
};

const REGRESSION_CASES: Case[] = [
  {
    label: "REGRESSION: calm/minimal brief vs Oatly (irreverent/loud)",
    expect: "conflict",
    businessName: "BC Security",
    industry: "Physical security systems integration (access control, CCTV, locks)",
    positioning: "A trusted, professional installer of security systems for B2B and residential clients.",
    audience: "Facility managers and homeowners who value reliability and trust over trendiness.",
    goal: "Replace a dated, broken-looking site with something that reflects a serious, trustworthy business.",
    existingSiteRead: BC_SECURITY_EXISTING_SITE_READ,
    // Fallback deliberately doesn't overlap with the Basecamp case below — if Oatly's
    // capture fails, this should try another loud/irreverent site, not silently become
    // a duplicate of the other regression case.
    referenceCandidates: ["https://www.oatly.com", "https://www.duolingo.com"],
    rawBriefText:
      "We want the new site to feel calm, minimal and elegant — very restrained, lots of whitespace, " +
      "no clutter, no bright colours, quiet and understated. Nothing loud or playful. We attached {REF} " +
      "as a reference site we like the feel of.",
  },
  {
    label: "REGRESSION: calm/minimal brief vs Basecamp (irreverent/loud)",
    expect: "conflict",
    businessName: "BC Security",
    industry: "Physical security systems integration (access control, CCTV, locks)",
    positioning: "A trusted, professional installer of security systems for B2B and residential clients.",
    audience: "Facility managers and homeowners who value reliability and trust over trendiness.",
    goal: "Replace a dated, broken-looking site with something that reflects a serious, trustworthy business.",
    existingSiteRead: BC_SECURITY_EXISTING_SITE_READ,
    referenceCandidates: ["https://www.basecamp.com", "https://www.mailchimp.com"],
    rawBriefText:
      "We want the new site to feel calm, minimal and elegant — very restrained, lots of whitespace, " +
      "no clutter, no bright colours, quiet and understated. Nothing loud or playful. We attached {REF} " +
      "as a reference site we like the feel of.",
  },
];

const CALIBRATION_CASES: Case[] = [
  {
    label: "CALIBRATION: developer-tool startup vs Linear (precise/engineered)",
    expect: "quiet",
    businessName: "Fictional dev-tools startup",
    industry: "B2B developer tooling / software",
    positioning: "A focused, technical product built by engineers for engineers.",
    audience: "Software engineers and technical decision-makers evaluating developer tools.",
    goal: "Replace a generic template site with one that reads as precise and technically credible.",
    existingSiteRead: GENERIC_TEMPLATE_EXISTING_SITE_READ,
    referenceCandidates: ["https://linear.app", "https://vercel.com"],
    rawBriefText:
      "We're a developer tools company. We want the new site to feel precise, minimal and " +
      "engineered — quiet confidence, letting the product speak for itself rather than " +
      "marketing hype. We attached {REF} as a reference for the feel we want.",
  },
  {
    label: "CALIBRATION: productivity-software company vs Notion (confident/plain-spoken)",
    expect: "quiet",
    businessName: "Fictional productivity software company",
    industry: "B2B/consumer productivity software",
    positioning: "A flexible workspace tool for teams and individuals.",
    audience: "Knowledge workers and small teams looking for a flexible tool.",
    goal: "Replace a generic template site with one that reads as confident and product-led.",
    existingSiteRead: GENERIC_TEMPLATE_EXISTING_SITE_READ,
    referenceCandidates: ["https://www.notion.so", "https://www.figma.com"],
    rawBriefText:
      "We're a productivity software company. We want the new site to feel confident and " +
      "plain-spoken — big clear typography, real product screenshots doing the talking, " +
      "minimal persuasion copy, not corporate or salesy. We attached {REF} as a reference " +
      "for the feel we want.",
  },
  {
    label: "CALIBRATION: early-stage startup vs YC (considered/authoritative)",
    expect: "quiet",
    businessName: "Fictional early-stage startup",
    industry: "Early-stage technology startup",
    positioning: "A small team building a new product, currently focused on credibility with investors and early customers.",
    audience: "Investors, early adopters and technical early customers.",
    goal: "Replace a generic template site with one that reads as considered and quietly authoritative.",
    existingSiteRead: GENERIC_TEMPLATE_EXISTING_SITE_READ,
    referenceCandidates: ["https://www.ycombinator.com", "https://a16z.com"],
    rawBriefText:
      "We're an early-stage startup. We want the new site to feel considered and quietly " +
      "authoritative, like an essay rather than a sales page — no feature grids, no urgency " +
      "tactics, let one clear statement carry the page. We attached {REF} as a reference for " +
      "the feel we want.",
  },
];

async function captureWithFallback(candidates: string[], slug: string) {
  for (const candidate of candidates) {
    const shots = await captureSiteVisualShots(candidate, OUT_DIR, slug);
    if (shots) return { url: candidate, shots };
  }
  return null;
}

type Result = {
  label: string;
  expect: "conflict" | "quiet";
  referenceUrl: string;
  conflicts: number;
  resolved: number;
  gaps: number;
  confidence: string;
};

async function buildSynthesisInput(c: Case, slug: string) {
  const captured = await captureWithFallback(c.referenceCandidates, slug);
  if (!captured) return null;
  const { url: referenceUrl, shots } = captured;
  console.log(`Reference: ${referenceUrl}`);

  const bytes = {
    desktop: (await readFile(shots.desktopPath)).toString("base64"),
    mobile: (await readFile(shots.mobilePath)).toString("base64"),
    hero: (await readFile(shots.heroPath)).toString("base64"),
    section: (await readFile(shots.sectionPath)).toString("base64"),
  };

  const referenceRead = await analyzeVisualRead(
    "REFERENCE_SITE",
    referenceUrl,
    `${c.businessName} — ${c.industry}. ${c.positioning} Client picked this as a reference they like.`,
    shots,
    bytes
  );
  console.log("Reference first_impression:", JSON.stringify(referenceRead.first_impression));

  const synthesisInput: BriefSynthesisInput = {
    rawBriefText: c.rawBriefText.replace("{REF}", referenceUrl),
    businessName: c.businessName,
    industry: c.industry,
    extractedPositioning: c.positioning,
    targetCustomer: c.audience,
    statedGoal: c.goal,
    existingSiteRead: c.existingSiteRead,
    pageCount: 12,
    pageTypes: ["home", "product", "pricing", "about", "blog", "contact"],
    wordCount: 4000,
    heaviestPageSummary: "Product and pricing pages carry substantial detail; blog has ongoing content.",
    referenceReads: [referenceRead],
    assetManifest: [{ filename: "logo.png", type: "LOGO" }],
    lockedColours: null,
    lockedFonts: null,
    lockedMarks: null,
    hardConstraints: "Output will be a standalone static site.",
  };

  return { referenceUrl, synthesisInput };
}

async function runCase(c: Case, slug: string): Promise<Result | null> {
  console.log(`\n=== ${c.label} ===`);
  const built = await buildSynthesisInput(c, slug);
  if (!built) {
    console.error(`SKIPPED — all reference candidates failed to capture`);
    return null;
  }
  const { referenceUrl, synthesisInput } = built;

  const interpretedBrief = await synthesizeInterpretedBrief(synthesisInput);
  console.log(
    `conflicts=${interpretedBrief.conflicts.length} resolved=${interpretedBrief.resolved.length} ` +
      `gaps=${interpretedBrief.confidence.gaps.length} confidence=${interpretedBrief.confidence.level}`
  );
  if (interpretedBrief.conflicts.length > 0) {
    console.log("conflicts:", JSON.stringify(interpretedBrief.conflicts, null, 2));
  }
  if (interpretedBrief.resolved.length > 0) {
    console.log("resolved:", JSON.stringify(interpretedBrief.resolved, null, 2));
  }

  return {
    label: c.label,
    expect: c.expect,
    referenceUrl,
    conflicts: interpretedBrief.conflicts.length,
    resolved: interpretedBrief.resolved.length,
    gaps: interpretedBrief.confidence.gaps.length,
    confidence: interpretedBrief.confidence.level,
  };
}

// --repeat=N mode: capture + Call 0A run ONCE, then call synthesizeInterpretedBrief N
// times on the byte-identical input. Isolates Call 0B's own routing stochasticity from
// capture/Call-0A variance — the question this answers is "given the exact same evidence,
// how often does the routing decision (conflict vs resolved vs quiet) change?"
async function runStabilityMeasurement(c: Case, slug: string, repeat: number): Promise<void> {
  console.log(`\n=== STABILITY (x${repeat}): ${c.label} ===`);
  const built = await buildSynthesisInput(c, slug);
  if (!built) {
    console.error(`SKIPPED — all reference candidates failed to capture`);
    return;
  }
  const { synthesisInput } = built;

  const runs: Array<{ conflicts: number; resolved: number; gaps: number; confidence: string }> = [];
  for (let i = 1; i <= repeat; i++) {
    const interpretedBrief = await synthesizeInterpretedBrief(synthesisInput);
    const summary = {
      conflicts: interpretedBrief.conflicts.length,
      resolved: interpretedBrief.resolved.length,
      gaps: interpretedBrief.confidence.gaps.length,
      confidence: interpretedBrief.confidence.level,
    };
    runs.push(summary);
    console.log(
      `  run ${i}/${repeat}: conflicts=${summary.conflicts} resolved=${summary.resolved} ` +
        `gaps=${summary.gaps} confidence=${summary.confidence}`
    );
    if (interpretedBrief.conflicts.length > 0) {
      console.log(`    conflicts: ${interpretedBrief.conflicts.map((x) => x.description).join(" | ")}`);
    }
  }

  const conflictCounts = runs.map((r) => r.conflicts);
  const min = Math.min(...conflictCounts);
  const max = Math.max(...conflictCounts);
  const firedCount = runs.filter((r) => r.conflicts > 0).length;
  console.log(
    `\nSpread over ${repeat} runs: conflicts.length ranged ${min}-${max}; ` +
      `${firedCount}/${repeat} runs produced at least one conflict.`
  );

  // The question that matters for the BRIEF_REVIEW gate is binary — did this fire at all
  // — not the exact count. A model listing 2 facets of the same real tension in one run
  // and 3 in another is normal generative variance in how it articulates a conflict it
  // consistently found, not a routing problem. Report the two separately instead of
  // collapsing them into one verdict, which previously made a stable routing decision
  // look unstable just because the count wobbled.
  if (firedCount > 0 && firedCount < repeat) {
    console.log(
      "UNSTABLE ROUTING: identical input triggered BRIEF_REVIEW on some runs and not others " +
        "— the same client situation could get human review or skip it depending on chance."
    );
  } else {
    console.log(
      `STABLE ROUTING: every run ${firedCount === repeat ? "triggered" : "skipped"} BRIEF_REVIEW's conflict condition.`
    );
    if (min !== max) {
      console.log(
        `(conflicts.length count varied ${min}-${max} across runs — expected variance in how many ` +
          "facets of the same tension get articulated, not a routing concern.)"
      );
    }
  }
}

// Optional --only=oatly,linear filter (case-insensitive substring match against each
// case's label) so a single misfiring case can be re-verified after a prompt tweak
// without re-running (and re-paying for) the whole suite.
const onlyArg = process.argv.find((a) => a.startsWith("--only="));
const onlyFilters = onlyArg ? onlyArg.slice("--only=".length).split(",").map((s) => s.trim().toLowerCase()) : null;
function matchesFilter(label: string): boolean {
  return !onlyFilters || onlyFilters.some((f) => label.toLowerCase().includes(f));
}

// Optional --repeat=N — requires --only to also narrow to exactly one case. Runs
// runStabilityMeasurement instead of the normal single-pass suite.
const repeatArg = process.argv.find((a) => a.startsWith("--repeat="));
const repeatCount = repeatArg ? parseInt(repeatArg.slice("--repeat=".length), 10) : null;

async function main() {
  if (repeatCount) {
    const allCases = [...REGRESSION_CASES, ...CALIBRATION_CASES].filter((c) => matchesFilter(c.label));
    if (allCases.length !== 1) {
      console.error(
        `--repeat requires --only to match exactly one case; matched ${allCases.length}: ` +
          allCases.map((c) => c.label).join(", ")
      );
      process.exit(1);
    }
    await runStabilityMeasurement(allCases[0], "stability", repeatCount);
    await rm(OUT_DIR, { recursive: true, force: true });
    return;
  }

  const results: Result[] = [];

  for (const [i, c] of REGRESSION_CASES.entries()) {
    if (!matchesFilter(c.label)) continue;
    const r = await runCase(c, `regression${i + 1}`);
    if (r) results.push(r);
  }
  for (const [i, c] of CALIBRATION_CASES.entries()) {
    if (!matchesFilter(c.label)) continue;
    const r = await runCase(c, `calibration${i + 1}`);
    if (r) results.push(r);
  }

  console.log("\n=== SUMMARY ===");
  for (const r of results) {
    console.log(
      `[${r.expect}] ${r.label} [${r.referenceUrl}]: conflicts=${r.conflicts} resolved=${r.resolved} gaps=${r.gaps} confidence=${r.confidence}`
    );
  }

  const regressionFailures = results.filter((r) => r.expect === "conflict" && r.conflicts === 0);
  const calibrationFailures = results.filter((r) => r.expect === "quiet" && r.conflicts > 0);

  console.log(`\nRegression cases with conflicts: ${results.filter((r) => r.expect === "conflict" && r.conflicts > 0).length}/${results.filter((r) => r.expect === "conflict").length}`);
  console.log(`Calibration cases still producing conflicts: ${calibrationFailures.length}/${results.filter((r) => r.expect === "quiet").length}`);

  await rm(OUT_DIR, { recursive: true, force: true });

  if (regressionFailures.length > 0) {
    console.error("\nFAIL: a genuinely conflicting case produced zero conflicts — conflict detection has been over-tightened.");
    process.exitCode = 1;
  }
  if (calibrationFailures.length > 0) {
    console.error("\nWARNING: a genuinely aligned case still produced conflicts — BRIEF_REVIEW risks being effectively unconditional.");
  }
}

main().catch(async (e) => {
  console.error(e);
  await rm(OUT_DIR, { recursive: true, force: true }).catch(() => {});
  process.exit(1);
});
