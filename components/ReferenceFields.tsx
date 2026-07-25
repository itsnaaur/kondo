"use client";

import { useState } from "react";

type Row = { key: number; url: string; note: string };

export function ReferenceFields() {
  const [rows, setRows] = useState<Row[]>([]);
  const [nextKey, setNextKey] = useState(0);

  function addRow() {
    setRows((r) => [...r, { key: nextKey, url: "", note: "" }]);
    setNextKey((k) => k + 1);
  }

  function removeRow(key: number) {
    setRows((r) => r.filter((row) => row.key !== key));
  }

  function updateRow(key: number, field: "url" | "note", value: string) {
    setRows((r) => r.map((row) => (row.key === key ? { ...row, [field]: value } : row)));
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.key} className="flex gap-2">
          <input
            name="referenceUrl"
            value={row.url}
            onChange={(e) => updateRow(row.key, "url", e.target.value)}
            placeholder="https://inspiration-site.com"
            className="w-1/2 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-yellow-400"
          />
          <input
            name="referenceNote"
            value={row.note}
            onChange={(e) => updateRow(row.key, "note", e.target.value)}
            placeholder="What to follow — animation, layout, fonts..."
            className="flex-1 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-yellow-400"
          />
          <button
            type="button"
            onClick={() => removeRow(row.key)}
            className="rounded-lg border border-neutral-700 px-3 text-sm text-neutral-400 transition hover:text-neutral-200"
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addRow}
        className="rounded-lg border border-dashed border-neutral-700 px-4 py-2 text-sm text-neutral-400 transition hover:border-neutral-500 hover:text-neutral-200"
      >
        + Add reference site
      </button>
    </div>
  );
}
