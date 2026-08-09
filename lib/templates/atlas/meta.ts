import type { TemplateMeta } from "../types";

export const meta: TemplateMeta = {
  key: "atlas",
  label: "Atlas — Adaptive",
  // Validated against two genuinely different real clients (a 16-service medical clinic
  // with no testimonials/process, and a services/testimonials/stats/process-rich property
  // advisory) — every section is conditional (content-guards.ts's usableFaqs/headlineStats/
  // teamFromCaptions/sceneImages/pickHero), and the no-photo hero falls back to a plain
  // gradient band the same way ledger's does. Broad on purpose, same as ledger: this is
  // meant to be a strong general-purpose choice, not a niche one.
  industries: [
    "professional services",
    "medical",
    "clinic",
    "dental",
    "legal",
    "law",
    "consulting",
    "finance",
    "financial advisory",
    "real estate",
    "property",
    "education",
    "trade",
    "home service",
  ],
  // Deliberately no requires — every section (hero, stats, differentiators, services,
  // process, team/scenes, testimonials, FAQs, partner logos) degrades to "just don't
  // render" when its content is thin or absent, which is the whole point of the guards
  // this template is built around. One real consequence worth knowing: because nothing
  // here can ever score "not-suited", pickDefaultTemplate's not-suited fallback branch
  // (lib/templates/registry.ts's FALLBACK_TEMPLATE_KEY) becomes unreachable in practice —
  // atlas always scores at least "works", so the sort in pickDefaultTemplate never bottoms
  // out. Left FALLBACK_TEMPLATE_KEY pointed at ledger anyway as defensive dead code, but
  // flagging this since it's a real, non-obvious structural effect of this choice.
  //
  // requires-narrowness is deliberately NOT what breaks ties against ledger/showcase —
  // that measured fragility (who declared the most constraints), not fit. The tie-break
  // in lib/templates/registry.ts scores actual section coverage per client instead: atlas
  // renders more of what a content-rich client (testimonials, stats, differentiators,
  // process, FAQs) actually has, so it wins those ties on merit, not on requirement count.
  rendersSections: ["services", "testimonials", "stats", "differentiators", "process", "faqs", "gallery", "partnerLogos"],
};
