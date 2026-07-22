import { createClient } from "@/lib/actions/clients";
import { AssetDropzone } from "@/components/AssetDropzone";
import { TopNav } from "@/components/TopNav";

export default function NewClientPage() {
  return (
    <div className="min-h-screen bg-black">
      <TopNav />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="mb-1 text-2xl font-semibold text-neutral-100">New client</h1>
        <p className="mb-8 text-sm text-neutral-400">
          Set up a client folder, drop their brief and assets, then run the audit.
        </p>

        <form action={createClient} className="space-y-8">
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-300">
              Client name
            </label>
            <input
              name="name"
              required
              placeholder="Acme Co."
              className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-yellow-400"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-300">
              Current site URL
            </label>
            <input
              name="siteUrl"
              type="url"
              required
              placeholder="https://theirsite.com"
              className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-yellow-400"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-300">
              Facelift preferences / brief
            </label>
            <textarea
              name="briefText"
              rows={6}
              placeholder="What do they want kept, changed, tone, inspiration sites, anything explicit..."
              className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-yellow-400"
            />
          </div>

          <div>
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-500">
              Assets
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <AssetDropzone label="Logo(s)" name="logoFiles" />
              <AssetDropzone label="Brand guide" name="brandGuideFiles" />
              <AssetDropzone label="Case studies" name="caseStudyFiles" />
              <AssetDropzone label="Other assets" name="otherFiles" />
            </div>
          </div>

          <button
            type="submit"
            className="rounded-lg bg-yellow-400 px-5 py-2.5 font-medium text-neutral-900 transition hover:bg-yellow-300"
          >
            Create client
          </button>
        </form>
      </main>
    </div>
  );
}
