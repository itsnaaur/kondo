import Anthropic from "@anthropic-ai/sdk";
import { validateVisualReadShape, type VisualRead } from "./visual-read-types";
import { normalizeStringifiedJson } from "./json-tool-utils";
import type { VisualShotSet } from "@/lib/crawl/visual-shots";

const TOOL_NAME = "report_visual_read";

const SHARED_PROPERTIES = {
  mode: {
    type: "string",
    enum: ["EXISTING_SITE", "REFERENCE_SITE"],
    description: "Required.",
  },
  url: { type: "string", description: "Required." },
  first_impression: {
    type: "object",
    description: "Required. One word, then one sentence.",
    required: ["word", "elaboration"],
    properties: {
      word: { type: "string" },
      elaboration: { type: "string" },
    },
  },
  mechanism: {
    type: "array",
    description: "Required, at least 2 items — the concrete devices producing the impression.",
    minItems: 2,
    items: { type: "string" },
  },
  hierarchy: {
    type: "object",
    description: "Required.",
    required: ["order", "appropriate", "note"],
    properties: {
      order: { type: "array", items: { type: "string" } },
      appropriate: { type: "boolean" },
      note: { type: "string" },
    },
  },
  type_read: {
    type: "object",
    description: "Required.",
    required: ["families", "has_real_scale", "character"],
    properties: {
      families: { type: "array", items: { type: "string" } },
      has_real_scale: { type: "boolean" },
      character: { type: "string" },
    },
  },
  spacing: {
    type: "object",
    description: "Required.",
    required: ["systematic", "density", "rhythm_note"],
    properties: {
      systematic: { type: "boolean" },
      density: { type: "string", enum: ["airy", "balanced", "dense"] },
      rhythm_note: { type: "string" },
    },
  },
  colour: {
    type: "object",
    description: "Required.",
    required: ["working_palette", "accent", "accent_discipline"],
    properties: {
      working_palette: {
        type: "array",
        items: {
          type: "object",
          required: ["hex", "role"],
          properties: { hex: { type: "string" }, role: { type: "string" } },
        },
      },
      accent: { type: "string" },
      accent_discipline: { type: "string", enum: ["restrained", "moderate", "scattered"] },
    },
  },
  mobile: {
    type: "object",
    description: "Required.",
    required: ["survives", "issues"],
    properties: {
      survives: { type: "boolean" },
      issues: { type: "array", items: { type: "string" } },
    },
  },
  era: {
    type: "object",
    description: "EXISTING_SITE mode only.",
    properties: {
      reads_as: { type: "string" },
      dating_signals: { type: "array", items: { type: "string" } },
    },
  },
  identity: {
    type: "object",
    description: "EXISTING_SITE mode only.",
    properties: {
      deliberate: { type: "boolean" },
      default_family: { type: "string" },
    },
  },
  failures: {
    type: "array",
    description: "EXISTING_SITE mode only.",
    items: {
      type: "object",
      required: ["issue", "kind", "cost"],
      properties: {
        issue: { type: "string" },
        kind: { type: "string", enum: ["function", "taste"] },
        cost: { type: "string", enum: ["high", "medium", "low"] },
      },
    },
  },
  equity: {
    type: "array",
    description: "EXISTING_SITE mode only.",
    items: {
      type: "object",
      required: ["asset", "why_keep"],
      properties: { asset: { type: "string" }, why_keep: { type: "string" } },
    },
  },
  why_it_works: { type: "string", description: "REFERENCE_SITE mode only." },
  boldness_location: { type: "string", description: "REFERENCE_SITE mode only." },
  transferable: {
    type: "array",
    description: "REFERENCE_SITE mode only.",
    items: { type: "string" },
  },
  not_transferable: {
    type: "array",
    description: "REFERENCE_SITE mode only.",
    items: { type: "string" },
  },
  copy_test: { type: "string", description: "REFERENCE_SITE mode only." },
} as const;

const VISUAL_READ_TOOL: Anthropic.Tool = {
  name: TOOL_NAME,
  description: "Report a targeted visual read of a website's composition from screenshots.",
  input_schema: {
    type: "object",
    required: [
      "mode",
      "url",
      "first_impression",
      "mechanism",
      "hierarchy",
      "type_read",
      "spacing",
      "colour",
      "mobile",
    ],
    properties: SHARED_PROPERTIES,
  },
};

const SYSTEM_PROMPT = `You are reading a website's visual composition from screenshots. You are not
reading it for content — the content has already been extracted separately. You are
reading it for how it looks and how it works as a composition.

Answer the specific questions below via the report_visual_read tool. Do not write a
general description of the page; general descriptions are useless downstream. Every
answer should be something a designer could act on.

## Questions to answer, in both modes

FIRST IMPRESSION — In one word, then one sentence: what does this page feel like?
Commit to a specific word. "Clean" and "professional" are non-answers; find the word
that distinguishes this page from every other page.

MECHANISM — What specifically produces that impression? Name the devices: the type
choices, the spacing, the palette, the density, the imagery treatment, the way
sections are separated. Attribute the feeling to concrete causes. If you cannot
name the cause, the impression you named is probably wrong.

HIERARCHY — Where does the eye land first, second, third? Is that the right order
given what this page is for?

TYPE — How many families are in use? Is there a real type scale, or are sizes
arbitrary? What does the type choice say about the brand, whether or not that was
intended?

SPACING AND DENSITY — Is spacing a consistent system or ad hoc? Is the page airy,
balanced, or dense? Does the rhythm change between sections, and does that change
mean anything?

COLOUR — What is the actual working palette, as hex estimates. Which colour is
carrying accent duty. Is the accent used with restraint or scattered.

MOBILE — What specifically differs at 390px. Does the composition survive, or does
it become a single stack of undifferentiated blocks? Note anything that breaks.

## Additional questions in EXISTING_SITE mode — fill in era, identity, failures, equity

ERA — What period does this design read as, and name the specific things that date
it. Be concrete: stock photography style, bevelled or gradient buttons, small body
type, carousels, centred everything, boxed max-width containers, icon-plus-heading
tiles, and so on.

IDENTITY — Does this site have a deliberate visual identity, or is it an unmodified
theme or builder default? If it is a default, say which family of default.

FAILURES — List the specific things that are wrong, ordered by how much they cost
the business. Distinguish problems of taste from problems of function. A weak
palette is taste. An invisible primary CTA is function. Function first.

EQUITY — What is worth keeping. Colours the customer base may recognise, a logo or
mark with real attachment, a photography library that is genuinely good, a
structural idea that works. Be conservative here: recommend keeping something only
if there is a real reason, not out of politeness. If nothing is worth keeping, say
so plainly — return an empty array.

## Additional questions in REFERENCE_SITE mode — fill in why_it_works, boldness_location, transferable, not_transferable, copy_test

WHY IT WORKS — The client pointed at this site. They are usually right about liking
it and wrong about why. Identify the underlying quality they are probably responding
to, which is often not the thing they would name.

BOLDNESS — Where does this site spend its boldness? Identify the one element it is
built around, and note how quiet everything else is by comparison.

TRANSFERABLE — Which qualities transfer to a different business in a different
industry, and which are specific to this subject and would look borrowed?

COPY TEST — If someone copied only this site's palette and typefaces onto different
content, what would fail to come across? Your answer to this identifies the real
mechanism, which is what we want to carry forward — not the palette.

## Important

In REFERENCE_SITE mode you are extracting transferable qualities, never a template.
Your output will be the only thing passed downstream; the screenshots will not be.
Write it so that someone who has never seen this site could design something with
the same qualities and no visual resemblance.`;

function buildUserMessage(
  mode: "EXISTING_SITE" | "REFERENCE_SITE",
  url: string,
  businessContext: string,
  captureNotes: string
): string {
  return [
    `MODE: ${mode}`,
    `URL: ${url}`,
    `Business context: ${businessContext}`,
    "",
    "Screenshots attached in order: desktop full page, mobile full page, hero crop, content section crop.",
    "",
    `Capture notes: ${captureNotes}`,
  ].join("\n");
}

const MAX_ATTEMPTS = 3;

export async function analyzeVisualRead(
  mode: "EXISTING_SITE" | "REFERENCE_SITE",
  url: string,
  businessContext: string,
  shots: VisualShotSet,
  shotBytes: { desktop: string; mobile: string; hero: string; section: string }
): Promise<VisualRead> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const captureNotes = shots.cookieBannerDismissed
    ? "A cookie-consent banner was detected and dismissed before capture."
    : "No cookie-consent banner was detected (or it could not be dismissed) — if a banner is visible, do not diagnose it as a design decision.";

  function buildContent(correctionNote: string | null): Anthropic.ContentBlockParam[] {
    return [
      { type: "text", text: buildUserMessage(mode, url, businessContext, captureNotes) },
      { type: "image", source: { type: "base64", media_type: "image/png", data: shotBytes.desktop } },
      { type: "image", source: { type: "base64", media_type: "image/png", data: shotBytes.mobile } },
      { type: "image", source: { type: "base64", media_type: "image/png", data: shotBytes.hero } },
      { type: "image", source: { type: "base64", media_type: "image/png", data: shotBytes.section } },
      ...(correctionNote
        ? [
            {
              type: "text" as const,
              text: `IMPORTANT: your previous attempt at this tool call was rejected: ${correctionNote}. Re-read the tool schema and make sure this attempt includes every required field before you finalize the call.`,
            },
          ]
        : []),
    ];
  }

  let lastError: Error | null = null;
  let correctionNote: string | null = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const stream = anthropic.messages.stream({
        model: "claude-sonnet-5",
        max_tokens: 16000,
        output_config: { effort: "medium" },
        system: SYSTEM_PROMPT,
        tools: [VISUAL_READ_TOOL],
        tool_choice: { type: "tool", name: TOOL_NAME },
        messages: [{ role: "user", content: buildContent(correctionNote) }],
      });

      const message = await stream.finalMessage();

      if (message.stop_reason === "max_tokens") {
        throw new Error("Visual read was cut off by the token limit before finishing.");
      }

      const toolUse = message.content.find(
        (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
      );
      const normalizedInput = toolUse ? normalizeStringifiedJson(toolUse.input) : null;

      const validation = validateVisualReadShape(normalizedInput);
      if (!validation.valid) {
        console.error(
          `[visual-read] attempt ${attempt}/${MAX_ATTEMPTS} invalid shape (${mode} ${url}): ${validation.reason}`
        );
        throw new Error(`Claude did not return a valid visual read: ${validation.reason}`);
      }

      return normalizedInput as VisualRead;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      correctionNote = lastError.message;
      console.error(`[visual-read] attempt ${attempt}/${MAX_ATTEMPTS} failed (${mode} ${url}):`, lastError.message);
    }
  }

  throw lastError ?? new Error("Visual read failed for an unknown reason");
}
