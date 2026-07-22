"use client";

import { useState, useTransition } from "react";
import { saveAuditNotes } from "@/lib/actions/audit";

export function AuditNotesForm({
  auditReportId,
  initialNotes,
}: {
  auditReportId: string;
  initialNotes: string;
}) {
  const [notes, setNotes] = useState(initialNotes);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(false);
    startTransition(async () => {
      await saveAuditNotes(auditReportId, notes);
      setSaved(true);
    });
  }

  return (
    <div>
      <textarea
        value={notes}
        onChange={(e) => {
          setNotes(e.target.value);
          setSaved(false);
        }}
        rows={4}
        placeholder="Correct or annotate the audit findings before generating..."
        className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-yellow-400"
      />
      <div className="mt-2 flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="rounded-lg bg-neutral-800 px-4 py-1.5 text-sm font-medium text-neutral-200 transition hover:bg-neutral-700 disabled:opacity-60"
        >
          {isPending ? "Saving..." : "Save notes"}
        </button>
        {saved && <span className="text-sm text-neutral-500">Saved</span>}
      </div>
    </div>
  );
}
