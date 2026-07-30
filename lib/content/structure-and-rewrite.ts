import Anthropic from "@anthropic-ai/sdk";
import { withTransientRetry } from "@/lib/ai/anthropic-retry";
import { normalizeStringifiedJson } from "@/lib/ai/json-tool-utils";
import type { ContentService, ContentTestimonial, ConfidenceLevel } from "./types";

const TOOL_NAME = "structure_site_content";
const MAX_ATTEMPTS = 3;

const CONFIDENCE_ENUM = ["low", "medium", "high"] as const;

const STRUCTURE_TOOL: Anthropic.Tool = {
  name: TOOL_NAME,
  description:
    "Read this business's crawled website text and produce structured, sales-ready content: " +
    "who they are, what they offer, and proof they're good at it. Rewrite copy to be " +
    "punchier and clearer than the source — this is going straight onto a landing page.",
  input_schema: {
    type: "object",
    required: [
      "businessName",
      "businessNameConfidence",
      "tagline",
      "taglineConfidence",
      "aboutCopy",
      "aboutCopyConfidence",
      "detectedIndustry",
      "contactAddress",
      "contactAddressConfidence",
      "services",
      "testimonials",
    ],
    properties: {
      businessName: { type: "string", description: "The business's actual name, not the site's <title> if that includes taglines/boilerplate." },
      businessNameConfidence: { type: "string", enum: CONFIDENCE_ENUM },
      tagline: { type: "string", description: "One punchy sentence capturing what they do and for whom. Rewritten, not copied verbatim." },
      taglineConfidence: { type: "string", enum: CONFIDENCE_ENUM },
      aboutCopy: { type: "string", description: "2-4 sentences, rewritten to be sharper and more confident than the source copy." },
      aboutCopyConfidence: { type: "string", enum: CONFIDENCE_ENUM },
      detectedIndustry: {
        type: "string",
        description: "A short industry/category label (e.g. \"local service\", \"medical/clinic\", \"SaaS\", \"hospitality\", \"professional services\", \"education\") used to pick a template.",
      },
      contactAddress: { type: ["string", "null"], description: "Street address if present anywhere in the crawled text, else null. Do not guess." },
      contactAddressConfidence: { type: "string", enum: CONFIDENCE_ENUM },
      services: {
        type: "array",
        description:
          "The distinct services/products offered. Rewrite descriptions to be punchy, not copy-pasted. " +
          "If a service is only named in the source (e.g. a menu/nav listing) with no real description " +
          "anywhere in the text, still write one short, genuine line inferred from the service name and " +
          "general industry context — never leave description blank or a bare restatement of the name. " +
          "A reviewer editing a plausible draft is a much lower bar than a reviewer writing from scratch. " +
          "Still mark it low confidence and flagged: true with flagReason noting the description is inferred, " +
          "not sourced, so the reviewer knows to verify it.",
        items: {
          type: "object",
          required: ["name", "description", "confidence", "flagged"],
          properties: {
            name: { type: "string" },
            description: { type: "string" },
            confidence: { type: "string", enum: CONFIDENCE_ENUM },
            flagged: { type: "boolean" },
            flagReason: { type: "string" },
          },
        },
      },
      testimonials: {
        type: "array",
        description: "Genuine customer testimonials/reviews found in the text. Do not invent any. Flag anything that might actually be a staff bio, a case study blurb, or otherwise not a real customer quote.",
        items: {
          type: "object",
          required: ["quote", "author", "confidence", "flagged"],
          properties: {
            quote: { type: "string" },
            author: { type: "string" },
            role: { type: "string" },
            confidence: { type: "string", enum: CONFIDENCE_ENUM },
            flagged: { type: "boolean" },
            flagReason: { type: "string" },
          },
        },
      },
    },
  },
};

export type StructuredContentResult = {
  businessName: string;
  businessNameConfidence: ConfidenceLevel;
  tagline: string;
  taglineConfidence: ConfidenceLevel;
  aboutCopy: string;
  aboutCopyConfidence: ConfidenceLevel;
  detectedIndustry: string;
  contactAddress: string | null;
  contactAddressConfidence: ConfidenceLevel;
  services: Omit<ContentService, "id">[];
  testimonials: Omit<ContentTestimonial, "id">[];
};

function isConfidence(v: unknown): v is ConfidenceLevel {
  return v === "low" || v === "medium" || v === "high";
}

function validateShape(input: unknown): { valid: true; value: StructuredContentResult } | { valid: false; reason: string } {
  if (!input || typeof input !== "object") return { valid: false, reason: "tool input is not an object" };
  const v = input as Record<string, unknown>;

  if (typeof v.businessName !== "string" || !v.businessName.trim()) return { valid: false, reason: "missing businessName" };
  if (!isConfidence(v.businessNameConfidence)) return { valid: false, reason: "missing/invalid businessNameConfidence" };
  if (typeof v.tagline !== "string" || !v.tagline.trim()) return { valid: false, reason: "missing tagline" };
  if (!isConfidence(v.taglineConfidence)) return { valid: false, reason: "missing/invalid taglineConfidence" };
  if (typeof v.aboutCopy !== "string" || !v.aboutCopy.trim()) return { valid: false, reason: "missing aboutCopy" };
  if (!isConfidence(v.aboutCopyConfidence)) return { valid: false, reason: "missing/invalid aboutCopyConfidence" };
  if (typeof v.detectedIndustry !== "string" || !v.detectedIndustry.trim()) return { valid: false, reason: "missing detectedIndustry" };
  if (v.contactAddress !== null && typeof v.contactAddress !== "string") return { valid: false, reason: "contactAddress must be string or null" };
  if (!isConfidence(v.contactAddressConfidence)) return { valid: false, reason: "missing/invalid contactAddressConfidence" };
  if (!Array.isArray(v.services)) return { valid: false, reason: "services must be an array" };
  if (!Array.isArray(v.testimonials)) return { valid: false, reason: "testimonials must be an array" };

  for (const s of v.services) {
    if (!s || typeof s !== "object" || typeof (s as Record<string, unknown>).name !== "string" || typeof (s as Record<string, unknown>).description !== "string") {
      return { valid: false, reason: "a service entry is missing name/description" };
    }
  }
  for (const t of v.testimonials) {
    if (!t || typeof t !== "object" || typeof (t as Record<string, unknown>).quote !== "string" || typeof (t as Record<string, unknown>).author !== "string") {
      return { valid: false, reason: "a testimonial entry is missing quote/author" };
    }
  }

  return { valid: true, value: v as unknown as StructuredContentResult };
}

const SYSTEM_PROMPT = `You are helping an agency turn a prospect's existing website into sales-ready content \
for a landing-page mockup. You are not designing anything — a human-built template will \
render whatever you produce. Your job is purely: read, structure, and rewrite.

Rules:
- Never invent facts. If something isn't in the crawled text, leave it null/empty and mark \
low confidence rather than guessing.
- Testimonials must be real quotes found in the text. If something looks like a staff bio, \
a case study, or isn't clearly a customer speaking, include it but set flagged: true with a reason.
- Rewrite the tagline and about copy to be punchier and more confident than the source — \
this is the one place you should improve on the original, not just transcribe it.
- A service named without any real description anywhere in the source (a bare menu/nav \
listing) still needs a genuine one-line description, not a blank or a restatement of the \
name — infer it plausibly from the name and industry context, mark it low confidence and \
flagged, and say in flagReason that it's inferred rather than sourced.
- detectedIndustry should be a short, common label a human would recognize (e.g. "local \
service", "medical/clinic", "SaaS", "hospitality", "professional services", "education").`;

export async function structureAndRewriteContent(pageTexts: { url: string; title: string; text: string }[]): Promise<StructuredContentResult> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const combinedText = pageTexts
    .map((p) => `--- ${p.title || p.url} (${p.url}) ---\n${p.text}`)
    .join("\n\n")
    .slice(0, 15_000);

  let lastError: Error | null = null;
  let correctionNote: string | null = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const result = await withTransientRetry(`structure-and-rewrite attempt ${attempt}`, async () => {
        const stream = anthropic.messages.stream({
          model: "claude-sonnet-5",
          max_tokens: 4096,
          output_config: { effort: "high" },
          system: SYSTEM_PROMPT,
          tools: [STRUCTURE_TOOL],
          tool_choice: { type: "tool", name: TOOL_NAME },
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: `Crawled site text:\n\n${combinedText}` },
                ...(correctionNote
                  ? [
                      {
                        type: "text" as const,
                        text: `IMPORTANT: your previous attempt was rejected: ${correctionNote}. Re-read the tool schema and include every required field this time.`,
                      },
                    ]
                  : []),
              ],
            },
          ],
        });
        return stream.finalMessage();
      });

      if (result.stop_reason === "max_tokens") {
        throw new Error("Content structuring was cut off by the token limit.");
      }

      const toolUse = result.content.find(
        (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
      );
      const normalized = toolUse ? normalizeStringifiedJson(toolUse.input) : null;
      const validation = validateShape(normalized);

      if (!validation.valid) {
        console.error(`[structure-and-rewrite] attempt ${attempt}/${MAX_ATTEMPTS} invalid shape: ${validation.reason}`);
        throw new Error(`Claude did not return valid structured content: ${validation.reason}`);
      }

      return validation.value;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      correctionNote = lastError.message;
      console.error(`[structure-and-rewrite] attempt ${attempt}/${MAX_ATTEMPTS} failed:`, lastError.message);
    }
  }

  throw lastError ?? new Error("Content structuring failed after all attempts");
}
