"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";
import { checkCrawlRateLimit } from "@/lib/security/rate-limit";
import { enqueueJob } from "@/lib/jobs/queue";
import { logAuditEvent } from "@/lib/audit-log";

// Both "Analyse Site" (first run) and "Re-analyse Site" (from an already-approved or
// already-failed client) — the same action, since both are just "run the Analyse Site
// job for this client." Re-analysis overwrites the ContentRecord in place (see
// lib/content/run-analysis.ts's upsert) without touching any existing Concept — published
// links stay live throughout, and a failure here never locks the client out of its
// already-approved content, since nothing downstream gates on Client.status.
export async function startAnalysis(clientId: string) {
  const user = await requireUser();

  const client = await prisma.client.findUniqueOrThrow({ where: { id: clientId } });

  // No-ops rather than erroring — the Re-analyse button is disabled client-side while
  // ANALYZING, but a disabled button doesn't stop a form submission already in flight,
  // and two clicks must not race two Playwright crawls against the same
  // ContentRecord.upsert.
  if (client.status === "ANALYZING") return;

  const rateLimit = await checkCrawlRateLimit(user.id);
  if (!rateLimit.allowed) {
    throw new Error(`You're analysing sites too quickly — try again in ${rateLimit.retryAfterSeconds}s.`);
  }

  await prisma.client.update({
    where: { id: clientId },
    data: { status: "ANALYZING", crawlPagesDone: 0, crawlPagesTotal: null },
  });
  await enqueueJob("ANALYZE_SITE", { clientId, siteUrl: client.siteUrl }, user.id);
  await logAuditEvent("ANALYSIS_STARTED", { userId: user.id, clientId });

  revalidatePath(`/clients/${clientId}`);
}
