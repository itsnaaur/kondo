"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type StatusResponse = { status: string | null; lastError: string | null };

// Task 3.7b. Mirrors AnalysisProgress's own polling shape (2s interval, cancel-on-unmount,
// router.refresh() once the underlying thing is done) but with a different progress signal:
// ANALYZE_SITE has crawlPagesDone/Total on the Client row to drive a real bar; GENERATE_PAGE
// touches Client.status for nothing (design system resolution and stylesheet generation are
// synchronous/local, and the one real network step — markup generation — gives no partial
// progress until it succeeds or exhausts retries, see STALE_JOB_TIMEOUT_MS's own comment in
// lib/jobs/queue.ts). There is no page-count equivalent to show, so this is honestly
// indeterminate rather than a bar that can't reflect anything real.
export function GenerationProgress({ clientId }: { clientId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<StatusResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      const res = await fetch(`/api/clients/${clientId}/generation-status`, { cache: "no-store" });
      if (!res.ok || cancelled) return;
      const data: StatusResponse = await res.json();
      if (cancelled) return;

      setStatus(data);

      if (data.status === "PENDING" || data.status === "RUNNING") {
        timer = setTimeout(poll, 2000);
        return;
      }
      router.refresh();
    }

    poll();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [clientId, router]);

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-3">
      <p className="mb-2 text-sm text-neutral-300" role="status" aria-live="polite">
        {status?.status === "PENDING"
          ? "Queued — page generation will start shortly..."
          : "Generating page — resolving design system and writing markup with AI, this can take a few minutes..."}
      </p>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-800">
        <div className="h-full w-1/3 animate-pulse rounded-full bg-yellow-400" />
      </div>
    </div>
  );
}
