# Typography standards

Generated sites load their fonts from the Google Fonts CDN — real, distinctive typefaces
instead of the OS-default system-font stack. This is a deliberate reversal of an earlier
"system fonts only" rule: real websites are deployed live with an internet connection, so
there's no good reason to give up genuine typographic character for an offline guarantee
nobody needs in production. Every stack below still ends in a matching system-font fallback,
so the page degrades gracefully if the CDN is ever unreachable — it just won't look as
distinctive in that rare case.

**Include the archetype's `<link>` tag in `<head>`, before your own stylesheet.** Use the
`font-family` value given exactly as written (it already includes the CDN font first,
generic-family-appropriate system fonts after).

**Pairing rule**: pick one distinctive font for headings and one quiet, highly-legible font for
body text — never two loud fonts, never the same font at the same weight for both. Contrast in
weight or classification (serif heading + sans body, or bold display sans + regular text sans)
is what makes a pairing read as intentional.

## Archetype: Professional / trustworthy / corporate

- **Link**: `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Libre+Franklin:wght@600;700&family=Source+Sans+3:wght@400;600&display=swap" rel="stylesheet">`
- **Heading**: `"Libre Franklin", -apple-system, "Segoe UI", system-ui, Roboto, Arial, sans-serif` at 600-700 weight
- **Body**: `"Source Sans 3", -apple-system, "Segoe UI", system-ui, Roboto, Helvetica, Arial, sans-serif` at 400-600 weight
- **Scale**: moderate size jumps (e.g. 16px body → 32px h1), avoid extreme size contrast — it
  reads as considered rather than shouting.

## Archetype: Modern / tech / innovative

- **Link**: `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=IBM+Plex+Sans:wght@400;500&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">`
- **Heading**: `"Space Grotesk", -apple-system, "Segoe UI", system-ui, sans-serif` at 700 weight
- **Body**: `"IBM Plex Sans", -apple-system, "Segoe UI", system-ui, sans-serif` at 400 weight,
  slightly tighter line-height (1.5)
- **Accent**: `"IBM Plex Mono", ui-monospace, "SF Mono", Consolas, monospace` for labels, stats,
  or code-like details — reinforces a technical feel and shares a designer with the body font.

## Archetype: Playful / friendly / approachable

- **Link**: `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@600;700&family=Nunito+Sans:wght@400;600&display=swap" rel="stylesheet">`
- **Heading**: `"Fredoka", -apple-system, "Segoe UI", system-ui, sans-serif` at 600-700 weight —
  genuinely rounded, unlike any system font, so it carries the friendly feel on its own
- **Body**: `"Nunito Sans", -apple-system, "Segoe UI", system-ui, sans-serif` at 400-600 weight,
  generous line-height (1.6-1.7)

## Archetype: Luxurious / elegant / premium

- **Link**: `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,300;0,400;1,400&family=Karla:wght@400;500&display=swap" rel="stylesheet">`
- **Heading**: `"Fraunces", Georgia, "Times New Roman", serif` at 300-400 weight, italic for
  accents/pull-quotes, generous letter-spacing on all-caps labels — a high-contrast serif with
  real editorial character
- **Body**: `"Karla", -apple-system, "Segoe UI", system-ui, sans-serif` at regular weight — a
  serif heading against a clean sans body is the classic premium pairing
- **Scale**: larger size contrast than other archetypes (e.g. 16px body → 48px+ h1) — scale
  itself communicates luxury.

## Archetype: Bold / energetic / confident

- **Link**: `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;800;900&display=swap" rel="stylesheet">`
- **Heading**: `"Archivo", -apple-system, "Segoe UI", system-ui, sans-serif` at maximum weight
  (800-900), tight letter-spacing, often uppercase
- **Body**: same family (`"Archivo"`) at regular weight — one family across the whole weight
  range keeps it cohesive while the heading weight still reads as a deliberate contrast

## Archetype: Calm / wellness / minimal

- **Link**: `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Manrope:wght@300;500;600&display=swap" rel="stylesheet">`
- **Heading**: `"Manrope", -apple-system, "Segoe UI", system-ui, sans-serif` at 500-600 weight
- **Body**: `"Manrope", -apple-system, "Segoe UI", system-ui, sans-serif` at 300 weight — one
  family for a quieter, more unified page; wide line-height (1.7+) and generous paragraph
  spacing. Avoid heavy weights entirely, they contradict the calm feel.

## Archetype: Warm / organic / natural

- **Link**: `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Lora:wght@400;600&family=Mulish:wght@400;500&display=swap" rel="stylesheet">`
- **Heading**: `"Lora", Georgia, "Times New Roman", serif` at 400-600 weight — a warm, readable
  serif that reads as crafted/human rather than mass-produced
- **Body**: `"Mulish", -apple-system, "Segoe UI", system-ui, sans-serif` at regular weight

## Archetype: Creative / artistic / expressive

- **Link**: `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@500;700&family=Work+Sans:wght@400;500&display=swap" rel="stylesheet">`
- **Heading**: `"Bricolage Grotesque", -apple-system, "Segoe UI", system-ui, sans-serif` at
  600-700 weight, used at unconventional scale/rotation/placement — an expressive variable
  display face rather than the safest possible choice
- **Body**: `"Work Sans", -apple-system, "Segoe UI", system-ui, sans-serif` at regular weight,
  kept deliberately plain so it doesn't compete with the expressive heading treatment

## General rules (all archetypes)

- Never use more than 2 font families on one page (heading family + body family; a monospace
  accent is a permitted third only for the Tech archetype).
- Every `font-family` CSS value must end in the matching system-font fallback shown above —
  never reference the Google Font name alone.
- Set a real type scale (e.g. a 1.25 or 1.333 ratio) rather than picking sizes ad hoc.
- Line-height: tighter (1.1-1.3) for large headings, looser (1.5-1.7) for body copy.
- Use `<strong>` and `<em>` (or an equivalent weight/style bump in your own component markup)
  to give body copy rhythm — a key phrase, a number, a promise — instead of leaving every
  paragraph as one uniform weight and style throughout. Overusing this is worse than not using
  it at all: reserve it for the one or two phrases per section that actually deserve the
  emphasis, not every sentence.
- Headings are a hierarchy, not a repeated pattern: h1/h2/h3 should differ in more than just
  size — vary weight, color, or letter-spacing between levels so the structure of the page is
  legible even with the text scaled to gray boxes.
