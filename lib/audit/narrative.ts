import { readFile } from "fs/promises";
import Anthropic from "@anthropic-ai/sdk";
import type { TechnicalAudit, VisualDesignAudit, MotionInteractionAudit } from "@/lib/audit-types";

const TOOL_NAME = "report_audit_narrative";

const AUDIT_NARRATIVE_TOOL: Anthropic.Tool = {
  name: TOOL_NAME,
  description:
    "Report the audit narrative: what was found on the current site, whether/how that confirms the client's brief, recommended changes with rationale, and the brand tone read.",
  input_schema: {
    type: "object",
    properties: {
      findingsSummary: {
        type: "string",
        description:
          "3-5 sentences, written like an auditor reporting what they observed — purely descriptive, no recommendations here. Cover the platform/tech, visual design (colors/fonts/density), and content structure of the CURRENT site. If reference/inspiration site screenshots were provided, briefly note what stands out about them too. Start from evidence, e.g. 'Upon crawling the site, I found...' — do not jump to what should change.",
      },
      briefUnderstanding: {
        type: ["string", "null"],
        description:
          "Only if a client brief was provided: 2-4 sentences explicitly connecting claims/requests in the brief to what the audit evidence actually shows, to prove the brief was understood — e.g. \"The brief notes the site feels too text-heavy — this checks out: the homepage alone carries roughly N words with no supporting imagery.\" If no brief was given, return null.",
      },
      recommendations: {
        type: "array",
        description:
          "3-6 concrete, specific proposed changes (e.g. simplify the color palette, restructure navigation, reduce text density, change typography, add motion/animation, restyle the hero). Each with a one-sentence rationale tied back to the findings and/or brief.",
        items: {
          type: "object",
          properties: {
            title: { type: "string", description: "Short label for the change, e.g. 'Simplify the color palette'" },
            rationale: { type: "string", description: "One sentence on why this will make the site better, grounded in the findings/brief." },
          },
          required: ["title", "rationale"],
        },
      },
      brandTone: {
        type: "object",
        description: "The existing brand tone read — kept for the design system reference.",
        properties: {
          personality: {
            type: "array",
            items: { type: "string" },
            description: "3-5 short personality descriptors, e.g. 'corporate', 'playful', 'minimal', 'luxury', 'bold'",
          },
          voice: { type: "string", description: "One sentence on the tone of voice in the site's copy." },
          emotionalImpression: { type: "string", description: "One sentence on the emotional impression a visitor gets." },
          summary: { type: "string", description: "2-3 sentence overall brand tone summary." },
        },
        required: ["personality", "voice", "emotionalImpression", "summary"],
      },
    },
    required: ["findingsSummary", "briefUnderstanding", "recommendations", "brandTone"],
  },
};

export type BrandToneResult = {
  personality: string[];
  voice: string;
  emotionalImpression: string;
  summary: string;
};

export type RecommendationItem = { title: string; rationale: string };

export type AuditNarrativeResult = {
  findingsSummary: string;
  briefUnderstanding: string | null;
  recommendations: RecommendationItem[];
  brandTone: BrandToneResult;
};

type ReferenceInput = { url: string; note: string | null; screenshotPath: string | null };

export async function analyzeAuditNarrative(input: {
  contentSample: string;
  screenshotPaths: string[];
  briefText: string | null;
  references: ReferenceInput[];
  technical: TechnicalAudit | null;
  visualDesign: VisualDesignAudit | null;
  motionInteraction: MotionInteractionAudit | null;
}): Promise<AuditNarrativeResult | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!input.contentSample.trim() && input.screenshotPaths.length === 0) return null;

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  async function toImageBlock(p: string): Promise<Anthropic.ImageBlockParam> {
    const data = await readFile(p);
    return { type: "image", source: { type: "base64", media_type: "image/png", data: data.toString("base64") } };
  }

  const mainImageBlocks = await Promise.all(input.screenshotPaths.slice(0, 3).map(toImageBlock));

  const referenceBlocks: Anthropic.ContentBlockParam[] = [];
  for (const ref of input.references) {
    if (!ref.screenshotPath) continue;
    referenceBlocks.push({
      type: "text",
      text: `The following image is a screenshot of a reference/inspiration site the client provided: ${ref.url}${
        ref.note ? ` — note: ${ref.note}` : ""
      }`,
    });
    referenceBlocks.push(await toImageBlock(ref.screenshotPath));
  }

  const summaryLines: string[] = [
    "You are auditing a client's current website ahead of a redesign (facelift). Report your findings as an auditor would: describe what you observe first, separately from what you'd recommend changing.",
    "",
    "## Deterministic technical data already collected",
    `Platform: ${input.technical?.platform ?? "Unknown"}`,
    `Pages analyzed: ${input.technical?.pagesCrawled ?? 0}`,
    `Forms present: ${input.technical?.formsDetected ? "Yes" : "No"}`,
    `Color palette detected: ${input.visualDesign?.colorPalette.map((c) => c.value).join(", ") || "none"}`,
    `Typography detected: ${input.visualDesign?.typography.map((t) => t.value).join(", ") || "none"}`,
    `Animation/motion detected: ${input.motionInteraction?.animationLibraries.join(", ") || "None detected"}`,
    "",
    "## Client brief",
    input.briefText?.trim() || "(No brief was provided by the client for this project.)",
    "",
    "## Page copy sample from the current site",
    input.contentSample.slice(0, 6000) || "(no text extracted)",
  ];

  const message = await anthropic.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 2048,
    tools: [AUDIT_NARRATIVE_TOOL],
    tool_choice: { type: "tool", name: TOOL_NAME },
    messages: [
      {
        role: "user",
        content: [
          ...mainImageBlocks,
          { type: "text", text: "The images above are screenshots of the CLIENT'S CURRENT site being audited." },
          ...referenceBlocks,
          { type: "text", text: summaryLines.join("\n") },
        ],
      },
    ],
  });

  const toolUse = message.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  );

  return (toolUse?.input as AuditNarrativeResult) ?? null;
}
