import type {
  TechnicalAudit,
  VisualDesignAudit,
  MotionInteractionAudit,
  BrandToneAudit,
  ContentInventoryEntry,
} from "@/lib/audit-types";

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
};

export function buildAuditSummaryLines(input: PromptInput): string[] {
  const lines: string[] = [];

  lines.push("## Client brief");
  lines.push(
    input.briefText?.trim() || "No specific brief provided — use your judgment based on the audit."
  );

  lines.push("\n## Inspiration / reference sites");
  if (input.references.length > 0) {
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
  lines.push(
    `Color palette detected: ${input.visualDesign?.colorPalette.map((c) => c.value).join(", ") || "none"}`
  );
  lines.push(
    `Typography detected: ${input.visualDesign?.typography.map((t) => t.value).join(", ") || "none"}`
  );
  lines.push(
    `Animation/motion: ${input.motionInteraction?.animationLibraries.join(", ") || "None detected"}`
  );

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
