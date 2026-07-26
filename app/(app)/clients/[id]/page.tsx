import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { GenerationProgress } from "@/components/GenerationProgress";
import { GenerationForm } from "@/components/GenerationForm";
import { MessageList } from "@/components/MessageList";
import { ClientBriefPanel } from "@/components/ClientBriefPanel";
import { STATUS_LABEL, INTENT_LABEL } from "@/lib/labels";
import { moveToTrash } from "@/lib/actions/trash";
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

  const hasConversationStarted = client.messages.length > 0;

  const briefPanelProps = {
    clientId: client.id,
    status: client.status,
    intent: client.intent,
    briefText: client.briefText,
    assets: client.assets,
    references: client.references,
    audit,
    technical,
    visualDesign,
    motionInteraction,
    contentInventory,
    brandTone,
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-shrink-0 items-start justify-between border-b border-neutral-800 px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold text-neutral-100">{client.name}</h1>
          <p className="text-sm text-neutral-400">
            <a href={client.siteUrl} target="_blank" rel="noreferrer" className="hover:text-neutral-200">
              {client.siteUrl}
            </a>
            {client.createdBy && (
              <span className="text-neutral-600">
                {" "}
                | Added by {client.createdBy.email ?? client.createdBy.id}
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex gap-2">
            <span className="rounded-full border border-neutral-700 px-3 py-1 text-xs text-neutral-300">
              {INTENT_LABEL[client.intent] ?? client.intent}
            </span>
            <span className="rounded-full border border-neutral-700 px-3 py-1 text-xs text-neutral-300">
              {STATUS_LABEL[client.status] ?? client.status}
            </span>
          </div>
          <form action={moveToTrash.bind(null, client.id)}>
            <button type="submit" className="text-xs text-neutral-500 transition hover:text-red-400">
              Move to trash
            </button>
          </form>
        </div>
      </div>

      {hasConversationStarted ? (
        <div className="flex min-h-0 flex-1">
          {/* Conversation — main pane, sits beside the sidebar */}
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex-shrink-0 px-6 pb-2 pt-4">
              <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500">
                Conversation
              </h2>
            </div>

            <MessageList messages={client.messages} />

            <div className="flex-shrink-0 border-t border-neutral-800 px-6 py-4">
              {client.status === "GENERATING" && <GenerationProgress clientId={client.id} />}

              {client.status === "READY_FOR_REVIEW" && (
                <div className="space-y-3">
                  <div className="flex gap-3">
                    {client.intent === "FACELIFT" && (
                      <a
                        href={`/api/clients/${client.id}/preview/index.html`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-block rounded-lg border border-neutral-700 px-3 py-1.5 text-sm text-neutral-200 transition hover:border-neutral-500"
                      >
                        Open preview ↗
                      </a>
                    )}
                    <a
                      href={`/api/clients/${client.id}/export`}
                      className="inline-block rounded-lg bg-yellow-400 px-3 py-1.5 text-sm font-medium text-neutral-900 transition hover:bg-yellow-300"
                    >
                      {client.intent === "WORDPRESS_TRANSFER" ? "Download theme zip" : "Download zip"}
                    </a>
                  </div>
                  {client.intent === "WORDPRESS_TRANSFER" && (
                    <p className="text-xs text-neutral-500">
                      No live preview for WordPress themes — install the zip on a WP site via
                      Appearance → Themes → Add New → Upload Theme to see it rendered.
                    </p>
                  )}
                  <GenerationForm clientId={client.id} isRefinement />
                </div>
              )}

              {client.status === "AUDIT_READY" && (
                <GenerationForm clientId={client.id} isRefinement={false} />
              )}

              {client.status !== "GENERATING" &&
                client.status !== "READY_FOR_REVIEW" &&
                client.status !== "AUDIT_READY" && (
                  <p className="text-sm text-neutral-600">
                    Conversation starts once the audit is ready and the first generation runs.
                  </p>
                )}
            </div>
          </div>

          {/* Brief, audit, assets, references — secondary pane */}
          <div className="w-[400px] flex-shrink-0 overflow-y-auto border-l border-neutral-800 px-6 py-6">
            <ClientBriefPanel {...briefPanelProps} />
          </div>
        </div>
      ) : (
        // No conversation yet — the audit/brief is the main thing to act on, so give it
        // the full width instead of squeezing it into the narrow side rail.
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-8">
          <div className="mx-auto w-full max-w-2xl">
            <ClientBriefPanel {...briefPanelProps} emphasizeRunAudit />
            {client.status === "AUDIT_READY" && (
              <section>
                <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-500">
                  Generate the first version
                </h2>
                <GenerationForm clientId={client.id} isRefinement={false} />
              </section>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
