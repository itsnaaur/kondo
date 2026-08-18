// The background-job queue. Vercel serverless functions are killed once the response is
// sent, so a multi-page Playwright crawl can't run as a fire-and-forget async call from a
// server action — it has to be a durable row a separate long-running worker process
// (scripts/worker.ts) picks up and executes. This module is intentionally plain — no
// "use server", no Next.js imports — so it can be safely imported from both server
// actions and the standalone worker script.
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit-log";
import type { Prisma } from "@/app/generated/prisma/client";

// Task 3.7. Two job types now: analysing a site (crawl + one AI structuring call) and
// generating a page (design system resolution + AI markup generation + validation +
// persist Concept, Phase B's own pipeline — see lib/content/generate-page.ts). Both are
// slow and AI-touching; everything else in the app (template rendering, publish) stays
// synchronous and never queued.
export type JobType = "ANALYZE_SITE" | "GENERATE_PAGE";

// The two real payload shapes, defined once here rather than separately in worker.ts and
// whichever server action enqueues each type — a single shared source both sides import,
// so the shape a caller constructs and the shape the worker expects can't silently drift
// apart. See parseAnalyzeSitePayload/parseGeneratePagePayload below for the runtime
// validation this file's own Job.payload column (a bare Json field, no schema) can't
// provide on its own.
export type AnalyzeSitePayload = { clientId: string; siteUrl: string };
export type GeneratePagePayload = { clientId: string };

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

// Task 3.7, constraint 2. `job.payload as AnalyzeSitePayload` (the previous shape of this
// code, worker.ts's own former line 32) was an unchecked cast — safe only because exactly
// one job type ever existed, so `payload` could only ever be the one shape a caller ever
// constructed. With two job types sharing one untyped `Json` column, a cast alone no
// longer proves anything: a GENERATE_PAGE row's payload (`{ clientId }`) read through an
// `AnalyzeSitePayload` cast would silently produce `siteUrl: undefined` instead of a
// caught error, and the reverse (an ANALYZE_SITE payload's extra `siteUrl` field) would
// silently pass a GeneratePagePayload check that only wanted `clientId` — both are real,
// not hypothetical, since the two shapes overlap on `clientId`. These two functions
// validate the actual, real fields at read time and throw a specific, actionable error
// instead of proceeding with `undefined` values that would fail confusingly three
// function calls later.
export function parseAnalyzeSitePayload(payload: unknown): AnalyzeSitePayload {
  const p = payload as Record<string, unknown> | null;
  if (!p || typeof p !== "object") throw new Error("ANALYZE_SITE payload is not an object.");
  if (typeof p.clientId !== "string" || !p.clientId) throw new Error("ANALYZE_SITE payload is missing a valid clientId.");
  if (typeof p.siteUrl !== "string" || !p.siteUrl) throw new Error("ANALYZE_SITE payload is missing a valid siteUrl.");
  return { clientId: p.clientId, siteUrl: p.siteUrl };
}

export function parseGeneratePagePayload(payload: unknown): GeneratePagePayload {
  const p = payload as Record<string, unknown> | null;
  if (!p || typeof p !== "object") throw new Error("GENERATE_PAGE payload is not an object.");
  if (typeof p.clientId !== "string" || !p.clientId) throw new Error("GENERATE_PAGE payload is missing a valid clientId.");
  return { clientId: p.clientId };
}

// Section 4's concurrency cap ("one or two active generations per user, prevents queue
// flooding") — a database question, not a Redis sliding-window one.
export async function countActiveJobsForUser(userId: string): Promise<number> {
  return prisma.job.count({
    where: { createdByUserId: userId, status: { in: ["PENDING", "RUNNING"] } },
  });
}

// Task 3.7 — added createdByUserId. Phase B needs to know who requested a page
// generation so the resulting Concept.createdByUserId can attribute it, the same way the
// synchronous createConcept action already does from the live session — a queued job has
// no live session to read that from at process time, only whatever the Job row itself
// carries.
export type ClaimedJob = { id: string; type: JobType; payload: unknown; createdByUserId: string | null };

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
    RETURNING id, type, payload, "createdByUserId"
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
// client to ANALYSIS_FAILED even though the old process would have finished successfully.
// This one timeout applies uniformly to any RUNNING job regardless of type (reclaim below
// doesn't branch on job.type), so it has to cover the worst case across BOTH job types,
// not just the one that existed when 90 minutes was first chosen.
//
// ANALYZE_SITE (crawl + images + structuring, all three run inside this one job):
//   - crawl: MAX_PAGES(150) × (PAGE_TIMEOUT_MS 20s + REQUEST_DELAY_MS 400ms)  ≈ 51 min
//     (lib/crawl/crawler.ts)
//   - images: up to 11 sequential downloads (logo + MAX_CANDIDATE_IMAGES 10), each up to
//     MAX_IMAGE_REDIRECTS(5) hops × FETCH_TIMEOUT_MS(10s)                    ≈ 9 min
//     (lib/crawl/download-images.ts)
//   - structuring call: MAX_ATTEMPTS(3) validation retries, each itself up to
//     MAX_TRANSIENT_RETRIES(5) backoff retries (lib/ai/anthropic-retry.ts)   ≈ 16 min
//     (lib/content/structure-and-rewrite.ts)
//   ≈ 76 minutes worst case, all three stacked.
//
// GENERATE_PAGE (Task 3.7 — design system resolution + stylesheet generation + markup
// generation + validation + persist, all inside this one, separate job):
//   - design system resolution (3.2) + stylesheet generation (3.3): deterministic, local,
//     no network call — build plan §6.1's own "milliseconds, $0" — not counted.
//   - markup generation call: MAX_ATTEMPTS(3) validation retries, each itself up to
//     MAX_TRANSIENT_RETRIES(5) backoff retries (lib/ai/anthropic-retry.ts) — the exact
//     same retry shape and the exact same shared constants as the structuring call above
//     (lib/content/generate-markup.ts), so the same ≈16 min estimate applies by direct
//     analogy, not a separately re-derived number.                          ≈ 16 min
//   - validation (3.5, HTML parsing, CPU-bound) + fallback render (3.6, string templating,
//     CPU-bound) + Concept persist (one DB write): all synchronous and local — not counted,
//     same treatment as design system resolution/stylesheet generation above.
//   ≈ 16 minutes worst case.
//
// Recomputed honestly, not assumed to need a bigger number just because a new job type was
// added: max(76, 16) = 76 minutes — ANALYZE_SITE's own worst case still dominates.
// GENERATE_PAGE never runs the crawl/image/structuring steps itself (it's a separate,
// later job against already-extracted content, not summed with ANALYZE_SITE's own
// runtime), so its own worst case is well inside the existing 90-minute headroom. The
// constant itself is unchanged; this comment is, so the reasoning that justifies it now
// actually accounts for both job types instead of going stale the moment a second one
// existed.
const STALE_JOB_TIMEOUT_MS = 90 * 60 * 1000;

// Task 3.7 — generalized and exported. Was a private, ANALYZE_SITE-flavoured
// revertOrphanedClient(clientId); the actual behaviour (flip Client.status to
// ANALYSIS_FAILED, log why) is reusable as-is for any real pipeline failure, not just an
// orphaned job — lib/content/generate-page.ts's own outer catch (a genuinely unexpected
// GENERATE_PAGE failure, not a markup-generation failure the fallback renderer already
// recovers from) reuses this exact function rather than a third hand-copied
// status-flip-plus-audit-log implementation.
export async function revertClientToAnalysisFailed(clientId: string, reason: string): Promise<void> {
  try {
    // Same recovery path a normal analysis failure takes (see
    // lib/content/run-analysis.ts) — a stuck or failed job is functionally indistinguishable
    // from any other analysis failure, and this status is purely a progress indicator, not a
    // gate: it never locks a client out of already-approved content or its concept
    // history (see the ClientStatus/gating notes in the Kondo rebuild plan).
    await prisma.client.update({ where: { id: clientId }, data: { status: "ANALYSIS_FAILED" } });
    await logAuditEvent("ANALYSIS_FAILED", { clientId, metadata: { reason } });
  } catch {
    // Client no longer exists (deleted between enqueue and this call) — nothing to revert.
  }
}

export async function reclaimOrphanedJobs(): Promise<number> {
  const cutoff = new Date(Date.now() - STALE_JOB_TIMEOUT_MS);
  const stale = await prisma.job.findMany({ where: { status: "RUNNING", startedAt: { lt: cutoff } } });
  if (stale.length === 0) return 0;

  for (const job of stale) {
    const payload = job.payload as Record<string, unknown>;
    const clientId = typeof payload.clientId === "string" ? payload.clientId : null;
    if (clientId) await revertClientToAnalysisFailed(clientId, "orphaned_job_reclaimed");

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
