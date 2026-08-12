import * as Sentry from "@sentry/nextjs";

// Auto-imported by instrumentation.ts for the Edge runtime (proxy.ts's middleware).
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
});
