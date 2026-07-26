import { AuditProgress } from "@/components/AuditProgress";
import { AuditNotesForm } from "@/components/AuditNotesForm";
import { ExpandableText } from "@/components/ExpandableText";
import { ASSET_TYPE_LABEL } from "@/lib/labels";
import { startAudit } from "@/lib/actions/audit";
import type {
  TechnicalAudit,
  VisualDesignAudit,
  MotionInteractionAudit,
  ContentInventoryEntry,
  BrandToneAudit,
} from "@/lib/audit-types";

type ClientBriefPanelProps = {
  clientId: string;
  status: string;
  intent: string;
  briefText: string | null;
  assets: Array<{ id: string; filename: string; type: string }>;
  references: Array<{ id: string; url: string; note: string | null }>;
  audit: {
    id: string;
    findingsSummary: string | null;
    briefUnderstanding: string | null;
    reviewNotes: string | null;
  } | null;
  technical: TechnicalAudit | null | undefined;
  visualDesign: VisualDesignAudit | null | undefined;
  motionInteraction: MotionInteractionAudit | null | undefined;
  contentInventory: ContentInventoryEntry[] | null | undefined;
  brandTone: BrandToneAudit | null | undefined;
  /** Bigger CTA button when this panel is the primary/wide display (pre-conversation). */
  emphasizeRunAudit?: boolean;
};

export function ClientBriefPanel({
  clientId,
  status,
  intent,
  briefText,
  assets,
  references,
  audit,
  technical,
  visualDesign,
  motionInteraction,
  contentInventory,
  brandTone,
  emphasizeRunAudit = false,
}: ClientBriefPanelProps) {
  const runAuditButtonClass = emphasizeRunAudit
    ? "rounded-lg bg-yellow-400 px-8 py-4 text-base font-medium text-neutral-900 transition hover:bg-yellow-300"
    : "rounded-lg bg-yellow-400 px-5 py-2.5 font-medium text-neutral-900 transition hover:bg-yellow-300";

  return (
    <>
      <section className="mb-8">
        <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-neutral-500">
          Brief
        </h2>
        {briefText ? (
          <ExpandableText
            text={briefText}
            className="rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-3 text-neutral-200"
          />
        ) : (
          <p className="rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-3 text-neutral-500">
            No brief provided.
          </p>
        )}
      </section>

      {references.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-neutral-500">
            Inspiration / reference sites
          </h2>
          <ul className="space-y-1">
            {references.map((ref) => (
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
        {assets.length === 0 ? (
          <p className="text-sm text-neutral-500">No assets uploaded.</p>
        ) : (
          <ul className="space-y-1">
            {assets.map((asset) => (
              <li
                key={asset.id}
                className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-2 text-sm"
              >
                <span className="truncate text-neutral-200">{asset.filename}</span>
                <span className="flex-shrink-0 text-neutral-500">
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

        {status === "DRAFT" && intent === "FACELIFT" && (
          <form action={startAudit.bind(null, clientId)}>
            <button type="submit" className={runAuditButtonClass}>
              Run audit
            </button>
          </form>
        )}

        {status === "DRAFT" &&
          intent === "WORDPRESS_TRANSFER" &&
          (assets.some((a) => a.type === "PROJECT_ARCHIVE") ? (
            <form action={startAudit.bind(null, clientId)}>
              <button type="submit" className={runAuditButtonClass}>
                Run audit
              </button>
            </form>
          ) : (
            <p className="text-sm text-neutral-500">
              Upload a project archive (.zip) before running the audit.
            </p>
          ))}

        {status === "AUDITING" && <AuditProgress clientId={clientId} />}

        {audit && status !== "AUDITING" && status !== "DRAFT" && (
          <div className="space-y-6">
            <div className="rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-3">
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
                What we found
              </h3>
              <p className="text-sm text-neutral-200">
                {audit.findingsSummary || "Not available for this audit."}
              </p>
            </div>

            {briefText && (
              <div className="rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-3">
                <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Understanding your brief
                </h3>
                <p className="text-sm text-neutral-200">
                  {audit.briefUnderstanding ||
                    "Not available — the brief wasn't cross-referenced against the audit."}
                </p>
              </div>
            )}

            <details className="group">
              <summary className="cursor-pointer text-sm font-medium uppercase tracking-wide text-neutral-500 hover:text-neutral-300">
                Full audit details
              </summary>
              <div className="mt-4 space-y-6">
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
                      <span className="text-neutral-400">
                        {technical.pageBuilders.join(", ")}
                      </span>
                    </p>
                  )}
                  <p className="text-sm text-neutral-200">
                    {intent === "WORDPRESS_TRANSFER" ? "HTML files found" : "Pages crawled"}:{" "}
                    <span className="text-neutral-400">
                      {technical?.pagesCrawled}
                      {technical?.crawlTruncated
                        ? " (capped — larger site than the crawl limit)"
                        : ""}
                    </span>
                  </p>
                  <p className="text-sm text-neutral-200">
                    Forms detected:{" "}
                    <span className="text-neutral-400">
                      {technical?.formsDetected ? "Yes" : "No"}
                    </span>
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
                      Could not be analyzed for this client (no content/screenshots available, or
                      the analysis step failed).
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
              </div>
            </details>

            <div>
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
                Review notes
              </h3>
              <AuditNotesForm auditReportId={audit.id} initialNotes={audit.reviewNotes ?? ""} />
            </div>
          </div>
        )}
      </section>
    </>
  );
}
