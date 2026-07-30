import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// The primary Publish/Export output: a hosted, non-indexed link on this app's own
// domain, deliberately unauthenticated — prospects opening a cold-email link aren't
// logged in. No CSP sandbox here (unlike the old internal preview route this replaces):
// that existed to contain AI-authored, untrusted HTML; these templates are hand-authored
// and trusted, and this route is the actual destination page a prospect opens, not an
// iframe embedding untrusted output. X-Robots-Tag plus the <meta name="robots"> already
// baked into every render by TemplateShell, plus /robots.txt's Disallow: /p/, is
// belt-and-braces against indexing.
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const concept = await prisma.concept.findUnique({ where: { publishSlug: slug } });
  if (!concept || concept.publishStatus !== "PUBLISHED") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new NextResponse(concept.html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "X-Robots-Tag": "noindex, nofollow",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "SAMEORIGIN",
    },
  });
}
