// Task 3.1. Lifted out of lib/templates/suitability.ts (Task 0.1-era template scoring) and
// extended — it becomes pattern eligibility rather than template suitability, per instruction.
// Moved specifically because lib/templates/ (including the old suitability.ts, registry.ts's
// scoring, and TemplateGallery.tsx) is deleted whole in Task 3.8 (build plan §7); this module
// must still exist afterward, so it deliberately imports nothing from lib/templates/ — not
// TemplateContent, not TemplateMeta. Its two inputs are a narrow, self-contained ContentCoverage
// shape (below) and Task 1.9/1.9a's own CapabilitySummary (lib/content/assign-image-roles.ts),
// which is NOT template-shaped and survives 3.8 untouched.
//
// Three carry-forwards from 1.9a/1.10, addressed directly:
//
// 1. Allen Evans ("1 hero-grade, nothing else" per 1.9a's original finding) and 2. BC Security
// (zero-showcase, no usable imagery at all) are exactly the cases this module exists to route
// correctly: a pattern declaring `heroImage: true` must score `not-suited` for both, so
// eligibility naturally falls through to a pattern with no image requirements at all (the
// typographic/content-led case) rather than forcing a photo-led layout onto a client with little
// or no usable photography. Verified against both clients' real, freshly-recomputed capability
// summaries in this task's own log entry — including a real discrepancy found there, not assumed:
// 1.10's actual production wiring run found Allen Evans at "0 hero-grade", not the "1 hero-grade"
// this carry-forward's own text states, because classify-partner-logos.ts (untouched, pre-existing)
// misclassifies its one real photo as a partner logo before 1.9 ever sees it. Both numbers are
// real, verified, and stated as of different points in this session — see the log entry, not
// silently reconciled to whichever the task text assumed.
//
// 3. Three unreconciled hero-selection mechanisms were found in 1.10: selectHeroAssetId
// (crawl-time geometry), to-template-content.ts's tier1/tier2 chain (feeds Ledger/Showcase), and
// content-guards.ts's pickHero (feeds Atlas only). NOT reconciled here, per instruction — but this
// module's own design states which one it trusts once the other two are gone with the templates
// in 3.8: Task 1.9/1.9a's assignImageRoles()/CapabilitySummary, exclusively. It is the only one of
// the three that is not template-specific, the only one informed by real vision-classification
// confidence rather than geometry alone, and the one this task was explicitly told to consume
// ("that summary was built for this and has had no consumer until now"). This module never reads
// heroImageUrl, galleryImages, or anything else produced by the other two mechanisms — by
// construction, not by omission.

import type { CapabilitySummary } from "@/lib/content/assign-image-roles";

export type PatternRequirements = {
  heroImage?: boolean;
  phone?: boolean;
  minServices?: number;
  minGallery?: number;
  minTestimonials?: number;
  needsPricing?: boolean;
  needsTeamPhotos?: boolean;
  needsCredentials?: boolean;
};

// Deliberately narrow — exactly the text-extraction facts eligibility actually needs, not the
// full ContentRecord/TemplateContent shape. A caller with either of those already in hand maps
// it onto this in one line (see this task's own verification script, and registry.ts's own
// transitional adapter — lib/templates/registry.ts, not touched by this file).
export type ContentCoverage = {
  servicesCount: number;
  testimonialsCount: number;
  hasPhone: boolean;
  hasPricing: boolean;
  hasCredentials: boolean;
};

export type EligibilityStatus = "recommended" | "works" | "not-suited";

// Every unmet requirement, not just the first — a deliberate change from the original
// scoreTemplate's "return on the first unmet requirement" behaviour (lib/templates/suitability.ts,
// pre-3.1). That shortcut made sense when every template declared at most one requirement (that
// file's own comment said so directly); with 8 requirement fields now instead of 4, a caller
// deciding what a client is actually missing benefits from seeing everything at once, not just
// whichever check happened to run first. Empty when status is not "not-suited".
export type EligibilityResult = { status: EligibilityStatus; reasons: string[] };

// industryMatches is the caller's own concern, not this module's — a real pattern's own declared
// industries list doesn't exist yet (no pattern library has been authored; see this task's log
// entry), so there is nothing here to match against. Defaults to false (never "recommended"
// without the caller explicitly asserting a match) rather than assumed true.
export function scorePatternEligibility(
  requirements: PatternRequirements,
  content: ContentCoverage,
  images: CapabilitySummary,
  industryMatches = false
): EligibilityResult {
  const reasons: string[] = [];

  if (requirements.heroImage && images.heroGrade < 1) {
    reasons.push("No hero-grade image available (Task 1.9/1.9a capability summary: heroGrade 0)");
  }
  if (requirements.phone && !content.hasPhone) {
    reasons.push("No phone number found");
  }
  if (requirements.minServices !== undefined && content.servicesCount < requirements.minServices) {
    reasons.push(`Needs at least ${requirements.minServices} services (has ${content.servicesCount})`);
  }
  if (requirements.minGallery !== undefined) {
    // The old check (lib/templates/suitability.ts, pre-3.1) deduped a hero+gallery URL pool from
    // TemplateContent directly. Its natural successor here is every non-unusable, non-logo role
    // 1.9/1.9a can assign to a real photo — hero, section-background, gallery, team, and
    // feature-inline all count as "a usable photo this pattern could show", matching what the old
    // check's own dedup was actually trying to measure (how many distinct real photos exist at
    // all), just against the richer role taxonomy instead of a flat URL set.
    const usablePhotoCount =
      images.heroGrade + images.sectionBackgroundGrade + images.galleryGrade + images.teamGrade + images.featureInlineGrade;
    if (usablePhotoCount < requirements.minGallery) {
      reasons.push(`Needs at least ${requirements.minGallery} usable photos (has ${usablePhotoCount})`);
    }
  }
  if (requirements.minTestimonials !== undefined && content.testimonialsCount < requirements.minTestimonials) {
    reasons.push(`Needs at least ${requirements.minTestimonials} testimonials (has ${content.testimonialsCount})`);
  }
  if (requirements.needsPricing && !content.hasPricing) {
    reasons.push("No priced offers found");
  }
  if (requirements.needsTeamPhotos && images.teamGrade < 1) {
    reasons.push("No team-grade (headshot) image available (Task 1.9/1.9a capability summary: teamGrade 0)");
  }
  if (requirements.needsCredentials && !content.hasCredentials) {
    reasons.push("No text-form credentials found");
  }

  if (reasons.length > 0) return { status: "not-suited", reasons };
  return { status: industryMatches ? "recommended" : "works", reasons: [] };
}
