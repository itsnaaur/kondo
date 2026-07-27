"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function GenerationProgress({
  clientId,
  status,
  message,
}: {
  clientId: string;
  /** The status this component polls away from — refreshes once the client leaves it. */
  status: string;
  message?: string;
}) {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      const res = await fetch(`/api/clients/${clientId}/status`, { cache: "no-store" });
      if (!res.ok || cancelled) return;
      const data: { status: string } = await res.json();
      if (cancelled) return;

      if (data.status !== status) {
        router.refresh();
        return;
      }
      timer = setTimeout(poll, 2000);
    }

    poll();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [clientId, status, router]);

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-3">
      <p className="text-sm text-neutral-300">
        {message ?? "Generating — this usually takes under a minute..."}
      </p>
    </div>
  );
}
