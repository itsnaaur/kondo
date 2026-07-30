import Link from "next/link";

type TemplateGalleryProps = {
  clientId: string;
  templates: { key: string; label: string; html: string }[];
  defaultKey: string;
};

// Every card's HTML was rendered by the exact same renderTemplateToHtml() call used by
// the full preview and the publish route — no separate thumbnail/screenshot pipeline, so
// switching templates costs nothing beyond this cheap iframe scale-down. No allow-scripts
// on the sandbox: both templates are static markup with no inline JS, so the strictest
// sandbox is free.
export function TemplateGallery({ clientId, templates, defaultKey }: TemplateGalleryProps) {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {templates.map((t) => (
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
          <div className="flex items-center justify-between border-t border-neutral-800 bg-neutral-950 px-4 py-3">
            <span className="text-sm font-medium text-neutral-200">{t.label}</span>
            {t.key === defaultKey && <span className="text-xs text-yellow-400">Suggested</span>}
          </div>
        </Link>
      ))}
    </div>
  );
}
