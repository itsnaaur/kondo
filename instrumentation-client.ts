import * as Sentry from "@sentry/nextjs";

// NEXT_PUBLIC_ prefix required — this file runs in the browser bundle, and only
// NEXT_PUBLIC_* env vars are ever inlined there (same rule every other client-visible
// value in this app follows, e.g. NEXT_PUBLIC_SUPABASE_URL). No dsn set means the SDK
// silently doesn't send anything — safe to leave this active with nothing configured.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
