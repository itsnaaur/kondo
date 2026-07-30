"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { deleteClientAssetsFromStorage } from "@/lib/storage/upload-asset";
import { TRASH_RETENTION_DAYS } from "@/lib/trash-utils";
import { requireUser } from "@/lib/auth/require-user";
import { logAuditEvent } from "@/lib/audit-log";

export async function moveToTrash(clientId: string) {
  const user = await requireUser();
  await prisma.client.update({ where: { id: clientId }, data: { deletedAt: new Date() } });
  await logAuditEvent("CLIENT_TRASHED", { userId: user.id, clientId });
  revalidatePath("/", "layout");
  redirect("/");
}

export async function restoreFromTrash(clientId: string) {
  await requireUser();
  await prisma.client.update({ where: { id: clientId }, data: { deletedAt: null } });
  revalidatePath("/", "layout");
  redirect("/trash");
}

// Permanently deleting a client is the only place Storage objects are ever removed —
// everywhere else, assets are append-only (see lib/storage/upload-asset.ts), because
// already-published Concept HTML has asset URLs baked in permanently and must never
// break. This also cascades (via the Prisma schema's onDelete: Cascade) to delete every
// Concept row for this client, so any of its published /p/[slug] links start 404ing —
// intentional: the client no longer exists, nothing of theirs should still be reachable.
export async function permanentlyDeleteClient(clientId: string) {
  const user = await requireUser();
  await logAuditEvent("CLIENT_DELETED", { userId: user.id, clientId });
  await deleteClientAssetsFromStorage(clientId).catch((err) => {
    console.error(`[trash] failed to delete Storage objects for client ${clientId}:`, err);
  });
  await prisma.client.delete({ where: { id: clientId } });
  revalidatePath("/", "layout");
  redirect("/trash");
}

// Called opportunistically when the dashboard or trash page loads — no persistent job
// scheduler in this app, so anything past the retention window gets swept here instead of
// on an exact timer. Always reached from an already-authenticated page render (proxy.ts
// gates the whole (app) route group), but checked independently anyway for the same
// reason every other action here is.
export async function purgeExpiredTrash() {
  await requireUser();

  const cutoff = new Date(Date.now() - TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000);

  const expired = await prisma.client.findMany({
    where: { deletedAt: { lt: cutoff } },
    select: { id: true },
  });

  for (const { id } of expired) {
    try {
      await deleteClientAssetsFromStorage(id);
      await prisma.client.delete({ where: { id } });
    } catch (err) {
      console.error(`[trash] failed to purge expired client ${id}:`, err);
    }
  }
}
