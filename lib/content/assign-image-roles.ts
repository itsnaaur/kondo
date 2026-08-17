// Rules-based role assignment — no model call anywhere in this file. Consumes Task 1.7's
// deterministic metrics and Task 1.8's vision classification; assigns no judgement of its
// own beyond fixed, disclosed thresholds. Anything requiring a real judgement call (is this
// image hero-worthy, is this a headshot, is there clear space for overlaid text) should
// already have come from 1.8's classification — this file only combines those already-made
// judgements with 1.7's structural facts (dimensions, alpha, entropy) into a final role.
//
// Carry-forward from 1.7b, held throughout: no single-entropy-threshold plan. 1.7b's real
// 41-asset ground truth found min(width,height) (98% best-possible split accuracy) and
// hasAlpha (90%) meaningfully stronger discriminators than colour entropy (85%, wide overlap
// band) for photo-vs-graphic. Both are used below, but only as a *cross-validation safety
// net* against 1.8's own subject/heroSuitable classification, which is the primary signal
// wherever it's available — see REAL_PHOTO_MIN_DIM_PX's own comment for exactly where each
// threshold came from.

import type { ImageMetrics } from "./image-metrics";
import type { ImageClassification, ImageClassificationSubject } from "./classify-images";

export type ImageRole =
  | "logo"
  | "hero"
  | "section-background"
  | "gallery"
  | "team"
  | "feature-inline"
  | "unusable";

export type RoleAssignmentInput = {
  assetId: string;
  assetType: "LOGO" | "IMAGE";
  metrics: ImageMetrics | null;
  classification: ImageClassification | null;
};

export type RoleAssignment = {
  assetId: string;
  role: ImageRole;
  // Which source(s) this specific decision drew from, and why — required, not optional, so
  // "why did this get unusable" is always answerable without re-deriving the rule chain by
  // hand. See this task's own log entry (docs/kondo-v2-execution.md, 1.9) for the honest,
  // per-client review of whether these came out right.
  reason: string;
};

export type CapabilitySummary = {
  heroGrade: number;
  sectionBackgroundGrade: number;
  galleryGrade: number;
  teamGrade: number;
  featureInlineGrade: number;
  unusable: number;
  logoPresent: boolean;
};

// 1.7b's own real, ground-truth-derived number: the smallest min(width,height) among the
// 21 real photos in that 41-asset sample was 500px (BC Security's product shots, 980×500).
// Used two ways below: (a) as a floor a *classified* photo must still clear before being
// trusted (a cross-check against a subject classification that might be wrong), and (b) as
// the sole photo/graphic signal when classification is entirely missing. This is the same
// number 1.7b validated, reused for a related but not identical question — flagged
// explicitly in this task's log entry, not presented as a fresh independent validation.
const REAL_PHOTO_MIN_DIM_PX = 500;

const REAL_PHOTO_SUBJECTS = new Set<ImageClassificationSubject>([
  "person", "people", "product", "interior", "exterior", "equipment",
]);
const NON_PHOTO_SUBJECTS = new Set<ImageClassificationSubject>([
  "abstract", "graphic", "screenshot", "map", "icon",
]);

function isRealPhotoSubject(s: ImageClassificationSubject): boolean {
  return REAL_PHOTO_SUBJECTS.has(s);
}

function minDim(metrics: ImageMetrics | null): number | null {
  if (!metrics || metrics.width === null || metrics.height === null) return null;
  return Math.min(metrics.width, metrics.height);
}

// The no-classification fallback — deliberately capped at gallery/unusable, never
// hero/section-background/team/feature-inline. Those four roles all depend on a judgement
// 1.8 makes (heroSuitable, isHeadshot, subject nuance) that this function has no authority
// to invent on its own when 1.8 hasn't run for an asset yet. Uses 1.7b's two strongest
// metrics-only discriminators (min(width,height), hasAlpha) exactly as that task ranked
// them — entropy is deliberately NOT used here, per the carry-forward.
function assignWithoutClassification(metrics: ImageMetrics | null): { role: ImageRole; reason: string } {
  if (!metrics || metrics.width === null || metrics.height === null) {
    return { role: "unusable", reason: "no classification and no usable metrics (dimensions unavailable) — nothing to assign a role from" };
  }
  const dim = minDim(metrics);
  if (dim === null || dim < REAL_PHOTO_MIN_DIM_PX) {
    return {
      role: "unusable",
      reason: `no classification; min(width,height)=${dim}px is below ${REAL_PHOTO_MIN_DIM_PX}px, the smallest real photo 1.7b's ground truth observed — likely a graphic/icon, not a usable photo`,
    };
  }
  if (metrics.hasAlpha === true) {
    return {
      role: "unusable",
      reason: "no classification; hasAlpha=true — 1.7b found 17/20 real graphics carry alpha vs 1/21 real photos, so this is more likely a graphic than a usable photo",
    };
  }
  return {
    role: "gallery",
    reason: `no classification; min(width,height)=${dim}px clears the ${REAL_PHOTO_MIN_DIM_PX}px real-photo floor and has no alpha channel — plausibly a real photo, capped at gallery since hero/team/feature-inline all need 1.8's judgement`,
  };
}

type PhotoCandidate = {
  input: RoleAssignmentInput;
  classification: ImageClassification;
  minDim: number | null;
};

function assignPhotoRole(candidate: PhotoCandidate): { role: ImageRole; reason: string } {
  const { classification, minDim: dim } = candidate;

  // Quality/defect overrides — checked before any role-specific logic, since a disqualifying
  // defect matters regardless of what role the image would otherwise get.
  if (classification.hasWatermark) {
    return { role: "unusable", reason: "classification: hasWatermark=true — a visible stock-photo watermark or copyright mark, not usable as shown" };
  }
  // Cross-validation against 1.7's metrics — 1.8 says this is a real photo (subject already
  // checked by the caller), but 1.7's own strongest discriminators disagree strongly enough
  // to distrust that specific call, not overrule it lightly. Both thresholds are 1.7b's own
  // real numbers, not invented for this check.
  if (candidate.input.metrics?.hasAlpha === true) {
    return {
      role: "unusable",
      reason: `classification says subject="${classification.subject}" (a real photo) but metrics.hasAlpha=true — 1.7b found this combination strongly atypical for a real photo (17/20 real graphics carry alpha vs 1/21 real photos); trusting the metric over a possibly-wrong subject call`,
    };
  }
  if (dim !== null && dim < REAL_PHOTO_MIN_DIM_PX) {
    return {
      role: "unusable",
      reason: `classification says subject="${classification.subject}" (a real photo) but min(width,height)=${dim}px is below 1.7b's observed real-photo floor of ${REAL_PHOTO_MIN_DIM_PX}px; trusting the metric over a possibly-wrong subject call`,
    };
  }

  if (classification.isHeadshot) {
    return { role: "team", reason: "classification: isHeadshot=true" };
  }
  if (classification.subject === "product" || classification.subject === "equipment") {
    return { role: "feature-inline", reason: `classification: subject="${classification.subject}" — a discrete item shot, suited to illustrating a specific offering` };
  }

  // Remaining real-photo subjects (person-not-headshot, people, interior, exterior) are the
  // wide-scene candidates — hero/section-background/gallery are resolved across the whole
  // client's asset set in assignImageRoles below (hero is a relative "best of" pick, not a
  // per-image threshold), so this function only reports whether this specific image is
  // hero-*eligible*, leaving the cross-image "which one wins" decision to the caller.
  const heroEligible =
    classification.heroSuitable.suitable === true &&
    classification.confidence !== "low" &&
    dim !== null &&
    dim >= REAL_PHOTO_MIN_DIM_PX;

  if (heroEligible) {
    return { role: "hero", reason: `classification: heroSuitable.suitable=true, confidence="${classification.confidence}" — "${classification.heroSuitable.reason}"` };
  }
  if (classification.clearSpace !== "none") {
    return { role: "section-background", reason: `classification: clearSpace="${classification.clearSpace}" — enough clear space for overlaid text, though not flagged heroSuitable` };
  }
  return { role: "gallery", reason: `classification: subject="${classification.subject}", a real photo not otherwise routed to a more specific role` };
}

// Assigns roles for one client's full asset set at once, not one asset independently — hero
// is a relative "best of" pick across the set (a real hero banner is singular; a client with
// three heroSuitable photos should get one hero and two section-backgrounds, not three
// competing heroes), which only makes sense evaluated together.
export function assignImageRoles(assets: RoleAssignmentInput[]): RoleAssignment[] {
  const results = new Map<string, RoleAssignment>();
  const heroCandidates: { assetId: string; input: RoleAssignmentInput; classification: ImageClassification; dim: number }[] = [];

  for (const input of assets) {
    if (input.assetType === "LOGO") {
      results.set(input.assetId, { assetId: input.assetId, role: "logo", reason: "Asset.type=LOGO — the crawler's own designated logo, a structural fact, not a metric/classification judgement" });
      continue;
    }

    if (!input.classification) {
      const fallback = assignWithoutClassification(input.metrics);
      results.set(input.assetId, { assetId: input.assetId, ...fallback });
      continue;
    }

    if (NON_PHOTO_SUBJECTS.has(input.classification.subject)) {
      results.set(input.assetId, {
        assetId: input.assetId,
        role: "unusable",
        reason: `classification: subject="${input.classification.subject}" — not a photograph of the business`,
      });
      continue;
    }

    if (!isRealPhotoSubject(input.classification.subject)) {
      // Defensive only — every ImageClassificationSubject value is in exactly one of
      // REAL_PHOTO_SUBJECTS/NON_PHOTO_SUBJECTS, so this branch is unreachable for a
      // well-typed input; kept as a fail-closed default rather than assuming that invariant
      // always holds for data read back from a Json column (nothing enforces it at the DB).
      results.set(input.assetId, { assetId: input.assetId, role: "unusable", reason: `unrecognised subject value "${input.classification.subject}"` });
      continue;
    }

    const dim = minDim(input.metrics);
    const decision = assignPhotoRole({ input, classification: input.classification, minDim: dim });

    if (decision.role === "hero") {
      // Don't commit yet — collected and resolved after this loop, since only the single
      // best hero-eligible photo per client should actually get "hero"; the rest fall
      // through to section-background/gallery below.
      heroCandidates.push({ assetId: input.assetId, input, classification: input.classification, dim: dim ?? 0 });
      continue;
    }
    results.set(input.assetId, { assetId: input.assetId, ...decision });
  }

  if (heroCandidates.length > 0) {
    // Tiebreak, explicit and stated, not iteration-order-dependent — same discipline as
    // 0.1a/1.1b/1.2's own sort fixes. Confidence first (a "high" hero-suitability call is
    // more trustworthy than "medium"), then the larger image, then assetId for a fully
    // deterministic order when everything else ties.
    const confidenceRank = { high: 2, medium: 1, low: 0 } as const;
    heroCandidates.sort((a, b) => {
      const c = confidenceRank[b.classification.confidence] - confidenceRank[a.classification.confidence];
      if (c !== 0) return c;
      if (b.dim !== a.dim) return b.dim - a.dim;
      return a.assetId.localeCompare(b.assetId);
    });
    const [winner, ...runnersUp] = heroCandidates;
    results.set(winner.assetId, {
      assetId: winner.assetId,
      role: "hero",
      reason: `classification: heroSuitable.suitable=true, confidence="${winner.classification.confidence}" — "${winner.classification.heroSuitable.reason}" (chosen over ${runnersUp.length} other hero-eligible image(s) in this client's set)`,
    });
    for (const runnerUp of runnersUp) {
      const role: ImageRole = runnerUp.classification.clearSpace !== "none" ? "section-background" : "gallery";
      results.set(runnerUp.assetId, {
        assetId: runnerUp.assetId,
        role,
        reason: `classification: heroSuitable.suitable=true but not the single best hero pick for this client (lost the tiebreak to a higher-confidence or larger image); clearSpace="${runnerUp.classification.clearSpace}" → ${role}`,
      });
    }
  }

  return assets.map((a) => results.get(a.assetId)!);
}

export function summarizeCapabilities(assignments: RoleAssignment[]): CapabilitySummary {
  const count = (role: ImageRole) => assignments.filter((a) => a.role === role).length;
  return {
    heroGrade: count("hero"),
    sectionBackgroundGrade: count("section-background"),
    galleryGrade: count("gallery"),
    teamGrade: count("team"),
    featureInlineGrade: count("feature-inline"),
    unusable: count("unusable"),
    logoPresent: assignments.some((a) => a.role === "logo"),
  };
}

// "1 hero-grade, 4 gallery-grade, 0 team, logo present" — the exact shape this task asked
// for, used to gate pattern eligibility in Phase 3 (a pattern requiring a hero image can't
// be offered to a client with heroGrade=0).
export function describeCapabilities(summary: CapabilitySummary): string {
  const parts = [
    `${summary.heroGrade} hero-grade`,
    `${summary.sectionBackgroundGrade} section-background-grade`,
    `${summary.galleryGrade} gallery-grade`,
    `${summary.teamGrade} team`,
    `${summary.featureInlineGrade} feature-inline`,
    `${summary.unusable} unusable`,
    summary.logoPresent ? "logo present" : "no logo",
  ];
  return parts.join(", ");
}
