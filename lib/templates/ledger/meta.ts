import type { TemplateMeta } from "../types";

export const meta: TemplateMeta = {
  key: "ledger",
  label: "Ledger — Modern Editorial",
  /**
   * Deliberately broad. Listed for the industries where a long, scannable
   * services index is the natural shape of the page.
   */
  industries: [
    "medical",
    "clinic",
    "dental",
    "health",
    "allied health",
    "legal",
    "law",
    "accounting",
    "finance",
    "consulting",
    "professional services",
    "security",
    "engineering",
    "construction",
    "trade",
    "saas",
    "software",
    "technology",
    "education",
  ],
  // Verified across every real client's rendered output during Ledger's own build: the
  // photo-present split hero and the no-photo dark fallback are not equally good — the
  // latter is a real, working degradation path, not a design defect, but it's noticeably
  // plainer. Worth calling out as a requirement rather than leaving it implicit.
  requires: { heroImage: true },
};
