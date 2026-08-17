import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Task 3.0. Supersedes the static Content-Security-Policy previously assembled in
// next.config.ts's SECURITY_HEADERS — a nonce can't live in a static header (a fresh one has to
// exist per request), so CSP generation moves here. The other security headers (HSTS,
// X-Content-Type-Options, X-Frame-Options, Referrer-Policy) stay in next.config.ts — they're
// genuinely static, nothing about a nonce touches them, moving them would be scope creep.
//
// /p/[slug] is deliberately excluded from this file's matcher below (see the comment there) and
// so never gets a nonce from here — it has its own separate, static, nonce-less CSP rule added
// directly in next.config.ts's headers(), scoped to /p/:path* only. That route serves
// hand-authored template HTML with zero inline <script> tags (confirmed: grepped every template
// for `<script`, the only match is a test asserting XSS input gets escaped, not a real template
// feature) — so unlike the rest of the app, it never needed 'unsafe-inline' in script-src to
// begin with, nonce or not.
function buildCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV === "development";
  // React's dev-mode debugging tooling (reconstructing call stacks, the error overlay) uses
  // eval() and only in development — scoped to dev only, same reasoning the pre-3.0 static
  // config already carried (see git history on next.config.ts).
  const scriptSrc = `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`;
  return [
    "default-src 'self'",
    scriptSrc,
    // style-src is untouched by this task on purpose — the constraint list scopes this to
    // script-src specifically ("Production script-src carries the nonce and no
    // 'unsafe-inline'"). 'unsafe-inline' here is what lets every template's own embedded
    // <style> block and inline style="" attributes render at all; removing it is a separate,
    // larger piece of work (a style nonce, or moving every inline style out) not asked for here.
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://*.supabase.co",
    "connect-src 'self' https://*.supabase.co",
    "frame-ancestors 'none'",
  ].join("; ");
}

export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce);

  // Set on the REQUEST headers (forwarded into rendering via updateSession below) so Next can
  // read x-nonce via headers() during SSR, and Content-Security-Policy on the request too — Next
  // auto-detects the nonce by parsing this exact header on the request, per its own documented
  // mechanism, not by reading the x-nonce header directly.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = await updateSession(request, requestHeaders);
  // And on the actual RESPONSE headers — what the browser receives and enforces. Sets on every
  // branch updateSession can return (the "continue" response and every redirect), since a
  // redirect response should carry the same policy even though nothing renders from its body.
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  // /p/* is deliberately excluded — it's the one public, unauthenticated surface in this
  // app (a prospect opening a published concept link from a cold email isn't logged in
  // and never will be). Every other route, including /api/*, still goes through
  // updateSession() below; the actual concept HTML is served by app/p/[slug]/route.ts,
  // which is what this exclusion targets.
  //
  // robots.txt is excluded too — confirmed live that without this, a bot hitting
  // /robots.txt (never authenticated, never following a redirect to /login) simply never
  // sees the Disallow: /p/ rule, silently making that belt-and-braces protection do
  // nothing. The X-Robots-Tag header set directly on the /p/[slug] response is the
  // primary defense either way; this just makes the secondary one actually reachable.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|p/|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico)$).*)"],
};
