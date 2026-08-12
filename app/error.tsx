"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

// Fallback for anything under app/ not covered by the more specific app/(app)/error.tsx —
// currently just /login and /mfa, which mostly handle their own errors inline already
// (client-side Supabase calls), but this is the safety net if something outside that
// still throws during render instead.
export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-black px-6 text-center text-neutral-100">
      <p className="mb-2 text-lg font-semibold">Something went wrong</p>
      <p className="mb-6 max-w-md text-sm text-neutral-400">
        {error.message || "An unexpected error occurred."}
      </p>
      <button
        onClick={reset}
        className="rounded-lg bg-yellow-400 px-5 py-2.5 font-medium text-neutral-900 transition hover:bg-yellow-300"
      >
        Try again
      </button>
    </main>
  );
}
