// Call 0B output — the single document Call 1 works from. Resolves ambiguity between
// the raw brief, the existing site, and any reference sites rather than passing it along.

export type TargetQuality = {
  client_word: string;
  what_they_mean: string;
  mechanism: string;
  source: "brief" | "reference" | "inferred";
};

export type MovingAwayFrom = { signal: string; evidence: string };

export type CarryForward = { asset: string; reason: string; binding: boolean };

// The only three rules allowed to settle a tension without human input. Enforced as an
// enum, not prose: a first attempt at this (asking the model to only escalate "genuine"
// conflicts) held for gaps but not for conflicts — the model started inventing plausible-
// sounding ad hoc justifications (e.g. citing a reference's own not_transferable notes as
// though that settled a mood/formality mismatch) once the prompt left room to reason its
// way into "resolved." Restricting the field to these three literal values, rejected in
// validation if anything else appears, closes that path structurally instead of hoping
// the next prompt tweak holds.
export const RESOLUTION_RULES = [
  "locked_beats_all",
  "reference_beats_adjective",
  "reference_beats_equity",
] as const;
export type ResolutionRule = (typeof RESOLUTION_RULES)[number];

// A tension that looked like a conflict but was actually settled by one of the three
// rules above. Exists so the model has somewhere to put "a named rule already decided
// this" instead of escalating it into conflicts just because it noticed two inputs
// pointed differently — but conflicts is the resting state (see brief-synthesis.ts's
// system prompt): a tension only leaves it by citing one of these three rules verbatim.
export type Resolved = {
  between: string[];
  resolution: string;
  rule: ResolutionRule;
};

export type Conflict = {
  between: string[];
  description: string;
  leaning: string;
  why: string;
};

export type InterpretedBrief = {
  subject: {
    business: string;
    audience: string;
    what_they_actually_do: string;
  };
  page_job: string;
  target_qualities: TargetQuality[];
  moving_away_from: MovingAwayFrom[];
  carry_forward: CarryForward[];
  content_reality: {
    volume: "sparse" | "moderate" | "heavy";
    supports_ambition: boolean;
    note: string;
  };
  resolved: Resolved[];
  conflicts: Conflict[];
  confidence: {
    level: "high" | "medium" | "low";
    gaps: string[];
  };
};

const REQUIRED_KEYS: (keyof InterpretedBrief)[] = [
  "subject",
  "page_job",
  "target_qualities",
  "moving_away_from",
  "carry_forward",
  "content_reality",
  "resolved",
  "conflicts",
  "confidence",
];

export type InterpretedBriefValidation = { valid: true } | { valid: false; reason: string };

export function validateInterpretedBriefShape(value: unknown): InterpretedBriefValidation {
  if (!value || typeof value !== "object") {
    return { valid: false, reason: `expected an object, got ${value === null ? "null" : typeof value}` };
  }
  const obj = value as Record<string, unknown>;

  const missing = REQUIRED_KEYS.filter((key) => !(key in obj));
  if (missing.length > 0) {
    return { valid: false, reason: `missing top-level keys: ${missing.join(", ")}` };
  }

  if (!Array.isArray(obj.target_qualities) || obj.target_qualities.length < 2) {
    return { valid: false, reason: "target_qualities is not an array with at least 2 items" };
  }
  if (!Array.isArray(obj.resolved)) {
    return { valid: false, reason: "resolved is not an array" };
  }
  for (const [i, entry] of obj.resolved.entries()) {
    const rule = (entry as Record<string, unknown> | null)?.rule;
    if (!RESOLUTION_RULES.includes(rule as ResolutionRule)) {
      return {
        valid: false,
        reason:
          `resolved[${i}].rule is "${String(rule)}", not one of the three named rules ` +
          `(${RESOLUTION_RULES.join(", ")}) — a tension that doesn't cite one of these ` +
          `verbatim belongs in conflicts, not resolved`,
      };
    }
  }
  if (!Array.isArray(obj.conflicts)) {
    return { valid: false, reason: "conflicts is not an array" };
  }

  const confidence = obj.confidence as Record<string, unknown> | undefined;
  if (typeof confidence?.level !== "string") {
    return { valid: false, reason: "confidence.level is not a string" };
  }

  return { valid: true };
}

export function isValidInterpretedBriefShape(value: unknown): value is InterpretedBrief {
  return validateInterpretedBriefShape(value).valid;
}

// The stored Client.interpretedBrief bundle — everything Call 1 needs, so a BRIEF_REVIEW
// pause (possibly long) doesn't require re-running Call 0.
export type InterpretedBriefBundle = {
  existingSiteRead: import("./visual-read-types").VisualRead;
  referenceReads: import("./visual-read-types").VisualRead[];
  interpretedBrief: InterpretedBrief;
  // Reference URLs whose screenshot capture or visual read failed and were dropped from
  // referenceReads. Tracked explicitly — and forces BRIEF_REVIEW regardless of what Call
  // 0B decided — so a design never gets built on a silently-incomplete subset of the
  // client's stated references without anyone finding out.
  failedReferenceUrls: string[];
};

export function isValidInterpretedBriefBundle(value: unknown): value is InterpretedBriefBundle {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  return (
    "existingSiteRead" in obj &&
    Array.isArray(obj.referenceReads) &&
    Array.isArray(obj.failedReferenceUrls) &&
    isValidInterpretedBriefShape(obj.interpretedBrief)
  );
}
