import Link from "next/link";

export type ConceptHistoryItem = {
  id: string;
  templateKey: string;
  createdAt: Date;
  createdByEmail: string | null;
  publishSlug: string | null;
  publishStatus: string;
};

// A record of what already happened — visible whenever concepts.length > 0, regardless
// of Client.status or contentRecord.reviewedAt (see the Client Workspace page). A
// follow-up sent last Friday must still be findable here even mid-re-analysis.
export function ConceptHistoryList({
  clientId,
  concepts,
}: {
  clientId: string;
  concepts: ConceptHistoryItem[];
}) {
  if (concepts.length === 0) {
    return <p className="text-sm text-neutral-500">No concepts generated yet.</p>;
  }

  return (
    <ul className="space-y-2">
      {concepts.map((c) => (
        <li
          key={c.id}
          className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-3"
        >
          <div className="min-w-0">
            <Link href={`/clients/${clientId}/concepts/${c.id}`} className="font-medium text-neutral-100 hover:underline">
              {c.templateKey}
            </Link>
            <p className="truncate text-xs text-neutral-500">
              {c.createdAt.toLocaleDateString()} · {c.createdByEmail ?? "unknown"} ·{" "}
              {c.publishStatus === "PUBLISHED" ? "Published" : c.publishStatus === "UNPUBLISHED" ? "Unpublished" : "Draft"}
            </p>
          </div>
          {c.publishStatus === "PUBLISHED" && c.publishSlug && (
            <a
              href={`/p/${c.publishSlug}`}
              target="_blank"
              rel="noreferrer"
              className="flex-shrink-0 text-sm text-yellow-400 hover:underline"
            >
              View link
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}
