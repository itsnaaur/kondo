import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, authErrorResponse } from "@/lib/auth/require-user";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
  } catch (err) {
    const response = authErrorResponse(err);
    if (response) return response;
    throw err;
  }

  const { id } = await params;

  const client = await prisma.client.findUnique({
    where: { id },
    select: { status: true, crawlPagesDone: true, crawlPagesTotal: true },
  });

  if (!client) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(client);
}
