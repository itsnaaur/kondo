# Third-Party Notices

This file records third-party data vendored into this repository, distinct from npm
dependencies (see `package.json`/`package-lock.json` for those). Two imports from the same
upstream repository (`ui-ux-pro-max-skill`, MIT) — see `lib/design/data/PROVENANCE.md` for full
import details of each (row counts, normalisation applied, source file hash).

## ui-ux-pro-max-skill

- Repository: https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
- Pinned commit SHA: `a38d04c3d5c298c851dbe5e6ee1965ee3de42cb5`
- What was taken:
  - `src/ui-ux-pro-max/data/colors.csv`, imported as `lib/design/data/palettes.json` — 191 of
    192 rows (see `lib/design/data/PROVENANCE.md` for which row was dropped and why).
  - `src/ui-ux-pro-max/data/typography.csv`, imported as `lib/design/data/typography.json` — 61
    of 74 rows (13 mobile/native-app pairings excluded; see `lib/design/data/PROVENANCE.md`'s
    `typography.json` section for exactly which and why).
  - No other file from this repository is vendored. `src/ui-ux-pro-max/data/google-fonts.csv`
    and `google-font-licenses.json` (used below to verify the fonts named in `typography.json`)
    are read at validation time only (`lib/design/build/validate-fonts.ts`) and never vendored.
- License: MIT

```
MIT License

Copyright (c) 2024 Next Level Builder

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Google Fonts (referenced by `lib/design/data/typography.json`)

`typography.json` does not vendor any font **files** — it stores font family names and
`fonts.googleapis.com` URLs (the same CDN-hosted-stylesheet approach the three shipped
templates already use, see `lib/templates/registry.ts`'s `GOOGLE_FONT_LINKS`). Every family a
font actually loads from is Google's own CDN at request time, under that family's own license,
not this repository's MIT terms.

The 61 imported pairings reference **88 distinct Google Fonts families** (54 distinct heading
fonts, 50 distinct body fonts, overlapping). Verified directly against
`google-font-licenses.json` inside the same pinned `ui-ux-pro-max-skill` clone above — itself
sourced from https://github.com/google/fonts at revision `038b637da7b3fd956a4ed93ffc607c3d5e4ce172`
(a separate pin, nested inside the `ui-ux-pro-max-skill` pin, not vendored into this repository)
— **87 are SIL Open Font License 1.1 (OFL), 1 is Apache License 2.0**: `Syncopate` (used in
pairing No. 56, "Kinetic Motion"). Every other family below is OFL.

Both licenses are standard, publicly available texts, identical across every family that uses
them, and neither font's actual binary is bundled here (see above — only the family name and a
CDN URL are stored). Linked rather than reproduced 88 times below; if full inline text is
required, it should be added here rather than assumed equivalent to the link:

- SIL Open Font License 1.1: https://openfontlicense.org
- Apache License 2.0: https://www.apache.org/licenses/LICENSE-2.0

Families (license in parentheses):

Abril Fatface (OFL), Amatic SC (OFL), Anton (OFL), Archivo (OFL), Atkinson Hyperlegible (OFL),
Baloo 2 (OFL), Barlow (OFL), Barlow Condensed (OFL), Be Vietnam Pro (OFL), Bebas Neue (OFL),
Bodoni Moda (OFL), Cabin (OFL), Caveat (OFL), Chakra Petch (OFL), Cinzel (OFL), Comic Neue (OFL),
Cormorant (OFL), Cormorant Garamond (OFL), Cormorant Infant (OFL), Crimson Pro (OFL), Crimson
Text (OFL), DM Sans (OFL), Didact Gothic (OFL), EB Garamond (OFL), Epilogue (OFL), Exo (OFL), Exo
2 (OFL), Figtree (OFL), Fira Code (OFL), Fira Sans (OFL), Fredoka (OFL), Great Vibes (OFL), IBM
Plex Sans (OFL), Inter (OFL), JetBrains Mono (OFL), Josefin Sans (OFL), Jost (OFL), Karla (OFL),
Lato (OFL), Lexend (OFL), Lexend Mega (OFL), Libre Baskerville (OFL), Libre Bodoni (OFL), Lora
(OFL), Manrope (OFL), Merriweather (OFL), Montserrat (OFL), Newsreader (OFL), Noto Naskh Arabic
(OFL), Noto Sans (OFL), Noto Sans Arabic (OFL), Noto Sans Hebrew (OFL), Noto Sans JP (OFL), Noto
Sans KR (OFL), Noto Sans SC (OFL), Noto Sans TC (OFL), Noto Sans Thai (OFL), Noto Serif JP (OFL),
Noto Serif TC (OFL), Nunito (OFL), Nunito Sans (OFL), Open Sans (OFL), Orbitron (OFL), Outfit
(OFL), Playfair Display (OFL), Playfair Display SC (OFL), Plus Jakarta Sans (OFL), Poiret One
(OFL), Poppins (OFL), Press Start 2P (OFL), Public Sans (OFL), Quicksand (OFL), Raleway (OFL),
Righteous (OFL), Roboto (OFL), Roboto Mono (OFL), Rubik (OFL), Russo One (OFL), Share Tech Mono
(OFL), Source Sans 3 (OFL), Source Serif 4 (OFL), Space Grotesk (OFL), Space Mono (OFL),
Syncopate (Apache-2.0), Syne (OFL), VT323 (OFL), Varela Round (OFL), Work Sans (OFL).
