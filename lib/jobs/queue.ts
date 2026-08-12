// The background-job queue. Vercel serverless functions are killed once the response is
// sent, so a multi-page Playwright crawl can't run as a fire-and-forget async call from a
// server action — it has to be a durable row a separate long-running worker process
// (scripts/worker.ts) picks up and executes. This module is intentionally plain — no
// "use server", no Next.js imports — so it can be safely imported from both server
// actions and the standalone worker script.
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit-log";
import type { Prisma } from "@/app/generated/prisma/client";

// Only one job type exists in this flow: analysing a site is the one slow, AI-touching
// step. Everything downstream (template rendering, publish) is synchronous and never
// queued.
export type JobType = "ANALYZE_SITE";

export async function enqueueJob(
  type: JobType,
  payload: object,
  createdByUserId: string | null = null
): Promise<string> {
  const job = await prisma.job.create({
    data: { type, payload: payload as Prisma.InputJsonValue, status: "PENDING", createdByUserId },
  });
  return job.id;
}

// Section 4's concurrency cap ("one or two active generations per user, prevents queue
// flooding") — a database question, not a Redis sliding-window one.
export async function countActiveJobsForUser(userId: string): Promise<number> {
  return prisma.job.count({
    where: { createdByUserId: userId, status: { in: ["PENDING", "RUNNING"] } },
  });
}

export type ClaimedJob = { id: string; type: JobType; payload: unknown };

// Claims exactly one pending job atomically, safe even if more than one worker process
// is ever running concurrently — FOR UPDATE SKIP LOCKED lets other workers skip past a
// row already being claimed instead of blocking on it. No user input is interpolated
// into this query; it is a fixed, parameter-free statement.
export async function claimNextJob(): Promise<ClaimedJob | null> {
  const rows = await prisma.$queryRaw<ClaimedJob[]>`
    UPDATE "Job" SET status = 'RUNNING', "startedAt" = now(), attempts = attempts + 1, "updatedAt" = now()
    WHERE id = (
      SELECT id FROM "Job" WHERE status = 'PENDING' ORDER BY "createdAt" ASC LIMIT 1 FOR UPDATE SKIP LOCKED
    )
    RETURNING id, type, payload
  `;
  return rows[0] ?? null;
}

export async function completeJob(id: string): Promise<void> {
  await prisma.job.update({ where: { id }, data: { status: "COMPLETE", finishedAt: new Date() } });
}

export async function failJob(id: string, error: string): Promise<void> {
  await prisma.job.update({
    where: { id },
    // Postgres text columns don't need truncation for reasonable error messages, but a
    // pathological error (e.g. an entire stack trace someone throws by mistake) shouldn't
    // bloat the table — cap it.
    data: { status: "FAILED", lastError: error.slice(0, 4000), finishedAt: new Date() },
  });
}

// A RUNNING job only ever gets marked COMPLETE/FAILED by the process that claimed it —
// if that process is killed or crashes first, the row is stuck RUNNING forever. Nothing
// else ever revisits it, so countActiveJobsForUser would keep counting it against the
// per-user concurrency cap indefinitely.
//
// Only reclaims jobs RUNNING far longer than any real job should ever take — claimNextJob
// is explicitly designed to be safe under concurrent workers (FOR UPDATE SKIP LOCKED), so
// this deliberately doesn't assume single-worker and reclaim everything RUNNING; a job
// claimed moments ago by a genuinely-still-alive worker is left alone.
//
// Sized against the pipeline's own worst-case constants, not guessed, since too low a
// number here means a worker restart (a Railway redeploy, an OOM) mid-way through a
// genuinely-still-progressing large-site analysis reclaims it as "orphaned" and flips the
// client to ANALYSIS_FAILED even though the old process would have finished successfully:
//   - crawl: MAX_PAGES(150) × (PAGE_TIMEOUT_MS 20s + REQUEST_DELAY_MS 400ms)  ≈ 51 min
//     (lib/crawl/crawler.ts)
//   - images: up to 11 sequential downloads (logo + MAX_CANDIDATE_IMAGES 10), each up to
//     MAX_IMAGE_REDIRECTS(5) hops × FETCH_TIMEOUT_MS(10s)                    ≈ 9 min
//     (lib/crawl/download-images.ts)
//   - structuring call: MAX_ATTEMPTS(3) validation retries, each itself up to
//     MAX_TRANSIENT_RETRIES(5) backoff retries (lib/ai/anthropic-retry.ts)   ≈ 16 min
//     (lib/content/structure-and-rewrite.ts)
// ≈ 76 minutes worst case, all three stacked. 90 minutes leaves real headroom without
// being so long that a job that's actually stuck (not just slow) sits unreclaimed for
// hours.
const STALE_JOB_TIMEOUT_MS = 90 * 60 * 1000;

async function revertOrphanedClient(clientId: string): Promise<void> {
  try {
    // Same recovery path a normal analysis failure takes (see
    // lib/content/run-analysis.ts) — a stuck job is functionally indistinguishable from
    // any other analysis failure, and this status is purely a progress indicator, not a
    // gate: it never locks a client out of already-approved content or its concept
    // history (see the ClientStatus/gating notes in the Kondo rebuild plan).
    await prisma.client.update({ where: { id: clientId }, data: { status: "ANALYSIS_FAILED" } });
    await logAuditEvent("ANALYSIS_FAILED", { clientId, metadata: { reason: "orphaned_job_reclaimed" } });
  } catch {
    // Client no longer exists (deleted between enqueue and reclaim) — nothing to revert.
  }
}

export async function reclaimOrphanedJobs(): Promise<number> {
  const cutoff = new Date(Date.now() - STALE_JOB_TIMEOUT_MS);
  const stale = await prisma.job.findMany({ where: { status: "RUNNING", startedAt: { lt: cutoff } } });
  if (stale.length === 0) return 0;

  for (const job of stale) {
    const payload = job.payload as Record<string, unknown>;
    const clientId = typeof payload.clientId === "string" ? payload.clientId : null;
    if (clientId) await revertOrphanedClient(clientId);

    await prisma.job.update({
      where: { id: job.id },
      data: {
        status: "FAILED",
        lastError:
          "Orphaned: still RUNNING far longer than any real job should take — the worker that claimed it was likely killed or crashed before finishing.",
        finishedAt: new Date(),
      },
    });
  }

  return stale.length;
}
