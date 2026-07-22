"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ClientStatus } from "@/app/generated/prisma/client";
import { crawlClientSite } from "@/lib/crawl/crawler";
import { buildAuditFromPages } from "@/lib/crawl/analyze";

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

  // Fire-and-forget: the crawl can take minutes for a full site, so it runs in the
  // background while the page shows progress via polling, rather than blocking this action.
  runAuditInBackground(clientId, client.siteUrl);

  redirect(`/clients/${clientId}`);
}

async function runAuditInBackground(clientId: string, siteUrl: string) {
  try {
    const { pages, truncated } = await crawlClientSite(clientId, siteUrl);
    const { technical, visualDesign, motionInteraction, contentInventory } = buildAuditFromPages(
      pages,
      truncated
    );

    await prisma.auditReport.upsert({
      where: { clientId },
      create: {
        clientId,
        pagesCrawled: pages.length,
        technical,
        visualDesign,
        motionInteraction,
        contentInventory,
      },
      update: {
        pagesCrawled: pages.length,
        technical,
        visualDesign,
        motionInteraction,
        contentInventory,
      },
    });

    await prisma.client.update({
      where: { id: clientId },
      data: { status: ClientStatus.AUDIT_READY },
    });
  } catch (err) {
    console.error(`[audit] failed for client ${clientId}:`, err);
    await prisma.client.update({
      where: { id: clientId },
      data: { status: ClientStatus.DRAFT },
    });
  }
}
