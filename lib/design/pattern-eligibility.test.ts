import { describe, it, expect } from "vitest";
import { scorePatternEligibility, type ContentCoverage } from "./pattern-eligibility";
import type { CapabilitySummary } from "@/lib/content/assign-image-roles";

const EMPTY_CONTENT: ContentCoverage = {
  servicesCount: 0,
  testimonialsCount: 0,
  hasPhone: false,
  hasPricing: false,
  hasCredentials: false,
};

const RICH_CONTENT: ContentCoverage = {
  servicesCount: 6,
  testimonialsCount: 4,
  hasPhone: true,
  hasPricing: true,
  hasCredentials: true,
};

const NO_IMAGES: CapabilitySummary = {
  heroGrade: 0,
  sectionBackgroundGrade: 0,
  galleryGrade: 0,
  teamGrade: 0,
  featureInlineGrade: 0,
  unusable: 0,
  logoPresent: false,
};

const RICH_IMAGES: CapabilitySummary = {
  heroGrade: 1,
  sectionBackgroundGrade: 2,
  galleryGrade: 3,
  teamGrade: 2,
  featureInlineGrade: 1,
  unusable: 0,
  logoPresent: true,
};

describe("scorePatternEligibility — the four original requirements (lifted from lib/templates/suitability.ts)", () => {
  it("heroImage: not-suited when heroGrade is 0", () => {
    const result = scorePatternEligibility({ heroImage: true }, RICH_CONTENT, NO_IMAGES);
    expect(result.status).toBe("not-suited");
    expect(result.reasons.some((r) => r.includes("hero"))).toBe(true);
  });

  it("heroImage: satisfied when heroGrade >= 1", () => {
    const result = scorePatternEligibility({ heroImage: true }, RICH_CONTENT, RICH_IMAGES);
    expect(result.status).not.toBe("not-suited");
  });

  it("phone: not-suited when hasPhone is false", () => {
    const result = scorePatternEligibility({ phone: true }, EMPTY_CONTENT, RICH_IMAGES);
    expect(result.status).toBe("not-suited");
    expect(result.reasons).toContain("No phone number found");
  });

  it("minServices: not-suited below the threshold, works at or above it", () => {
    const below = scorePatternEligibility({ minServices: 5 }, { ...EMPTY_CONTENT, servicesCount: 4 }, RICH_IMAGES);
    const at = scorePatternEligibility({ minServices: 5 }, { ...EMPTY_CONTENT, servicesCount: 5 }, RICH_IMAGES);
    expect(below.status).toBe("not-suited");
    expect(at.status).not.toBe("not-suited");
  });

  it("minGallery: sums every non-unusable, non-hero-exclusive role grade (hero+sectionBackground+gallery+team+featureInline)", () => {
    // RICH_IMAGES totals 1+2+3+2+1 = 9 usable photos across every role.
    const at9 = scorePatternEligibility({ minGallery: 9 }, RICH_CONTENT, RICH_IMAGES);
    const at10 = scorePatternEligibility({ minGallery: 10 }, RICH_CONTENT, RICH_IMAGES);
    expect(at9.status).not.toBe("not-suited");
    expect(at10.status).toBe("not-suited");
    expect(at10.reasons.some((r) => r.includes("9"))).toBe(true);
  });
});

describe("scorePatternEligibility — the four new requirements (Task 3.1's own extension)", () => {
  it("minTestimonials: not-suited below the threshold", () => {
    const result = scorePatternEligibility({ minTestimonials: 3 }, { ...EMPTY_CONTENT, testimonialsCount: 2 }, RICH_IMAGES);
    expect(result.status).toBe("not-suited");
    expect(result.reasons).toContain("Needs at least 3 testimonials (has 2)");
  });

  it("needsPricing: not-suited when hasPricing is false", () => {
    const result = scorePatternEligibility({ needsPricing: true }, EMPTY_CONTENT, RICH_IMAGES);
    expect(result.status).toBe("not-suited");
    expect(result.reasons).toContain("No priced offers found");
  });

  it("needsTeamPhotos: reads teamGrade specifically, not any other image role", () => {
    const noTeam = scorePatternEligibility({ needsTeamPhotos: true }, RICH_CONTENT, { ...RICH_IMAGES, teamGrade: 0 });
    const withTeam = scorePatternEligibility({ needsTeamPhotos: true }, RICH_CONTENT, { ...RICH_IMAGES, teamGrade: 1 });
    expect(noTeam.status).toBe("not-suited");
    expect(withTeam.status).not.toBe("not-suited");
  });

  it("needsCredentials: not-suited when hasCredentials is false", () => {
    const result = scorePatternEligibility({ needsCredentials: true }, EMPTY_CONTENT, RICH_IMAGES);
    expect(result.status).toBe("not-suited");
    expect(result.reasons).toContain("No text-form credentials found");
  });
});

describe("scorePatternEligibility — every unmet requirement is reported, not just the first", () => {
  it("a client failing three requirements at once gets three reasons back", () => {
    const result = scorePatternEligibility(
      { heroImage: true, phone: true, needsCredentials: true },
      EMPTY_CONTENT,
      NO_IMAGES
    );
    expect(result.status).toBe("not-suited");
    expect(result.reasons).toHaveLength(3);
  });
});

describe("scorePatternEligibility — status tiers", () => {
  it("no requirements at all always resolves works or recommended, never not-suited", () => {
    const result = scorePatternEligibility({}, EMPTY_CONTENT, NO_IMAGES);
    expect(result.status).not.toBe("not-suited");
    expect(result.reasons).toEqual([]);
  });

  it("industryMatches defaults to false — never recommended without the caller explicitly asserting a match", () => {
    const result = scorePatternEligibility({}, RICH_CONTENT, RICH_IMAGES);
    expect(result.status).toBe("works");
  });

  it("industryMatches true, with every requirement met, resolves recommended", () => {
    const result = scorePatternEligibility({ heroImage: true }, RICH_CONTENT, RICH_IMAGES, true);
    expect(result.status).toBe("recommended");
  });

  it("industryMatches true does not override a real unmet requirement", () => {
    const result = scorePatternEligibility({ heroImage: true }, RICH_CONTENT, NO_IMAGES, true);
    expect(result.status).toBe("not-suited");
  });
});
