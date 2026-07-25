"use client";

import { useState } from "react";

const CLAMP_CLASS: Record<number, string> = {
  3: "line-clamp-3",
  4: "line-clamp-4",
  5: "line-clamp-5",
};

const COLLAPSE_THRESHOLD = 240;

export function ExpandableText({
  text,
  previewLines = 4,
  className = "",
}: {
  text: string;
  previewLines?: number;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const collapsible = text.length > COLLAPSE_THRESHOLD;

  return (
    <div>
      <p
        className={`whitespace-pre-wrap ${
          expanded || !collapsible ? "" : (CLAMP_CLASS[previewLines] ?? "line-clamp-4")
        } ${className}`}
      >
        {text}
      </p>
      {collapsible && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="mt-1 text-xs font-medium text-yellow-400 hover:text-yellow-300"
        >
          {expanded ? "See less" : "See more"}
        </button>
      )}
    </div>
  );
}
