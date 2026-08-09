import type { TemplateContent, TemplateImage } from "../templates/types";

/**
 * Defensive filters between extraction and rendering.
 *
 * Every rule here exists because real client data broke a layout, not because
 * it seemed prudent. Extraction is honest about what it found; these decide
 * what is *presentable*, which is a different question.
 */

/**
 * Princeton returned six FAQ questions with empty answer strings — the crawl
 * found the questions in an accordion whose answers were JS-rendered. An FAQ
 * section built from those renders as six clickable rows that open onto
 * nothing.
 */
export function usableFaqs(faqs: { question: string; answer: string }[]) {
  return (faqs || []).filter((f) => f.question?.trim() && f.answer?.trim().length > 20);
}

/**
 * Stats fail in a subtler way than being wrong: they're the wrong *kind*.
 * Twelve of Propell's thirteen are per-client case-study figures —
 * "$300k / Capital growth for Jack and Harry Gray in just 2 years". True, but
 * not a trust stat, and a band of them reads as someone else's spreadsheet.
 *
 * Word-count alone isn't enough — "Growth for Andrew Panyanouvong" is short
 * (4 words) and still a case-study figure, confirmed live against real data.
 * So this is a whitelist, not a blacklist: a headline stat's label has to
 * *contain* a recognizable metric word, not just be short. "Years serving
 * Kenmore families" and "Google review rating" both pass (contain "years" /
 * "rating"); "Growth for Andrew Panyanouvong" doesn't contain any of these,
 * so it's correctly rejected. Deliberately a contains-check, not a
 * starts-with-check — "Google review rating" doesn't start with a metric
 * word, and an earlier starts-with draft of this filter would have dropped
 * it incorrectly.
 */
const METRIC_WORD_PATTERN =
  /\b(years?|clients?|customers?|patients?|projects?|properties|reviews?|ratings?|rated|members?|portfolios?|staff|team|locations?|offices|awards?|deals?|sales|transactions?)\b/i;

export function headlineStats(stats: { value: string; label: string }[]) {
  return (stats || [])
    .filter((s) => s.value?.trim() && s.label?.trim())
    .filter((s) => s.label.trim().split(/\s+/).length <= 5)
    .filter((s) => s.value.length <= 12)
    .filter((s) => METRIC_WORD_PATTERN.test(s.label))
    .slice(0, 4);
}

/**
 * Team members, read out of image captions. Propell's photos caption as
 * "Michael Pell, Managing Director" — a name and a role, which is a team card.
 * Princeton's caption as "Dr Nina talking with a patient" — a description of a
 * scene, which is not. The comma is the whole test, and it correctly gives
 * Propell a team section and Princeton none.
 */
export function teamFromCaptions(images: TemplateImage[]) {
  const seen = new Set<string>();
  const team: { name: string; role: string; url: string }[] = [];

  for (const img of images || []) {
    if (img.subject !== "people" || !img.caption) continue;
    const idx = img.caption.indexOf(",");
    if (idx < 2) continue;

    const name = img.caption.slice(0, idx).trim();
    let role = img.caption.slice(idx + 1).trim();

    // A name is 2–4 capitalised words. "Dr Nina talking with a patient" fails
    // this before the comma test even matters.
    const words = name.split(/\s+/);
    if (words.length < 2 || words.length > 4) continue;
    if (!/^[A-Z]/.test(name)) continue;

    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    role = role.replace(/,?\s*(in|since)\s+\d{4}\.?$/i, "").trim();
    if (role.length > 64) role = role.slice(0, 61).trimEnd() + "…";

    team.push({ name, role, url: img.url });
  }
  return team;
}

/** Photos that can carry a section: real scenes, not logos or icons. */
export function sceneImages(images: TemplateImage[]) {
  return (images || []).filter((i) => {
    if (!i.url) return false;
    if (i.subject === "abstract") return false;
    if (/\.svg(\?|$)/i.test(i.url)) return false;
    if ((i.widthPx ?? 0) < 600) return false;
    return true;
  });
}

/**
 * Hero selection. `suitableAsHero` is the AI's judgement and it outranks the
 * crawler's `role: "hero"` guess — on both test clients the role-tagged image
 * was marked unsuitable while better candidates sat in the gallery.
 */
export function pickHero(images: TemplateImage[], fallback: string | null): TemplateImage | null {
  const scenes = sceneImages(images);
  const landscape = (i: TemplateImage) => (i.widthPx ?? 0) / (i.heightPx ?? 1) >= 1.25;

  const flagged = scenes.filter((i) => i.suitableAsHero && landscape(i));
  if (flagged.length) return flagged.sort((a, b) => (b.widthPx ?? 0) - (a.widthPx ?? 0))[0];

  const wide = scenes.filter(landscape);
  if (wide.length) return wide.sort((a, b) => (b.widthPx ?? 0) - (a.widthPx ?? 0))[0];

  return fallback ? { url: fallback } : null;
}

export type Prepared = {
  hero: TemplateImage | null;
  scenes: TemplateImage[];
  team: { name: string; role: string; url: string }[];
  stats: { value: string; label: string }[];
  faqs: { question: string; answer: string }[];
};

export function prepare(c: TemplateContent): Prepared {
  const hero = pickHero(c.galleryImages || [], c.heroImageUrl);
  const team = teamFromCaptions(c.galleryImages || []);
  const teamUrls = new Set(team.map((t) => t.url));
  const scenes = sceneImages(c.galleryImages || []).filter(
    (i) => i.url !== hero?.url && !teamUrls.has(i.url),
  );

  return {
    hero,
    scenes,
    team,
    stats: headlineStats(c.stats),
    faqs: usableFaqs(c.faqs),
  };
}
