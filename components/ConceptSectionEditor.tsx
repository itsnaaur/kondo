"use client";

import { useActionState } from "react";
import { editConceptSection, type SectionEditState } from "@/lib/actions/concepts";
import { SubmitButton } from "@/components/SubmitButton";

type Section = { key: string; label: string };

// Deliberately no local state for the preview HTML itself — the parent page passes
// `initialHtml` straight through to PreviewFrame from the server-rendered Concept row, and
// Next's own action-triggered refresh (see editConceptSection's revalidatePath) re-fetches
// that prop automatically once the edit lands, the same way every other Save flow in this
// app already works. This component only owns the form's pending/error/success state.
export function ConceptSectionEditor({
  clientId,
  conceptId,
  sections,
}: {
  clientId: string;
  conceptId: string;
  sections: Section[];
}) {
  const [state, formAction] = useActionState<SectionEditState, FormData>(
    editConceptSection.bind(null, clientId, conceptId),
    null
  );

  if (sections.length === 0) return null;

  return (
    <section className="rounded-xl border border-neutral-800 bg-neutral-950 p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium text-neutral-100">Edit a section</h2>
          <p className="mt-1 text-xs text-neutral-500">
            Applies to this concept only — the template and every other client using it are
            unaffected.
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-yellow-700/60 bg-yellow-950/20 px-2.5 py-1 text-[11px] font-medium text-yellow-400">
          Experimental
        </span>
      </div>

      <form action={formAction} className="space-y-3">
        <div>
          <label htmlFor="sectionKey" className="mb-1 block text-xs font-medium text-neutral-400">
            Section
          </label>
          <select
            id="sectionKey"
            name="sectionKey"
            defaultValue={sections[0].key}
            className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-yellow-400"
          >
            {sections.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="instruction" className="mb-1 block text-xs font-medium text-neutral-400">
            What do you want to change?
          </label>
          <textarea
            id="instruction"
            name="instruction"
            rows={3}
            placeholder="e.g. Arrange this section as a grid of cards instead of plain text."
            className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-yellow-400"
          />
        </div>

        {state && "error" in state && (
          <p className="rounded-lg border border-red-700/60 bg-red-950/30 px-3 py-2 text-sm text-red-300">
            {state.error}
          </p>
        )}
        {state && "success" in state && (
          <p className="rounded-lg border border-green-700/60 bg-green-950/20 px-3 py-2 text-sm text-green-300">
            Section updated — the preview above reflects the change. Review it before
            publishing.
          </p>
        )}

        <SubmitButton
          pendingLabel="Applying..."
          className="rounded-lg bg-yellow-400 px-4 py-2 text-sm font-medium text-neutral-900 transition hover:bg-yellow-300"
        >
          Apply to this concept
        </SubmitButton>
      </form>
    </section>
  );
}
