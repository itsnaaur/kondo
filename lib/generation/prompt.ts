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
      'Logo and any real content images crawled from the client\'s current site are attached below as images, each labeled with the exact filename to reference at "assets/{filename}" in your HTML. Prefer a real attached content image over a fabricated CSS placeholder wherever one fits the section — that\'s the whole reason it was crawled and attached. Only fall back to CSS/SVG treatment for sections with no matching real image.'
    );
  }

  lines.push("\n## Output rules");
  lines.push("- Produce a polished, modern static website: at minimum index.html and style.css.");
  lines.push(
    "- Preserve the brand's color palette and typography where sensible; evolve the layout per the brief/references."
  );
  lines.push(
    "- Use semantic HTML and responsive CSS (flexbox/grid). No external CSS/JS framework or component-library CDN dependencies (no Bootstrap, Tailwind CDN, jQuery, etc.) — the only permitted external reference is the Google Fonts `<link>` tag specified by the design standards below."
  );
  lines.push(
    "- Do not fabricate photographic imagery — use CSS gradients, shapes, or simple inline SVG icons instead of placeholder photos, unless a logo or real content-image asset is attached (see below)."
  );
  lines.push(
    "- Typography is a craft, not just a font choice: build a real heading hierarchy (h1-h3 should differ in weight/color/letter-spacing, not just size), and use bold/italic emphasis on the one or two phrases per section that earn it. A page where every paragraph is one uniform weight reads as unfinished."
  );
  lines.push(
    "- Treat every visual dimension of the page as a deliberate decision, not a default: color palette, font pairing and heading hierarchy, spacing scale, shadows, gradients, corner radius, image treatment, motion and page transitions, and mobile layout. The design standards below give current, concrete guidance for each of these per archetype — use it instead of reaching for the safest generic choice (soft gray shadow, 8px radius everywhere, no gradient, desktop-shrunk-to-mobile) on any of them."
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
