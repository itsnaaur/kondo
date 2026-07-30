import { createClient } from "@/lib/actions/clients";
import { SubmitButton } from "@/components/SubmitButton";

export default function NewClientPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="mb-1 text-2xl font-semibold text-neutral-100">Add client</h1>
      <p className="mb-8 text-sm text-neutral-400">
        A name and their current site. Everything else happens on the client&apos;s page.
      </p>

      <form action={createClient} className="space-y-6">
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-300">Client name</label>
          <input
            name="name"
            required
            placeholder="Acme Co."
            className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-yellow-400"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-300">Current site URL</label>
          <input
            name="siteUrl"
            type="url"
            required
            placeholder="https://theirsite.com"
            className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-yellow-400"
          />
        </div>

        <SubmitButton
          pendingLabel="Adding..."
          className="rounded-lg bg-yellow-400 px-5 py-2.5 font-medium text-neutral-900 transition hover:bg-yellow-300"
        >
          Add client
        </SubmitButton>
      </form>
    </main>
  );
}
