"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";
import { requireActiveClient } from "@/lib/actions/require-active-client";
import { checkCrawlRateLimit, checkGlobalDailySpendCeiling, MAX_CONCURRENT_JOBS_PER_USER } from "@/lib/security/rate-limit";
import { enqueueJob, countActiveJobsForUser } from "@/lib/jobs/queue";
import { logAuditEvent } from "@/lib/audit-log";

// Both "Analyse Site" (first run) and "Re-analyse Site" (from an already-approved or
// already-failed client) — the same action, since both are just "run the Analyse Site
// job for this client." Re-analysis overwrites the ContentRecord in place (see
// lib/content/run-analysis.ts's upsert) without touching any existing Concept — published
// links stay live throughout, and a failure here never locks the client out of its
// already-approved content, since nothing downstream gates on Client.status.
export async function startAnalysis(clientId: string) {
  const user = await requireUser();

  const client = await requireActiveClient(clientId);

  // No-ops rather than erroring — the Re-analyse button is disabled client-side while
  // ANALYZING, but a disabled button doesn't stop a form submission already in flight,
  // and two clicks must not race two Playwright crawls against the same
  // ContentRecord.upsert.
  if (client.status === "ANALYZING") return;

  const rateLimit = await checkCrawlRateLimit(user.id);
  if (!rateLimit.allowed) {
    throw new Error(`You're analysing sites too quickly — try again in ${rateLimit.retryAfterSeconds}s.`);
  }

  // Section 4's concurrency cap ("one or two active generations per user, prevents queue
  // flooding") — was defined (lib/security/rate-limit.ts, lib/jobs/queue.ts) but never
  // actually called anywhere until now, so a single user could queue unbounded concurrent
  // jobs regardless of the constant's existence.
  const activeJobs = await countActiveJobsForUser(user.id);
  if (activeJobs >= MAX_CONCURRENT_JOBS_PER_USER) {
    throw new Error(
      `You already have ${activeJobs} analysis job${activeJobs === 1 ? "" : "s"} in progress — wait for one to finish before starting another.`
    );
  }

  // The aggregate-across-everyone hard stop, checked last (right before the job is
  // actually created) since it increments a shared daily counter as a side effect — a
  // request rejected by an earlier check above shouldn't count against today's ceiling.
  const spendCeiling = await checkGlobalDailySpendCeiling();
  if (!spendCeiling.allowed) {
    throw new Error(
      `Kondo has hit its shared daily analysis limit across all users — try again in ${Math.ceil(spendCeiling.retryAfterSeconds / 3600)}h.`
    );
  }

  // The early `if (client.status === "ANALYZING") return` above is only a fast path, not
  // the actual guarantee — two nearly-simultaneous calls (a double click, two users on the
  // same client) can both read status !== "ANALYZING" before either write commits, and
  // both would otherwise enqueue their own Job row against the same ContentRecord.upsert.
  // updateMany's WHERE runs as a single atomic statement in Postgres, so only one of two
  // racing requests ever actually flips the status and gets a matched row back; the loser
  // sees count 0 and no-ops exactly like the fast-path check above, instead of enqueueing a
  // second, redundant crawl.
  const claimed = await prisma.client.updateMany({
    where: { id: clientId, status: { not: "ANALYZING" } },
    data: { status: "ANALYZING", crawlPagesDone: 0, crawlPagesTotal: null },
  });
  if (claimed.count === 0) return;

  await enqueueJob("ANALYZE_SITE", { clientId, siteUrl: client.siteUrl }, user.id);
  await logAuditEvent("ANALYSIS_STARTED", { userId: user.id, clientId });

  revalidatePath(`/clients/${clientId}`);
}
