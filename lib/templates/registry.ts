import { renderShell } from "./shell";
import type { TemplateComponent, TemplateContent, TemplateMeta } from "./types";
import { scoreTemplate, type SuitabilityResult } from "./suitability";
import renderSaasTemplate from "./saas";
import { meta as saasMeta } from "./saas/meta";
import { css as saasCss } from "./saas/styles";
import renderLocalServiceTemplate from "./local-service";
import { meta as localServiceMeta } from "./local-service/meta";
import { css as localServiceCss } from "./local-service/styles";
import { renderLedger } from "./ledger";
import { meta as ledgerMeta } from "./ledger/meta";

type RenderResult = { body: string; css: string };

type TemplateEntry = {
  render: (content: TemplateContent) => RenderResult;
  meta: TemplateMeta;
  // Only ledger uses these — saas/local-service have static CSS and no body class, so
  // both stay undefined for them rather than needing any change to those two templates.
  bodyClass?: string;
  headExtra?: string;
};

// saas/local-service's TemplateComponent returns a plain string with CSS fixed at import
// time; ledger's palette is derived per-render from the client's own brand colors, so its
// CSS can't be a static string the way the other two are. Wrapping the plain-string
// templates into the same { body, css } shape here — rather than changing
// TemplateComponent's contract — means neither existing template needed to change at all.
function withStaticCss(render: TemplateComponent, css: string): (content: TemplateContent) => RenderResult {
  return (content) => ({ body: render(content), css });
}

// Ledger uses Google Fonts (Instrument Sans + Newsreader) — without this link tag it
// silently falls back to system faces, the same class of failure as the img-src CSP gap
// hit earlier. next.config.ts's CSP must allow fonts.googleapis.com (style-src) and
// fonts.gstatic.com (font-src) for these to actually load, not just be requested.
const LEDGER_FONT_LINKS = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600&family=Newsreader:ital,opsz,wght@1,6..72,400&display=swap" rel="stylesheet">`;

// Adding another template later is: a new subdirectory following this same
// index.ts/styles.ts/meta.ts convention, plus one line here — no other file changes.
const TEMPLATES: Record<string, TemplateEntry> = {
  [saasMeta.key]: { render: withStaticCss(renderSaasTemplate, saasCss), meta: saasMeta },
  [localServiceMeta.key]: {
    render: withStaticCss(renderLocalServiceTemplate, localServiceCss),
    meta: localServiceMeta,
  },
  [ledgerMeta.key]: {
    render: renderLedger,
    meta: ledgerMeta,
    bodyClass: "tpl-ledger",
    headExtra: LEDGER_FONT_LINKS,
  },
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

  const { body, css } = entry.render(content);
  return renderShell({
    title: content.businessName || "Concept preview",
    css,
    bodyHtml: body,
    bodyClass: entry.bodyClass,
    headExtra: entry.headExtra,
  });
}

const FALLBACK_TEMPLATE_KEY = localServiceMeta.key;

const STATUS_RANK: Record<SuitabilityResult["status"], number> = { recommended: 0, works: 1, "not-suited": 2 };

// Tie-break priority when two templates land on the same status — this is a judgment
// call the suitability spec doesn't cover (its rules describe a single template's score,
// not how to rank two that tie). It's a real case, not a hypothetical: local-service's
// industries list is deliberately broad (medical/clinic/dental/legal/etc. — see its meta)
// and overlaps heavily with ledger's, so any client with a phone, a hero image, and an
// industry like "medical/clinic" (e.g. a dental practice) scores "recommended" on both.
// Declaration order in TEMPLATES would silently prefer whichever template happens to be
// listed first, which is an accident of file structure, not a preference — so it's made
// explicit here instead: ledger first (its narrower, harder-to-satisfy requirement makes
// "recommended" a stronger signal when earned), then saas, then local-service (the
// broadest-fit, safest-fallback template, per FALLBACK_TEMPLATE_KEY below).
const TIE_BREAK_PRIORITY = [ledgerMeta.key, saasMeta.key, localServiceMeta.key];

// Every template scored against this client's actual content — the one call site both
// the gallery (for sorting/labels) and pickDefaultTemplate (below) need, so scoring logic
// only lives in lib/templates/suitability.ts and isn't duplicated here.
export function scoreAllTemplates(
  content: TemplateContent
): { key: string; label: string; status: SuitabilityResult["status"]; reason?: string }[] {
  return Object.values(TEMPLATES).map((t) => ({
    key: t.meta.key,
    label: t.meta.label,
    ...scoreTemplate(t.meta, content),
  }));
}

// Requirements beat industry match — a clinic with no photos shouldn't get Ledger
// pre-selected just because "clinic" is in its industry list, when Ledger's own
// requires.heroImage is unmet for this exact client. Falls back to local-service (not an
// arbitrary pick — it's the template built to hold up with the least content) only if
// nothing scores above not-suited.
export function pickDefaultTemplate(content: TemplateContent): string {
  const scored = scoreAllTemplates(content).sort((a, b) => {
    const statusDiff = STATUS_RANK[a.status] - STATUS_RANK[b.status];
    if (statusDiff !== 0) return statusDiff;
    return TIE_BREAK_PRIORITY.indexOf(a.key) - TIE_BREAK_PRIORITY.indexOf(b.key);
  });
  const best = scored[0];
  if (!best || best.status === "not-suited") return FALLBACK_TEMPLATE_KEY;
  return best.key;
}
