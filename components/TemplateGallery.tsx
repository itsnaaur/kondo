import Link from "next/link";

type TemplateStatus = "recommended" | "works" | "not-suited";

type TemplateGalleryProps = {
  clientId: string;
  templates: { key: string; label: string; html: string; status: TemplateStatus; reason?: string }[];
  defaultKey: string;
};

const STATUS_RANK: Record<TemplateStatus, number> = { recommended: 0, works: 1, "not-suited": 2 };

// Every card's HTML was rendered by the exact same renderTemplateToHtml() call used by
// the full preview and the publish route — no separate thumbnail/screenshot pipeline, so
// switching templates costs nothing beyond this cheap iframe scale-down. No allow-scripts
// on the sandbox: both templates are static markup with no inline JS, so the strictest
// sandbox is free.
export function TemplateGallery({ clientId, templates, defaultKey }: TemplateGalleryProps) {
  // Sorted by suitability, not declaration order — a "not-suited" card sitting at the top
  // defeats the point of labeling it at all. Within a tied status, the pre-selected
  // (defaultKey) card comes first — otherwise two "Recommended" cards can appear with the
  // highlighted one second, which reads as if the wrong card were chosen.
  const sorted = [...templates].sort((a, b) => {
    const statusDiff = STATUS_RANK[a.status] - STATUS_RANK[b.status];
    if (statusDiff !== 0) return statusDiff;
    return (a.key === defaultKey ? 0 : 1) - (b.key === defaultKey ? 0 : 1);
  });

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {sorted.map((t) => (
        <Link
          key={t.key}
          href={`/clients/${clientId}/preview/${t.key}`}
          className={`group block overflow-hidden rounded-xl border transition ${
            t.key === defaultKey ? "border-yellow-400" : "border-neutral-800 hover:border-neutral-600"
          }`}
        >
          <div className="relative h-56 overflow-hidden bg-white">
            <iframe
              srcDoc={t.html}
              sandbox=""
              scrolling="no"
              title={t.label}
              style={{
                width: "1200px",
                height: "1800px",
                transform: "scale(0.3)",
                transformOrigin: "top left",
                border: "none",
                pointerEvents: "none",
              }}
            />
          </div>
          <div className="border-t border-neutral-800 bg-neutral-950 px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-neutral-200">{t.label}</span>
              {/* Every template stays fully selectable regardless of status — this is
                  advice, not a lock. A "works" card gets no badge at all; absence of a
                  badge is itself the signal, per the spec, so it isn't rendered here. */}
              {t.status === "recommended" && (
                <span className="rounded-full bg-yellow-400/10 px-2 py-0.5 text-xs font-medium text-yellow-400">
                  Recommended
                </span>
              )}
              {t.status === "not-suited" && (
                <span className="rounded-full bg-red-400/10 px-2 py-0.5 text-xs font-medium text-red-400">
                  Not suited
                </span>
              )}
            </div>
            {t.status === "not-suited" && t.reason && (
              <p className="mt-1 text-xs text-neutral-500">{t.reason}</p>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
