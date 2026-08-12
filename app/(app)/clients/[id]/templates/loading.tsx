// Choose Template renders and suitability-scores every registered template synchronously
// in one request (see page.tsx's own comment) — the heaviest single page-load in the app.
// Without this, that render time showed as a blank tab.
export default function ChooseTemplateLoading() {
  return (
    <main className="mx-auto max-w-5xl animate-pulse px-6 py-10">
      <div className="mb-8 space-y-2">
        <div className="h-7 w-56 rounded bg-neutral-900" />
        <div className="h-3 w-72 rounded bg-neutral-900" />
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-2">
            <div className="aspect-[4/3] rounded-xl bg-neutral-950" />
            <div className="h-4 w-24 rounded bg-neutral-900" />
          </div>
        ))}
      </div>
    </main>
  );
}
