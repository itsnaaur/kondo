import type { TemplateMeta } from "../types";

export const meta: TemplateMeta = {
  key: "saas",
  label: "SaaS / Startup",
  industries: ["saas", "software", "technology", "tech", "startup", "app", "platform"],
  // No entry here is a deliberate assessment, not an oversight — checked index.ts: hero
  // falls back to a brand-color gradient, contact works off either email or phone, every
  // content section (services/gallery/testimonials) is independently optional. Nothing in
  // this template is genuinely blocked by missing content the way ledger's hero or
  // local-service's phone are.
};
