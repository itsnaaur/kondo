"use server";

import path from "path";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ClientStatus, ProjectIntent, AssetType } from "@/app/generated/prisma/client";
import { crawlClientSite } from "@/lib/crawl/crawler";
import { buildAuditFromPages } from "@/lib/crawl/analyze";
import { analyzeProjectArchive } from "@/lib/source-analysis/analyzer";
import { clientSourceDir } from "@/lib/storage";
import { analyzeBrandTone } from "@/lib/audit/brand-tone";
import type { PageExtraction } from "@/lib/crawl/types";

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

  redirect(`/clients/${clientId}`);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function saveAuditResult(clientId: string, result: Record<string, any>, pagesCount: number) {
  await prisma.auditReport.upsert({
    where: { clientId },
    create: { clientId, pagesCrawled: pagesCount, ...result },
    update: { pagesCrawled: pagesCount, ...result },
  });

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

async function runCrawlAuditInBackground(clientId: string, siteUrl: string) {
  try {
    const { pages, truncated } = await crawlClientSite(clientId, siteUrl);
    const result = buildAuditFromPages(pages, truncated);
    const brandTone = await tryAnalyzeBrandTone(
      result.contentSample,
      pages.map((p: PageExtraction) => p.screenshotPath)
    );
    await saveAuditResult(clientId, { ...result, brandTone }, pages.length);
  } catch (err) {
    await failAudit(clientId, "crawl", err);
  }
}

async function tryAnalyzeBrandTone(contentSample: string, screenshotPaths: string[] = []) {
  try {
    return await analyzeBrandTone(contentSample, screenshotPaths);
  } catch (err) {
    console.error("[audit] brand tone analysis failed, continuing without it:", err);
    return null;
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
    const brandTone = await tryAnalyzeBrandTone(result.contentSample);
    await saveAuditResult(clientId, { ...result, brandTone }, result.contentInventory.length);
  } catch (err) {
    await failAudit(clientId, "source analysis", err);
  }
}
