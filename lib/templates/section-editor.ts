// Locates and swaps a single top-level section within an already-rendered concept's HTML —
// the mechanism behind per-client, per-section AI edits (lib/actions/concepts.ts's
// editConceptSection). Every template's renderer tags each top-level section
// (header/section/footer) with data-kondo-section="<key>" (see atlas/ledger/showcase's
// index.ts) specifically so this file has something stable to find, independent of the
// class names or copy a given render happens to produce.
//
// Concept.html is already a frozen, per-client snapshot (see the Concept model's own
// comment in prisma/schema.prisma) — editing it here can never affect another client's
// concept or the shared template source in lib/templates/*/index.ts. What this module adds
// on top of that is section-level isolation *within* one page: a template's sections share
// CSS classes with each other (the same heading style, the same eyebrow label, the same
// color variables), so an edit has to be found and replaced as an exact, bounded fragment —
// never a find/replace across the whole page — or a change meant for "About" could bleed
// into "Services" on the same client's own page.

export type ConceptSection = { key: string; label: string; html: string };

// Kept here, not embedded in the HTML itself — the label is presentation for the editor
// UI, not part of what identifies the section.
const SECTION_LABELS: Record<string, string> = {
  nav: "Navigation",
  hero: "Hero",
  why: "Why us",
  services: "Services",
  process: "How it works",
  about: "About",
  reviews: "Testimonials",
  faq: "FAQs",
  partners: "Trust strip",
  deep: "Gallery & details",
  feature: "Feature quote",
  mosaic: "Gallery",
  cta: "Call to action",
  footer: "Footer",
};

const ATTR_MARKER = 'data-kondo-section="';

// Depth-aware scan for the </tagName> that matches the opening tag whose content starts at
// `searchFrom` — not just the next occurrence, since a section can (now or later) contain
// another element of the same tag name nested inside it. Plain string scanning rather than
// a regex with global-flag state, which is easy to get subtly wrong across repeated calls.
function findMatchingClose(html: string, searchFrom: number, tagName: string): number {
  const openMarker = `<${tagName}`;
  const closeMarker = `</${tagName}>`;
  let depth = 1;
  let pos = searchFrom;

  while (depth > 0) {
    const nextClose = html.indexOf(closeMarker, pos);
    if (nextClose === -1) return -1;

    const nextOpen = html.indexOf(openMarker, pos);
    if (nextOpen !== -1 && nextOpen < nextClose) {
      // Guard against a false match like "<sectioning-thing" — only a real opening tag if
      // the next character is whitespace or '>'.
      const afterTag = html[nextOpen + openMarker.length];
      if (afterTag === ">" || afterTag === " " || afterTag === "\n" || afterTag === "\t") {
        depth++;
      }
      pos = nextOpen + openMarker.length;
      continue;
    }

    depth--;
    pos = nextClose + closeMarker.length;
    if (depth === 0) return pos;
  }
  return -1;
}

// Every marked section in document order — the source of truth both for populating the
// section-picker dropdown and for locating one section to replace.
export function listConceptSections(html: string): ConceptSection[] {
  const sections: ConceptSection[] = [];
  let searchPos = 0;

  for (;;) {
    const attrIdx = html.indexOf(ATTR_MARKER, searchPos);
    if (attrIdx === -1) break;

    const keyStart = attrIdx + ATTR_MARKER.length;
    const keyEnd = html.indexOf('"', keyStart);
    if (keyEnd === -1) break;
    const key = html.slice(keyStart, keyEnd);

    // Walk back to the '<' that opened this tag, then read the tag name off it — the
    // attribute is always written on the section's own opening tag, never a descendant's.
    const tagStart = html.lastIndexOf("<", attrIdx);
    const tagNameMatch = tagStart === -1 ? null : html.slice(tagStart + 1, attrIdx).match(/^[a-zA-Z][a-zA-Z0-9-]*/);
    const tagName = tagNameMatch?.[0];
    if (!tagName) {
      searchPos = keyEnd + 1;
      continue;
    }

    const openTagCloseIdx = html.indexOf(">", keyEnd);
    if (openTagCloseIdx === -1) {
      searchPos = keyEnd + 1;
      continue;
    }

    const matchEnd = findMatchingClose(html, openTagCloseIdx + 1, tagName);
    if (matchEnd === -1) {
      searchPos = keyEnd + 1;
      continue;
    }

    sections.push({ key, label: SECTION_LABELS[key] ?? key, html: html.slice(tagStart, matchEnd) });
    searchPos = matchEnd;
  }

  return sections;
}

export function extractConceptSection(html: string, key: string): string | null {
  return listConceptSections(html).find((s) => s.key === key)?.html ?? null;
}

// Swaps one section's fragment for a new one and returns the full updated page. Throws
// rather than silently no-op'ing on a bad key — a caller passing a key that doesn't exist
// in this exact html is a bug worth surfacing, not swallowing.
export function replaceConceptSection(html: string, key: string, newFragment: string): string {
  const target = listConceptSections(html).find((s) => s.key === key);
  if (!target) throw new Error(`Section "${key}" not found in this concept's HTML`);

  const idx = html.indexOf(target.html);
  if (idx === -1) throw new Error(`Section "${key}" could not be relocated for replacement`);

  return html.slice(0, idx) + newFragment + html.slice(idx + target.html.length);
}
