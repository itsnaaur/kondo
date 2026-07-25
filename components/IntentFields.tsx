"use client";

import { useState } from "react";
import { AssetDropzone } from "./AssetDropzone";

type Intent = "FACELIFT" | "WORDPRESS_TRANSFER";

export function IntentFields() {
  const [intent, setIntent] = useState<Intent>("FACELIFT");

  return (
    <div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label
          className={`cursor-pointer rounded-lg border px-4 py-3 text-sm transition ${
            intent === "FACELIFT"
              ? "border-yellow-400 bg-neutral-900"
              : "border-neutral-700 bg-neutral-950"
          }`}
        >
          <input
            type="radio"
            name="intent"
            value="FACELIFT"
            checked={intent === "FACELIFT"}
            onChange={() => setIntent("FACELIFT")}
            className="mr-2 accent-yellow-400"
          />
          <span className="font-medium text-neutral-100">Website facelift</span>
          <p className="mt-1 text-xs text-neutral-500">
            Redesign their current site into a new static HTML build.
          </p>
        </label>

        <label
          className={`cursor-pointer rounded-lg border px-4 py-3 text-sm transition ${
            intent === "WORDPRESS_TRANSFER"
              ? "border-yellow-400 bg-neutral-900"
              : "border-neutral-700 bg-neutral-950"
          }`}
        >
          <input
            type="radio"
            name="intent"
            value="WORDPRESS_TRANSFER"
            checked={intent === "WORDPRESS_TRANSFER"}
            onChange={() => setIntent("WORDPRESS_TRANSFER")}
            className="mr-2 accent-yellow-400"
          />
          <span className="font-medium text-neutral-100">WordPress transfer</span>
          <p className="mt-1 text-xs text-neutral-500">
            Convert their existing coded site into an installable WP theme.
          </p>
        </label>
      </div>

      {intent === "WORDPRESS_TRANSFER" && (
        <div className="mt-4">
          <AssetDropzone
            label="Project archive (.zip of their site's source code)"
            name="projectArchiveFiles"
            multiple={false}
          />
        </div>
      )}
    </div>
  );
}
