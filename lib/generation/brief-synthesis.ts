import Anthropic from "@anthropic-ai/sdk";
import { formatAdjectiveTranslations } from "./adjective-translations";
import {
  validateInterpretedBriefShape,
  RESOLUTION_RULES,
  type InterpretedBrief,
} from "./interpreted-brief-types";
import { normalizeStringifiedJson } from "./json-tool-utils";
import type { VisualRead } from "./visual-read-types";

const TOOL_NAME = "report_interpreted_brief";

const INTERPRETED_BRIEF_TOOL: Anthropic.Tool = {
  name: TOOL_NAME,
  description: "Report the synthesized interpretation of a client's redesign brief.",
  input_schema: {
    type: "object",
    required: [
      "subject",
      "page_job",
      "target_qualities",
      "moving_away_from",
      "carry_forward",
      "content_reality",
      "resolved",
      "conflicts",
      "confidence",
    ],
    properties: {
      subject: {
        type: "object",
        description: "Required.",
        required: ["business", "audience", "what_they_actually_do"],
        properties: {
          business: { type: "string" },
          audience: { type: "string" },
          what_they_actually_do: { type: "string" },
        },
      },
      page_job: { type: "string", description: "Required." },
      target_qualities: {
        type: "array",
        description: "Required, at least 2 items.",
        minItems: 2,
        items: {
          type: "object",
          required: ["client_word", "what_they_mean", "mechanism", "source"],
          properties: {
            client_word: { type: "string" },
            what_they_mean: { type: "string" },
            mechanism: { type: "string" },
            source: { type: "string", enum: ["brief", "reference", "inferred"] },
          },
        },
      },
      moving_away_from: {
        type: "array",
        description: "Required (may be empty).",
        items: {
          type: "object",
          required: ["signal", "evidence"],
          properties: { signal: { type: "string" }, evidence: { type: "string" } },
        },
      },
      carry_forward: {
        type: "array",
        description: "Required (may be empty).",
        items: {
          type: "object",
          required: ["asset", "reason", "binding"],
          properties: {
            asset: { type: "string" },
            reason: { type: "string" },
            binding: { type: "boolean" },
          },
        },
      },
      content_reality: {
        type: "object",
        description: "Required.",
        required: ["volume", "supports_ambition", "note"],
        properties: {
          volume: { type: "string", enum: ["sparse", "moderate", "heavy"] },
          supports_ambition: { type: "boolean" },
          note: { type: "string" },
        },
      },
      resolved: {
        type: "array",
        description:
          "Required (may be empty — this is expected to be the smaller field, not conflicts). " +
          "Only tensions where you can cite one of exactly three named rules, verbatim, as the " +
          "thing that settled it. If you cannot name one of those three, it is not resolved — " +
          "put it in conflicts instead, even if you have a reason that sounds sensible in the " +
          "moment.",
        items: {
          type: "object",
          required: ["between", "resolution", "rule"],
          properties: {
            between: { type: "array", items: { type: "string" } },
            resolution: { type: "string", description: "What you decided." },
            rule: {
              type: "string",
              enum: [...RESOLUTION_RULES],
              description:
                "Must be exactly one of these three. There is no fourth rule — if none of these " +
                "verbatim values applies, this entry does not belong in resolved.",
            },
          },
        },
      },
      conflicts: {
        type: "array",
        description:
          "Required. This is the resting state for any tension you notice — default to putting " +
          "it here. It only leaves for confidence.gaps (one side is genuinely missing) or resolved " +
          "(you can cite one of the three named rules verbatim). A short resolved array and a " +
          "conflicts array doing most of the work is expected and correct, not a sign you should " +
          "have tried harder to resolve things yourself.",
        items: {
          type: "object",
          required: ["between", "description", "leaning", "why"],
          properties: {
            between: { type: "array", items: { type: "string" } },
            description: { type: "string" },
            leaning: { type: "string" },
            why: { type: "string" },
          },
        },
      },
      confidence: {
        type: "object",
        description: "Required.",
        required: ["level", "gaps"],
        properties: {
          level: {
            type: "string",
            enum: ["high", "medium", "low"],
            description:
              "high: brief, reference reads and supplied assets all point the same direction, and " +
              "nothing here required inferring beyond what was actually stated or shown. medium: " +
              "the overall direction is clear but at least one significant thing had to be inferred. " +
              "low: gaps or unresolved conflicts are significant enough that a designer shouldn't " +
              "proceed without a second pass. Do not default to medium out of caution — if it's " +
              "genuinely high, say so.",
          },
          gaps: { type: "array", items: { type: "string" } },
        },
      },
    },
  },
};

const SYSTEM_PROMPT = `You are interpreting a client's redesign brief. Your output is the single document a
designer will work from, so it must resolve ambiguity rather than pass it along.

## Translate adjectives into mechanisms

Clients describe websites with adjectives. Adjectives are not design instructions —
they are pointers to underlying qualities, and the same adjective means different
things for different businesses. Your first job is to convert every evaluative word
in the brief into the mechanism that actually produces it for THIS business.

Consult the translation reference below. It is a starting point, not a lookup table
to copy from — adapt each translation to the specific subject.

{{ADJECTIVE_TRANSLATIONS}}

For any evaluative word not in the reference, do the same work: state what the word
is pointing at, then name the mechanism that produces it here.

## Read the negative space

Briefs carry unstated constraints. "We want it to look modern" almost always means
"the current site looks dated and that embarrasses us" — which makes it a negative
constraint about specific dating signals, not a positive instruction. "We don't want
to look like a typical [X]" is a real constraint even though it names nothing.

Extract these. State what the client is trying to move away from, using the existing
site read as evidence for what they are reacting against.

## The three named rules

There are exactly three rules that settle a tension without a human. Nothing else does,
no matter how sound the reasoning feels in the moment:

- locked_beats_all — an explicitly locked constraint (a locked colour, font or mark)
  always wins over anything it conflicts with.
- reference_beats_adjective — when a brief adjective and the qualities of a reference the
  client chose disagree, the reference wins. Clients are unreliable at describing what
  they want and reliable at pointing at it.
- reference_beats_equity — when an existing-site asset is merely noted as equity, not
  locked, a reference the client explicitly chose outweighs it. A reference's own
  not_transferable notes tell you which of its surface details not to copy — they narrow
  what you take from it, they do not by themselves establish that its overall register or
  formality fits this business. Excluding a reference's surface tics does not resolve a
  mood or formality mismatch between the reference and the brief; that mismatch is still
  conflict material even after the tics are excluded.

These three names are the only vocabulary resolved.rule accepts. If your reasoning
doesn't reduce to one of them verbatim, you have not resolved anything yet.

## conflicts is the resting state

Default every tension to conflicts. It only leaves for one of two reasons, and both
require you to do something specific, not just feel confident:

1. GAP — one side is genuinely absent, not opposed. The reference leads with dense
   product screenshots and none were supplied. The existing site names a locked font
   but no reference speaks to typography at all. Nothing is contradicted here; something
   is missing. This goes in confidence.gaps. Never put a gap in resolved or conflicts.

   This applies even when the missing thing is central to the whole reference mechanism,
   not just a supporting detail. A reference site's entire effect might depend on a
   dark-native product UI or on real screenshots existing — if nothing confirms that
   precondition holds for this client, that is still a gap, not a conflict, no matter how
   much of the direction rides on it. Use this test: if your own reasoning is "a human
   should confirm whether X exists/is available" or "this depends on assets not yet
   supplied," you have just described a gap — write it in confidence.gaps and move on.
   Do not also raise it as a conflict because it feels too consequential to leave there;
   consequential and contradictory are different things, and only the second belongs in
   conflicts.

2. RESOLVED — you can name one of the three rules above, by its exact value
   (locked_beats_all / reference_beats_adjective / reference_beats_equity), as the thing
   that settles it. If you cannot cite one of those three names verbatim, do not invent a
   fourth rule and do not talk yourself into a resolution because it sounds reasonable —
   leave it in conflicts. A tension you can't attach to a named rule is exactly what
   conflicts is for, not a gap in your reasoning to paper over.

Everything else stays in conflicts by default: the mood the brief repeatedly and
explicitly asks for turning out to be the opposite of the reference's dominant character,
the client stating two things that are themselves mutually exclusive, a hard category
mismatch between the reference's audience and this client's audience, or simply being
genuinely unsure which way to lean after checking the three rules above. State which way
you lean and why, but do not resolve it yourself — a human reviews every entry here
before design work begins.

A short resolved array next to a conflicts array doing most of the work is the expected,
correct shape of this output — not a sign you under-resolved. If resolved and conflicts
are roughly the same size, or resolved is longer, you are very likely letting things
through on reasoning that isn't one of the three named rules.

## Do not design

You are not choosing palettes, typefaces or layouts. You are establishing what the
design must achieve and what it must avoid. Naming a specific colour or font here
pre-empts a decision that belongs to the next stage. Describe qualities and
mechanisms only.`;

export type BriefSynthesisInput = {
  rawBriefText: string | null;
  businessName: string;
  industry: string;
  extractedPositioning: string;
  targetCustomer: string;
  statedGoal: string;
  existingSiteRead: VisualRead;
  pageCount: number;
  pageTypes: string[];
  wordCount: number;
  heaviestPageSummary: string;
  referenceReads: VisualRead[];
  assetManifest: Array<{ filename: string; type: string }>;
  lockedColours: string | null;
  lockedFonts: string | null;
  lockedMarks: string | null;
  hardConstraints: string;
};

function buildUserMessage(input: BriefSynthesisInput): string {
  const lines: string[] = [];
  lines.push("CLIENT BRIEF, VERBATIM");
  lines.push(input.rawBriefText?.trim() || "No specific brief provided — use your judgment.");

  lines.push("\nBUSINESS CONTEXT");
  lines.push(`${input.businessName} — ${input.industry}`);
  lines.push(`Positioning, in their own words: ${input.extractedPositioning}`);
  lines.push(`Target customer: ${input.targetCustomer}`);
  lines.push(`What this site needs to achieve: ${input.statedGoal}`);

  lines.push("\nEXISTING SITE — VISUAL READ");
  lines.push(JSON.stringify(input.existingSiteRead, null, 2));

  lines.push("\nEXISTING SITE — CONTENT SCALE");
  lines.push(`Page count: ${input.pageCount}`);
  lines.push(`Page types: ${input.pageTypes.join(", ") || "none"}`);
  lines.push(`Approximate word count: ${input.wordCount}`);
  lines.push(`Heaviest page: ${input.heaviestPageSummary}`);

  lines.push("\nREFERENCE SITES — VISUAL READS");
  lines.push(
    input.referenceReads.length > 0
      ? JSON.stringify(input.referenceReads, null, 2)
      : "(none supplied)"
  );

  lines.push("\nBRAND ASSETS SUPPLIED");
  if (input.assetManifest.length > 0) {
    for (const a of input.assetManifest) lines.push(`- ${a.filename} (${a.type})`);
  } else {
    lines.push("None.");
  }
  lines.push(`Locked colours: ${input.lockedColours ?? "none specified"}`);
  lines.push(`Locked typefaces: ${input.lockedFonts ?? "none specified"}`);
  lines.push(`Locked marks: ${input.lockedMarks ?? "none specified"}`);

  lines.push("\nHARD CONSTRAINTS");
  lines.push(input.hardConstraints);

  return lines.join("\n");
}

const MAX_ATTEMPTS = 3;

export async function synthesizeInterpretedBrief(input: BriefSynthesisInput): Promise<InterpretedBrief> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const system = SYSTEM_PROMPT.replace("{{ADJECTIVE_TRANSLATIONS}}", formatAdjectiveTranslations());

  function buildContent(correctionNote: string | null): Anthropic.ContentBlockParam[] {
    return [
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

  let lastError: Error | null = null;
  let correctionNote: string | null = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const stream = anthropic.messages.stream({
        model: "claude-sonnet-5",
        max_tokens: 16000,
        output_config: { effort: "high" },
        system,
        tools: [INTERPRETED_BRIEF_TOOL],
        tool_choice: { type: "tool", name: TOOL_NAME },
        messages: [{ role: "user", content: buildContent(correctionNote) }],
      });

      const message = await stream.finalMessage();

      if (message.stop_reason === "max_tokens") {
        throw new Error("Brief synthesis was cut off by the token limit before finishing.");
      }

      const toolUse = message.content.find(
        (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
      );
      const normalizedInput = toolUse ? normalizeStringifiedJson(toolUse.input) : null;

      const validation = validateInterpretedBriefShape(normalizedInput);
      if (!validation.valid) {
        console.error(
          `[brief-synthesis] attempt ${attempt}/${MAX_ATTEMPTS} invalid shape: ${validation.reason}`
        );
        throw new Error(`Claude did not return a valid interpreted brief: ${validation.reason}`);
      }

      return normalizedInput as InterpretedBrief;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      correctionNote = lastError.message;
      console.error(`[brief-synthesis] attempt ${attempt}/${MAX_ATTEMPTS} failed:`, lastError.message);
    }
  }

  throw lastError ?? new Error("Brief synthesis failed for an unknown reason");
}
