import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { toTemplateContent } from "@/lib/content/to-template-content";
import { TEMPLATE_LIST, renderTemplateToHtml, pickDefaultTemplate } from "@/lib/templates/registry";
import { TemplateGallery } from "@/components/TemplateGallery";

// Requires contentRecord.reviewedAt != null (not Client.status — see the Kondo rebuild
// plan's gating notes). Every template is rendered synchronously in this one request via
// the exact same renderTemplateToHtml() call the full preview and publish route use —
// deterministic, no AI, no Playwright — which is what makes trying every template
// "5 seconds, zero API calls."
export default async function ChooseTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const client = await prisma.client.findUnique({
    where: { id },
    include: { contentRecord: true, assets: true },
  });

  if (!client) notFound();
  if (!client.contentRecord?.reviewedAt) redirect(`/clients/${id}`);

  const templateContent = toTemplateContent(client.contentRecord, client.assets);
  const defaultKey = pickDefaultTemplate(client.contentRecord.detectedIndustry);

  const templates = TEMPLATE_LIST.map((meta) => ({
    key: meta.key,
    label: meta.label,
    html: renderTemplateToHtml(meta.key, templateContent),
  }));

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-100">Choose a template</h1>
          <p className="text-sm text-neutral-400">Populated with {client.name}&apos;s real content.</p>
        </div>
        <Link href={`/clients/${id}`} className="text-sm text-neutral-500 hover:text-neutral-300">
          ← Back
        </Link>
      </div>

      <TemplateGallery clientId={id} templates={templates} defaultKey={defaultKey} />
    </main>
  );
}
