"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

// Catches an error thrown by the root layout itself (app/layout.tsx) — the one place
// app/error.tsx and app/(app)/error.tsx can't reach, since both render *inside* that
// layout. Next requires this file to render its own <html>/<body>: there is no outer
// layout left to provide them once this is what's rendering.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  // Sentry.captureException is a no-op with no NEXT_PUBLIC_SENTRY_DSN configured (see
  // instrumentation-client.ts) — safe to call unconditionally rather than gating this on
  // whether Sentry happens to be set up.
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-black px-6 text-neutral-100">
        <div className="max-w-sm text-center">
          <p className="mb-2 text-lg font-semibold">Something went wrong</p>
          <p className="mb-6 text-sm text-neutral-400">
            Kondo hit an unexpected error loading the page. Try again, or reload the tab if it keeps
            happening.
          </p>
          <button
            onClick={reset}
            className="rounded-lg bg-yellow-400 px-5 py-2.5 font-medium text-neutral-900 transition hover:bg-yellow-300"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
