import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { TopNav } from "@/components/TopNav";
import { AuditProgress } from "@/components/AuditProgress";
import { AuditNotesForm } from "@/components/AuditNotesForm";
import { GenerationProgress } from "@/components/GenerationProgress";
import { GenerationForm } from "@/components/GenerationForm";
import { STATUS_LABEL, ASSET_TYPE_LABEL, INTENT_LABEL } from "@/lib/labels";
import { startAudit } from "@/lib/actions/audit";
import type {
  TechnicalAudit,
  VisualDesignAudit,
  MotionInteractionAudit,
  ContentInventoryEntry,
  BrandToneAudit,
} from "@/lib/audit-types";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      assets: true,
      auditReport: true,
      references: true,
      createdBy: true,
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!client) notFound();

  const audit = client.auditReport;
  const technical = audit?.technical as TechnicalAudit | null | undefined;
  const visualDesign = audit?.visualDesign as VisualDesignAudit | null | undefined;
  const motionInteraction = audit?.motionInteraction as MotionInteractionAudit | null | undefined;
  const contentInventory = audit?.contentInventory as ContentInventoryEntry[] | null | undefined;
  const brandTone = audit?.brandTone as BrandToneAudit | null | undefined;

  return (
    <div className="min-h-screen bg-black">
      <TopNav />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-100">{client.name}</h1>
            <a
              href={client.siteUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-neutral-400 hover:text-neutral-200"
            >
              {client.siteUrl}
            </a>
            {client.createdBy && (
              <p className="mt-1 text-xs text-neutral-600">
                Added by {client.createdBy.email ?? client.createdBy.id}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <span className="rounded-full border border-neutral-700 px-3 py-1 text-xs text-neutral-300">
              {INTENT_LABEL[client.intent] ?? client.intent}
            </span>
            <span className="rounded-full border border-neutral-700 px-3 py-1 text-xs text-neutral-300">
              {STATUS_LABEL[client.status] ?? client.status}
            </span>
          </div>
        </div>

        <section className="mb-8">
          <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-neutral-500">
            Brief
          </h2>
          <p className="whitespace-pre-wrap rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-3 text-neutral-200">
            {client.briefText || "No brief provided."}
          </p>
        </section>

        {client.references.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-neutral-500">
              Inspiration / reference sites
            </h2>
            <ul className="space-y-1">
              {client.references.map((ref) => (
                <li
                  key={ref.id}
                  className="rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-2 text-sm"
                >
                  <a
                    href={ref.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-neutral-200 hover:underline"
                  >
                    {ref.url}
                  </a>
                  {ref.note && <p className="mt-0.5 text-neutral-500">{ref.note}</p>}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mb-8">
          <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-neutral-500">
            Assets
          </h2>
          {client.assets.length === 0 ? (
            <p className="text-sm text-neutral-500">No assets uploaded.</p>
          ) : (
            <ul className="space-y-1">
              {client.assets.map((asset) => (
                <li
                  key={asset.id}
                  className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-2 text-sm"
                >
                  <span className="text-neutral-200">{asset.filename}</span>
                  <span className="text-neutral-500">
                    {ASSET_TYPE_LABEL[asset.type] ?? asset.type}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mb-8">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-500">
            Audit
          </h2>

          {client.status === "DRAFT" && client.intent === "FACELIFT" && (
            <form action={startAudit.bind(null, client.id)}>
              <button
                type="submit"
                className="rounded-lg bg-yellow-400 px-5 py-2.5 font-medium text-neutral-900 transition hover:bg-yellow-300"
              >
                Run audit
              </button>
            </form>
          )}

          {client.status === "DRAFT" &&
            client.intent === "WORDPRESS_TRANSFER" &&
            (client.assets.some((a) => a.type === "PROJECT_ARCHIVE") ? (
              <form action={startAudit.bind(null, client.id)}>
                <button
                  type="submit"
                  className="rounded-lg bg-yellow-400 px-5 py-2.5 font-medium text-neutral-900 transition hover:bg-yellow-300"
                >
                  Run audit
                </button>
              </form>
            ) : (
              <p className="text-sm text-neutral-500">
                Upload a project archive (.zip) before running the audit.
              </p>
            ))}

          {client.status === "AUDITING" && <AuditProgress clientId={client.id} />}

          {audit && client.status !== "AUDITING" && client.status !== "DRAFT" && (
            <div className="space-y-6">
              <div className="rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-3">
                <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Technical
                </h3>
                <p className="text-sm text-neutral-200">
                  Platform: <span className="text-neutral-400">{technical?.platform}</span>
                </p>
                {!!technical?.pageBuilders.length && (
                  <p className="text-sm text-neutral-200">
                    Page builder:{" "}
                    <span className="text-neutral-400">{technical.pageBuilders.join(", ")}</span>
                  </p>
                )}
                <p className="text-sm text-neutral-200">
                  {client.intent === "WORDPRESS_TRANSFER" ? "HTML files found" : "Pages crawled"}:{" "}
                  <span className="text-neutral-400">
                    {technical?.pagesCrawled}
                    {technical?.crawlTruncated ? " (capped — larger site than the crawl limit)" : ""}
                  </span>
                </p>
                <p className="text-sm text-neutral-200">
                  Forms detected:{" "}
                  <span className="text-neutral-400">{technical?.formsDetected ? "Yes" : "No"}</span>
                </p>
              </div>

              <div className="rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-3">
                <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Visual design
                </h3>
                <p className="mb-1 text-sm text-neutral-400">Color palette</p>
                <div className="mb-3 flex flex-wrap gap-2">
                  {visualDesign?.colorPalette.map((c) => (
                    <div
                      key={c.value}
                      title={`${c.value} (${c.count}×)`}
                      className="h-8 w-8 rounded border border-neutral-700"
                      style={{ backgroundColor: c.value }}
                    />
                  ))}
                </div>
                <p className="mb-1 text-sm text-neutral-400">Typography</p>
                <p className="text-sm text-neutral-200">
                  {visualDesign?.typography.map((t) => t.value).join(" · ") || "—"}
                </p>
              </div>

              <div className="rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-3">
                <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Motion &amp; interaction
                </h3>
                <p className="text-sm text-neutral-200">
                  {motionInteraction?.animationLibraries.length
                    ? motionInteraction.animationLibraries.join(", ")
                    : "No animation libraries detected"}
                </p>
              </div>

              <div className="rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-3">
                <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Brand tone &amp; emotion
                </h3>
                {brandTone ? (
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-1.5">
                      {brandTone.personality.map((p) => (
                        <span
                          key={p}
                          className="rounded-full border border-neutral-700 px-2.5 py-0.5 text-xs text-neutral-300"
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                    <p className="text-sm text-neutral-200">
                      Voice: <span className="text-neutral-400">{brandTone.voice}</span>
                    </p>
                    <p className="text-sm text-neutral-200">
                      Feels like:{" "}
                      <span className="text-neutral-400">{brandTone.emotionalImpression}</span>
                    </p>
                    <p className="text-sm text-neutral-400">{brandTone.summary}</p>
                  </div>
                ) : (
                  <p className="text-sm text-neutral-500">
                    Could not be analyzed for this client (no content/screenshots available, or the
                    analysis step failed).
                  </p>
                )}
              </div>

              <div className="rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-3">
                <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Content inventory ({contentInventory?.length ?? 0} pages)
                </h3>
                <ul className="max-h-48 space-y-1 overflow-y-auto text-sm">
                  {contentInventory?.slice(0, 20).map((p) => (
                    <li key={p.url} className="truncate text-neutral-400">
                      {p.title || p.url}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Review notes
                </h3>
                <AuditNotesForm auditReportId={audit.id} initialNotes={audit.reviewNotes ?? ""} />
              </div>
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-500">
            Conversation
          </h2>
          <p className="mb-3 text-xs text-neutral-500">
            Generating and every refinement after it happen here, as one running
            conversation — the AI keeps full context of what it already built for this
            client.
          </p>

          {client.messages.length > 0 && (
            <ul className="mb-4 space-y-2">
              {client.messages.map((message) => (
                <li
                  key={message.id}
                  className={`rounded-lg border px-4 py-2 text-sm ${
                    message.role === "user"
                      ? "border-neutral-700 bg-neutral-900 text-neutral-200"
                      : "border-neutral-800 bg-neutral-950 text-neutral-300"
                  }`}
                >
                  <p className="mb-0.5 text-xs uppercase tracking-wide text-neutral-500">
                    {message.role === "user" ? "Prompt" : "Kondo"}
                  </p>
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </li>
              ))}
            </ul>
          )}

          {client.status === "GENERATING" && <GenerationProgress clientId={client.id} />}

          {client.status === "READY_FOR_REVIEW" && (
            <div className="space-y-3">
              <div className="flex gap-3">
                {client.intent === "FACELIFT" && (
                  <a
                    href={`/api/clients/${client.id}/preview/index.html`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-200 transition hover:border-neutral-500"
                  >
                    Open preview ↗
                  </a>
                )}
                <a
                  href={`/api/clients/${client.id}/export`}
                  className="inline-block rounded-lg bg-yellow-400 px-4 py-2 text-sm font-medium text-neutral-900 transition hover:bg-yellow-300"
                >
                  {client.intent === "WORDPRESS_TRANSFER" ? "Download theme zip" : "Download zip"}
                </a>
              </div>
              {client.intent === "WORDPRESS_TRANSFER" && (
                <p className="text-xs text-neutral-500">
                  No live preview for WordPress themes — install the zip on a WP site via Appearance →
                  Themes → Add New → Upload Theme to see it rendered.
                </p>
              )}
              <GenerationForm clientId={client.id} isRefinement />
            </div>
          )}

          {client.status === "AUDIT_READY" && (
            <GenerationForm clientId={client.id} isRefinement={false} />
          )}
        </section>
      </main>
    </div>
  );
}
