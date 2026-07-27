import { approveDesignSpec, regenerateDesignSpec } from "@/lib/actions/generation";
import type { DesignSpec } from "@/lib/generation/design-spec-types";

export function DesignSpecReview({ clientId, spec }: { clientId: string; spec: DesignSpec }) {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-3">
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
          What this business is
        </h3>
        <p className="text-sm text-neutral-200">{spec.subject.business}</p>
        <p className="mt-1 text-sm text-neutral-400">
          Audience: <span className="text-neutral-300">{spec.subject.audience}</span>
        </p>
        <p className="text-sm text-neutral-400">
          This page&apos;s job: <span className="text-neutral-300">{spec.subject.page_job}</span>
        </p>
      </div>

      <div className="rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-3">
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">Palette</h3>
        <div className="mb-2 flex flex-wrap gap-3">
          {spec.palette.colors.map((c) => (
            <div key={c.hex} className="flex items-center gap-2">
              <div
                title={c.hex}
                className="h-8 w-8 flex-shrink-0 rounded border border-neutral-700"
                style={{ backgroundColor: c.hex }}
              />
              <div className="text-xs">
                <p className="text-neutral-200">{c.name}</p>
                <p className="text-neutral-500">
                  {c.role} · {c.hex}
                </p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-sm text-neutral-400">{spec.palette.accent_policy}</p>
        <p className="mt-1 text-sm text-neutral-500">{spec.palette.rationale}</p>
      </div>

      <div className="rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-3">
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">Type</h3>
        <p className="text-sm text-neutral-200">
          Display: <span className="text-neutral-300">{spec.type.display.family}</span>{" "}
          <span className="text-neutral-600">({spec.type.display.source})</span>
        </p>
        <p className="text-sm text-neutral-200">
          Body: <span className="text-neutral-300">{spec.type.body.family}</span>{" "}
          <span className="text-neutral-600">({spec.type.body.source})</span>
        </p>
        {spec.type.utility && (
          <p className="text-sm text-neutral-200">
            Utility: <span className="text-neutral-300">{spec.type.utility.family}</span>
          </p>
        )}
        <p className="mt-1 text-sm text-neutral-500">{spec.type.pairing_rationale}</p>
      </div>

      <div className="rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-3">
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">Layout</h3>
        <p className="mb-2 text-sm text-neutral-200">{spec.layout.concept}</p>
        <p className="mb-1 text-xs text-neutral-500">Hero wireframe</p>
        <pre className="mb-3 overflow-x-auto rounded border border-neutral-800 bg-neutral-900 p-3 text-xs text-neutral-400">
          {spec.layout.hero_wireframe}
        </pre>
        <p className="mb-1 text-xs text-neutral-500">Section wireframe</p>
        <pre className="overflow-x-auto rounded border border-neutral-800 bg-neutral-900 p-3 text-xs text-neutral-400">
          {spec.layout.section_wireframe}
        </pre>
        <p className="mt-3 text-sm text-neutral-400">
          Density: <span className="text-neutral-300">{spec.layout.density}</span> · Radius:{" "}
          <span className="text-neutral-300">{spec.layout.radius}</span>
        </p>
      </div>

      <div className="rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-3">
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
          Signature element
        </h3>
        <p className="text-sm text-neutral-200">{spec.signature.element}</p>
        <p className="mt-1 text-sm text-neutral-400">{spec.signature.description}</p>
        <p className="mt-1 text-sm text-neutral-500">{spec.signature.why_this_subject}</p>
      </div>

      <div className="rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-3">
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">Motion</h3>
        <p className="text-sm text-neutral-400">{spec.motion.policy}</p>
        {spec.motion.deliberately_absent.length > 0 && (
          <p className="mt-1 text-sm text-neutral-500">
            Deliberately absent: {spec.motion.deliberately_absent.join(", ")}
          </p>
        )}
      </div>

      <div className="rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-3">
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
          Self-critique ({spec.revisions.length} revision{spec.revisions.length === 1 ? "" : "s"})
        </h3>
        <ul className="space-y-2">
          {spec.revisions.map((r, i) => (
            <li key={i} className="text-sm text-neutral-400">
              <span className="text-neutral-200">{r.changed}:</span> {r.from} → {r.to} —{" "}
              <span className="text-neutral-500">{r.why}</span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
          Full spec (edit before approving if needed)
        </h3>
        <form action={approveDesignSpec.bind(null, clientId)} className="space-y-3">
          <textarea
            name="spec"
            rows={16}
            defaultValue={JSON.stringify(spec, null, 2)}
            className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 font-mono text-xs text-neutral-200 outline-none focus:border-yellow-400"
          />
          <div className="flex gap-3">
            <button
              type="submit"
              className="rounded-lg bg-yellow-400 px-5 py-2.5 font-medium text-neutral-900 transition hover:bg-yellow-300"
            >
              Approve &amp; build
            </button>
          </div>
        </form>
        <form action={regenerateDesignSpec.bind(null, clientId)} className="mt-3">
          <button type="submit" className="text-sm text-neutral-500 transition hover:text-red-400">
            Reject — try a new direction
          </button>
        </form>
      </div>
    </div>
  );
}
