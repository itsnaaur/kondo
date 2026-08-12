import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

// Applied to every route including the preview route — this is fine for the
// non-CSP headers (identical value either way), and the preview route's own
// Content-Security-Policy (sandbox allow-scripts; ...) is stricter than this one and
// takes precedence in practice since it's the more specific policy a browser actually
// enforces from that response. This header covers the main app; no wildcard CORS is
// added anywhere in this app, so none is needed here either.
// React's dev-mode debugging tooling (reconstructing call stacks, the error overlay)
// uses eval() and only in development — "React will never use eval() in production
// mode" is Next.js's own message when this is missing. Scoping unsafe-eval to dev only
// keeps the production policy strict without breaking local development.
const scriptSrc =
  process.env.NODE_ENV === "production" ? "script-src 'self' 'unsafe-inline'" : "script-src 'self' 'unsafe-inline' 'unsafe-eval'";

const SECURITY_HEADERS = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      scriptSrc,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      // https://*.supabase.co is required here now, not just in connect-src — every
      // crawled logo/photo a published concept shows lives in Supabase Storage (see
      // lib/storage/upload-asset.ts), a different origin from the app itself. Confirmed
      // live: every <img> on a published /p/[slug] page silently failed to load
      // (naturalWidth 0) with this directive still scoped to 'self' only, the one thing
      // that's supposed to make a prospect go "wait, that's my site."
      "img-src 'self' data: blob: https://*.supabase.co",
      "connect-src 'self' https://*.supabase.co",
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

// withSentryConfig is safe to apply unconditionally — with no SENTRY_AUTH_TOKEN set (only
// needed for uploading source maps, not for error reporting itself) it just skips that
// step with a build-time warning instead of failing, same as every other Sentry piece in
// this app staying inert until a DSN/token is actually configured. org/project only
// matter for that same source-map upload, so leaving them undefined until set is fine.
//
// Note for local dev: if you've been alternating `npm run build` and `npm run dev`, a
// stray/mismatched .next cache between the two can produce spurious 404s on real routes
// (confirmed live this session — not a Sentry-specific issue, a known class of Next.js
// dev-vs-build cache artifact). `rm -rf .next` and restart if that ever happens; it is
// not something this config can prevent.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  // This app already ships its own strict CSP/security headers (see SECURITY_HEADERS
  // above) — the tunnel route trades a small amount of that scope (one extra same-origin
  // path that proxies to Sentry) for ad-blocker resilience. Left off; revisit if event
  // delivery turns out to be an issue in practice.
  tunnelRoute: false,
});
