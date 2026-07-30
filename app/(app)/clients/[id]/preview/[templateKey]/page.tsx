import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { toTemplateContent } from "@/lib/content/to-template-content";
import { renderTemplateToHtml, isValidTemplateKey, TEMPLATE_LIST } from "@/lib/templates/registry";
import { createConcept } from "@/lib/actions/concepts";
import { PreviewFrame } from "@/components/PreviewFrame";
import { SubmitButton } from "@/components/SubmitButton";

export default async function GenerateAndPreviewPage({
  params,
}: {
  params: Promise<{ id: string; templateKey: string }>;
}) {
  const { id, templateKey } = await params;
  if (!isValidTemplateKey(templateKey)) notFound();

  const client = await prisma.client.findUnique({
    where: { id },
    include: { contentRecord: true, assets: true },
  });

  if (!client) notFound();
  if (!client.contentRecord?.reviewedAt) redirect(`/clients/${id}`);

  const templateContent = toTemplateContent(client.contentRecord, client.assets);
  const html = renderTemplateToHtml(templateKey, templateContent);
  const label = TEMPLATE_LIST.find((t) => t.key === templateKey)?.label ?? templateKey;

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-100">{label}</h1>
          <p className="text-sm text-neutral-400">
            <Link href={`/clients/${id}/templates`} className="hover:text-neutral-300 hover:underline">
              ← Try a different template
            </Link>
          </p>
        </div>
        <form action={createConcept.bind(null, id, templateKey)}>
          <SubmitButton
            pendingLabel="Generating..."
            className="rounded-lg bg-yellow-400 px-5 py-2.5 font-medium text-neutral-900 transition hover:bg-yellow-300"
          >
            Generate Concept
          </SubmitButton>
        </form>
      </div>

      <PreviewFrame html={html} />
    </main>
  );
}
