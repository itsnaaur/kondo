import { buildAuditSummaryLines, type PromptInput, type GeneratedFile } from "./types";

export type { GeneratedFile, PromptInput };

export function buildGenerationPromptText(input: PromptInput): string {
  const lines: string[] = [
    "You are building a redesigned static HTML/CSS/JS website for a JRNY Digital client. The design direction below has already been decided and approved by the team — your job is to execute it faithfully, not to make a second round of design decisions.",
    "",
    ...buildAuditSummaryLines(input),
  ];

  if (input.assetList.length > 0) {
    lines.push(
      'Logo and any real content images crawled from the client\'s current site are attached below as images, each labeled with the exact filename to reference at "assets/{filename}" in your HTML. Prefer a real attached content image over a fabricated CSS placeholder wherever one fits the section — that\'s the whole reason it was crawled and attached. Only fall back to CSS/SVG treatment for sections with no matching real image.'
    );
  }

  lines.push("\n## Output rules");
  lines.push("- Produce a polished, modern static website: at minimum index.html and style.css.");
  lines.push(
    "- Use semantic HTML and responsive CSS (flexbox/grid). No external CSS/JS framework or component-library CDN dependencies (no Bootstrap, Tailwind CDN, jQuery, etc.) — the only permitted external reference is a Google Fonts `<link>` if the spec's type source is \"google\"."
  );
  lines.push(
    "- Define the spec's palette, type scale, and spacing scale as CSS custom properties in :root, then derive everything else from those properties. Never hardcode a hex value or font family outside :root."
  );
  lines.push(
    "- A single self-contained HTML file per page is fine, but split style.css out separately if that's cleaner — either way, no build step."
  );

  if (input.priorFiles && input.priorFiles.length > 0) {
    lines.push("\n## Current generated files (to be edited, not replaced from scratch)");
    for (const f of input.priorFiles) {
      lines.push(`\n### ${f.path}\n\`\`\`\n${f.content}\n\`\`\``);
    }
    lines.push("\n## Requested change");
    lines.push(input.userPrompt?.trim() || "Refine and improve the current design.");
    lines.push(
      "\nThe approved design spec above still governs palette/type/layout/motion — apply the requested change within it unless the change explicitly asks to alter the direction itself."
    );
    lines.push(
      "\nReturn the FULL updated set of files reflecting this change, including any files left unchanged."
    );
  } else {
    lines.push("\n## Task");
    lines.push("Generate the first version of the facelifted site now, executing the approved spec.");
    if (input.userPrompt?.trim()) {
      lines.push(`Additional instruction for this first pass: ${input.userPrompt.trim()}`);
    }
  }

  return lines.join("\n");
}
