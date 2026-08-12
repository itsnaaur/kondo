import * as Sentry from "@sentry/nextjs";

// Auto-imported by instrumentation.ts for the Node runtime. SENTRY_DSN is optional — the
// Sentry SDK already no-ops safely with no dsn (no events sent, no error thrown), so this
// needs no extra guard, just like every other optional integration in this app (Upstash,
// etc.) fails open rather than fails closed.
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
});
