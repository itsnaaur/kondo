import { renderShell } from "./shell";
import type { TemplateContent, TemplateMeta, TemplateSection } from "./types";
import {
  scorePatternEligibility,
  type ContentCoverage,
  type EligibilityResult,
} from "@/lib/design/pattern-eligibility";
import type { CapabilitySummary } from "@/lib/content/assign-image-roles";
import { renderLedger } from "./ledger";
import { meta as ledgerMeta } from "./ledger/meta";
import { renderShowcase } from "./showcase";
import { meta as showcaseMeta } from "./showcase/meta";
import { renderAtlas } from "./atlas";
import { meta as atlasMeta } from "./atlas/meta";

type RenderResult = { body: string; css: string };

type TemplateEntry = {
  render: (content: TemplateContent) => RenderResult;
  meta: TemplateMeta;
  bodyClass?: string;
  headExtra?: string;
};

// Ledger, Showcase, and Atlas all use Google Fonts (Instrument Sans + Newsreader) —
// without this link tag they silently fall back to system faces, the same class of
// failure as the img-src CSP gap hit earlier. next.config.ts's CSP must allow
// fonts.googleapis.com (style-src) and fonts.gstatic.com (font-src) for these to actually
// load, not just be requested.
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
  [atlasMeta.key]: {
    render: renderAtlas,
    meta: atlasMeta,
    bodyClass: "tpl-atlas",
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

const STATUS_RANK: Record<EligibilityResult["status"], number> = { recommended: 0, works: 1, "not-suited": 2 };

// Task 3.1 transitional adapters — this whole file is deleted in Task 3.8 along with the
// templates it scores, so these exist only to keep it compiling and working correctly in the
// meantime, not as a model for how real Phase 3 pattern-selection should get its inputs.
//
// ContentCoverage's fields are a direct 1:1 read off TemplateContent — no approximation needed.
function contentCoverageFromTemplateContent(content: TemplateContent): ContentCoverage {
  return {
    servicesCount: content.services.length,
    testimonialsCount: content.testimonials.length,
    hasPhone: Boolean(content.contactPhone),
    hasPricing: (content.offers?.length ?? 0) > 0,
    hasCredentials: (content.credentials?.length ?? 0) > 0,
  };
}

// This one IS an approximation, disclosed as such: TemplateContent has no real per-role image
// classification data (that requires a real assignImageRoles() call against the client's actual
// Asset rows — lib/content/assign-image-roles.ts — which this render-time gallery view has never
// had wired in). Derived instead from the two older, template-facing fields TemplateContent does
// have (heroImageUrl, galleryImages) — exactly the "mechanism 2" chain Task 1.10 found and this
// task's own log entry says NOT to trust once the real templates are gone. Using it here anyway,
// narrowly, is the acknowledged cost of keeping this doomed file's existing behaviour working
// until 3.8 deletes it outright — not a recommendation for anything built after that.
function approximateCapabilitySummary(content: TemplateContent): CapabilitySummary {
  const hasHero = Boolean(content.heroImageUrl);
  const galleryCount = content.galleryImages.length;
  return {
    heroGrade: hasHero ? 1 : 0,
    sectionBackgroundGrade: 0,
    galleryGrade: Math.max(0, galleryCount - (hasHero ? 1 : 0)),
    teamGrade: 0,
    featureInlineGrade: 0,
    unusable: 0,
    logoPresent: Boolean(content.logoUrl),
  };
}

const META_BY_KEY: Record<string, TemplateMeta> = Object.fromEntries(
  Object.values(TEMPLATES).map((t) => [t.meta.key, t.meta])
);

// How many of this client's actual content types a template has a section for at all
// (lib/templates/types.ts's rendersSections) — NOT whether that section survives a
// template's own internal filtering (e.g. atlas's content-guards.ts::usableFaqs). Checking
// raw record presence rather than simulating each template's render is the deliberate
// "interim, simple" scope of this fix: it's measurable straight off TemplateContent, no
// template-specific logic has to leak into the scorer. Known limitation this accepts: a
// client with FAQ rows that all get filtered out by usableFaqs still counts as "has FAQs"
// here, so atlas's coverage score can be very slightly inflated in that specific case.
// Checked against real data before shipping this: it doesn't currently flip any actual
// pickDefaultTemplate outcome, but a future client could hit it.
function sectionCoverage(meta: TemplateMeta, content: TemplateContent): number {
  const has: Record<TemplateSection, boolean> = {
    services: content.services.length > 0,
    testimonials: content.testimonials.length > 0,
    stats: content.stats.length > 0,
    differentiators: content.differentiators.length > 0,
    process: content.process.length > 0,
    faqs: content.faqs.length > 0,
    gallery: content.galleryImages.length > 0,
    partnerLogos: (content.partnerLogos?.length ?? 0) > 0,
  };
  return (meta.rendersSections ?? []).filter((s) => has[s]).length;
}

// Static tie-break priority — the LAST resort, only reached when status AND section
// coverage are both equal (e.g. ledger vs showcase, which declare the identical
// rendersSections list, so coverage can never separate them). Ranked by how hard each
// template's requirement is to earn: showcase (3+ real photos) first, then ledger (one
// hero photo), then atlas (no requires at all — see atlas/meta.ts). This mechanical rule
// used to be the ONLY tie-break, which is what let local-service-shaped ties reward
// whichever template simply declared the most constraints regardless of fit — see
// sectionCoverage above, which now runs first and settles most real ties on merit.
const TIE_BREAK_PRIORITY = [showcaseMeta.key, ledgerMeta.key, atlasMeta.key];

// Every template scored against this client's actual content — the one call site both
// the gallery (for sorting/labels) and pickDefaultTemplate (below) need, so scoring logic
// only lives in lib/design/pattern-eligibility.ts and isn't duplicated here.
export function scoreAllTemplates(
  content: TemplateContent
): { key: string; label: string; status: EligibilityResult["status"]; reason?: string }[] {
  const coverage = contentCoverageFromTemplateContent(content);
  const images = approximateCapabilitySummary(content);
  return Object.values(TEMPLATES).map((t) => {
    // meta.requires (heroImage/phone/minServices/minGallery) is structurally a subset of
    // PatternRequirements' 8 fields — passed through as-is, no translation needed.
    const result = scorePatternEligibility(t.meta.requires ?? {}, coverage, images);
    return {
      key: t.meta.key,
      label: t.meta.label,
      status: result.status,
      // scoreAllTemplates keeps the old singular `reason` shape — TemplateGallery.tsx (also
      // deleted in 3.8) reads t.reason directly and wasn't worth updating for a file this task
      // doesn't otherwise touch.
      reason: result.reasons.length > 0 ? result.reasons.join("; ") : undefined,
    };
  });
}

// Requirements beat industry match — a clinic with no photos shouldn't get Ledger
// pre-selected just because "clinic" is in its industry list, when Ledger's own
// requires.heroImage is unmet for this exact client. Falls back to FALLBACK_TEMPLATE_KEY
// only if nothing scores above not-suited.
export function pickDefaultTemplate(content: TemplateContent): string {
  const scored = scoreAllTemplates(content).sort((a, b) => {
    const statusDiff = STATUS_RANK[a.status] - STATUS_RANK[b.status];
    if (statusDiff !== 0) return statusDiff;
    // Section coverage before the static priority list — a template that actually shows
    // more of what this specific client has (testimonials, stats, process, ...) wins the
    // tie on merit, not on which template happened to declare the narrowest requirement.
    const coverageDiff = sectionCoverage(META_BY_KEY[b.key], content) - sectionCoverage(META_BY_KEY[a.key], content);
    if (coverageDiff !== 0) return coverageDiff;
    return TIE_BREAK_PRIORITY.indexOf(a.key) - TIE_BREAK_PRIORITY.indexOf(b.key);
  });
  const best = scored[0];
  if (!best || best.status === "not-suited") return FALLBACK_TEMPLATE_KEY;
  return best.key;
}
