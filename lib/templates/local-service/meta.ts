import type { TemplateMeta } from "../types";

export const meta: TemplateMeta = {
  key: "local-service",
  label: "Local Service",
  industries: [
    "local service",
    "medical",
    "clinic",
    "dental",
    "hospitality",
    "restaurant",
    "professional services",
    "law",
    "legal",
    "education",
    "trade",
    "home service",
    "retail",
  ],
  // The "Call now" topbar/nav/hero-CTA identity (lib/templates/local-service/index.ts) is
  // the template's whole point — without a phone number, most of its distinctive UI just
  // vanishes and it reads as a generic page, not a broken one, but not what this template
  // is for either.
  requires: { phone: true },
};
