"use server";

import path from "path";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { ClientStatus, ProjectIntent, AssetType } from "@/app/generated/prisma/client";
import { crawlClientSite } from "@/lib/crawl/crawler";
import { buildAuditFromPages } from "@/lib/crawl/analyze";
import { downloadCrawlImages } from "@/lib/crawl/download-images";
import { analyzeProjectArchive } from "@/lib/source-analysis/analyzer";
import { screenshotReferenceSites } from "@/lib/crawl/reference-screenshot";
import { clientSourceDir, clientReferenceScreenshotsDir } from "@/lib/storage";
import { analyzeAuditNarrative } from "@/lib/audit/narrative";
import type { PageExtraction } from "@/lib/crawl/types";
import type {
  TechnicalAudit,
  VisualDesignAudit,
  MotionInteractionAudit,
  RecommendationItem,
} from "@/lib/audit-types";

export async function saveAuditNotes(auditReportId: string, notes: string) {
  await prisma.auditReport.update({
    where: { id: auditReportId },
    data: { reviewNotes: notes, reviewedAt: new Date() },
  });
}

export async function startAudit(clientId: string) {
  const client = await prisma.client.findUniqueOrThrow({ where: { id: clientId } });

  await prisma.client.update({
    where: { id: clientId },
    data: { status: ClientStatus.AUDITING, crawlPagesDone: 0, crawlPagesTotal: 1 },
  });

  // Fire-and-forget: both paths can take a while, so they run in the background
  // while the page shows progress via polling, rather than blocking this action.
  if (client.intent === ProjectIntent.WORDPRESS_TRANSFER) {
    runSourceAuditInBackground(clientId);
  } else {
    runCrawlAuditInBackground(clientId, client.siteUrl);
  }

  revalidatePath("/", "layout");
  redirect(`/clients/${clientId}`);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function saveAuditResult(clientId: string, result: Record<string, any>, pagesCount: number) {
  await prisma.auditReport.upsert({
    where: { clientId },
    create: { clientId, pagesCrawled: pagesCount, ...result },
    update: { pagesCrawled: pagesCount, ...result },
  });

  const recommendations = result.recommendations as RecommendationItem[] | null | undefined;
  if (recommendations?.length) {
    await prisma.generationMessage.create({
      data: {
        clientId,
        role: "assistant",
        content: [
          "Based on the audit, here's what I'd propose for the facelift:",
          "",
          ...recommendations.map((r) => `• ${r.title} — ${r.rationale}`),
        ].join("\n"),
      },
    });
  }

  await prisma.client.update({
    where: { id: clientId },
    data: { status: ClientStatus.AUDIT_READY },
  });
}

async function failAudit(clientId: string, context: string, err: unknown) {
  console.error(`[audit] ${context} failed for client ${clientId}:`, err);
  await prisma.client.update({
    where: { id: clientId },
    data: { status: ClientStatus.DRAFT },
  });
}

async function tryAnalyzeNarrative(
  clientId: string,
  args: {
    contentSample: string;
    screenshotPaths: string[];
    technical: TechnicalAudit;
    visualDesign: VisualDesignAudit;
    motionInteraction: MotionInteractionAudit;
  }
) {
  try {
    const [client, references] = await Promise.all([
      prisma.client.findUniqueOrThrow({ where: { id: clientId } }),
      prisma.reference.findMany({ where: { clientId } }),
    ]);

    const referenceScreenshots = await screenshotReferenceSites(
      references.map((r) => r.url),
      clientReferenceScreenshotsDir(clientId)
    );

    const referenceInput = references.map((r) => ({
      url: r.url,
      note: r.note,
      screenshotPath:
        referenceScreenshots.find((s) => s.url === r.url)?.screenshotPath ?? null,
    }));

    const narrative = await analyzeAuditNarrative({
      contentSample: args.contentSample,
      screenshotPaths: args.screenshotPaths,
      briefText: client.briefText,
      references: referenceInput,
      technical: args.technical,
      visualDesign: args.visualDesign,
      motionInteraction: args.motionInteraction,
    });

    return {
      brandTone: narrative?.brandTone ?? null,
      findingsSummary: narrative?.findingsSummary ?? null,
      briefUnderstanding: narrative?.briefUnderstanding ?? null,
      recommendations: narrative?.recommendations ?? null,
    };
  } catch (err) {
    console.error("[audit] narrative analysis failed, continuing without it:", err);
    return {
      brandTone: null,
      findingsSummary: null,
      briefUnderstanding: null,
      recommendations: null,
    };
  }
}

async function runCrawlAuditInBackground(clientId: string, siteUrl: string) {
  try {
    const { pages, truncated } = await crawlClientSite(clientId, siteUrl);

    try {
      await downloadCrawlImages(clientId, pages);
    } catch (err) {
      console.error(`[audit] logo/image download failed for client ${clientId}, continuing:`, err);
    }

    const result = buildAuditFromPages(pages, truncated);
    const narrative = await tryAnalyzeNarrative(clientId, {
      contentSample: result.contentSample,
      screenshotPaths: pages.map((p: PageExtraction) => p.screenshotPath),
      technical: result.technical,
      visualDesign: result.visualDesign,
      motionInteraction: result.motionInteraction,
    });
    await saveAuditResult(clientId, { ...result, ...narrative }, pages.length);
  } catch (err) {
    await failAudit(clientId, "crawl", err);
  }
}

async function runSourceAuditInBackground(clientId: string) {
  try {
    const archiveAsset = await prisma.asset.findFirst({
      where: { clientId, type: AssetType.PROJECT_ARCHIVE },
      orderBy: { createdAt: "desc" },
    });

    if (!archiveAsset) {
      throw new Error("No project archive uploaded for this client");
    }

    const archivePath = path.join(process.cwd(), archiveAsset.storagePath);
    const result = await analyzeProjectArchive(archivePath, clientSourceDir(clientId));
    const narrative = await tryAnalyzeNarrative(clientId, {
      contentSample: result.contentSample,
      screenshotPaths: [],
      technical: result.technical,
      visualDesign: result.visualDesign,
      motionInteraction: result.motionInteraction,
    });
    await saveAuditResult(
      clientId,
      { ...result, ...narrative },
      result.contentInventory.length
    );
  } catch (err) {
    await failAudit(clientId, "source analysis", err);
  }
}
