"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";
import { requireActiveClient } from "@/lib/actions/require-active-client";
import { logAuditEvent } from "@/lib/audit-log";
import { renderTemplateToHtml, isValidTemplateKey } from "@/lib/templates/registry";
import { toTemplateContent } from "@/lib/content/to-template-content";
import { extractConceptSection, replaceConceptSection } from "@/lib/templates/section-editor";
import { editConceptSectionHtml } from "@/lib/content/edit-concept-section";
import { sectionEditInstructionSchema } from "@/lib/validation/text-limits";

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

export type SectionEditState = { error: string } | { success: true; html: string } | null;

// Edits exactly one section of an already-generated concept, in place — a real AI call,
// but a small, tightly scoped one (lib/content/edit-concept-section.ts), never the whole
// page. Two isolation guarantees, from two different places: this concept's html is
// already a frozen, per-client snapshot (see the Concept model's own comment in
// prisma/schema.prisma), so this can never affect another client or the shared template
// source; lib/templates/section-editor.ts + the scoped-class-prefix contract in
// edit-concept-section.ts is what keeps the change from bleeding into this same client's
// *other* sections, which do share CSS classes with each other.
export async function editConceptSection(
  clientId: string,
  conceptId: string,
  _prevState: SectionEditState,
  formData: FormData
): Promise<SectionEditState> {
  const user = await requireUser();
  await requireActiveClient(clientId);

  const sectionKey = String(formData.get("sectionKey") ?? "");
  if (!sectionKey) return { error: "Choose a section to edit." };

  const instructionCheck = sectionEditInstructionSchema.safeParse(formData.get("instruction"));
  if (!instructionCheck.success) {
    return { error: "Describe the change you want, in a sentence or two." };
  }
  const instruction = instructionCheck.data;

  const concept = await prisma.concept.findFirst({ where: { id: conceptId, clientId } });
  if (!concept) return { error: "This concept could not be found." };

  const sectionHtml = extractConceptSection(concept.html, sectionKey);
  if (!sectionHtml) return { error: "That section could not be found on this concept — try reloading the page." };

  // Unique per concept AND per section, so two different sections edited back to back
  // (or the same section edited twice) never share a scope and can never collide with
  // each other's leftover styles.
  const scopePrefix = `kondo-ovr-${conceptId}-${sectionKey}`.toLowerCase();

  let newFragment: string;
  try {
    newFragment = await editConceptSectionHtml(sectionHtml, instruction, scopePrefix);
  } catch (err) {
    console.error(`[editConceptSection] failed for concept ${conceptId} section ${sectionKey}:`, err);
    return {
      error:
        err instanceof Error
          ? `The AI edit didn't come back usable: ${err.message}`
          : "The AI edit failed — try rephrasing your instruction.",
    };
  }

  const updatedHtml = replaceConceptSection(concept.html, sectionKey, newFragment);

  await prisma.concept.update({ where: { id: conceptId }, data: { html: updatedHtml } });
  await logAuditEvent("CONCEPT_SECTION_EDITED", { userId: user.id, clientId, metadata: { conceptId, sectionKey } });

  revalidatePath(`/clients/${clientId}/concepts/${conceptId}`);
  return { success: true, html: updatedHtml };
}
