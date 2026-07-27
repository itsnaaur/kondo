import { approveInterpretedBrief, regenerateInterpretedBrief } from "@/lib/actions/generation";
import type { InterpretedBrief } from "@/lib/generation/interpreted-brief-types";

export function InterpretedBriefReview({
  clientId,
  brief,
  failedReferenceUrls = [],
}: {
  clientId: string;
  brief: InterpretedBrief;
  failedReferenceUrls?: string[];
}) {
  return (
    <div className="space-y-6">
      {failedReferenceUrls.length > 0 && (
        <div className="rounded-lg border border-red-700 bg-red-950/30 px-4 py-3">
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-red-400">
            {failedReferenceUrls.length} reference{failedReferenceUrls.length === 1 ? "" : "s"} failed to
            capture — this interpretation is incomplete
          </h3>
          <ul className="mb-2 list-inside list-disc text-sm text-red-200">
            {failedReferenceUrls.map((url) => (
              <li key={url}>{url}</li>
            ))}
          </ul>
          <p className="text-sm text-red-300/80">
            These were dropped entirely rather than considered — the interpretation below was built
            without them. Confirm the URLs are reachable and reject to try again, or approve knowing
            this reference was excluded.
          </p>
        </div>
      )}

      {brief.conflicts.length > 0 && (
        <div className="rounded-lg border border-yellow-600/60 bg-yellow-950/20 px-4 py-3">
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-yellow-500">
            Conflicts ({brief.conflicts.length}) — resolve before approving
          </h3>
          <ul className="space-y-3">
            {brief.conflicts.map((c, i) => (
              <li key={i} className="text-sm">
                <p className="text-neutral-200">
                  {c.between.join(" vs. ")}: <span className="text-neutral-300">{c.description}</span>
                </p>
                <p className="mt-1 text-neutral-400">
                  Leaning: <span className="text-neutral-300">{c.leaning}</span> —{" "}
                  <span className="text-neutral-500">{c.why}</span>
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-3">
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
          What this business is
        </h3>
        <p className="text-sm text-neutral-200">{brief.subject.business}</p>
        <p className="mt-1 text-sm text-neutral-400">
          Audience: <span className="text-neutral-300">{brief.subject.audience}</span>
        </p>
        <p className="text-sm text-neutral-400">{brief.subject.what_they_actually_do}</p>
        <p className="mt-2 text-sm text-neutral-400">
          This page&apos;s job: <span className="text-neutral-300">{brief.page_job}</span>
        </p>
      </div>

      <div className="rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-3">
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
          Target qualities
        </h3>
        <div className="space-y-3">
          {brief.target_qualities.map((q, i) => (
            <div key={i} className="text-sm">
              <p className="text-neutral-200">
                &ldquo;{q.client_word}&rdquo; <span className="text-neutral-600">({q.source})</span>
              </p>
              <p className="text-neutral-400">Means: {q.what_they_mean}</p>
              <p className="text-neutral-500">Mechanism: {q.mechanism}</p>
            </div>
          ))}
        </div>
      </div>

      {brief.moving_away_from.length > 0 && (
        <div className="rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-3">
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
            Moving away from
          </h3>
          <ul className="space-y-2">
            {brief.moving_away_from.map((m, i) => (
              <li key={i} className="text-sm text-neutral-400">
                <span className="text-neutral-200">{m.signal}</span> —{" "}
                <span className="text-neutral-500">{m.evidence}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {brief.carry_forward.length > 0 && (
        <div className="rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-3">
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
            Carry forward
          </h3>
          <ul className="space-y-2">
            {brief.carry_forward.map((c, i) => (
              <li key={i} className="text-sm text-neutral-400">
                <span className="text-neutral-200">{c.asset}</span>
                {c.binding && (
                  <span className="ml-2 rounded-full border border-red-800 px-2 py-0.5 text-xs text-red-400">
                    binding
                  </span>
                )}{" "}
                — <span className="text-neutral-500">{c.reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {brief.resolved.length > 0 && (
        <div className="rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-3">
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
            Resolved automatically ({brief.resolved.length})
          </h3>
          <ul className="space-y-3">
            {brief.resolved.map((r, i) => (
              <li key={i} className="text-sm">
                <p className="text-neutral-300">{r.between.join(" vs. ")}</p>
                <p className="mt-1 text-neutral-400">{r.resolution}</p>
                <p className="mt-1 text-neutral-600">Rule applied: {r.rule}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-3">
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
          Content reality
        </h3>
        <p className="text-sm text-neutral-200">
          Volume: <span className="text-neutral-300">{brief.content_reality.volume}</span> · Supports
          ambition:{" "}
          <span className="text-neutral-300">
            {brief.content_reality.supports_ambition ? "yes" : "no"}
          </span>
        </p>
        <p className="mt-1 text-sm text-neutral-500">{brief.content_reality.note}</p>
      </div>

      <div className="rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-3">
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
          Confidence
        </h3>
        <p className="text-sm text-neutral-200">{brief.confidence.level}</p>
        {brief.confidence.gaps.length > 0 && (
          <ul className="mt-1 list-inside list-disc text-sm text-neutral-500">
            {brief.confidence.gaps.map((g, i) => (
              <li key={i}>{g}</li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
          Full interpreted brief (edit before approving if needed)
        </h3>
        <form action={approveInterpretedBrief.bind(null, clientId)} className="space-y-3">
          <textarea
            name="brief"
            rows={16}
            defaultValue={JSON.stringify(brief, null, 2)}
            className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 font-mono text-xs text-neutral-200 outline-none focus:border-yellow-400"
          />
          <div className="flex gap-3">
            <button
              type="submit"
              className="rounded-lg bg-yellow-400 px-5 py-2.5 font-medium text-neutral-900 transition hover:bg-yellow-300"
            >
              Approve &amp; continue
            </button>
          </div>
        </form>
        <form action={regenerateInterpretedBrief.bind(null, clientId)} className="mt-3">
          <button type="submit" className="text-sm text-neutral-500 transition hover:text-red-400">
            Reject — try again
          </button>
        </form>
      </div>
    </div>
  );
}
