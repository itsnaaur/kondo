import type {
  TechnicalAudit,
  VisualDesignAudit,
  MotionInteractionAudit,
  BrandToneAudit,
  ContentInventoryEntry,
} from "@/lib/audit-types";
import { QUALITY_FLOOR } from "./quality-floor";
import type { DesignSpec } from "./design-spec-types";

export type GeneratedFile = { path: string; content: string };

export type PromptInput = {
  clientName: string;
  briefText: string | null;
  references: Array<{ url: string; note: string | null }>;
  technical: TechnicalAudit | null;
  visualDesign: VisualDesignAudit | null;
  motionInteraction: MotionInteractionAudit | null;
  brandTone: BrandToneAudit | null;
  contentInventory: ContentInventoryEntry[] | null;
  reviewNotes: string | null;
  assetList: Array<{ filename: string; type: string }>;
  priorFiles: GeneratedFile[] | null;
  userPrompt: string | null;
  /** The approved Call 1 output — Call 2 executes this faithfully rather than inventing it. */
  designSpec: DesignSpec;
};

export function buildAuditSummaryLines(input: PromptInput): string[] {
  const lines: string[] = [];

  lines.push("## Client brief");
  lines.push(
    input.briefText?.trim() || "No specific brief provided — use your judgment based on the audit."
  );

  lines.push("\n## Inspiration / reference sites");
  if (input.references.length > 0) {
    lines.push(
      "These informed the approved design direction below — you do not need to look at them again, just execute the spec."
    );
    for (const r of input.references) {
      lines.push(`- ${r.url}${r.note ? `: ${r.note}` : ""}`);
    }
  } else {
    lines.push("None provided.");
  }

  lines.push("\n## Audit of their current site");
  lines.push(`Platform: ${input.technical?.platform ?? "Unknown"}`);
  lines.push(`Pages crawled: ${input.technical?.pagesCrawled ?? 0}`);
  lines.push(`Forms present: ${input.technical?.formsDetected ? "Yes" : "No"}`);

  if (input.brandTone) {
    lines.push(`Brand tone: ${input.brandTone.personality.join(", ")} — ${input.brandTone.summary}`);
    lines.push(`Voice: ${input.brandTone.voice}`);
    lines.push(`Emotional impression: ${input.brandTone.emotionalImpression}`);
  }

  if (input.contentInventory?.length) {
    lines.push("\nContent inventory (their existing pages):");
    for (const p of input.contentInventory.slice(0, 20)) {
      lines.push(`- ${p.title || p.url}`);
    }
  }

  lines.push("\n## Approved design specification");
  lines.push(
    "This direction has already been decided and approved by the team. Execute it faithfully — " +
      "you are not a second opinion on the direction. Do not introduce a colour that is not in the " +
      "palette, a typeface that is not in the type spec, or motion that is not in the motion spec. " +
      "If executing the spec faithfully appears impossible, build the closest faithful version and " +
      "record the conflict in an HTML comment at the end of the document rather than silently " +
      "falling back to a default."
  );
  lines.push("```json");
  lines.push(JSON.stringify(input.designSpec, null, 2));
  lines.push("```");

  lines.push(`\n${QUALITY_FLOOR}`);

  lines.push("\n## Team review notes");
  lines.push(input.reviewNotes?.trim() || "None.");

  lines.push("\n## Available assets");
  if (input.assetList.length > 0) {
    for (const a of input.assetList) {
      lines.push(`- ${a.filename} (${a.type})`);
    }
  } else {
    lines.push("None provided.");
  }

  return lines;
}
