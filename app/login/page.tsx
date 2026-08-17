import { Suspense } from "react";
import LoginForm from "./login-form";

// Task 3.0. Without this, Next statically prerenders /login at build time (confirmed: it was
// the only real page, besides the built-in /_not-found, still marked ○ Static in `npm run
// build`'s route summary before this change) — a page rendered once at build time has no
// per-request nonce to inject into its own hydration scripts at all, which is fatal for a
// nonce-based CSP specifically (a stale, build-time nonce would never match the fresh one
// proxy.ts generates per request, so the browser blocks every inline script unconditionally).
// Same fix, same reasoning, as app/mfa/page.tsx's own force-dynamic.
export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
