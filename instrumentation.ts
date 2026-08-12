import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Reports errors from route handlers/server actions that Next itself catches before a
// thrown Error would otherwise reach a component-level error boundary (app/(app)/error.tsx,
// app/error.tsx) — those still call Sentry.captureException themselves (see their own
// comments), this is the complementary server-side hook.
export const onRequestError = Sentry.captureRequestError;
