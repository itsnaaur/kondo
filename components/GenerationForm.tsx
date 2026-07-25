import { startGeneration } from "@/lib/actions/generation";

export function GenerationForm({
  clientId,
  isRefinement,
}: {
  clientId: string;
  isRefinement: boolean;
}) {
  return (
    <form action={startGeneration.bind(null, clientId)} className="space-y-2">
      <textarea
        name="prompt"
        rows={3}
        placeholder={
          isRefinement
            ? "Describe what to change..."
            : "Optional — anything specific for this first pass (leave blank to use the brief as-is)"
        }
        className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-yellow-400"
      />
      <button
        type="submit"
        className="rounded-lg bg-yellow-400 px-5 py-2.5 font-medium text-neutral-900 transition hover:bg-yellow-300"
      >
        {isRefinement ? "Send refinement" : "Generate"}
      </button>
    </form>
  );
}
