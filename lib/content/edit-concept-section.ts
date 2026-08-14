import Anthropic from "@anthropic-ai/sdk";
import { withTransientRetry } from "@/lib/ai/anthropic-retry";

// One section of one client's already-generated concept, edited in isolation. Deliberately
// a much smaller, much more constrained call than lib/content/structure-and-rewrite.ts's
// full extraction pass: the model sees exactly one section's HTML and a plain-English
// instruction, nothing else on the page, and is bound to a scoped class prefix it cannot
// step outside of — see lib/templates/section-editor.ts's own comment for why isolation
// matters here (client-level isolation is free from the data model; section-level
// isolation, since sections share CSS classes with each other, is not, and is what this
// module exists to enforce).

const TOOL_NAME = "edit_section";
// A single section's markup is a small fraction of a full page — this is generous
// headroom, not a tight budget the way structure-and-rewrite.ts's is.
const MAX_OUTPUT_TOKENS = 4_000;
// Lighter than structure-and-rewrite.ts's 3 — this is a much simpler, single-field,
// mechanically-checkable task, so a well-behaved model rarely needs more than one retry.
const MAX_ATTEMPTS = 2;

const SYSTEM_PROMPT = `You are editing exactly one section of an already-designed marketing \
landing page, on behalf of the person who generated it. You are given that section's \
current HTML and a plain-English instruction for how to change it. Follow these rules \
exactly — this output is inserted directly into a real page that may be published \
publicly, and no other section of the page is shown to you, because none of them may be \
affected by this edit.

1. Return the ENTIRE section as one HTML fragment: the same outer tag the input used (for \
example, if given a <section ...>, return a <section ...>, never a <div> or anything \
else), through its matching closing tag. Do not wrap it in anything else.
2. The outer tag's data-kondo-section="..." attribute must be preserved exactly as given — \
never remove, rename, or duplicate it.
3. You may add a <style> block inside the fragment for any new CSS you need. Every new \
class name or id you introduce anywhere in the HTML or the CSS MUST start with the exact \
prefix you are given below — no exceptions. This is what keeps your change isolated to \
this one section; any class without that prefix is assumed to belong to the rest of the \
page and must never be redefined or overridden.
4. Never reference or redeclare a global CSS custom property (anything starting with --, \
e.g. --accent, --paper) — read an existing one with var() if you need the page's colors, \
but never redeclare its value.
5. Never remove or rewrite an existing class name already present in the given HTML unless \
the instruction specifically requires changing that element's structure — prefer adding \
new, prefixed classes over modifying what is already there.
6. Never include a <script> tag or any inline event-handler attribute (onclick, onload, \
etc.).
7. Preserve the actual business information already in the section — names, numbers, \
contact details, existing copy — unless the instruction explicitly asks you to change \
wording. You are changing layout and visual treatment, not the underlying facts, unless \
told otherwise.
8. If the instruction is vague, make the single most reasonable, tasteful interpretation \
for a professional small-business landing page — you cannot ask a follow-up question.`;

function buildEditTool(): Anthropic.Tool {
  return {
    name: TOOL_NAME,
    description: "Return the complete replacement HTML for this one page section.",
    input_schema: {
      type: "object",
      required: ["html"],
      properties: {
        html: {
          type: "string",
          description:
            "The full replacement HTML fragment for this section, starting with the same opening tag and ending with its matching closing tag.",
        },
      },
    },
  };
}

// Best-effort, not a full CSS parser — catches the common case (a new selector introduced
// without the required prefix) without needing to fully implement CSS selector grammar.
// Not the only safety net here: a selector this misses can at worst produce a visual
// glitch confined to this one client's one page (still frozen per-concept, still never
// reaching another client or the shared template) — not a security issue on its own.
function checkCssScoping(html: string, scopePrefix: string): { ok: true } | { ok: false; reason: string } {
  const styleBlocks = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]);
  for (const block of styleBlocks) {
    const withoutComments = block.replace(/\/\*[\s\S]*?\*\//g, "");
    for (const chunk of withoutComments.split("}")) {
      const braceIdx = chunk.indexOf("{");
      if (braceIdx === -1) continue;
      const selectorPart = chunk.slice(0, braceIdx);
      if (/^\s*@/.test(selectorPart)) continue; // @media/@keyframes header, not a selector to check
      const tokens = selectorPart.match(/[.#][a-zA-Z_-][a-zA-Z0-9_-]*/g) ?? [];
      for (const token of tokens) {
        if (!token.slice(1).startsWith(scopePrefix)) {
          return {
            ok: false,
            reason: `every new CSS class/id must start with "${scopePrefix}" — found "${token}", which doesn't`,
          };
        }
      }
    }
  }
  return { ok: true };
}

function validateSectionEditResponse(
  html: string,
  originalHtml: string,
  scopePrefix: string
): { ok: true } | { ok: false; reason: string } {
  if (!html) return { ok: false, reason: "response was empty" };
  if (html.length > 20_000) return { ok: false, reason: "response is implausibly large for a single section" };
  if (/<script/i.test(html)) return { ok: false, reason: "must not include a <script> tag" };
  if (/\son[a-z]+\s*=/i.test(html)) return { ok: false, reason: "must not include an inline event-handler attribute" };

  const originalTag = originalHtml.match(/^<([a-zA-Z][a-zA-Z0-9-]*)/)?.[1]?.toLowerCase();
  const newTag = html.match(/^<([a-zA-Z][a-zA-Z0-9-]*)/)?.[1]?.toLowerCase();
  if (!originalTag || !newTag || originalTag !== newTag) {
    return { ok: false, reason: `must start with the same outer tag as the original (<${originalTag ?? "?"}>)` };
  }

  const sectionAttr = originalHtml.match(/data-kondo-section="[^"]+"/)?.[0];
  if (sectionAttr && !html.includes(sectionAttr)) {
    return { ok: false, reason: `must keep the exact attribute ${sectionAttr}` };
  }

  return checkCssScoping(html, scopePrefix);
}

// sectionHtml: the one section's current fragment (lib/templates/section-editor.ts).
// instruction: the human's plain-English request.
// scopePrefix: a unique-per-edit class/id prefix (see lib/actions/concepts.ts) the model
// must confine any new CSS to.
export async function editConceptSectionHtml(
  sectionHtml: string,
  instruction: string,
  scopePrefix: string
): Promise<string> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const tool = buildEditTool();

  let lastError: Error | null = null;
  let correctionNote: string | null = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const result = await withTransientRetry(`edit-concept-section attempt ${attempt}`, async () => {
        const stream = anthropic.messages.stream({
          model: "claude-sonnet-5",
          max_tokens: MAX_OUTPUT_TOKENS,
          output_config: { effort: "high" },
          system: SYSTEM_PROMPT,
          tools: [tool],
          tool_choice: { type: "tool", name: TOOL_NAME },
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text:
                    `Scoped class/id prefix you must use for anything new: ${scopePrefix}\n\n` +
                    `Current section HTML:\n\n${sectionHtml}\n\nInstruction: ${instruction}`,
                },
                ...(correctionNote
                  ? [
                      {
                        type: "text" as const,
                        text: `IMPORTANT: your previous attempt was rejected: ${correctionNote}. Fix this and try again.`,
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
        throw new Error("Section edit was cut off by the token limit — try a shorter instruction.");
      }

      const toolUse = result.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
      const input = toolUse?.input as { html?: unknown } | undefined;
      const html = typeof input?.html === "string" ? input.html.trim() : "";

      const validation = validateSectionEditResponse(html, sectionHtml, scopePrefix);
      if (!validation.ok) {
        console.error(`[edit-concept-section] attempt ${attempt} rejected: ${validation.reason}`);
        correctionNote = validation.reason;
        lastError = new Error(validation.reason);
        continue;
      }

      return html;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw lastError ?? new Error("Section edit failed after retries.");
}
