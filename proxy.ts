import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return updateSession(request);
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
