import type { PageExtraction } from "./types";

const PAGE_BUILDER_HINTS = ["Elementor", "Divi", "Beaver Builder"];
const ANIMATION_LIBRARY_HINTS = ["AOS (animate on scroll)", "GSAP", "WOW.js", "ScrollMagic", "Animate.css"];

function tallyTop(values: string[], limit: number): Array<{ value: string; count: number }> {
  const counts = new Map<string, number>();
  for (const v of values) {
    if (!v) continue;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([value, count]) => ({ value, count }));
}

function detectHints(src: string, hints: Set<string>) {
  if (/wp-content|wp-includes/i.test(src)) hints.add("WordPress");
  if (/elementor/i.test(src)) hints.add("Elementor");
  if (/et_pb_|divi/i.test(src)) hints.add("Divi");
  if (/fl-builder/i.test(src)) hints.add("Beaver Builder");
  if (/cdn\.shopify\.com/i.test(src)) hints.add("Shopify");
  if (/static\.wixstatic\.com|wix\.com/i.test(src)) hints.add("Wix");
  if (/squarespace/i.test(src)) hints.add("Squarespace");
  if (/\baos\.(js|css)/i.test(src)) hints.add("AOS (animate on scroll)");
  if (/gsap/i.test(src)) hints.add("GSAP");
  if (/wow\.min\.js|wow\.js/i.test(src)) hints.add("WOW.js");
  if (/scrollmagic/i.test(src)) hints.add("ScrollMagic");
  if (/animate(\.min)?\.css/i.test(src)) hints.add("Animate.css");
}

export function buildAuditFromPages(pages: PageExtraction[], pagesTruncated: boolean) {
  const allColors: string[] = [];
  const allBackgrounds: string[] = [];
  const allFonts: string[] = [];
  const generators = new Set<string>();
  const hints = new Set<string>();
  let hasDataAOS = false;
  let formsDetected = false;

  for (const p of pages) {
    for (const sample of p.samples) {
      if (sample.style?.color) allColors.push(sample.style.color);
      if (sample.style?.backgroundColor) allBackgrounds.push(sample.style.backgroundColor);
      if (sample.style?.fontFamily) allFonts.push(sample.style.fontFamily);
    }
    if (p.generatorMeta) generators.add(p.generatorMeta);
    if (p.hasDataAOS) hasDataAOS = true;
    if (p.hasForm) formsDetected = true;
    for (const src of [...p.scriptSrcs, ...p.linkHrefs]) {
      detectHints(src, hints);
    }
  }

  const platform =
    [...generators].join(", ") || (hints.has("WordPress") ? "WordPress" : "Unknown / custom-built");
  const pageBuilders = [...hints].filter((h) => PAGE_BUILDER_HINTS.includes(h));
  const animationLibraries = [...hints].filter((h) => ANIMATION_LIBRARY_HINTS.includes(h));

  const technical = {
    platform,
    pageBuilders,
    formsDetected,
    pagesCrawled: pages.length,
    crawlTruncated: pagesTruncated,
  };

  const visualDesign = {
    colorPalette: tallyTop(allColors, 6),
    backgroundPalette: tallyTop(allBackgrounds, 6),
    typography: tallyTop(allFonts, 5),
  };

  const motionInteraction = {
    animationLibraries,
    scrollRevealDetected: hasDataAOS || animationLibraries.length > 0,
  };

  const contentInventory = pages.map((p) => ({ url: p.url, title: p.title }));

  return { technical, visualDesign, motionInteraction, contentInventory };
}
