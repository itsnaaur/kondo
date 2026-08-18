// Task 3.4. Build plan §6.4's other half of the token split: "the model owns markup only."
// One forced tool call, same pattern as structure-and-rewrite.ts (the extraction call) and
// classify-images.ts (Task 1.8) — output_config effort high, tool_choice forcing a single
// tool, withTransientRetry wrapping the API call, an outer attempt loop feeding a
// correctionNote back on failure. §8's explicit architecture rule: "Do not let the model
// author CSS" — this module's whole job is making that true by construction, not by asking
// nicely: the model is never shown a colour value (see toMarkupDesignInput below), the tool
// schema's only field is a markup string, and every rule in the system prompt is enforced by
// what information the model even has access to, not just by instruction text it could ignore.
//
// SCOPE NOTE: build plan §6.5's full validation gate (well-formed HTML, banned tags, contrast,
// mode coherence, image provenance, no empty sections) is explicitly Task 3.5's job, not this
// one's — this task's own instruction says so directly ("3.5's validator will assert them").
// `auditMarkup` below is a lightweight, regex-based reporting aid that exists ONLY to make this
// task's own honest-disclosure requirement possible (did the model follow the four constraints,
// report it rather than silently patch around it) — it never gates a retry, and it is not a
// substitute for 3.5's real, tested, HTML-parsing validator.
//
// FOUR CONSTRAINTS FROM THE TASK, ADDRESSED DIRECTLY:
// 1. data-kondo-section on every top-level section — required by the system prompt below,
//    checked (not enforced) by auditMarkup, because section-editor.ts's whole mechanism
//    (lib/templates/section-editor.ts's ATTR_MARKER scan) depends on it and has zero fallback
//    for an unmarked section.
// 2. CLASS_VOCABULARY read directly from lib/design/generate-stylesheet.ts (Task 3.3's own
//    export), interpolated into the system prompt at call time — never hand-copied, so the
//    two files cannot drift.
// 3. Forced tool use, withTransientRetry reused verbatim from lib/ai/anthropic-retry.ts.
// 4. No colour values, no <style>, no inline styles — enforced two ways: the model is
//    structurally never given a Palette (MarkupDesignInput has no such field, see
//    toMarkupDesignInput's own comment), and the system prompt states the rule explicitly;
//    auditMarkup checks for violations of both after the fact, for honest reporting.

import Anthropic from "@anthropic-ai/sdk";
import { withTransientRetry } from "@/lib/ai/anthropic-retry";
import { normalizeStringifiedJson } from "@/lib/ai/json-tool-utils";
import { CLASS_VOCABULARY } from "@/lib/design/generate-stylesheet";
import type { ResolveDesignSystemResult } from "@/lib/design/resolve-design-system";
import type { ImageRole, RoleAssignment, RoleAssignmentInput } from "./assign-image-roles";
import type { ImageClassificationSubject } from "./classify-images";
import type {
  ContentService,
  ContentTestimonial,
  ContentStat,
  ContentFaq,
  ContentDifferentiator,
  ContentProcessStep,
  ContentServiceArea,
  ContentHours,
  ContentOffer,
  ContentCredential,
} from "./types";

const TOOL_NAME = "generate_markup";
const MAX_ATTEMPTS = 3;
// Build plan §6.4's own stated budget for the markup half is "~4,000-6,000 tokens, comfortably
// inside budget" — set meaningfully above the task's own 8,000-token done-when bar so a
// genuine completion under 8,000 is distinguishable from "would have kept going but got cut at
// exactly the ceiling I chose." stop_reason === "max_tokens" is a hard failure either way.
const MAX_OUTPUT_TOKENS = 10_000;

// ---------- design system input, deliberately colour-free ----------

// Deliberately NOT `Palette` or the full DesignSystem/NeutralSystem — this type has no colour
// field at all, on purpose. The prompt-building code below can never accidentally interpolate
// a hex/hsl value into the model's context, because there is nothing on this type to read one
// from. That is a stronger guarantee than "the prompt just doesn't mention colour" would be —
// it holds even if a future edit to this file gets careless.
export type MarkupDesignInput = {
  vertical: string | null;
  typographyName: string;
  styleBundleName: string;
  styleBundleDescription: string;
  sectionRhythm: string;
  imageAspectPreference: string;
  // null when resolveDesignSystem returned ok:false — a NeutralSystem has no pattern to score.
  patternEligibility: { status: string; reasons: string[] } | null;
};

// The one place Palette gets dropped. Everything else this module touches is typed without a
// colour field at all (see MarkupDesignInput above) specifically so nothing downstream of this
// function can reach one even by accident.
export function toMarkupDesignInput(result: ResolveDesignSystemResult): MarkupDesignInput {
  const system = result.ok ? result.system : result.partial;
  return {
    vertical: result.ok ? result.system.vertical : null,
    typographyName: system.typography.name,
    styleBundleName: system.styleBundle.name,
    styleBundleDescription: system.styleBundle.description,
    sectionRhythm: system.styleBundle.tokens.sectionRhythm,
    imageAspectPreference: system.styleBundle.tokens.imageTreatment.aspectPreference,
    patternEligibility: result.ok
      ? { status: result.system.patternEligibility.status, reasons: result.system.patternEligibility.reasons }
      : null,
  };
}

// ---------- content record input ----------

// A direct 1:1 read off ContentRecord's own JSON-column shapes (lib/content/types.ts) — the
// caller parses ContentRecord's Json columns into these typed arrays; this module doesn't touch
// Prisma at all. Scalar fields only the ones a landing page markup generator actually needs —
// detectedIndustry is deliberately absent here (it already fed resolveDesignSystem's own
// vertical classification; MarkupDesignInput.vertical is its resolved output, not the raw text).
export type MarkupContentInput = {
  businessName: string | null;
  tagline: string | null;
  aboutCopy: string | null;
  ctaLabel: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  contactAddress: string | null;
  services: ContentService[];
  testimonials: ContentTestimonial[];
  stats: ContentStat[];
  faqs: ContentFaq[];
  differentiators: ContentDifferentiator[];
  process: ContentProcessStep[];
  serviceAreas: ContentServiceArea[];
  hours: ContentHours[];
  offers: ContentOffer[];
  credentials: ContentCredential[];
};

// Every array field has its own `flagged` boolean (lib/content/types.ts) — dropping flagged
// items before they ever reach the model, rather than sending them with a caveat, since a
// markup-writing model has no mechanism to visually distinguish "trustworthy" from "flagged"
// content on a page the way a human reviewer's UI does (ContentReviewForm's ConfidenceBadge).
function dropFlagged<T extends { flagged: boolean }>(items: T[]): T[] {
  return items.filter((item) => !item.flagged);
}

export function filterMarkupContent(content: MarkupContentInput): MarkupContentInput {
  return {
    ...content,
    services: dropFlagged(content.services),
    testimonials: dropFlagged(content.testimonials),
    stats: dropFlagged(content.stats),
    faqs: dropFlagged(content.faqs),
    differentiators: dropFlagged(content.differentiators),
    process: dropFlagged(content.process),
    serviceAreas: dropFlagged(content.serviceAreas),
    hours: dropFlagged(content.hours),
    offers: dropFlagged(content.offers),
    credentials: dropFlagged(content.credentials),
  };
}

// ---------- image manifest ----------

export type ManifestImage = {
  assetId: string;
  url: string;
  role: ImageRole;
  widthPx: number | null;
  heightPx: number | null;
  subject: ImageClassificationSubject | null;
  // Doubles as alt text, per classify-images.ts's own ImageClassification.caption comment —
  // reused here for exactly that purpose, not a separate field this module invents.
  altText: string | null;
  // Task 3.7c. 1.8's classify-images.ts computes this (normalised 0-1, image's main visual
  // interest) for every classified image and it has sat unused ever since — buildImageManifest
  // below read subject/caption off the same classification object but dropped focalPoint on the
  // floor. Threaded through now so the model can pick a .obj-top/.obj-bottom/.obj-left/.obj-right
  // modifier instead of every cropped image defaulting to a centred crop regardless of where its
  // actual subject sits.
  focalPoint: { x: number; y: number } | null;
};

// "The image manifest with assigned roles" the task names as an input — this join (Asset URL +
// RoleAssignmentInput's own metrics/classification + assignImageRoles' own verdict) does not
// exist anywhere else in the codebase (confirmed before writing this: lib/content/run-analysis.ts
// calls assignImageRoles but only ever reads .role off the result, never persists or joins it
// against Asset; the real analogous join pattern is to-template-content.ts's assetById Map, over
// the OLDER ContentImage-shaped data, not this one) — new, disclosed infrastructure this task
// needed in order to have a real manifest to call generateMarkup with at all.
export function buildImageManifest(
  inputs: RoleAssignmentInput[],
  assignments: RoleAssignment[],
  urlByAssetId: Map<string, string>
): ManifestImage[] {
  const inputById = new Map(inputs.map((i) => [i.assetId, i]));
  const manifest: ManifestImage[] = [];
  for (const a of assignments) {
    // Never offered to the model at all — the structural equivalent of §6.5's eventual "nothing
    // marked unusable" check, satisfied here by construction rather than left for 3.5 to catch.
    if (a.role === "unusable") continue;
    const url = urlByAssetId.get(a.assetId);
    if (!url) continue;
    const input = inputById.get(a.assetId);
    manifest.push({
      assetId: a.assetId,
      url,
      role: a.role,
      widthPx: input?.metrics?.width ?? null,
      heightPx: input?.metrics?.height ?? null,
      subject: input?.classification?.subject ?? null,
      altText: input?.classification?.caption ?? null,
      focalPoint: input?.classification?.focalPoint ?? null,
    });
  }
  return manifest;
}

// ---------- prompt construction ----------

// Real production vocabulary already in use by the three (3.8-doomed) templates' own
// data-kondo-section values (grepped directly from lib/templates/{atlas,ledger,showcase}/
// index.ts), and the exact key set lib/templates/section-editor.ts's own SECTION_LABELS display
// map was built from. Offered as existing convention, not a mandatory enum — section-editor.ts's
// own key type is a free string, and a genuinely different section this vocabulary doesn't name
// is still valid; SECTION_LABELS just falls back to the raw key as its own label in that case.
const KNOWN_SECTION_KEYS = [
  "nav", "hero", "why", "services", "process", "about",
  "reviews", "faq", "partners", "deep", "feature", "mosaic", "cta", "footer",
];

function buildSystemPrompt(classVocabulary: { className: string; description: string }[]): string {
  const vocabLines = classVocabulary.map((c) => `  ${c.className} — ${c.description}`).join("\n");
  return (
    "You write semantic HTML markup for a single business's landing-page concept. You never write CSS.\n\n" +
    "You are given: the business's real, extracted content (ground every claim in it — never invent " +
    "a service, testimonial, stat, or credential that isn't present); a manifest of real images " +
    "already assigned a role (hero, gallery, team, etc.) — only reference an image by its exact URL " +
    "from that manifest, never invent one; and a fixed CSS class vocabulary that is the ONLY way to " +
    "express colour, layout, or shape on this page.\n\n" +
    "CSS CLASS VOCABULARY — use these, and only these, for every visual decision:\n" +
    vocabLines +
    "\n\n" +
    "RULES, NO EXCEPTIONS:\n" +
    "- Never write a <style> tag, a style=\"\" attribute, or any literal colour value — no hex codes, " +
    "no rgb()/rgba()/hsl()/hsla(), no named CSS colours like \"red\" or \"navy\". Colour and shape " +
    "come entirely from the class vocabulary above; you are never deciding a colour value yourself.\n" +
    "- Never write <script>, <iframe>, <object>, <embed>, <form>, an inline event handler attribute " +
    "(onclick=, onload=, etc.), or a javascript:/data: URI.\n" +
    "- Every top-level section of the page must be exactly one <header>/<section>/<footer> element " +
    "carrying a data-kondo-section=\"key\" attribute on its own opening tag, where key is a short, " +
    "lowercase, hyphenated identifier. Existing convention, not a mandatory list — use whichever " +
    `keys genuinely describe this page's real sections: ${KNOWN_SECTION_KEYS.join(", ")}.\n` +
    "- Give every <img> real, specific alt text — use the manifest's own caption where one is present.\n" +
    "- Output body-level markup only. No <html>, <head>, or <body> wrapper tags — those are added " +
    "separately by the page shell."
  );
}

function buildUserText(design: MarkupDesignInput, content: MarkupContentInput, images: ManifestImage[]): string {
  const lines = [
    `Business: ${content.businessName ?? "(name unknown)"}`,
    `Detected vertical: ${
      design.vertical ??
      "(unmatched — no vertical could be classified; write generic, content-led framing rather than industry-specific jargon)"
    }`,
    `Typography mood: ${design.typographyName}`,
    `Style direction: ${design.styleBundleName} — ${design.styleBundleDescription} ` +
      `(section rhythm: ${design.sectionRhythm}; preferred image aspect: ${design.imageAspectPreference})`,
  ];
  if (design.patternEligibility) {
    lines.push(
      `Pattern eligibility signal: ${design.patternEligibility.status}` +
        (design.patternEligibility.reasons.length ? ` (${design.patternEligibility.reasons.join("; ")})` : "")
    );
  }
  lines.push(
    "",
    "CONTENT RECORD (ground every claim in this — do not invent anything beyond it):",
    JSON.stringify(content, null, 2),
    "",
    "IMAGE MANIFEST (only reference these exact URLs; never invent one):",
    JSON.stringify(images, null, 2)
  );
  return lines.join("\n");
}

function buildMarkupTool(): Anthropic.Tool {
  return {
    name: TOOL_NAME,
    description:
      "Return the complete semantic HTML body markup for this business's landing-page concept, " +
      "written entirely against the supplied CSS class vocabulary — no CSS, no colour values, no " +
      "inline styles, every top-level section carrying its own data-kondo-section attribute.",
    input_schema: {
      type: "object",
      required: ["html"],
      properties: {
        html: {
          type: "string",
          description:
            "Complete body-level HTML markup. Every top-level section is a <header>/<section>/" +
            '<footer> element carrying its own data-kondo-section="key" attribute. No <style>, no ' +
            'style="", no literal colour values, no <script>/<iframe>/<form>/<object>/<embed>, no ' +
            "inline event handlers.",
        },
      },
    },
  };
}

// ---------- lightweight, reporting-only audit (see the file header's scope note) ----------

export type MarkupAuditFinding = { severity: "error" | "warning"; message: string };

function flattenKnownClasses(vocabulary: { className: string }[]): Set<string> {
  const set = new Set<string>();
  for (const entry of vocabulary) {
    for (const token of entry.className.split(".").filter(Boolean)) set.add(token);
  }
  return set;
}

// Regex heuristics over the raw HTML string, deliberately not a real HTML parser — the same
// pragmatic choice section-editor.ts already made for this exact file format. Never gates a
// retry (see file header) — exists only so this task's own real findings can be reported with
// something more concrete than "I read it and it looked fine."
export function auditMarkup(html: string, knownClasses: Set<string>): MarkupAuditFinding[] {
  const findings: MarkupAuditFinding[] = [];

  if (/<style[\s>]/i.test(html)) findings.push({ severity: "error", message: "contains a <style> tag" });
  if (/\sstyle\s*=/i.test(html)) findings.push({ severity: "error", message: "contains an inline style= attribute" });
  if (/#[0-9a-f]{3,8}\b/i.test(html)) findings.push({ severity: "error", message: "contains a hex colour literal" });
  if (/\b(rgb|rgba|hsl|hsla)\s*\(/i.test(html)) {
    findings.push({ severity: "error", message: "contains an rgb()/hsl()-style colour function" });
  }
  for (const tag of ["script", "iframe", "object", "embed", "form"]) {
    if (new RegExp(`<${tag}[\\s>]`, "i").test(html)) {
      findings.push({ severity: "error", message: `contains a banned <${tag}> tag` });
    }
  }
  if (/\son[a-z]+\s*=/i.test(html)) findings.push({ severity: "error", message: "contains an inline event handler attribute" });
  if (/(javascript:|data:text\/html)/i.test(html)) findings.push({ severity: "error", message: "contains a javascript:/data: URI" });

  const topLevelTagCount = (html.match(/<(header|section|footer)[\s>]/gi) ?? []).length;
  const markerCount = (html.match(/data-kondo-section="/g) ?? []).length;
  if (markerCount === 0) {
    findings.push({ severity: "error", message: "no data-kondo-section attributes found at all" });
  } else if (markerCount < topLevelTagCount) {
    findings.push({
      severity: "warning",
      message: `${topLevelTagCount} header/section/footer tags but only ${markerCount} data-kondo-section markers — some may be missing one`,
    });
  }

  const usedClasses = new Set<string>();
  for (const m of html.matchAll(/class="([^"]*)"/g)) {
    for (const c of m[1].split(/\s+/).filter(Boolean)) usedClasses.add(c);
  }
  const unknown = [...usedClasses].filter((c) => !knownClasses.has(c));
  if (unknown.length > 0) {
    findings.push({ severity: "warning", message: `classes not in CLASS_VOCABULARY: ${unknown.join(", ")}` });
  }

  return findings;
}

// ---------- the call itself ----------

export type GenerateMarkupResult = {
  html: string;
  stopReason: string;
  outputTokens: number;
  inputTokens: number;
  attemptsUsed: number;
  findings: MarkupAuditFinding[];
};

export async function generateMarkup(
  design: MarkupDesignInput,
  content: MarkupContentInput,
  images: ManifestImage[]
): Promise<GenerateMarkupResult> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const systemPrompt = buildSystemPrompt(CLASS_VOCABULARY);
  const userText = buildUserText(design, content, images);
  const tool = buildMarkupTool();
  const knownClasses = flattenKnownClasses(CLASS_VOCABULARY);

  let lastError: Error | null = null;
  let correctionNote: string | null = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const result = await withTransientRetry(`generate-markup attempt ${attempt}`, async () => {
        const stream = anthropic.messages.stream({
          model: "claude-sonnet-5",
          max_tokens: MAX_OUTPUT_TOKENS,
          output_config: { effort: "high" },
          system: systemPrompt,
          tools: [tool],
          tool_choice: { type: "tool", name: TOOL_NAME },
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: userText },
                ...(correctionNote
                  ? [
                      {
                        type: "text" as const,
                        text: `IMPORTANT: your previous attempt was rejected: ${correctionNote}. Try again, following every rule.`,
                      },
                    ]
                  : []),
              ],
            },
          ],
        });
        return stream.finalMessage();
      });

      console.log(
        `[generate-markup] attempt ${attempt}: stop_reason=${result.stop_reason} ` +
          `output_tokens=${result.usage.output_tokens}/${MAX_OUTPUT_TOKENS}`
      );

      if (result.stop_reason === "max_tokens") {
        throw new Error("Markup generation was cut off by the token limit.");
      }

      const toolUse = result.content.find(
        (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
      );
      if (!toolUse) throw new Error("Claude did not return a tool_use block.");

      const normalized = normalizeStringifiedJson(toolUse.input) as { html?: unknown };
      if (typeof normalized.html !== "string" || !normalized.html.trim()) {
        throw new Error("Claude's tool response is missing a non-empty html field.");
      }

      return {
        html: normalized.html,
        stopReason: result.stop_reason ?? "unknown",
        outputTokens: result.usage.output_tokens,
        inputTokens: result.usage.input_tokens,
        attemptsUsed: attempt,
        findings: auditMarkup(normalized.html, knownClasses),
      };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      correctionNote = lastError.message;
      console.error(`[generate-markup] attempt ${attempt}/${MAX_ATTEMPTS} failed:`, lastError.message);
    }
  }

  throw lastError ?? new Error("generateMarkup failed for an unknown reason.");
}
