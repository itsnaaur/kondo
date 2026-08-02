import type { TemplateContent, TemplateMeta } from "./types";

export type SuitabilityStatus = "recommended" | "works" | "not-suited";
export type SuitabilityResult = { status: SuitabilityStatus; reason?: string };

// Checked in a fixed order and returns on the first unmet requirement — every template
// currently declares at most one requirement, so this doesn't yet matter in practice, but
// is worth knowing if a future template declares more than one.
export function scoreTemplate(meta: TemplateMeta, content: TemplateContent): SuitabilityResult {
  const requires = meta.requires ?? {};

  if (requires.heroImage && !content.heroImageUrl) {
    return { status: "not-suited", reason: "No hero image found" };
  }
  if (requires.phone && !content.contactPhone) {
    return { status: "not-suited", reason: "No phone number found" };
  }
  if (requires.minServices !== undefined && content.services.length < requires.minServices) {
    return {
      status: "not-suited",
      reason: `Needs at least ${requires.minServices} services (has ${content.services.length})`,
    };
  }

  const industry = content.detectedIndustry?.toLowerCase() ?? null;
  const industryMatches = industry ? meta.industries.some((i) => industry.includes(i)) : false;

  return { status: industryMatches ? "recommended" : "works" };
}
