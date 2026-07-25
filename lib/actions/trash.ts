"use server";

import { rm } from "fs/promises";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { clientDir } from "@/lib/storage";
import { TRASH_RETENTION_DAYS } from "@/lib/trash-utils";

export async function moveToTrash(clientId: string) {
  await prisma.client.update({ where: { id: clientId }, data: { deletedAt: new Date() } });
  redirect("/");
}

export async function restoreFromTrash(clientId: string) {
  await prisma.client.update({ where: { id: clientId }, data: { deletedAt: null } });
  redirect("/trash");
}

export async function permanentlyDeleteClient(clientId: string) {
  await rm(clientDir(clientId), { recursive: true, force: true });
  await prisma.client.delete({ where: { id: clientId } });
  redirect("/trash");
}

// Called opportunistically when the dashboard or trash page loads — no persistent
// job scheduler in this app, so anything past the retention window gets swept here
// instead of on an exact timer.
export async function purgeExpiredTrash() {
  const cutoff = new Date(Date.now() - TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000);

  const expired = await prisma.client.findMany({
    where: { deletedAt: { lt: cutoff } },
    select: { id: true },
  });

  for (const { id } of expired) {
    try {
      await rm(clientDir(id), { recursive: true, force: true });
      await prisma.client.delete({ where: { id } });
    } catch (err) {
      console.error(`[trash] failed to purge expired client ${id}:`, err);
    }
  }
}
