// Shown while the client workspace page's server-side data (client + contentRecord +
// assets + concepts, all in one query) is still loading — without this, navigating here
// showed a blank tab until everything resolved, the most data-heavy page-load in the app
// besides Choose Template.
export default function ClientWorkspaceLoading() {
  return (
    <main className="mx-auto max-w-4xl animate-pulse px-6 py-10">
      <div className="mb-8 flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-7 w-48 rounded bg-neutral-900" />
          <div className="h-3 w-32 rounded bg-neutral-900" />
        </div>
        <div className="h-6 w-24 rounded-full bg-neutral-900" />
      </div>
      <div className="space-y-4">
        <div className="h-16 rounded-lg bg-neutral-950" />
        <div className="h-40 rounded-xl bg-neutral-950" />
        <div className="h-40 rounded-xl bg-neutral-950" />
      </div>
    </main>
  );
}
