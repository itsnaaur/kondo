import Anthropic from "@anthropic-ai/sdk";
import { formatAntiDefaults } from "./anti-defaults";
import { validateDesignSpecShape, type DesignSpec } from "./design-spec-types";
import { normalizeStringifiedJson } from "./json-tool-utils";
import type { InterpretedBrief } from "./interpreted-brief-types";
import type { VisualRead } from "./visual-read-types";

const TOOL_NAME = "propose_design_spec";

const FONT_SPEC_SCHEMA = {
  type: "object",
  required: ["family", "fallback", "source", "weights"],
  properties: {
    family: { type: "string" },
    fallback: { type: "string" },
    source: { type: "string", enum: ["google", "system", "self-hosted"] },
    weights: { type: "array", items: { type: "integer" } },
  },
} as const;

const DESIGN_SPEC_TOOL: Anthropic.Tool = {
  name: TOOL_NAME,
  description:
    "Propose a design direction for this client as a structured spec. Do not write HTML — a separate call builds from this spec.",
  input_schema: {
    type: "object",
    required: ["palette", "type", "layout", "signature", "motion", "revisions"],
    properties: {
      // Deliberately no "subject" field here. The interpreted brief already states
      // business/audience/page_job explicitly (see INTERPRETED BRIEF below) — asking
      // the model to restate a value it was just handed reads as redundant busywork,
      // and it was dropping the field from the tool call often enough to matter (see
      // the attempt-1 metric logging below). Carried forward programmatically instead.
      palette: {
        type: "object",
        required: ["colors", "accent_policy", "rationale"],
        properties: {
          colors: {
            type: "array",
            minItems: 4,
            maxItems: 6,
            items: {
              type: "object",
              required: ["name", "hex", "role"],
              properties: {
                name: { type: "string" },
                hex: { type: "string", pattern: "^#[0-9A-Fa-f]{6}$" },
                role: {
                  type: "string",
                  enum: ["background", "surface", "ink", "ink-muted", "accent", "accent-alt", "border"],
                },
              },
            },
          },
          accent_policy: { type: "string", description: "Where the accent is permitted to appear, and where it is not." },
          rationale: { type: "string", description: "Why this palette fits the subject, not fashion." },
        },
      },
      type: {
        type: "object",
        required: ["display", "body", "scale", "pairing_rationale"],
        properties: {
          display: FONT_SPEC_SCHEMA,
          body: FONT_SPEC_SCHEMA,
          utility: FONT_SPEC_SCHEMA,
          scale: {
            type: "array",
            items: {
              type: "object",
              required: ["token", "size_rem", "weight", "line_height", "letter_spacing"],
              properties: {
                token: { type: "string" },
                size_rem: { type: "number" },
                weight: { type: "integer" },
                line_height: { type: "number" },
                letter_spacing: { type: "string" },
              },
            },
          },
          pairing_rationale: { type: "string" },
        },
      },
      layout: {
        type: "object",
        required: [
          "concept",
          "hero_wireframe",
          "section_wireframe",
          "grid",
          "spacing_scale",
          "radius",
          "density",
        ],
        properties: {
          concept: { type: "string", description: "One sentence." },
          hero_wireframe: { type: "string", description: "ASCII wireframe of the hero." },
          section_wireframe: { type: "string", description: "ASCII wireframe of one content section." },
          grid: { type: "string" },
          spacing_scale: { type: "array", items: { type: "string" } },
          radius: { type: "string" },
          density: { type: "string", enum: ["airy", "balanced", "dense"] },
        },
      },
      signature: {
        type: "object",
        required: ["element", "description", "why_this_subject"],
        properties: {
          element: { type: "string" },
          description: { type: "string" },
          why_this_subject: { type: "string" },
        },
      },
      motion: {
        type: "object",
        required: ["policy", "moments", "deliberately_absent"],
        properties: {
          policy: { type: "string" },
          moments: {
            type: "array",
            items: {
              type: "object",
              required: ["trigger", "behaviour", "duration_ms", "easing"],
              properties: {
                trigger: { type: "string" },
                behaviour: { type: "string" },
                duration_ms: { type: "integer" },
                easing: { type: "string" },
              },
            },
          },
          deliberately_absent: { type: "array", items: { type: "string" } },
        },
      },
      structural_devices: {
        type: "array",
        items: {
          type: "object",
          required: ["device", "encodes"],
          properties: {
            device: { type: "string" },
            encodes: { type: "string", description: "What this device encodes about the content — must be true." },
          },
        },
      },
      revisions: {
        type: "array",
        description:
          "The self-critique log. Must be non-empty — if you found nothing to change, you didn't do the critique seriously enough.",
        items: {
          type: "object",
          required: ["changed", "from", "to", "why"],
          properties: {
            changed: { type: "string" },
            from: { type: "string" },
            to: { type: "string" },
            why: { type: "string" },
          },
        },
      },
    },
  },
};

const SYSTEM_PROMPT = `You are the design lead at a small studio known for giving every client a visual
identity that could not be mistaken for anyone else's. This client has already
rejected proposals that felt templated. They are paying for a distinctive point of
view.

Your job in this call is NOT to write HTML. It is to decide the design direction and
return it via the propose_design_spec tool. A separate process will build from your spec, so
every decision must be explicit — anything you leave unstated will be filled in with
a generic default.

## Ground the design in the subject

The design comes from the client's own world: their industry, their materials, their
artifacts, their vernacular, the physical reality of what they do. Two businesses in
different industries with different audiences should not receive variations of the same
page with different colours. The INTERPRETED BRIEF below already states in one sentence
what this business is, who its customer is, and the single job this page has to do — do
not restate it in your tool call, just make sure every decision you make traces back to it.

## The brief has already been interpreted

The client's raw adjectives ("modern," "trustworthy," "premium") have already been
translated into mechanisms and qualities by an earlier step — that is the INTERPRETED
BRIEF below. Trust it: it has already resolved brief-vs-reference contradictions, flagged
what to carry forward, and named what this design must move away from. Your job is to
turn its target_qualities and mechanisms into an actual palette, type system, and layout —
not to re-interpret the client's adjectives yourself.

## What to decide

Fill in every one of these fields in your tool call. None of them are scene-setting prose
to skip past on the way to the "real" decisions.

PALETTE — 4 to 6 named hex values with defined roles. Justify the palette against
the subject, not against fashion. State which colour is the accent and where it is
permitted to appear. Restraint in accent usage is what makes it read as intentional.

TYPE — a display face and a body face, named specifically, plus a utility face if
the content needs one for captions or data. Pair them deliberately. The pairing
should be one you would not have chosen for a different client. Define a type scale
with explicit sizes, weights and letter-spacing. Typography carries the personality
of the page; it is not a neutral delivery vehicle. Fonts must be sourced from Google
Fonts (source: "google") or a system-font fallback stack (source: "system") — no
self-hosted files. Name a real, specific family, not "Inter" or "Roboto".

LAYOUT — a layout concept in one sentence, plus an ASCII wireframe of the hero and
one content section. The hero is a thesis: it should open with the most
characteristic thing in this subject's world. A big number with a small label,
supporting stats and a gradient accent is the template answer — use it only if it is
genuinely the best answer here.

SIGNATURE — the single element this page will be remembered by. One. Everything
around it stays quiet and disciplined. Spend your boldness in one place.

MOTION — where motion is used and, explicitly, where it is deliberately absent. An
orchestrated moment lands harder than scattered effects. Excessive animation is one
of the strongest tells of AI-generated design.

STRUCTURE — any structural devices (eyebrows, dividers, numbering, labels) must
encode something true about the content. Numbered markers 01/02/03 are only
appropriate when the content genuinely is a sequence. If it is not a sequence, do
not number it.

## Defaults you must not fall into

The following are current AI-design clichés. They are legitimate for some briefs,
but they appear regardless of subject, which makes them defaults rather than choices.
Where the client brief explicitly asks for one of these, follow the brief. Where the
brief leaves the axis free, do not spend that freedom here:

{{ANTI_DEFAULTS}}

## Take a real risk

Take one real aesthetic risk you can justify, and name it in your rationale. A direction
with zero risk in it is a direction that could have been generated for anyone.

## Self-critique before you answer

After drafting the direction, work through this check and revise:

1. Would you have produced substantially this same direction for a business in a
   different industry with a different audience? If yes, that part is a default, not
   a choice. Change it.
2. Does any element appear on the anti-defaults list without the brief asking for it?
   Replace it.
3. Is the boldness concentrated in one signature element, or scattered across the
   page? Concentrate it.
4. Does the complexity of execution match the ambition of the direction? Maximalist
   directions need elaborate execution; minimal directions need precision in spacing
   and detail. Elegance is executing the chosen vision well.

Record what you changed and why in the revisions field. This field is read by a
human reviewer, so be specific: "changed X to Y because Z", not "refined the palette".
An empty revisions array means the self-critique did not happen — it must contain at
least one entry.`;

export type DesignDirectionInput = {
  clientName: string;
  userPrompt: string | null;
  intent: "FACELIFT" | "WORDPRESS_TRANSFER";
  interpretedBrief: InterpretedBrief;
  existingSiteRead: VisualRead;
  referenceReads: VisualRead[];
  assetList: Array<{ filename: string; type: string }>;
};

export type ImageAttachment = {
  mediaType: "image/png" | "image/jpeg" | "image/webp" | "image/gif";
  data: string;
};

function buildUserMessage(input: DesignDirectionInput): string {
  const lines: string[] = [];

  lines.push("INTERPRETED BRIEF");
  lines.push(JSON.stringify(input.interpretedBrief, null, 2));
  if (input.userPrompt?.trim()) {
    lines.push(`\nAdditional instruction for this direction: ${input.userPrompt.trim()}`);
  }

  lines.push("\nCURRENT SITE");
  lines.push(
    "Screenshot attached above — read it for what the business is and what content exists. Do not treat its design as a constraint; the client is paying to replace it. A detailed visual diagnosis is also included below."
  );
  lines.push(JSON.stringify(input.existingSiteRead, null, 2));

  lines.push("\nREFERENCE DIRECTION");
  if (input.referenceReads.length > 0) {
    lines.push(
      "These are transferable qualities extracted from reference sites the client responded to — never a template to reproduce. No reference screenshots are attached; design original work that satisfies these qualities, not a visual match."
    );
    for (const r of input.referenceReads) {
      lines.push(
        `- ${r.url}: why it works — ${r.why_it_works ?? "n/a"}; transferable qualities — ${(r.transferable ?? []).join(", ") || "none noted"}`
      );
    }
  } else {
    lines.push("None provided.");
  }

  lines.push("\nBRAND ASSETS PROVIDED");
  if (input.assetList.length > 0) {
    for (const a of input.assetList) lines.push(`- ${a.filename} (${a.type})`);
    lines.push("Locked brand colours: none specified — derive the palette freely.");
    lines.push("Locked typefaces: none specified — choose freely.");
  } else {
    lines.push("None.");
  }

  lines.push("\nCONSTRAINTS");
  lines.push(
    input.intent === "WORDPRESS_TRANSFER"
      ? "Output will be a WordPress theme. Fonts must be loadable via a Google Fonts <link>/wp_enqueue_style or a system-font stack — no self-hosted font files, no other external CDN dependencies."
      : "Output will be a standalone static site. Fonts must be loadable via a Google Fonts <link> or a system-font stack — no other external CDN/framework dependencies."
  );

  return lines.join("\n");
}

const MAX_ATTEMPTS = 3;

export async function proposeDesignSpec(
  input: DesignDirectionInput,
  homepageScreenshot: ImageAttachment | null,
  logoImages: ImageAttachment[]
): Promise<DesignSpec> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  function buildContent(correctionNote: string | null): Anthropic.ContentBlockParam[] {
    return [
      ...(homepageScreenshot
        ? [
            {
              type: "text" as const,
              text: "The following is a screenshot of the client's current homepage.",
            },
            {
              type: "image" as const,
              source: {
                type: "base64" as const,
                media_type: homepageScreenshot.mediaType,
                data: homepageScreenshot.data,
              },
            },
          ]
        : []),
      ...logoImages.map(
        (img): Anthropic.ImageBlockParam => ({
          type: "image",
          source: { type: "base64", media_type: img.mediaType, data: img.data },
        })
      ),
      // Deliberately no reference-site screenshots here — Call 0A already extracted
      // transferable qualities from them (see REFERENCE DIRECTION below). Attaching the
      // images themselves risks a partial visual clone of someone else's site.
      { type: "text", text: buildUserMessage(input) },
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

  const system = SYSTEM_PROMPT.replace("{{ANTI_DEFAULTS}}", formatAntiDefaults());

  let lastError: Error | null = null;
  let correctionNote: string | null = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const stream = anthropic.messages.stream({
        model: "claude-sonnet-5",
        max_tokens: 16000,
        // No temperature — removed on Sonnet 5. Variance comes from the self-critique
        // step and the explicit anti-defaults list instead, per the design-prompt-system
        // rationale (a checklist of "add X" produces a new generic, not distinctiveness).
        output_config: { effort: "xhigh" },
        system,
        tools: [DESIGN_SPEC_TOOL],
        tool_choice: { type: "tool", name: TOOL_NAME },
        // On a retry, tell the model exactly what was rejected last time instead of just
        // hoping a fresh independent sample doesn't repeat the same omission.
        messages: [{ role: "user", content: buildContent(correctionNote) }],
      });

      const message = await stream.finalMessage();

      if (message.stop_reason === "max_tokens") {
        throw new Error(
          "Design direction was cut off by the token limit before finishing the spec."
        );
      }

      const toolUse = message.content.find(
        (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
      );

      const normalizedInput = toolUse ? normalizeStringifiedJson(toolUse.input) : null;

      // Subject is never asked of the model (see DESIGN_SPEC_TOOL above) — carry it
      // forward from the already-interpreted brief instead of hoping the model restates
      // it. This is what actually eliminates the old "missing top-level keys: subject"
      // failure, rather than just retrying past it.
      const withSubject =
        normalizedInput && typeof normalizedInput === "object"
          ? {
              ...(normalizedInput as Record<string, unknown>),
              subject: {
                business: input.interpretedBrief.subject.business,
                audience: input.interpretedBrief.subject.audience,
                page_job: input.interpretedBrief.page_job,
              },
            }
          : normalizedInput;

      if (process.env.DEBUG_DESIGN_SPEC) {
        console.error("[design-direction][debug] stop_reason:", message.stop_reason);
        console.error("[design-direction][debug] num blocks:", message.content.length);
        console.error(
          "[design-direction][debug] block types:",
          message.content.map((b) => b.type)
        );
        console.error(
          "[design-direction][debug] withSubject:",
          withSubject ? JSON.stringify(withSubject).slice(0, 4000) : "NO TOOL USE BLOCK"
        );
      }

      const validation = validateDesignSpecShape(withSubject);
      if (!validation.valid) {
        // Always logged (not gated behind a debug flag) — a silently-swallowed validation
        // failure papered over by the retry is exactly the failure mode that hides a real
        // problem until it degrades into a hard, visible one.
        console.error(
          `[design-direction] attempt ${attempt}/${MAX_ATTEMPTS} invalid spec shape: ${validation.reason}`
        );
        throw new Error(`Claude did not return a valid design spec: ${validation.reason}`);
      }

      const spec = withSubject as DesignSpec;
      if (!Array.isArray(spec.revisions) || spec.revisions.length === 0) {
        // Empty revisions means the self-critique step didn't happen, which reliably
        // predicts generic output — reject and retry rather than accepting it silently.
        throw new Error("Design spec returned with empty revisions — self-critique was skipped");
      }

      // Distinctly tagged and always logged (success and failure both) so the attempt-1
      // success rate can be computed from server logs instead of drifting invisible — a
      // retry recovering on attempt 2 is not the same thing as the primary path working,
      // and reporting it as "the retry worked as designed" hides a primary-path failure
      // that may be routine rather than rare.
      if (attempt === 1) {
        console.log("[design-direction][metric] attempt=1 result=success");
      }

      return spec;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      correctionNote = lastError.message;
      console.error(`[design-direction] attempt ${attempt}/${MAX_ATTEMPTS} failed:`, lastError.message);
      if (attempt === 1) {
        console.error(`[design-direction][metric] attempt=1 result=failure reason=${lastError.message}`);
      }
    }
  }

  throw lastError ?? new Error("Design direction failed for an unknown reason");
}
