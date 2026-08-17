import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

// Task 3.0: Content-Security-Policy is no longer assembled here for the main app — a nonce
// can't live in a static header (a fresh one must exist per request), so that moved to
// proxy.ts's per-response middleware. These four remain here because none of them need a
// nonce or any other per-request value; moving them would be scope creep for no benefit.
const SECURITY_HEADERS = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
];

// /p/[slug] (app/p/[slug]/route.ts) is excluded from proxy.ts's matcher — deliberately, it's
// the one public, unauthenticated surface in this app, and a prospect's cold-email link isn't
// going through session/MFA middleware. That also means it never receives a nonce from
// proxy.ts, so it needs its own CSP, assembled here as a static rule instead. It doesn't need
// one: confirmed by grepping every template in lib/templates/ for `<script` — the only match is
// a test asserting XSS input gets escaped, not a real template feature — so script-src can be
// 'self' with no 'unsafe-inline' and no nonce, a strictly stricter policy than the main app's
// pre-3.0 static one ever was. style-src keeps 'unsafe-inline': every template's CSS ships as a
// literal <style> block plus inline style="" attributes baked directly into the HTML
// (lib/templates/shell.ts), and there's no per-request nonce available here to gate it with
// instead.
const PUBLISH_ROUTE_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  // https://*.supabase.co is required here now, not just in connect-src — every crawled
  // logo/photo a published concept shows lives in Supabase Storage (see
  // lib/storage/upload-asset.ts), a different origin from the app itself. Confirmed live:
  // every <img> on a published /p/[slug] page silently failed to load (naturalWidth 0) with
  // this directive still scoped to 'self' only, the one thing that's supposed to make a
  // prospect go "wait, that's my site."
  "img-src 'self' data: blob: https://*.supabase.co",
  "connect-src 'self' https://*.supabase.co",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  async headers() {
    return [
      { source: "/:path*", headers: SECURITY_HEADERS },
      { source: "/p/:path*", headers: [{ key: "Content-Security-Policy", value: PUBLISH_ROUTE_CSP }] },
    ];
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
