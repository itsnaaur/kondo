"use client";

import { useState } from "react";

// Defaults to mobile, not desktop — most cold-email links open on a phone, so that's the
// rendering an author should see first, not an easy-to-skip afterthought. Toggling here
// is a pure CSS width change on the same already-rendered HTML — zero API calls, zero
// re-render.
export function PreviewFrame({ html }: { html: string }) {
  const [device, setDevice] = useState<"mobile" | "desktop">("mobile");
  const width = device === "mobile" ? "375px" : "1200px";

  return (
    <div>
      <div className="mb-3 flex gap-2">
        <button
          type="button"
          onClick={() => setDevice("mobile")}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
            device === "mobile" ? "bg-yellow-400 text-neutral-900" : "border border-neutral-700 text-neutral-300 hover:bg-neutral-900"
          }`}
        >
          Mobile
        </button>
        <button
          type="button"
          onClick={() => setDevice("desktop")}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
            device === "desktop" ? "bg-yellow-400 text-neutral-900" : "border border-neutral-700 text-neutral-300 hover:bg-neutral-900"
          }`}
        >
          Desktop
        </button>
      </div>
      <div className="flex justify-center overflow-auto rounded-xl border border-neutral-800 bg-neutral-200 p-4">
        <iframe
          srcDoc={html}
          sandbox=""
          title="Concept preview"
          style={{ width, height: "900px", maxWidth: "100%", border: "none", background: "#fff" }}
        />
      </div>
    </div>
  );
}
