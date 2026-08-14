import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { publishConcept, unpublishConcept } from "@/lib/actions/publish";
import { SubmitButton } from "@/components/SubmitButton";
import { PreviewFrame } from "@/components/PreviewFrame";
import { ConceptSectionEditor } from "@/components/ConceptSectionEditor";
import { listConceptSections } from "@/lib/templates/section-editor";

export default async function ConceptPage({
  params,
}: {
  params: Promise<{ id: string; conceptId: string }>;
}) {
  const { id, conceptId } = await params;

  const concept = await prisma.concept.findFirst({
    where: { id: conceptId, clientId: id },
    include: { client: true },
  });

  if (!concept) notFound();

  // Parsed fresh from this concept's own stored HTML on every render, not a fixed
  // per-template list — so a section already edited (or one a future template variant
  // adds or removes) always matches exactly what this concept actually has right now.
  const sections = listConceptSections(concept.html).map((s) => ({ key: s.key, label: s.label }));

  const isPublished = concept.publishStatus === "PUBLISHED";
  const publicUrl = concept.publishSlug ? `/p/${concept.publishSlug}` : null;

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-100">{concept.templateKey} concept</h1>
          <p className="text-sm text-neutral-400">
            <Link href={`/clients/${id}`} className="hover:text-neutral-300 hover:underline">
              ← Back to {concept.client.name}
            </Link>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href={`/api/clients/${id}/concepts/${conceptId}/download`}
            className="rounded-lg border border-neutral-700 px-4 py-2.5 text-sm text-neutral-200 transition hover:bg-neutral-900"
          >
            Download HTML
          </a>
          {isPublished ? (
            <form action={unpublishConcept.bind(null, id, conceptId)}>
              <SubmitButton
                pendingLabel="Unpublishing..."
                className="rounded-lg border border-neutral-700 px-4 py-2.5 text-sm text-neutral-200 transition hover:bg-neutral-900"
              >
                Unpublish
              </SubmitButton>
            </form>
          ) : (
            <form action={publishConcept.bind(null, id, conceptId)}>
              <SubmitButton
                pendingLabel="Publishing..."
                className="rounded-lg bg-yellow-400 px-4 py-2.5 text-sm font-medium text-neutral-900 transition hover:bg-yellow-300"
              >
                Publish
              </SubmitButton>
            </form>
          )}
        </div>
      </div>

      {isPublished && publicUrl && (
        <div className="mb-6 rounded-lg border border-yellow-700 bg-yellow-950/20 px-4 py-3 text-sm text-yellow-300">
          Live at{" "}
          <a href={publicUrl} target="_blank" rel="noreferrer" className="font-medium underline">
            {publicUrl}
          </a>{" "}
          — not indexed, safe to send in a cold email.
        </div>
      )}

      <div className="space-y-6">
        <PreviewFrame html={concept.html} />
        <ConceptSectionEditor clientId={id} conceptId={conceptId} sections={sections} />
      </div>
    </main>
  );
}
