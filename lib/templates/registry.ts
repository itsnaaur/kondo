import { renderShell } from "./shell";
import type { TemplateContent, TemplateMeta } from "./types";
import { scoreTemplate, type SuitabilityResult } from "./suitability";
import { renderLedger } from "./ledger";
import { meta as ledgerMeta } from "./ledger/meta";
import { renderShowcase } from "./showcase";
import { meta as showcaseMeta } from "./showcase/meta";

type RenderResult = { body: string; css: string };

type TemplateEntry = {
  render: (content: TemplateContent) => RenderResult;
  meta: TemplateMeta;
  bodyClass?: string;
  headExtra?: string;
};

// Ledger and Showcase both use Google Fonts (Instrument Sans + Newsreader) — without this
// link tag they silently fall back to system faces, the same class of failure as the
// img-src CSP gap hit earlier. next.config.ts's CSP must allow fonts.googleapis.com
// (style-src) and fonts.gstatic.com (font-src) for these to actually load, not just be
// requested.
const GOOGLE_FONT_LINKS = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600&family=Newsreader:ital,opsz,wght@1,6..72,400&display=swap" rel="stylesheet">`;

// Adding another template later is: a new subdirectory following this same
// index.ts/styles.ts/meta.ts convention, plus one line here — no other file changes.
const TEMPLATES: Record<string, TemplateEntry> = {
  [ledgerMeta.key]: {
    render: renderLedger,
    meta: ledgerMeta,
    bodyClass: "tpl-ledger",
    headExtra: GOOGLE_FONT_LINKS,
  },
  [showcaseMeta.key]: {
    render: renderShowcase,
    meta: showcaseMeta,
    bodyClass: "tpl-showcase",
    headExtra: GOOGLE_FONT_LINKS,
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

// Ledger, not Showcase, is the fallback — Showcase's requires.minGallery: 3 is a harder
// bar to clear than Ledger's requires.heroImage, so a client that satisfies neither still
// has better odds of being usable-if-imperfect on Ledger (a single photo, or none at all
// via its dark-gradient no-image treatment) than on Showcase.
const FALLBACK_TEMPLATE_KEY = ledgerMeta.key;

const STATUS_RANK: Record<SuitabilityResult["status"], number> = { recommended: 0, works: 1, "not-suited": 2 };

// Tie-break priority when two templates land on the same status — this is a judgment
// call the suitability spec doesn't cover (its rules describe a single template's score,
// not how to rank two that tie). Ranked by how hard each template's requirement is to
// earn: showcase (3+ real photos, the narrower bar) first, then ledger (one hero photo).
const TIE_BREAK_PRIORITY = [showcaseMeta.key, ledgerMeta.key];

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
// requires.heroImage is unmet for this exact client. Falls back to FALLBACK_TEMPLATE_KEY
// only if nothing scores above not-suited.
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
