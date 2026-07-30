"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";
import { logAuditEvent } from "@/lib/audit-log";
import { Prisma } from "@/app/generated/prisma/client";

function slugify(input: string): string {
  const cleaned = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return cleaned || "concept";
}

function isUniqueConstraintError(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

const MAX_SLUG_ATTEMPTS = 5;

// One slug per Concept, not per Client — a follow-up concept (different template, or a
// re-run after editing content) gets its own new link rather than overwriting whatever
// was already sent to a prospect. Re-publishing the *same* concept reuses its existing
// slug so a link already sent keeps working.
export async function publishConcept(clientId: string, conceptId: string) {
  const user = await requireUser();

  const concept = await prisma.concept.findUniqueOrThrow({
    where: { id: conceptId },
    include: { client: true },
  });

  if (concept.publishSlug) {
    await prisma.concept.update({
      where: { id: conceptId },
      data: { publishStatus: "PUBLISHED", publishedAt: new Date() },
    });
  } else {
    const base = slugify(concept.client.name);
    let published = false;
    for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS && !published; attempt++) {
      const slug = `${base}-${randomUUID().slice(0, 6)}`;
      try {
        await prisma.concept.update({
          where: { id: conceptId },
          data: { publishSlug: slug, publishStatus: "PUBLISHED", publishedAt: new Date() },
        });
        published = true;
      } catch (err) {
        if (!isUniqueConstraintError(err)) throw err;
        // Slug collision (rare) — loop and try another random suffix.
      }
    }
    if (!published) throw new Error("Could not generate a unique publish link — try again");
  }

  await logAuditEvent("CONCEPT_PUBLISHED", { userId: user.id, clientId, metadata: { conceptId } });
  revalidatePath(`/clients/${clientId}/concepts/${conceptId}`);
}

export async function unpublishConcept(clientId: string, conceptId: string) {
  const user = await requireUser();
  await prisma.concept.update({ where: { id: conceptId }, data: { publishStatus: "UNPUBLISHED" } });
  await logAuditEvent("CONCEPT_UNPUBLISHED", { userId: user.id, clientId, metadata: { conceptId } });
  revalidatePath(`/clients/${clientId}/concepts/${conceptId}`);
}
