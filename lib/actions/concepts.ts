"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";
import { requireActiveClient } from "@/lib/actions/require-active-client";
import { logAuditEvent } from "@/lib/audit-log";
import { renderTemplateToHtml, isValidTemplateKey } from "@/lib/templates/registry";
import { toTemplateContent } from "@/lib/content/to-template-content";

// The one and only point a Concept row (and its frozen HTML) gets persisted — trying
// templates in the gallery and toggling desktop/mobile on the preview page before this is
// a pure, ephemeral render, nothing written. Re-renders server-side rather than trusting
// any client-supplied HTML.
export async function createConcept(clientId: string, templateKey: string) {
  const user = await requireUser();
  await requireActiveClient(clientId);

  if (!isValidTemplateKey(templateKey)) {
    throw new Error(`Unknown template: ${templateKey}`);
  }

  const contentRecord = await prisma.contentRecord.findUniqueOrThrow({ where: { clientId } });
  if (!contentRecord.reviewedAt) {
    throw new Error("Content must be reviewed and approved before generating a concept");
  }

  const assets = await prisma.asset.findMany({ where: { clientId } });
  const templateContent = toTemplateContent(contentRecord, assets);
  const html = renderTemplateToHtml(templateKey, templateContent);

  const concept = await prisma.concept.create({
    data: {
      clientId,
      contentRecordId: contentRecord.id,
      templateKey,
      html,
      createdByUserId: user.id,
    },
  });

  await logAuditEvent("CONCEPT_GENERATED", {
    userId: user.id,
    clientId,
    metadata: { conceptId: concept.id, templateKey },
  });

  revalidatePath(`/clients/${clientId}`);
  redirect(`/clients/${clientId}/concepts/${concept.id}`);
}
