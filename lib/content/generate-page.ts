// Task 3.7. Phase B, wired for real — the path build plan §6 describes, run end to end for
// the first time: design system resolution (3.2) -> markup+CSS generation (3.4, rebuilt 3.13) ->
// validation (3.5, rendered-contrast-authoritative since 3.10a) -> persist Concept. On generation
// OR validation failure (after 3.4's own internal retries are exhausted), falls back to 3.6's
// renderFallbackConcept rather than leaving a dead client — this is the first real caller
// 3.6's own log entry said didn't exist yet.
//
// TASK 3.13. Stylesheet generation (3.3, lib/design/generate-stylesheet.ts) is retired from this
// live path — the model now writes its own CSS alongside the markup, in the same call, validated
// by rendering the real page rather than by construction from a fixed class vocabulary. See
// 3.13's own log entry for the real measurement this replaces a token-split architecture with,
// and for what still depends on generate-stylesheet.ts now that this file no longer does.
//
// TWO LAYERS OF FAILURE HANDLING, DELIBERATELY DIFFERENT:
//   1. INNER (markup generation / validation failure) — always recovered via the fallback
//      renderer. A real, usable Concept still gets persisted; the Job still completes
//      successfully; Client.status is never touched. This is the whole point of 3.6 — "the AI
//      declined to write safe markup" is not the same failure class as "this client is dead."
//   2. OUTER (anything else — ContentRecord missing, a database error, an unexpected bug) —
//      genuinely propagates. Client.status flips to ANALYSIS_FAILED via
//      lib/jobs/queue.ts's revertClientToAnalysisFailed (the same real mechanism
//      run-analysis.ts already uses for its own failures, reused here rather than a third
//      hand-copied status-flip), and the error is rethrown so scripts/worker.ts's own generic
//      catch marks the Job row FAILED too. This is the real wiring 3.6's own log entry named as
//      out of scope for itself — "3.6 builds the fallback, 3.7 is where it gets a caller and
//      where a real failure-status transition belongs" (verbatim from this task's own
//      instruction).

import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit-log";
import { revertClientToAnalysisFailed } from "@/lib/jobs/queue";
import { assignImageRoles, type RoleAssignmentInput, type CapabilitySummary } from "./assign-image-roles";
import { resolveDesignSystem } from "@/lib/design/resolve-design-system";
import type { ContentCoverage } from "@/lib/design/pattern-eligibility";
import {
  generateMarkup,
  toPageDesignInput,
  filterMarkupContent,
  buildImageManifest,
  type MarkupContentInput,
} from "./generate-markup";
import { validateGeneratedHtml, formatFailuresForRetry } from "./validate-generated-html";
import { renderFallbackConcept, type FallbackContent } from "./fallback-renderer";
import { toTemplateContent } from "./to-template-content";

const DISCLOSURE_TEXT = "Concept preview by JRNY Digital, using publicly available branding.";

function escHtml(input: string | null | undefined): string {
  if (!input) return "";
  const map: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return input.replace(/[&<>"']/g, (ch) => map[ch]);
}

// The successful-generation shell — deliberately simpler than fallback-renderer.ts's own
// wrapInShell: the system prompt (generate-markup.ts's buildSystemPrompt, since 3.13) requires
// the model's own CSS to open with `@import url("...");` for the resolved Google Font, so the
// font is already loading once that <style> block is inlined — no separate <link> needed here
// the way the fallback path needs one (the fallback's own stylesheet, lifted from atlas, was
// never wired to emit an @import itself). Unchanged from pre-3.13 other than which task's own
// output honours this — always the CSS string this function is handed, never generated here.
export function wrapGeneratedPage(title: string, css: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>${escHtml(title || "Concept preview")}</title>
<style>
*, *::before, *::after { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body { -webkit-font-smoothing: antialiased; }
img { max-width: 100%; display: block; }
.jrny-disclosure {
  text-align: center;
  padding: 14px 16px;
  font: 12px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: #9ca3af;
  background: #111827;
}
${css}</style>
</head>
<body>
${bodyHtml}
<footer class="jrny-disclosure">${escHtml(DISCLOSURE_TEXT)}</footer>
</body>
</html>`;
}

// Real Asset -> RoleAssignmentInput/manifest construction — the same append-only-table dedup
// and real assignImageRoles() call this session's own verification scripts have used
// repeatedly (3.1, 3.4, 3.5, 3.6's own throwaway scripts), now a real, permanent function
// instead of hand-copied a sixth time.
async function loadImageManifestInputs(clientId: string) {
  const assets = await prisma.asset.findMany({ where: { clientId, type: { in: ["LOGO", "IMAGE"] } }, orderBy: { createdAt: "desc" } });
  const seenUrls = new Set<string>();
  const latestAssets = assets.filter((a) => (seenUrls.has(a.url) ? false : (seenUrls.add(a.url), true)));
  const roleInputs: RoleAssignmentInput[] = latestAssets.map((a) => ({
    assetId: a.id,
    assetType: a.type,
    metrics: (a.metrics as never) ?? null,
    classification: (a.classification as never) ?? null,
  }));
  const roleAssignments = assignImageRoles(roleInputs);
  const urlByAssetId = new Map(latestAssets.map((a) => [a.id, a.url]));
  const manifest = buildImageManifest(roleInputs, roleAssignments, urlByAssetId);
  return { roleInputs, roleAssignments, manifest };
}

export function capabilitySummaryFrom(roleAssignments: { role: string }[]): CapabilitySummary {
  return {
    heroGrade: roleAssignments.filter((r) => r.role === "hero").length,
    sectionBackgroundGrade: roleAssignments.filter((r) => r.role === "section-background").length,
    galleryGrade: roleAssignments.filter((r) => r.role === "gallery").length,
    teamGrade: roleAssignments.filter((r) => r.role === "team").length,
    featureInlineGrade: roleAssignments.filter((r) => r.role === "feature-inline").length,
    unusable: roleAssignments.filter((r) => r.role === "unusable").length,
    logoPresent: roleAssignments.some((r) => r.role === "logo"),
  };
}

export async function generatePageInBackground(clientId: string, createdByUserId: string | null): Promise<void> {
  try {
    const record = await prisma.contentRecord.findUniqueOrThrow({ where: { clientId } });
    const allAssets = await prisma.asset.findMany({ where: { clientId } });
    const { roleAssignments, manifest } = await loadImageManifestInputs(clientId);

    const rawBrandColors = (record.brandColors as unknown as { hex: string; confidence?: string }[]) ?? [];
    const brandColors = rawBrandColors.filter((c) => c.confidence !== "low").map((c) => ({ hex: c.hex }));

    const services = (record.services as never as { flagged: boolean }[]) ?? [];
    const testimonials = (record.testimonials as never as { flagged: boolean }[]) ?? [];
    const offers = (record.offers as never as { flagged: boolean }[]) ?? [];
    const credentials = (record.credentials as never as { flagged: boolean }[]) ?? [];
    const contentCoverage: ContentCoverage = {
      servicesCount: services.length,
      testimonialsCount: testimonials.length,
      hasPhone: Boolean(record.contactPhone),
      hasPricing: offers.length > 0,
      hasCredentials: credentials.length > 0,
    };
    const capability = capabilitySummaryFrom(roleAssignments);

    const designResult = resolveDesignSystem({
      detectedIndustry: record.detectedIndustry,
      brandColors,
      content: contentCoverage,
      images: capability,
    });
    const design = toPageDesignInput(designResult);
    const system = designResult.ok ? designResult.system : designResult.partial;

    const rawContent: MarkupContentInput = {
      businessName: record.businessName,
      tagline: record.tagline,
      aboutCopy: record.aboutCopy,
      ctaLabel: record.ctaLabel,
      contactPhone: record.contactPhone,
      contactEmail: record.contactEmail,
      contactAddress: record.contactAddress,
      services: (record.services as never) ?? [],
      testimonials: (record.testimonials as never) ?? [],
      stats: (record.stats as never) ?? [],
      faqs: (record.faqs as never) ?? [],
      differentiators: (record.differentiators as never) ?? [],
      process: (record.process as never) ?? [],
      serviceAreas: (record.serviceAreas as never) ?? [],
      hours: (record.hours as never) ?? [],
      offers: (record.offers as never) ?? [],
      credentials: (record.credentials as never) ?? [],
    };
    const filteredContent = filterMarkupContent(rawContent);

    let html: string;
    let templateKey: string;

    try {
      // Task 3.13. generateMarkup now returns both html AND css — the model's own, no longer
      // lib/design/generate-stylesheet.ts's deterministic output. The rendered-contrast gate
      // (checkRenderedContrast, authoritative inside validateGeneratedHtml since 3.10a) is what
      // makes this safe to trust rather than the fixed CLASS_VOCABULARY generateStylesheet() used
      // to guarantee by construction — see 3.13's own log entry for the real measurement behind
      // this trade.
      const genResult = await generateMarkup(design, filteredContent, manifest);
      // Task 3.10a. Awaited — validateGeneratedHtml's own contrast gate renders the real page in
      // headless Chromium (checkRenderedContrast), which cannot run synchronously. Real, measured
      // added cost per call: see that task's own log entry.
      const validation = await validateGeneratedHtml({
        html: genResult.html,
        css: genResult.css,
        allowedImages: manifest,
        palette: system.palette,
        styleBundleMode: system.styleBundle.mode as "light" | "dark",
        typographyGoogleFontsUrl: system.typography.googleFontsUrl,
      });
      if (!validation.valid) {
        throw new Error(`Generated page failed validation: ${formatFailuresForRetry(validation.failures)}`);
      }
      html = wrapGeneratedPage(record.businessName ?? "Concept preview", genResult.css, genResult.html);
      templateKey = "generated";
    } catch (genErr) {
      // Markup generation or validation failed — the fallback renderer recovers, the job
      // still succeeds, Client.status is never touched. See this file's own header comment.
      console.warn(
        `[generate-page] markup generation/validation failed for client ${clientId}, falling back to renderFallbackConcept:`,
        genErr instanceof Error ? genErr.message : String(genErr)
      );
      const fallbackContent: FallbackContent = toTemplateContent(record, allAssets);
      html = renderFallbackConcept(fallbackContent, system.palette, system.typography.googleFontsUrl, system.styleBundle.id);
      templateKey = "fallback";
    }

    const concept = await prisma.concept.create({
      data: { clientId, contentRecordId: record.id, templateKey, html, createdByUserId },
    });
    await logAuditEvent("CONCEPT_GENERATED", { userId: createdByUserId, clientId, metadata: { conceptId: concept.id, templateKey } });
  } catch (err) {
    // Genuinely unexpected failure — ContentRecord missing, a database error, a bug outside
    // the markup-generation-specific try/catch above. Not something the fallback renderer can
    // recover from (it has no ContentRecord to render from either). Same real recovery path
    // run-analysis.ts uses for its own failures.
    await revertClientToAnalysisFailed(clientId, "generate_page_failed");
    throw err;
  }
}
