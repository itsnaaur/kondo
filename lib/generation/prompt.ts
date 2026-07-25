import { buildAuditSummaryLines, type PromptInput, type GeneratedFile } from "./types";

export type { GeneratedFile, PromptInput };

export function buildGenerationPromptText(input: PromptInput): string {
  const lines: string[] = [
    "You are generating a redesigned static HTML/CSS/JS website for a JRNY Digital client, based on an audit of their current site and their stated preferences. This is a facelift — new visual design, but the output should be a real, polished, standalone static website.",
    "",
    ...buildAuditSummaryLines(input),
  ];

  if (input.assetList.length > 0) {
    lines.push(
      'Logo images (if any) are attached below as images — reference them at "assets/{filename}" in your HTML.'
    );
  }

  lines.push("\n## Output rules");
  lines.push("- Produce a polished, modern static website: at minimum index.html and style.css.");
  lines.push(
    "- Preserve the brand's color palette and typography where sensible; evolve the layout per the brief/references."
  );
  lines.push(
    "- Use semantic HTML and responsive CSS (flexbox/grid). No external framework/CDN dependencies — it must work standalone when unzipped and opened locally."
  );
  lines.push(
    "- Do not fabricate photographic imagery — use CSS gradients, shapes, or simple inline SVG icons instead of placeholder photos, unless a logo asset is attached."
  );

  if (input.priorFiles && input.priorFiles.length > 0) {
    lines.push("\n## Current generated files (to be edited, not replaced from scratch)");
    for (const f of input.priorFiles) {
      lines.push(`\n### ${f.path}\n\`\`\`\n${f.content}\n\`\`\``);
    }
    lines.push("\n## Requested change");
    lines.push(input.userPrompt?.trim() || "Refine and improve the current design.");
    lines.push(
      "\nReturn the FULL updated set of files reflecting this change, including any files left unchanged."
    );
  } else {
    lines.push("\n## Task");
    lines.push("Generate the first version of the facelifted site now.");
    if (input.userPrompt?.trim()) {
      lines.push(`Additional instruction for this first pass: ${input.userPrompt.trim()}`);
    }
  }

  return lines.join("\n");
}
