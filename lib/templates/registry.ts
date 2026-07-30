import { renderShell } from "./shell";
import type { TemplateComponent, TemplateContent, TemplateMeta } from "./types";
import renderSaasTemplate from "./saas";
import { meta as saasMeta } from "./saas/meta";
import { css as saasCss } from "./saas/styles";
import renderLocalServiceTemplate from "./local-service";
import { meta as localServiceMeta } from "./local-service/meta";
import { css as localServiceCss } from "./local-service/styles";

type TemplateEntry = { render: TemplateComponent; meta: TemplateMeta; css: string };

// Adding a 7th template later is: a new subdirectory following this same
// index.ts/styles.ts/meta.ts convention, plus one line here — no other file changes.
const TEMPLATES: Record<string, TemplateEntry> = {
  [saasMeta.key]: { render: renderSaasTemplate, meta: saasMeta, css: saasCss },
  [localServiceMeta.key]: { render: renderLocalServiceTemplate, meta: localServiceMeta, css: localServiceCss },
};

export const TEMPLATE_LIST: TemplateMeta[] = Object.values(TEMPLATES).map((t) => t.meta);

export function isValidTemplateKey(key: string): boolean {
  return key in TEMPLATES;
}

// The one render path used identically by the Choose Template gallery, the full
// Generate & Preview page, the "Generate Concept" server action, and the /p/[slug]
// publish route (reading the frozen result back out of Postgres) — deterministic, no AI,
// no Playwright, sub-millisecond string templating. Plain string building rather than
// JSX/react-dom/server, since the latter can't be imported anywhere in Next's Server
// Component/Route Handler/Server Action module graph.
export function renderTemplateToHtml(key: string, content: TemplateContent): string {
  const entry = TEMPLATES[key];
  if (!entry) throw new Error(`Unknown template key: ${key}`);

  return renderShell({
    title: content.businessName || "Concept preview",
    css: entry.css,
    bodyHtml: entry.render(content),
  });
}

const FALLBACK_TEMPLATE_KEY = localServiceMeta.key;

export function pickDefaultTemplate(detectedIndustry: string | null): string {
  if (detectedIndustry) {
    const lower = detectedIndustry.toLowerCase();
    const match = Object.values(TEMPLATES).find((t) =>
      t.meta.industries.some((industry) => lower.includes(industry))
    );
    if (match) return match.meta.key;
  }
  return FALLBACK_TEMPLATE_KEY;
}
