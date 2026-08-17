import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isAllowedEmail } from "@/lib/auth/domain";

// Task 3.0. requestHeaders carries the per-request nonce (and the Content-Security-Policy
// header itself — see proxy.ts) that Next's App Router needs present on the *request* object,
// not just the response, to auto-apply it to the flight-data hydration scripts it injects
// during server rendering. Every NextResponse.next({request}) call below must forward this same
// Headers instance, not the original `request` unmodified, or the nonce silently never reaches
// rendering — proxy.ts is this function's only caller, so there's no back-compat path that skips
// passing it.
export async function updateSession(request: NextRequest, requestHeaders: Headers) {
  let supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Any redirect built below must carry forward whatever setAll() has written onto
  // supabaseResponse up to that point — Supabase's own Next.js SSR guide is explicit
  // that a fresh response object silently drops those Set-Cookie headers ("you must
  // return the supabaseResponse object as it is... or copy the cookies over"). This
  // matters even for branches that never call signOut() themselves: getUser()'s own
  // internal token-refresh can call setAll() to rotate or clear a cookie, and a bare
  // `NextResponse.redirect(url)` would discard that — leaving the browser holding a
  // stale refresh token that the server has already invalidated, which is exactly what
  // produced the repeated "Invalid Refresh Token: Refresh Token Not Found" errors.
  function redirectWithCookies(url: URL): NextResponse {
    const redirectResponse = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
    return redirectResponse;
  }

  // getUser() never throws — every supabase-js call returns { data, error } instead,
  // including a stale/invalid refresh token (surfaced as error.code ===
  // "refresh_token_not_found"). That's the same as "no user" for our purposes; no
  // separate handling needed beyond what the `!user` branch below already does.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!request.nextUrl.pathname.startsWith("/login")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", request.nextUrl.pathname);
      return redirectWithCookies(url);
    }

    // Layer 3 of the domain restriction, applied here too (not just in requireUser()):
    // catches a session that exists but shouldn't — a misconfigured Before User Created
    // hook, a Supabase dashboard change nobody documented, or a user row created
    // directly in the database during debugging. Signed out rather than just redirected,
    // so a non-domain session doesn't linger and keep bouncing between pages.
    if (!isAllowedEmail(user.email)) {
      await supabase.auth.signOut();
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.search = "";
      url.searchParams.set("error", "unauthorized_domain");
      return redirectWithCookies(url);
    }

    // MFA is mandatory. A session that's only reached AAL1 (password verified, no TOTP
    // step-up yet — either never enrolled, or enrolled but hasn't stepped up this
    // session) gets routed to enrollment/challenge before it can reach anything else.
    if (!request.nextUrl.pathname.startsWith("/mfa")) {
      const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aalData?.currentLevel !== "aal2") {
        const url = request.nextUrl.clone();
        url.pathname = "/mfa";
        url.search = "";
        return redirectWithCookies(url);
      }
    }
  }

  return supabaseResponse;
}
