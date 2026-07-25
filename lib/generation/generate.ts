import Anthropic from "@anthropic-ai/sdk";
import type { GeneratedFile } from "./prompt";

const TOOL_NAME = "generate_site";

const GENERATE_SITE_TOOL: Anthropic.Tool = {
  name: TOOL_NAME,
  description: "Return the complete set of static site files for the facelifted website.",
  input_schema: {
    type: "object",
    properties: {
      files: {
        type: "array",
        description: "Write this first, before the summary — it's the important part if space runs out.",
        items: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "Relative file path, e.g. 'index.html', 'style.css', 'assets/logo.png'",
            },
            content: { type: "string", description: "Full file contents" },
          },
          required: ["path", "content"],
        },
      },
      summary: {
        type: "string",
        description:
          "2-3 sentence summary of what was built or changed, written for the team member who requested it",
      },
    },
    required: ["files", "summary"],
  },
};

export type LogoImage = {
  mediaType: "image/png" | "image/jpeg" | "image/webp" | "image/gif";
  data: string;
};

export type GenerationResult = { summary: string; files: GeneratedFile[] };

export async function generateSite(
  promptText: string,
  logoImages: LogoImage[] = []
): Promise<GenerationResult> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const content: Anthropic.ContentBlockParam[] = [
    ...logoImages.map(
      (img): Anthropic.ImageBlockParam => ({
        type: "image",
        source: { type: "base64", media_type: img.mediaType, data: img.data },
      })
    ),
    { type: "text", text: promptText },
  ];

  // Streaming is required by the SDK once max_tokens is high enough that a request
  // could plausibly run past its non-streaming timeout.
  const stream = anthropic.messages.stream({
    model: "claude-sonnet-5",
    max_tokens: 32000,
    tools: [GENERATE_SITE_TOOL],
    tool_choice: { type: "tool", name: TOOL_NAME },
    messages: [{ role: "user", content }],
  });

  const message = await stream.finalMessage();

  if (message.stop_reason === "max_tokens") {
    throw new Error(
      "Generation was cut off by the token limit before finishing — the requested site was too large for one response."
    );
  }

  const toolUse = message.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  );

  if (!toolUse || !Array.isArray((toolUse.input as GenerationResult)?.files)) {
    throw new Error("Claude did not return a valid set of generated files");
  }

  return toolUse.input as GenerationResult;
}
