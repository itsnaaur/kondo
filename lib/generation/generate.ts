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

export type ReferenceImage = LogoImage & { url: string; note: string | null };

export type GenerationResult = { summary: string; files: GeneratedFile[] };

const MAX_ATTEMPTS = 2;

export async function generateSite(
  promptText: string,
  logoImages: LogoImage[] = [],
  referenceImages: ReferenceImage[] = []
): Promise<GenerationResult> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const content: Anthropic.ContentBlockParam[] = [
    ...logoImages.map(
      (img): Anthropic.ImageBlockParam => ({
        type: "image",
        source: { type: "base64", media_type: img.mediaType, data: img.data },
      })
    ),
    ...referenceImages.flatMap((img): Anthropic.ContentBlockParam[] => [
      {
        type: "text",
        text: `The following image is a screenshot of a reference/inspiration site the client provided: ${img.url}${
          img.note ? ` — note: ${img.note}` : ""
        }`,
      },
      { type: "image", source: { type: "base64", media_type: img.mediaType, data: img.data } },
    ]),
    { type: "text", text: promptText },
  ];

  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await requestGeneration(anthropic, content);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.error(`[generation] attempt ${attempt}/${MAX_ATTEMPTS} failed:`, lastError.message);
    }
  }

  throw lastError ?? new Error("Generation failed for an unknown reason");
}

async function requestGeneration(
  anthropic: Anthropic,
  content: Anthropic.ContentBlockParam[]
): Promise<GenerationResult> {
  // Streaming is required by the SDK once max_tokens is high enough that a request
  // could plausibly run past its non-streaming timeout.
  // effort: "xhigh" gives real design/typographic judgment room to think before writing
  // the tool call — forced tool_choice doesn't disable adaptive thinking on Sonnet 5, and
  // this is exactly the kind of creative+technical task that benefits from it. max_tokens
  // is raised to leave room for that thinking alongside the full file output.
  const stream = anthropic.messages.stream({
    model: "claude-sonnet-5",
    max_tokens: 64000,
    output_config: { effort: "xhigh" },
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

  // Forced tool_choice occasionally still comes back with an empty/malformed tool call at
  // this effort level on a long prompt — retried once by the caller rather than failing the
  // whole generation outright.
  if (!toolUse || !Array.isArray((toolUse.input as GenerationResult)?.files)) {
    throw new Error("Claude did not return a valid set of generated files");
  }

  return toolUse.input as GenerationResult;
}
