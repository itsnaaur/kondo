// Task 3.13. Rebuilt around the tuned free-CSS prompt validated real, end to end, across Tasks
// 3.9-3.12 before this task ever touched production code — 3.9 found the token-split
// architecture (this file writing markup only, lib/design/generate-stylesheet.ts writing CSS by
// construction) cost real design quality for a validator that could not actually check
// free-composed CSS; 3.10/3.10a/3.11/3.12 built and tuned the real gate and the real prompt in
// that order, ending at a real, measured 7/10 rendered-AA-clean rate (3.12's own log entry) against
// a 3/10 baseline for the untuned prompt, both measured through the same, real, unmodified
// validator this file's own output now runs through unchanged. See 3.13's own log entry for what
// still depends on generate-stylesheet.ts/CLASS_VOCABULARY now that this file no longer does (the
// fallback renderer does not — it uses lib/design/resolve-tokens.ts's TemplateTokens, a separate
// module never imported here).
//
// THE MODEL NOW OWNS MARKUP AND CSS, IN ONE CALL, DELIBERATELY. Where the pre-3.13 version of
// this file made "the model never sees a colour value" a structural guarantee (no Palette field
// reachable from its own input type), that guarantee is now backwards: colour, contrast safety,
// and section rhythm all depend on this file handing the model the real, resolved Palette and the
// real validated text-on-background pairs, and trusting the real, rendered gate
// (checkRenderedContrast, wired into validateGeneratedHtml since 3.10a) to catch what the prompt's
// own rules don't. One forced tool call, output_config effort high, tool_choice forcing the one
// tool, withTransientRetry wrapping the API call (unchanged pattern from structure-and-rewrite.ts/
// classify-images.ts), an outer attempt loop feeding a correctionNote back on any failure —
// SCOPE NOTE, UNCHANGED FROM BEFORE: the full validation gate is Task 3.5/3.10a's job, not this
// one's. auditMarkup below remains a lightweight, regex-based, non-gating disclosure aid over the
// `html` field only — it never gates a retry and is not a substitute for validateGeneratedHtml.

import Anthropic from "@anthropic-ai/sdk";
import { withTransientRetry } from "@/lib/ai/anthropic-retry";
import { normalizeStringifiedJson } from "@/lib/ai/json-tool-utils";
import type { Palette } from "./normalize-brand-colors";
import { VALIDATED_TEXT_PAIRS, paletteColorToHex } from "@/lib/design/validated-text-pairs";
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

const TOOL_NAME = "generate_page";
const MAX_ATTEMPTS = 3;
// 3.9/3.11/3.12's own real, measured token spend for this exact combined markup+CSS shape: min
// 9455, max 11700, mean 10449-10837 across three separate 10-run measurements — this ceiling is
// set to what was actually tested and validated real, not a fresh guess. Roughly double
// generate-markup.ts's pre-3.13 own 10,000 (markup-only), a real, quantified cost of the free-CSS
// approach 3.9 first measured and this task now adopts.
const MAX_OUTPUT_TOKENS = 16_000;

// ---------- design system input — now WITH colour, deliberately ----------

const NON_COLOR_PALETTE_KEYS = new Set(["derivedFrom"]);

function toKebabCase(role: string): string {
  return role.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
}

export type PageDesignInput = {
  vertical: string | null;
  palette: Palette;
  typographyHeadingFont: string;
  typographyBodyFont: string;
  typographyGoogleFontsUrl: string;
  styleBundleName: string;
  styleBundleDescription: string;
  sectionRhythm: string;
  // null when resolveDesignSystem returned ok:false — a NeutralSystem has no pattern to score.
  patternEligibility: { status: string; reasons: string[] } | null;
};

export function toPageDesignInput(result: ResolveDesignSystemResult): PageDesignInput {
  const system = result.ok ? result.system : result.partial;
  return {
    vertical: result.ok ? result.system.vertical : null,
    palette: system.palette,
    typographyHeadingFont: system.typography.headingFont,
    typographyBodyFont: system.typography.bodyFont,
    typographyGoogleFontsUrl: system.typography.googleFontsUrl,
    styleBundleName: system.styleBundle.name,
    styleBundleDescription: system.styleBundle.description,
    sectionRhythm: system.styleBundle.tokens.sectionRhythm,
    patternEligibility: result.ok
      ? { status: result.system.patternEligibility.status, reasons: result.system.patternEligibility.reasons }
      : null,
  };
}

// ---------- content record input (unchanged from pre-3.13) ----------

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

// ---------- image manifest (unchanged from pre-3.13) ----------

export type ManifestImage = {
  assetId: string;
  url: string;
  role: ImageRole;
  widthPx: number | null;
  heightPx: number | null;
  subject: ImageClassificationSubject | null;
  altText: string | null;
  focalPoint: { x: number; y: number } | null;
};

export function buildImageManifest(
  inputs: RoleAssignmentInput[],
  assignments: RoleAssignment[],
  urlByAssetId: Map<string, string>
): ManifestImage[] {
  const inputById = new Map(inputs.map((i) => [i.assetId, i]));
  const manifest: ManifestImage[] = [];
  for (const a of assignments) {
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

// Same real production vocabulary as pre-3.13 — grepped from the (3.8-deleted) templates' own
// data-kondo-section values, unchanged by this task.
const KNOWN_SECTION_KEYS = [
  "nav", "hero", "why", "services", "process", "about",
  "reviews", "faq", "partners", "deep", "feature", "mosaic", "cta", "footer",
];

function paletteToPromptLines(palette: Palette): string {
  return Object.entries(palette)
    .filter(([key]) => !NON_COLOR_PALETTE_KEYS.has(key))
    .map(([key, value]) => `  --${toKebabCase(key)}: ${paletteColorToHex(value as string)};  /* role: ${key} */`)
    .join("\n");
}

function validatedPairLines(): string {
  return VALIDATED_TEXT_PAIRS.map(
    (p) => `  --${toKebabCase(p.fg)} text on --${toKebabCase(p.bg)} background (${p.label})`
  ).join("\n");
}

// Every section below is real, tested prompt content — not freshly authored for this task.
// Palette/VALIDATED_TEXT_PAIRS/contrast rule/reference compositions/token-budget note: 3.11's own
// prompt (log entry, Part D). The two CSS-authoring rules (blanket resets, specificity ties):
// 3.12's own addition, added after 3.11's own two investigated failures named the exact mechanism
// each one closes. Banned tags/event handlers/URIs/data-kondo-section/image-reuse-at-most-once:
// carried over unchanged from this file's own pre-3.13 version (Task 3.4/3.7e).
function buildSystemPrompt(design: PageDesignInput): string {
  return (
    "You write a complete landing-page concept for a single real business — both the semantic HTML " +
    "body markup AND its own <style> block, written entirely in CSS you compose yourself. Compose " +
    "freely: asymmetric layouts, overlapping elements, offset images, real visual variety — whatever " +
    "the content genuinely warrants. You are not filling in a template.\n\n" +
    "PALETTE — the ONLY colours that exist on this page. Reference every one by CSS custom property " +
    `(var(--role-name)), never a literal hex/rgb/hsl value:\n${paletteToPromptLines(design.palette)}\n\n` +
    "TEXT-ON-BACKGROUND PAIRS — validated safe for real accessibility contrast (AA, 4.5:1). Every " +
    "piece of text on this page must use one of these exact role pairs for its colour+background:\n" +
    `${validatedPairLines()}\n\n` +
    "CONTRAST — a specific rule learned from real prior failures, not a general reminder. Across " +
    "real prior free-composed pages measured by rendering them in a real browser, EVERY genuine AA " +
    "contrast failure had the exact same shape: accent-coloured text (var(--accent)) placed on a " +
    "tinted accent background (var(--accent-soft)) or a dark elevated background (var(--deep-soft)) " +
    "instead of one of the validated pairs above. That specific combination looks fine at a glance " +
    "and fails a real contrast check every time it has been tried. Accent-coloured TEXT belongs only " +
    "on --paper or --mist backgrounds. If you want a coloured label, eyebrow, badge, or number on a " +
    "tinted or dark surface, use --ink or --paper for the TEXT there instead of --accent — never " +
    "accent text on accent-soft or deep-soft, under any circumstance, even inside a more specific " +
    "nested selector that overrides just the background, and even if you also build a separate, " +
    "correctly-scoped variant elsewhere — double check every real usage of an accent-text class " +
    "against the actual background it ends up on before finishing.\n\n" +
    "CSS AUTHORING — two more specific rules, each learned from a real, previously-found bug in this " +
    "exact exercise, not general advice:\n" +
    "  - Never set `background` inside a blanket multi-tag reset rule (e.g. `body, section, header, " +
    "footer { ...; background: ...; }`) for any tag name that could be reused in a different " +
    "semantic context elsewhere on the page. A citation's own <footer> inside a <blockquote>, for " +
    "example, is not the page's own footer. Scope background colours to classes, never to a bare " +
    "tag selector shared across more than one real use on the page.\n" +
    "  - When a modifier class (e.g. `.service-card--large`) is meant to override a property that " +
    "the base class (`.service-card`) also sets for the same descendant shape, the two rules have " +
    "IDENTICAL CSS specificity if they differ only by class name — the LATER-declared rule silently " +
    "wins the tie regardless of which one you intended to win. Always declare a modifier's own " +
    "override rules AFTER the base class's rules in your stylesheet's source order, for every " +
    "property the modifier changes.\n\n" +
    `TYPOGRAPHY: heading font "${design.typographyHeadingFont}", body font "${design.typographyBodyFont}". ` +
    "Load both from this exact Google Fonts URL via @import at the very top of your <style> block: " +
    `${design.typographyGoogleFontsUrl}\n\n` +
    `STYLE DIRECTION: "${design.styleBundleName}" — ${design.styleBundleDescription} Section rhythm: ` +
    `${design.sectionRhythm}. This is direction, not fixed values — choose your own real ` +
    "border-radius, shadow, and spacing numbers that express this character; do not invent a wildly " +
    "different visual character than described.\n\n" +
    (design.vertical
      ? `Detected vertical: ${design.vertical}\n\n`
      : "Detected vertical: (unmatched — no vertical could be classified; write generic, " +
        "content-led framing rather than industry-specific jargon)\n\n") +
    "REFERENCE COMPOSITIONS — read these as composition PATTERNS to adapt to this business's real " +
    "content and real images, not markup to copy verbatim. Use what genuinely fits; do not force the " +
    "page into a shape the real content doesn't support:\n" +
    "  - Offset hero: headline and CTA in one column, hero image in the other, deliberately not " +
    "vertically centred against the text block — let the image sit higher/lower than the text " +
    "baseline, or bleed slightly past the section edge. A small floating card (its own background, " +
    "border, real shadow) overlaps the boundary between the text column and the image, carrying one " +
    "concrete trust signal drawn from the real content below (a stat, a credential, years in " +
    "business) — never invented.\n" +
    "  - Asymmetric service grid: services are not identical equal-width tiles in a uniform grid. " +
    "Vary column or row span so one or two tiles (e.g. the first, or the one with the richest real " +
    "content) are visibly larger, with the rest following a smaller, denser rhythm around them.\n" +
    "  - Split proof section: two unequal-width columns — one carrying a real testimonial or a small " +
    "cluster of real stats/numbers, the other a supporting image or a short list of real credentials. " +
    "The split need not be 50/50; let the real content's own weight decide which side is wider.\n\n" +
    "TOKEN BUDGET: you have up to 16,000 output tokens for this response. There is room for a " +
    "fuller, richer page — more sections, more considered composition, more of the real content " +
    "included — without approaching the ceiling. Use the space the content genuinely calls for; do " +
    "not pad for its own sake.\n\n" +
    "RULES, NO EXCEPTIONS:\n" +
    "- Never write <script>, <iframe>, <object>, <embed>, <form>, an inline event handler attribute " +
    "(onclick=, onload=, etc.), or a javascript:/data: URI.\n" +
    "- Every top-level section of the page must be exactly one <header>/<section>/<footer> element " +
    "carrying a data-kondo-section=\"key\" attribute on its own opening tag, where key is a short, " +
    "lowercase, hyphenated identifier. Existing convention, not a mandatory list — use whichever " +
    `keys genuinely describe this page's real sections: ${KNOWN_SECTION_KEYS.join(", ")}.\n` +
    "- Give every <img> real, specific alt text — use the manifest's own caption where one is present.\n" +
    "- EVERY IMAGE IN THE MANIFEST MAY BE USED AT MOST ONCE ON THE WHOLE PAGE, WITH EXACTLY ONE " +
    "EXCEPTION: an image with role \"logo\" may be used any number of times (e.g. once in the nav, " +
    "once in the footer — that's normal, not a violation). Every other role — hero, " +
    "section-background, gallery, team, feature-inline — may appear in your markup at most once, " +
    "full stop, even if it's the single best-fitting image for two different sections. If you find " +
    "yourself wanting to place the same non-logo URL a second time, that means one of those two " +
    "sections needs a different image from the manifest instead, or no image at all — never the " +
    "same URL twice. Before you finish, mentally check every non-logo <img src> you wrote against " +
    "every other one: no two may match.\n" +
    "- Output body markup and a <style> block only. No <html>, <head>, or <body> wrapper tags — " +
    "those are added separately by the page shell."
  );
}

function buildUserText(design: PageDesignInput, content: MarkupContentInput, images: ManifestImage[]): string {
  const lines = [`Business: ${content.businessName ?? "(name unknown)"}`];
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
    roleCountSummary(images),
    JSON.stringify(images, null, 2)
  );
  return lines.join("\n");
}

// Task 3.7e, carried over unchanged. A real, measured baseline (10 real generations) found a 50%
// validation-failure rate, 100% of it the model reusing one non-logo image across two sections —
// this line restates the per-role counts right where the model is about to read the images it can
// pick from, concretely, so "5 feature-inline images, use each at most once" is impossible to miss.
function roleCountSummary(images: ManifestImage[]): string {
  const counts = new Map<string, number>();
  for (const img of images) counts.set(img.role, (counts.get(img.role) ?? 0) + 1);
  const parts: string[] = [];
  for (const [role, count] of counts) {
    if (role === "logo") continue;
    parts.push(count > 1 ? `${count} different "${role}" images below — use each at most once, never the same one twice` : `1 "${role}" image below`);
  }
  return parts.length ? `(${parts.join("; ")}.)` : "";
}

function buildPageTool(): Anthropic.Tool {
  return {
    name: TOOL_NAME,
    description:
      "Return the complete landing-page concept for this business: semantic HTML body markup, and " +
      "the CSS for its own <style> block, written entirely against the supplied palette and text-on-" +
      "background pairs — every top-level section carrying its own data-kondo-section attribute.",
    input_schema: {
      type: "object",
      required: ["html", "css"],
      properties: {
        html: {
          type: "string",
          description:
            "Complete body-level HTML markup. Every top-level section is a <header>/<section>/" +
            '<footer> element carrying its own data-kondo-section="key" attribute. No <style> tag, ' +
            'no style="" attribute, no literal colour values, no <script>/<iframe>/<form>/<object>/' +
            "<embed>, no inline event handlers.",
        },
        css: {
          type: "string",
          description:
            "Complete CSS for the page, to be placed in a <style> block. Every colour references " +
            "the given palette via var(--role-name); no literal hex/rgb/hsl values.",
        },
      },
    },
  };
}

// ---------- lightweight, reporting-only audit (see file header's scope note) ----------
// Constraint 2 from the pre-3.13 version (class-vocabulary conformance) is gone — there is no
// fixed vocabulary to conform to any more. Everything else (no colour/no <style> in the html
// field specifically — colour and CSS both belong in the separate css field — banned tags, event
// handlers, javascript:/data: URIs, data-kondo-section coverage) is unchanged.

export type MarkupAuditFinding = { severity: "error" | "warning"; message: string };

export function auditMarkup(html: string): MarkupAuditFinding[] {
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

  return findings;
}

// ---------- the call itself ----------

export type GenerateMarkupResult = {
  html: string;
  css: string;
  stopReason: string;
  outputTokens: number;
  inputTokens: number;
  attemptsUsed: number;
  findings: MarkupAuditFinding[];
};

export async function generateMarkup(
  design: PageDesignInput,
  content: MarkupContentInput,
  images: ManifestImage[]
): Promise<GenerateMarkupResult> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const systemPrompt = buildSystemPrompt(design);
  const userText = buildUserText(design, content, images);
  const tool = buildPageTool();

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
        throw new Error("Page generation was cut off by the token limit.");
      }

      const toolUse = result.content.find(
        (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
      );
      if (!toolUse) throw new Error("Claude did not return a tool_use block.");

      const normalized = normalizeStringifiedJson(toolUse.input) as { html?: unknown; css?: unknown };
      if (typeof normalized.html !== "string" || !normalized.html.trim()) {
        throw new Error("Claude's tool response is missing a non-empty html field.");
      }
      if (typeof normalized.css !== "string" || !normalized.css.trim()) {
        throw new Error("Claude's tool response is missing a non-empty css field.");
      }

      return {
        html: normalized.html,
        css: normalized.css,
        stopReason: result.stop_reason ?? "unknown",
        outputTokens: result.usage.output_tokens,
        inputTokens: result.usage.input_tokens,
        attemptsUsed: attempt,
        findings: auditMarkup(normalized.html),
      };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      correctionNote = lastError.message;
      console.error(`[generate-markup] attempt ${attempt}/${MAX_ATTEMPTS} failed:`, lastError.message);
    }
  }

  throw lastError ?? new Error("generateMarkup failed for an unknown reason.");
}
