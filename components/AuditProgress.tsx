"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type StatusResponse = {
  status: string;
  crawlPagesDone: number | null;
  crawlPagesTotal: number | null;
};

export function AuditProgress({ clientId }: { clientId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<StatusResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      const res = await fetch(`/api/clients/${clientId}/status`, { cache: "no-store" });
      if (!res.ok || cancelled) return;
      const data: StatusResponse = await res.json();
      if (cancelled) return;

      setStatus(data);

      if (data.status !== "AUDITING") {
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
  }, [clientId, router]);

  const done = status?.crawlPagesDone ?? 0;
  const total = status?.crawlPagesTotal ?? 1;
  const pct = Math.min(100, Math.round((done / Math.max(total, 1)) * 100));

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-3">
      <p className="mb-2 text-sm text-neutral-300">
        Crawling site — {done} page{done === 1 ? "" : "s"} done
        {status?.crawlPagesTotal ? `, ~${status.crawlPagesTotal} discovered so far` : ""}...
      </p>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-800">
        <div className="h-full bg-yellow-400 transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
