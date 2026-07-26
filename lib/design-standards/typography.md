# Typography standards

Generated sites must work standalone with no external font CDN, so every stack below uses
**system fonts only** — fonts already installed on the client's OS, referenced by CSS font-stack
with sensible fallbacks across Windows, macOS, and Linux. No `<link>` tags, no `@font-face`
downloads. This still produces real visual distinction across archetypes because modern system
fonts (Segoe UI Variable, San Francisco, Georgia, ui-monospace) span a wide range of moods.

**Pairing rule**: pick one distinctive font for headings and one quiet, highly-legible font for
body text — never two loud fonts, never the same font at the same weight for both. Contrast in
weight or classification (serif heading + sans body, or bold display sans + regular text sans)
is what makes a pairing read as intentional.

## Archetype: Professional / trustworthy / corporate

- **Heading**: `"Segoe UI Semibold", "Segoe UI", system-ui, -apple-system, Roboto, Arial, sans-serif`
- **Body**: `-apple-system, "Segoe UI", system-ui, Roboto, Helvetica, Arial, sans-serif`
- **Scale**: moderate size jumps (e.g. 16px body → 32px h1), medium weight headings (600), avoid
  extreme size contrast — it reads as considered rather than shouting.

## Archetype: Modern / tech / innovative

- **Heading**: `-apple-system, "Segoe UI", system-ui, Roboto, sans-serif` at a heavy weight (700-800)
- **Body**: same stack at regular weight (400), slightly tighter line-height (1.5)
- **Accent**: `ui-monospace, "SF Mono", "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace`
  for labels, stats, or code-like details — reinforces a technical feel without needing a
  downloaded font.

## Archetype: Playful / friendly / approachable

- **Heading**: `-apple-system, "Segoe UI", system-ui, Roboto, sans-serif` at a rounded-reading
  heavy weight (700), slightly larger than strictly needed
- **Body**: same stack, regular weight, generous line-height (1.6-1.7) for an easygoing feel
- **Note**: since a true rounded system font isn't reliably available cross-platform, lean on
  generous spacing, rounded UI corners, and warm color instead of font choice to carry the
  playful feel.

## Archetype: Luxurious / elegant / premium

- **Heading**: `Georgia, "Iowan Old Style", "Palatino Linotype", Palatino, "Times New Roman", serif`
  at a light-to-regular weight, generous letter-spacing on all-caps labels
- **Body**: `-apple-system, "Segoe UI", system-ui, Roboto, sans-serif` at regular weight — a serif
  heading against a clean sans body is the classic premium pairing
- **Scale**: larger size contrast than other archetypes (e.g. 16px body → 48px+ h1) — scale
  itself communicates luxury.

## Archetype: Bold / energetic / confident

- **Heading**: `-apple-system, "Segoe UI", system-ui, Roboto, sans-serif` at maximum weight
  (800-900), tight letter-spacing, often uppercase
- **Body**: same stack at regular weight — keep body text quiet so the heading weight reads as
  a deliberate contrast, not just "everything is bold"

## Archetype: Calm / wellness / minimal

- **Heading**: `Georgia, "Iowan Old Style", Palatino, serif` at a light weight, or
  `-apple-system, "Segoe UI", system-ui, sans-serif` at regular weight — avoid heavy weights
  entirely, they contradict the calm feel
- **Body**: same family as heading for a quieter, more unified page; wide line-height (1.7+)
  and generous paragraph spacing

## Archetype: Warm / organic / natural

- **Heading**: `Georgia, "Iowan Old Style", Palatino, serif` at regular weight — serif reads as
  crafted/human rather than mass-produced
- **Body**: `-apple-system, "Segoe UI", system-ui, Roboto, sans-serif` regular weight

## Archetype: Creative / artistic / expressive

- **Heading**: `-apple-system, "Segoe UI", system-ui, sans-serif` at heavy weight, used at
  unconventional scale/rotation/placement rather than a "special" typeface — the system-font
  constraint means creativity here comes from layout and color, not font selection
- **Body**: same stack at regular weight, kept deliberately plain so it doesn't compete with
  the expressive heading treatment

## General rules (all archetypes)

- Never use more than 2 font stacks on one page (heading stack + body stack; a monospace accent
  is a permitted third only for the Tech archetype).
- Set a real type scale (e.g. a 1.25 or 1.333 ratio) rather than picking sizes ad hoc.
- Line-height: tighter (1.1-1.3) for large headings, looser (1.5-1.7) for body copy.
