import { prisma } from "@/lib/prisma";
import type { Client } from "@/app/generated/prisma/client";

// Trashed (Client.deletedAt set) clients are hidden from the sidebar/dashboard, but
// nothing stopped a direct URL to a trashed client's workspace from still working —
// re-analysing, approving content, generating and publishing new concepts, all with no
// indication anything was different. Every mutating action below that operates on an
// existing client calls this first, so "moved to trash" is actually enforced, not just a
// UI hint that a stale tab or bookmarked URL can bypass.
export async function requireActiveClient(clientId: string): Promise<Client> {
  const client = await prisma.client.findUniqueOrThrow({ where: { id: clientId } });
  if (client.deletedAt) {
    throw new Error("This client has been moved to trash — restore it from the Trash page before making changes.");
  }
  return client;
}
