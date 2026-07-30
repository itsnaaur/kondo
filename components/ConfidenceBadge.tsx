type ConfidenceBadgeProps = {
  confidence?: "low" | "medium" | "high";
  flagged?: boolean;
  flagReason?: string;
};

// Renders next to any Review Extraction field the crawl/AI wasn't sure about — a guessed
// brand colour, a low-quality image, a suspicious testimonial. Nothing renders at all for
// high-confidence, unflagged fields, so the screen only draws attention to what actually
// needs a human's thirty seconds.
export function ConfidenceBadge({ confidence, flagged, flagReason }: ConfidenceBadgeProps) {
  const shouldShow = flagged || confidence === "low" || confidence === "medium";
  if (!shouldShow) return null;

  const label = flagged ? "Flagged" : confidence === "low" ? "Low confidence" : "Verify";

  return (
    <span
      title={flagReason}
      className="inline-flex items-center gap-1 rounded-full border border-amber-700/60 bg-amber-950/50 px-2 py-0.5 text-xs font-medium text-amber-400"
    >
      ⚠ {label}
    </span>
  );
}
