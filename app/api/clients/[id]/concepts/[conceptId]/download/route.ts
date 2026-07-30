import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, authErrorResponse } from "@/lib/auth/require-user";
import { logAuditEvent } from "@/lib/audit-log";
import type { User } from "@supabase/supabase-js";

function slugify(name: string): string {
  return name.replace(/[^a-zA-Z0-9-]+/g, "-").toLowerCase();
}

// The "download a self-contained HTML file" half of Publish/Export. Portable, not fully
// self-contained: inlined CSS but absolute Supabase Storage image URLs (see the Kondo
// rebuild plan's Architecture decisions) — no build step or external stylesheet, but it
// does need network access to load the client's photos/logo when opened.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; conceptId: string }> }
) {
  let user: User;
  try {
    user = await requireUser();
  } catch (err) {
    const response = authErrorResponse(err);
    if (response) return response;
    throw err;
  }

  const { id, conceptId } = await params;

  const concept = await prisma.concept.findFirst({
    where: { id: conceptId, clientId: id },
    include: { client: true },
  });
  if (!concept) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const filename = `${slugify(concept.client.name)}-${concept.templateKey}-concept.html`;

  await logAuditEvent("EXPORT_DOWNLOADED", { userId: user.id, clientId: id, metadata: { conceptId, filename } });

  return new NextResponse(concept.html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
