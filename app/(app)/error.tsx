"use client";

import { useEffect } from "react";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";

// Catches any error thrown while rendering a page or a server action inside the
// authenticated app shell — Sidebar/TopNav (app/(app)/layout.tsx) stay mounted around
// this, only the broken page content is replaced. Before this existed, every thrown
// Error in a server action (bad site URL, an SSRF rejection, a rate-limit hit, a stale
// optimistic-concurrency save, "content must be reviewed and approved" — all written as
// clear, user-facing messages, see lib/actions/**) hit Next's default unstyled crash
// screen instead of ever being read here.
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  // No-op without NEXT_PUBLIC_SENTRY_DSN configured (see instrumentation-client.ts) — a
  // deliberate, user-facing throw (a validation message, a rate limit) reports here just
  // like a genuine bug would; Sentry issue grouping/volume is the place to tell those
  // apart later, not something worth filtering client-side here.
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <main className="mx-auto flex max-w-2xl flex-col items-center px-6 py-16 text-center">
      <p className="mb-2 text-lg font-semibold text-neutral-100">Something went wrong</p>
      <p className="mb-6 max-w-md text-sm text-neutral-400">
        {error.message || "An unexpected error occurred."}
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="rounded-lg bg-yellow-400 px-5 py-2.5 font-medium text-neutral-900 transition hover:bg-yellow-300"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-lg border border-neutral-700 px-5 py-2.5 font-medium text-neutral-300 transition hover:bg-neutral-900"
        >
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}
