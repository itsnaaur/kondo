import { readFile } from "fs/promises";
import Anthropic from "@anthropic-ai/sdk";

const TOOL_NAME = "report_brand_tone";

const BRAND_TONE_TOOL: Anthropic.Tool = {
  name: TOOL_NAME,
  description: "Report the analyzed brand tone, personality, and emotional impression of a website.",
  input_schema: {
    type: "object",
    properties: {
      personality: {
        type: "array",
        items: { type: "string" },
        description:
          "3-5 short personality descriptors, e.g. 'corporate', 'playful', 'minimal', 'luxury', 'bold'",
      },
      voice: {
        type: "string",
        description:
          "One sentence describing the tone of voice used in the site's copy (formal, casual, technical, etc.)",
      },
      emotionalImpression: {
        type: "string",
        description:
          "One sentence describing the emotional impression a visitor gets (calm, energetic, premium, approachable, etc.)",
      },
      summary: {
        type: "string",
        description:
          "2-3 sentence overall brand tone summary useful for briefing a designer on how to preserve or evolve the brand feel",
      },
    },
    required: ["personality", "voice", "emotionalImpression", "summary"],
  },
};

export type BrandToneResult = {
  personality: string[];
  voice: string;
  emotionalImpression: string;
  summary: string;
};

export async function analyzeBrandTone(
  contentSample: string,
  screenshotPaths: string[] = []
): Promise<BrandToneResult | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!contentSample.trim() && screenshotPaths.length === 0) return null;

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const imageBlocks = await Promise.all(
    screenshotPaths.slice(0, 3).map(async (p): Promise<Anthropic.ImageBlockParam> => {
      const data = await readFile(p);
      return {
        type: "image",
        source: { type: "base64", media_type: "image/png", data: data.toString("base64") },
      };
    })
  );

  const message = await anthropic.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 1024,
    tools: [BRAND_TONE_TOOL],
    tool_choice: { type: "tool", name: TOOL_NAME },
    messages: [
      {
        role: "user",
        content: [
          ...imageBlocks,
          {
            type: "text",
            text: `Analyze the brand tone, personality, and emotional impression of this website based on the screenshots (if provided) and the following page copy:\n\n${
              contentSample.slice(0, 6000) || "(no text extracted)"
            }`,
          },
        ],
      },
    ],
  });

  const toolUse = message.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  );

  return (toolUse?.input as BrandToneResult) ?? null;
}
