"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";
import { requireActiveClient } from "@/lib/actions/require-active-client";
import { checkGenerationRateLimit, checkGlobalDailySpendCeiling, MAX_CONCURRENT_JOBS_PER_USER } from "@/lib/security/rate-limit";
import { enqueueJob, countActiveJobsForUser } from "@/lib/jobs/queue";
import { logAuditEvent } from "@/lib/audit-log";

// Task 3.7. Build plan §12, open decision 4: "Does Phase B auto-run on Continue, or is it a
// separate click?" Decided here, implemented here: SEPARATE CLICK. startPageGeneration is its
// own action, not folded into approveContentRecord's own "Approve & continue" flow
// (components/ContentReviewForm.tsx) — approving content does not itself enqueue a
// GENERATE_PAGE job.
//
// Why separate, not automatic: the build plan's own framing already leans this way ("Separate
// makes spend explicit and gives a free design-system re-roll before paying for generation"),
// and the pipeline itself backs it up structurally, not just as a stated preference. Design
// system resolution (3.2) and stylesheet generation (3.3) are both deterministic, local, and
// free (build plan §6.1's own "milliseconds, $0") — only markup generation (3.4) is a real,
// billed Anthropic call. Auto-running on Continue would mean every content approval
// immediately spends real money on a markup call, with no point at which a human could see the
// resolved palette/typography/style bundle and decide it's wrong BEFORE paying to generate
// against it. A separate action is also the only way this fits the existing concurrency/spend
// machinery cleanly: startAnalysis (lib/actions/analysis.ts) already gates its own job type
// behind checkCrawlRateLimit + countActiveJobsForUser + checkGlobalDailySpendCeiling, all
// checked at the moment of a real, explicit enqueue — the same shape this function reuses
// (with checkGenerationRateLimit, the sibling limiter already defined in
// lib/security/rate-limit.ts, "suggested starting points from the security review," never
// called from anywhere until now), not a shape that would make sense wired invisibly behind a
// review-approval click.
export async function startPageGeneration(clientId: string) {
  const user = await requireUser();

  await requireActiveClient(clientId);

  const contentRecord = await prisma.contentRecord.findUnique({ where: { clientId } });
  if (!contentRecord) {
    throw new Error("This client has no reviewed content yet — analyse and approve content first.");
  }
  // The same real gate lib/actions/concepts.ts's own createConcept already enforces for the
  // old, synchronous template-gallery flow — reviewedAt, not Client.status, is the actual
  // "ready" signal (see the ContentRecord model's own comment in schema.prisma). Page
  // generation is not exempt from this just because it's now queued instead of synchronous.
  if (!contentRecord.reviewedAt) {
    throw new Error("Content must be reviewed and approved before generating a page.");
  }

  // No-op rather than erroring, same reasoning as startAnalysis's own ANALYZING fast path —
  // a disabled button doesn't stop a form submission already in flight, and two clicks must
  // not race two GENERATE_PAGE jobs against the same client.
  const alreadyRunning = await prisma.job.findFirst({
    where: { type: "GENERATE_PAGE", status: { in: ["PENDING", "RUNNING"] }, payload: { path: ["clientId"], equals: clientId } },
  });
  if (alreadyRunning) return;

  const rateLimit = await checkGenerationRateLimit(user.id);
  if (!rateLimit.allowed) {
    throw new Error(`You're generating pages too quickly — try again in ${rateLimit.retryAfterSeconds}s.`);
  }

  const activeJobs = await countActiveJobsForUser(user.id);
  if (activeJobs >= MAX_CONCURRENT_JOBS_PER_USER) {
    throw new Error(
      `You already have ${activeJobs} job${activeJobs === 1 ? "" : "s"} in progress — wait for one to finish before starting another.`
    );
  }

  // Same aggregate hard stop as startAnalysis, checked last for the same reason — it
  // increments a shared daily counter as a side effect, so a request rejected by an earlier
  // check shouldn't count against today's ceiling.
  const spendCeiling = await checkGlobalDailySpendCeiling();
  if (!spendCeiling.allowed) {
    throw new Error(
      `Kondo has hit its shared daily generation limit across all users — try again in ${Math.ceil(spendCeiling.retryAfterSeconds / 3600)}h.`
    );
  }

  await enqueueJob("GENERATE_PAGE", { clientId }, user.id);
  await logAuditEvent("CONCEPT_GENERATED", { userId: user.id, clientId, metadata: { action: "enqueued" } });

  revalidatePath(`/clients/${clientId}`);
}
