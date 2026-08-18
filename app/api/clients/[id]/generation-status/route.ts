import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, authErrorResponse } from "@/lib/auth/require-user";

// Task 3.7b. GENERATE_PAGE never touches Client.status (see lib/content/generate-page.ts's
// own header comment), so unlike /api/clients/[id]/status this can't read progress off the
// Client row — the Job row itself is the only signal. Returns the most recent GENERATE_PAGE
// job for this client regardless of status, so a caller polling while one is PENDING/RUNNING
// sees it flip to COMPLETE/FAILED without a second query shape for "is anything active."
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
  } catch (err) {
    const response = authErrorResponse(err);
    if (response) return response;
    throw err;
  }

  const { id } = await params;

  const job = await prisma.job.findFirst({
    where: { type: "GENERATE_PAGE", payload: { path: ["clientId"], equals: id } },
    orderBy: { createdAt: "desc" },
    select: { status: true, lastError: true },
  });

  return NextResponse.json({ status: job?.status ?? null, lastError: job?.lastError ?? null });
}
