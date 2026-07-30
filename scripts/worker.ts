// The background-job worker. Deploy this as a separate long-running process (Railway,
// Fly, Render, a small VM — anywhere that runs a persistent Node process) alongside the
// Vercel deployment of the Next.js app. It needs the same DATABASE_URL, ANTHROPIC_API_KEY,
// NEXT_PUBLIC_SUPABASE_URL, and SUPABASE_SECRET_KEY as the main app, plus Playwright's
// Chromium installed (`npx playwright install --with-deps chromium`).
//
// Run with: npx tsx --env-file=.env scripts/worker.ts  (or `npm run worker`)
import { claimNextJob, completeJob, failJob, reclaimOrphanedJobs, type ClaimedJob } from "@/lib/jobs/queue";
import { runAnalysisInBackground } from "@/lib/content/run-analysis";

const POLL_INTERVAL_MS = 3000;

type AnalyzeSitePayload = { clientId: string; siteUrl: string };

async function dispatch(job: ClaimedJob): Promise<void> {
  switch (job.type) {
    case "ANALYZE_SITE": {
      const payload = job.payload as AnalyzeSitePayload;
      return runAnalysisInBackground(payload.clientId, payload.siteUrl);
    }
    default:
      throw new Error(`Unknown job type: ${job.type}`);
  }
}

async function processJob(job: ClaimedJob): Promise<void> {
  console.log(`[worker] processing ${job.id} (${job.type})`);
  try {
    await dispatch(job);
    // Contract runAnalysisInBackground must follow: on failure, it reverts Client.status
    // to ANALYSIS_FAILED itself and then rethrows — never catch, log, and return
    // normally. This catch only handles Job-row bookkeeping, not user-facing recovery, so
    // it relies on that rethrow to know a dispatch actually failed.
    await completeJob(job.id);
    console.log(`[worker] completed ${job.id}`);
  } catch (err) {
    console.error(`[worker] job ${job.id} threw:`, err);
    await failJob(job.id, err instanceof Error ? err.message : String(err));
  }
}

async function main(): Promise<void> {
  // Recovers jobs left RUNNING by whatever process had this worker's job before it —
  // restarting `npm run worker` mid-job is routine, and until this existed, the orphaned
  // row silently ate a concurrency slot forever.
  const reclaimed = await reclaimOrphanedJobs();
  if (reclaimed > 0) {
    console.log(`[worker] reclaimed ${reclaimed} orphaned job(s) left RUNNING by a previous process`);
  }

  console.log("[worker] started, polling for jobs...");
  for (;;) {
    const job = await claimNextJob();
    if (!job) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      continue;
    }
    await processJob(job);
  }
}

main().catch((err) => {
  console.error("[worker] fatal error:", err);
  process.exit(1);
});
