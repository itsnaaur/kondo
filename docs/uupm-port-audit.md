# UI/UX Pro Max — port audit

**Audited repo:** `C:\Users\acer\Documents\project room\JRNY-Digital\ui-ux-pro-max-skill`
**At commit:** `a38d04c3d5c298c851dbe5e6ee1965ee3de42cb5` — "feat(search): overhaul relevance and curated design data", Fri 14 Aug 2026
**Working tree:** clean (`git status --porcelain` empty) — everything below is upstream HEAD, unmodified
**Audit date:** 17 Aug 2026 · **Audited by:** Claude Opus 5 · Read-only; nothing in the UUPM repo was changed
**Judged against:** Kondo's Node/TS pipeline — crawl a prospect site, extract content + brand colours, emit a bespoke self-contained landing page, unattended, dozens at a time

---

## Verdict

**Port a narrow slice of the data; do not port the selection logic.** The palette, typography and industry-mood tables are genuinely good — 192 role-semantic palettes that pass WCAG AA on every text pair bar one, 74 font pairings whose families and weights all resolve against a pinned `google/fonts` snapshot, all OFL/Apache — but the BM25 retrieval layer that turns a business description into a design system is not fit for unattended batch use, and its data taxonomy is built for consumer apps, not Australian service businesses.

**The single biggest caveat:** on our own five verticals the resolver silently produced a wrong-but-plausible answer three times out of five — a neuro-rehab clinic matched **Veterinary Clinic** and got a bubbly Claymorphism system, and an optometry practice got a **dark-mode "code green + difficulty amber"** palette lifted from *Coding Challenge & Practice* because the word "practice" appears in both. There is no confidence signal in the output that would let a batch job catch either.

---

## 1. Licence and provenance

### 1.1 LICENSE — full contents

`ui-ux-pro-max-skill/LICENSE`, verbatim:

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

### 1.2 Does it cover the data?

Yes, in the ordinary reading. MIT's grant is over "the Software and associated documentation files" — a single repo-root licence with no path scoping, and `skill.json:8` independently declares `"license": "MIT"` for the whole package. The CSVs are not carved out anywhere.

**Confirmed by search, not assumed:**

- `find src -iname "*licen*" -o -iname "*notice*" -o -iname "*attribut*"` returns exactly one file: `src/ui-ux-pro-max/data/google-font-licenses.json` — and that is a *manifest of Google Fonts licences*, not a licence over the dataset.
- No per-file header comments in the CSVs. `head -c 300 src/ui-ux-pro-max/data/colors.csv` starts directly with the column header row (`No,Product Type,Primary,...`). CSV has no comment syntax and none is faked.
- No `LICENSE`, `COPYING`, `NOTICE` or `TERMS` file anywhere under `src/`.

**What we must reproduce:** the copyright line and the permission notice, "in all copies or substantial portions." Importing 192 palette rows and 74 typography rows is a substantial portion. Practical form: a `THIRD_PARTY_NOTICES.md` (or a header block in the generated data module) carrying the text above verbatim plus a link to `https://github.com/nextlevelbuilder/ui-ux-pro-max-skill` and the pinned commit SHA. That is the whole obligation — no copyleft, no share-alike, no attribution in the *generated pages*.

### 1.3 Premium vs open

There is a paid tier, and the README is explicit about the split. `README.md:200–217`, verbatim:

```
## 💎 Basic vs. Premium Version Comparison

Many users ask about the differences between the open-source and premium versions. Here is a detailed breakdown to help you choose the right fit for your workflow.

### 🟢 Basic Version (This Repository)
* **Fully Open Source:** Perfect for individual developers, hobbyists, and standard projects.
* **Core UI/UX Intelligence:** Full access to 79 searchable UI styles (50 active), 192 product types, color palettes, and curated font pairings.
* **Smart Recommendations:** Built-in BM25 search engine for highly accurate design matching.
* **Cross-Platform Support:** Stack-specific guidelines supporting 22 major frameworks (React, Vue, Tailwind, iOS, Android, etc.).
* **Design System Generation:** Instantly generate tailored UI rules, patterns, and logic via CLI.

### 🟡 Premium Version
* **Extended Brand Design Skills:** Goes beyond UI/UX to include Brand Identity generation, Logo Design, Corporate Identity Programs (CIP), Banners, Presentation Slides, and custom Iconography.
* **Advanced Asset Creation:** Deep integration with AI-powered image generation to create real visual assets, not just placeholders.
* **Enterprise Architecture:** A more comprehensive and scalable Design Token architecture, built for large-scale team deployments.
* **Priority Support:** Dedicated technical assistance for teams and professionals who need an uninterrupted full design workflow.
```

The line **"Basic Version (This Repository)"** with **"Full access to … 192 product types, color palettes, and curated font pairings"** is the marker. Everything we want to import — `colors.csv`, `typography.csv`, `products.csv`, `ui-reasoning.csv`, `styles.csv`, `landing.csv` — is named as Basic. The Premium tier is asset *generation* (logos, banners, imagery), not a withheld data table. There is no premium marker column, no gated directory, and no encrypted/stub file in `src/ui-ux-pro-max/data/`. Nothing in this clone appears to be premium content.

### 1.4 Third-party data credited inside the data files

**Fonts.** `data/google-font-licenses.json` pins the upstream:

```json
"source": {"repository": "https://github.com/google/fonts",
           "metadataFile": "METADATA.pb",
           "revision": "038b637da7b3fd956a4ed93ffc607c3d5e4ce172"}
```

1934 families, licence distribution across the whole catalogue: `{'OFL': 1894, 'APACHE2': 35, 'UFL': 5}`.

Restricting to the **91 distinct families actually referenced by `typography.csv`** (heading font, body font, and every `family=` in the Google Fonts URL):

```
distinct families used by typography.csv: 91
not in licence manifest: []
licence distribution for used families: Counter({'OFL': 90, 'APACHE2': 1})
non-OFL used families: [('Syncopate', 'APACHE2')]
```

Both OFL 1.1 and Apache 2.0 permit commercial web use with no attribution surfaced to the end user. Serving them from `fonts.googleapis.com` (which is what every `CSS Import` cell in `typography.csv` does) carries no licence obligation on our side at all. If we ever self-host, OFL requires the licence file to ship with the font binaries and forbids selling the fonts standalone — neither is a constraint on us.

**Palettes.** No source credited. `colors.csv` has a `Notes` column but it contains design rationale ("Trust blue + orange CTA contrast"), not provenance. `data-provenance.json` records each palette as `{"type": "derived", "ref": "products.csv#Product Type=..."}` — i.e. internally derived, not lifted from a third-party palette library. I found no third-party palette credit anywhere in the repo. Hex triples are not copyrightable as such; the *curation* is, and MIT covers it.

**Icons.** `data/phosphor-icons-upstream.json` (856KB) and `icons.csv` reference Phosphor Icons and Heroicons — both MIT. Irrelevant to us; we are not importing icons.

### 1.5 Maintenance — active, not a snapshot

```
$ git log -1 --format="%H %ad %an %s"
a38d04c3d5c298c851dbe5e6ee1965ee3de42cb5 Fri Aug 14 00:08:23 2026 +0700 Viet Tran feat(search): overhaul relevance and curated design data

$ git log --oneline | wc -l
214
$ git log --since="2026-02-17" --oneline | wc -l
121
$ git log --since="2026-02-01" --date=format:"%Y-%m" --format="%ad" | sort | uniq -c
     11 2026-02
     38 2026-03
      2 2026-04
     41 2026-06
     31 2026-07
      8 2026-08
$ git log --since="2026-02-17" --format="%an" | sort -u | wc -l
53
$ git shortlog -sn --all | head -5
    59	Viet Tran
    30	Goon
    10	Alexander
    10	Duy /zuey/
     6	Clark Cant
```

Actively maintained: 121 commits and 53 distinct contributors in the last six months, last commit three days before this audit. That is a *fast-moving* upstream, which matters for pinning (§9.7) — a `main`-tracking import will drift under us.

One provenance nit worth knowing: the repo's own validator fails on a fresh Windows clone.

```
$ python validate_data.py; echo "exit: $?"
FAILED: 4 data integrity issue(s) found:
  - [catalog:summary] stale snapshot for google-fonts.csv
  - [catalog:summary] stale snapshot for google-font-licenses.json
  - [catalog:summary] stale snapshot for icons.csv
  - [catalog:summary] stale snapshot for phosphor-icons-upstream.json
exit: 1
```

This is **not** an upstream data defect — it is a line-ending artefact. `validate_data.py:666` SHA-256s the raw bytes; `git config core.autocrlf` is `true` here and the repo ships no `.gitattributes`, so every file is checked out CRLF. Normalising to LF reproduces the expected digests exactly:

```
google-fonts.csv           asis=d03194d2c35a2cdc lf=1c8c3b2ea1faf6a1 expected=1c8c3b2ea1faf6a1
google-font-licenses.json  asis=7c35e410dd8b5853 lf=35688523f2955795 expected=35688523f2955795
icons.csv                  asis=272ccf0eb60e50ba lf=50816c6012030178 expected=50816c6012030178
phosphor-icons-upstream.json asis=81c37fb3583eb43a lf=2399325233b277b5 expected=2399325233b277b5
```

Consequence for us: **any byte-level pin we take must normalise line endings first**, or the hash will differ on every developer machine.

---

## 2. Data inventory

Directory: `src/ui-ux-pro-max/data/` — 13 top-level CSVs, 22 stack CSVs under `data/stacks/`, 4 JSON sidecars.

### 2.0 Relevance triage

| File | Rows | Relevant to landing-page generation? |
|---|---:|---|
| `colors.csv` | 192 | **Yes — core.** 192 role-semantic palettes. |
| `typography.csv` | 74 | **Yes — core.** Curated Google Font pairings + ready CSS imports. |
| `ui-reasoning.csv` | 192 | **Yes — core.** Industry → mood / anti-patterns / decision rules. |
| `products.csv` | 192 | **Yes — join key + keyword corpus.** Also the industry taxonomy. |
| `styles.csv` | 88 | **Partial.** Good CSS-variable payloads; Tailwind-flavoured; 38/88 unreachable by search. |
| `landing.csv` | 34 | **Partial — needs re-annotation.** No controlled section vocabulary (§7.5). |
| `google-fonts.csv` | 1934 | **Reference only.** Weight/subset validation for the 91 families we'd use. |
| `google-font-licenses.json` | 1934 | **Reference only.** Licence audit trail. |
| `ux-guidelines.csv` | 119 | **Marginal.** Mostly prose; ~18 automatable (§7.6). |
| `motion.csv` | 17 | **Marginal.** GSAP snippets; we emit static CSS. |
| `charts.csv` | 25 | **No.** Dashboards/BI. |
| `icons.csv` | 105 | **No.** Phosphor/React import strings. |
| `app-interface.csv` | 32 | **No.** React Native mobile app UI. |
| `react-performance.csv` | 44 | **No.** React/Next runtime perf. |
| `data/stacks/*.csv` (22) | 1260 | **No.** Framework guidance (WPF, SwiftUI, Avalonia, …). |
| `phosphor-icons-upstream.json` | 1512 | **No.** |
| `catalog-summary.json`, `data-provenance.json` | — | **Reference only.** Counts, SHAs, freshness SLAs. |

Everything below is measured, not eyeballed — the script is `inventory.py` (Appendix C).

### 2.1 `products.csv` — 192 rows, 9 columns

| # | Column | Type | Empty % | Distinct |
|---:|---|---|---:|---:|
| 1 | `No` | int | 0.0 | 192 |
| 2 | `Product Type` | text-short (**PK**) | 0.0 | 192 |
| 3 | `Keywords` | comma-list | 0.0 | 192 |
| 4 | `Primary Style Recommendation` | ` + `-delimited style refs | 0.0 | 85 |
| 5 | `Secondary Styles` | ` , `-delimited style refs | 0.0 | 127 |
| 6 | `Landing Page Pattern` | text-short (FK, **36 broken** — §3.4) | 0.0 | 77 |
| 7 | `Dashboard Style (if applicable)` | free text | 0.0 | 129 |
| 8 | `Color Palette Focus` | free text | 0.0 | 191 |
| 9 | `Key Considerations` | text-long, free text | 0.0 | 192 |

Zero nulls anywhere. No controlled vocabulary in any column — even `Landing Page Pattern`, which reads like an enum, is free text (77 distinct values against 34 real patterns).

**Structured-inside-a-string columns:** `Primary Style Recommendation` uses ` + `; `Secondary Styles` uses ` , ` (note the *spaces around the comma* — a naive `split(",")` leaves leading whitespace); `Keywords` uses `, `. Parsing: `split(delim).map(s => s.trim()).filter(Boolean)`.

### 2.2 `colors.csv` — 192 rows, 19 columns

| # | Column | Type | Empty % | Distinct |
|---:|---|---|---:|---:|
| 1 | `No` | int | 0.0 | 192 |
| 2 | `Product Type` | text-short (**FK → products**) | 0.0 | 192 |
| 3 | `Primary` | hex6 | 0.0 | 50 |
| 4 | `On Primary` | hex6, **controlled** | 0.0 | 3 |
| 5 | `Secondary` | hex6 | 0.0 | 61 |
| 6 | `On Secondary` | hex6, **controlled** | 0.0 | 3 |
| 7 | `Accent` | hex6 | 0.0 | 33 |
| 8 | `On Accent` | hex6, **controlled** | 0.0 | 3 |
| 9 | `Background` | hex6 | 0.0 | 33 |
| 10 | `Foreground` | hex6 | 0.0 | 34 |
| 11 | `Card` | hex6 | 0.0 | 17 |
| 12 | `Card Foreground` | hex6 | 0.0 | 34 |
| 13 | `Muted` | hex6 | 0.0 | 72 |
| 14 | `Muted Foreground` | hex6, **controlled** | 0.0 | 4 |
| 15 | `Border` | **mixed** hex6 (173) / `rgba()` (19) | 0.0 | 57 |
| 16 | `Destructive` | hex6, **controlled** | 0.0 | 3 |
| 17 | `On Destructive` | hex6, **controlled** | 0.0 | 2 |
| 18 | `Ring` | hex6 | 0.0 | 46 |
| 19 | `Notes` | free text | 0.0 | 192 |

Full controlled vocabularies:

```
On Primary      (3): ['#000000', '#0F172A', '#FFFFFF']
On Secondary    (3): ['#000000', '#0F172A', '#FFFFFF']
On Accent       (3): ['#000000', '#0F172A', '#FFFFFF']
On Destructive  (2): ['#000000', '#FFFFFF']
Destructive     (3): ['#DC2626', '#EF4444', '#FF3B30']
Muted Foreground(4): ['#475569', '#5F6673', '#94A3B8', '#CBD5E1']
Background     (33): ['#000000','#020617','#050510','#0B0B10','#0D1117','#0F0F23','#0F172A','#1C1917','#1F2937','#888888','#ECFDF5','#ECFEFF','#EEF2FF','#EFF6FF','#F0F9FF','#F0FDF4','#F0FDFA','#F5F3FF','#F5F5F0','#F5F5F7','#F8FAFC','#FAF5F2','#FAF5FF','#FAFAF9','#FAFAFA','#FDF2F8','#FDF4FF','#FEF2F2','#FEF3C7','#FFF1F2','#FFF7ED','#FFFBEB','#FFFFFF']
Accent         (33): ['#0284C7','#0369A1','#059669','#0891B2','#0EA5E9','#16A34A','#18181B','#1E40AF','#22C55E','#2563EB','#3B82F6','#4338CA','#6366F1','#7C3AED','#8B5CF6','#92400E','#A16207','#B45309','#CA8A04','#D97706','#DC2626','#E11D48','#EA580C','#EC4899','#EF4444','#F43F5E','#F59E0B','#F8FAFC','#F97316','#FBBF24','#FF00FF','#FF3333','#FFFFFF']
Card           (17): ['#0C0C0C','#0C0C0D','#0C130E','#0E1223','#101823','#182424','#192134','#1B1B30','#1B2336','#1E1C35','#1E1D35','#1E1E23','#222735','#262321','#313742','#999999','#FFFFFF']
```

**Flag:** `Border` is the only format-inconsistent column in the whole directory — 19 rows use `rgba(255,255,255,0.08)` instead of hex, all of them dark-background palettes. Any importer must handle both or normalise.

**No column is mostly empty.** `colors.csv` has a 0.0% null rate in all 19 columns.

### 2.3 `ui-reasoning.csv` — 192 rows, 12 columns

| # | Column | Type | Empty % | Distinct |
|---:|---|---|---:|---:|
| 1 | `No` | int | 0.0 | 192 |
| 2 | `UI_Category` | text-short (**FK → products**) | 0.0 | 192 |
| 3 | `Recommended_Pattern` | text (FK → landing, via aliases) | 0.0 | 88 |
| 4 | `Style_Priority` | ` + `-delimited style refs | 0.0 | 94 |
| 5 | `Color_Mood` | free text | 0.0 | 192 |
| 6 | `Typography_Mood` | free text | 0.0 | 97 |
| 7 | `Key_Effects` | free text | 0.0 | 132 |
| 8 | `Decision_Rules` | **JSON in a string** | 0.0 | 131 |
| 9 | `Anti_Patterns` | ` + `-delimited free-text clauses | 0.0 | 131 |
| 10 | `Severity` | **controlled**: `HIGH`, `MEDIUM` | 0.0 | 2 |
| 11 | `Reasoning` | free text | **83.9** | 31 |
| 12 | `Confidence` | float 0.88–0.95 | **83.9** | 8 |

**Two mostly-empty columns flagged:** `Reasoning` and `Confidence` are populated on only 31 of 192 rows (83.9% empty). If we were hoping to filter by confidence, we can't — 161 rows have none. (Note: `data-provenance.json` carries a separate `confidence` per reasoning entity for all 192; that one *is* complete. Different field, different file.)

**The JSON-in-a-string column.** `Decision_Rules` raw form, verbatim from three rows:

```
Legal Services  → {"must_have":["constraint:case-results","constraint:credential-display"]}
B2B Service     → {"must_have":["constraint:case-studies","constraint:roi-messaging"]}
Medical Clinic  → {"must_have":["constraint:appointment-booking","constraint:insurance-info"]}
SaaS (General)  → {"if_ux_focused":["style:minimalism-and-swiss-style", ...]}
```

Parsing needed: `JSON.parse`, then validate against a closed grammar — conditions from a 36-name allow-list, actions of the form `prefix:value` where prefix ∈ `{constraint, style, pattern, mode}`. All 192 rows parse cleanly and zero use unknown conditions (verified — §4.6).

### 2.4 `styles.csv` — 88 rows, 29 columns

| # | Column | Type | Empty % | Distinct |
|---:|---|---|---:|---:|
| 1 | `No` | int | 0.0 | 88 |
| 2 | `Style Category` | text (**natural key**) | 0.0 | 88 |
| 3 | `Type` | **controlled** (6) | 0.0 | 6 |
| 4 | `Keywords` | comma-list | 0.0 | 88 |
| 5 | `Primary Colors` | free text + embedded hex | 0.0 | 88 |
| 6 | `Secondary Colors` | free text + embedded hex | 0.0 | 85 |
| 7 | `Effects & Animation` | comma-list | 0.0 | 88 |
| 8 | `Best For` | comma-list | 0.0 | 88 |
| 9 | `Do Not Use For` | comma-list | 0.0 | 87 |
| 10 | `Light Mode ✓` | **controlled** (3) | 0.0 | 3 |
| 11 | `Dark Mode ✓` | **controlled** (3) | 0.0 | 3 |
| 12 | `Performance` | **controlled** key:value pipe-list (3) | 0.0 | 3 |
| 13 | `Accessibility` | **controlled** key:value pipe-list (3) | 0.0 | 3 |
| 14 | `Mobile-Friendly` | **controlled** (4) | 0.0 | 4 |
| 15 | `Conversion-Focused` | semi-controlled (10, glyph-prefixed) | 0.0 | 10 |
| 16 | `Framework Compatibility` | pipe-list | 0.0 | 49 |
| 17 | `Era/Origin` | free text | 0.0 | 54 |
| 18 | `Complexity` | **controlled** (3) | 0.0 | 3 |
| 19 | `AI Prompt Keywords` | free text | 0.0 | 88 |
| 20 | `CSS/Technical Keywords` | CSS-ish free text | 0.0 | 85 |
| 21 | `Implementation Checklist` | `☐ `-prefixed comma-list | 0.0 | 85 |
| 22 | `Design System Variables` | **CSS custom properties** | 0.0 | 85 |
| 23 | `Style ID` | slug (**PK**) | 0.0 | 88 |
| 24 | `Aliases` | pipe-list | **71.6** | 25 |
| 25 | `Status` | **controlled**: active/supplemental/deprecated | 0.0 | 3 |
| 26 | `Parent Style ID` | FK → self | **67.0** | 16 |
| 27 | `Replacement Domain` | **controlled**: landing/style | **89.8** | 2 |
| 28 | `Replacement ID` | FK cross-domain | **89.8** | 9 |
| 29 | `Preferred Mode` | **controlled**: auto/dark | 0.0 | 2 |

```
Type                (6): ['BI/Analytics','General','Landing Page','Mobile','Platform/Material','Platform/System']
Light Mode ✓        (3): ['conditional','not-recommended','supported']
Dark Mode ✓         (3): ['conditional','not-recommended','supported']
Performance         (3): ['cost:high|drivers:animation,large-images','cost:low|drivers:none','cost:moderate|drivers:animation,blur']
Accessibility       (3): ['risk:conditional|requires:contrast-text-4.5,keyboard,visible-focus,reduced-motion',
                          'risk:high|requires:...', 'risk:low|requires:...']
Mobile-Friendly     (4): ['adaptable','conditional','native','not-recommended']
Conversion-Focused (10): ['◐ Low','◐ Medium','✓ High','✓ High (Viral)','✓ High energy','✓ Medium','✓ Very High','✗ Low','✗ Low-Conversion','✗ Not applicable']
Complexity          (3): ['High','Low','Medium']
Status              (3): ['active','deprecated','supplemental']
Preferred Mode      (2): ['auto','dark']
```

**Structured-inside-a-string:** `Performance` and `Accessibility` are `key:value|key:csv-list` — a two-level parse. `Design System Variables` is a comma-separated list of CSS declarations (`--spacing: 2rem, --border-radius: 0px, --font-...`) — note the delimiter is a comma but values may themselves contain commas in font stacks, so it is *not* safely splittable; it needs a CSS-declaration-aware parse or manual cleanup. **This is the one column I would not trust to a regex.**

**Mostly-empty columns flagged:** `Aliases` (71.6%), `Parent Style ID` (67.0%), `Replacement Domain` / `Replacement ID` (89.8%). All four are legitimately sparse — they only apply to aliased or deprecated rows — not data rot.

**`Conversion-Focused` is a taxonomy smell:** 10 values across three glyph prefixes (`✓`/`◐`/`✗`) that encode an ordinal, plus free-text qualifiers ("High (Viral)", "High energy"). Not machine-usable without a hand-written mapping.

### 2.5 `landing.csv` — 34 rows, 10 columns

| # | Column | Type | Empty % | Distinct |
|---:|---|---|---:|---:|
| 1 | `No` | int | 0.0 | 34 |
| 2 | `Pattern Name` | text (**natural key**) | 0.0 | 34 |
| 3 | `Keywords` | comma-list | 0.0 | 34 |
| 4 | `Section Order` | ` > `-delimited, **free text** | 0.0 | 34 |
| 5 | `Primary CTA Placement` | free text | 0.0 | 34 |
| 6 | `Color Strategy` | text-long, free text | 0.0 | 34 |
| 7 | `Recommended Effects` | comma-list | 0.0 | 34 |
| 8 | `Conversion Optimization` | text-long, free text | 0.0 | 34 |
| 9 | `Pattern ID` | slug (**PK**) | 0.0 | 34 |
| 10 | `Aliases` | pipe-list | **61.8** | 13 |

All 34 `Pattern ID`s and `Pattern Name`s are listed in §7.5. `Section Order` is the column we most need and the weakest one in the directory — see §7.5.

### 2.6 `typography.csv` — 74 rows, 11 columns

| # | Column | Type | Empty % | Distinct |
|---:|---|---|---:|---:|
| 1 | `No` | int | 0.0 | 74 |
| 2 | `Font Pairing Name` | text (**PK**) | 0.0 | 74 |
| 3 | `Category` | semi-controlled (26) | 0.0 | 26 |
| 4 | `Heading Font` | family name | 0.0 | 58 |
| 5 | `Body Font` | family name | 0.0 | 53 |
| 6 | `Mood/Style Keywords` | comma-list (**the useful join key**) | 0.0 | 74 |
| 7 | `Best For` | comma-list | 0.0 | 74 |
| 8 | `Google Fonts URL` | url with embedded weight spec | 0.0 | 73 |
| 9 | `CSS Import` | ready-to-paste `@import` | 0.0 | 73 |
| 10 | `Tailwind Config` | JS object fragment | 0.0 | 68 |
| 11 | `Notes` | text-long | 0.0 | 74 |

```
Category (26): ['Display + Mono','Display + Sans','Display + Serif','Display Rounded + Geometric Sans',
'Display Serif + Sans + Mono','Geometric Sans (Bold-Only)','Geometric Sans (Single Dominant)',
'Geometric Sans (Single Family)','Geometric Sans (System Fallback)','Geometric Sans + Sans + Mono (Triple)',
'Geometric Sans + Single Weight','Handwritten + Handwritten (Dual)','Mono + Mono','Mono + Mono (Single Family)',
'Mono + Sans','Sans (System Default)','Sans + Mono','Sans + Sans','Sans + Serif (Display) + Mono',
'Script + Sans','Script + Serif','Serif + Book Serif + Engraved (Triple Stack)','Serif + Sans','Serif + Serif',
'Serif + Serif + Mono (Triple Stack)','Tech Display + Mono']
```

**Structured-inside-a-string:** `Google Fonts URL` encodes the weight axis — `family=Inter:wght@300;400;500;600;700&family=...`. To validate against `google-fonts.csv` you must parse `family=` segments, split on `:`, then extract three-digit weights. That's what §7.3 does.

### 2.7 `google-fonts.csv` — 1934 rows, 15 columns

| # | Column | Type | Empty % | Distinct |
|---:|---|---|---:|---:|
| 1 | `Family` | text (**PK**) | 0.0 | 1934 |
| 2 | `Category` | **controlled** (5) | 0.0 | 5 |
| 3 | `Stroke` | **controlled** (3) | **29.9** | 3 |
| 4 | `Classifications` | **controlled** pipe-list (8) | **44.1** | 8 |
| 5 | `Keywords` | free text | 1.1 | 766 |
| 6 | `Styles` | ` \| `-list of `400`/`400i` | 0.0 | 92 |
| 7 | `Variable Axes` | ` \| `-list of `axis: lo..hi` | **71.7** | 97 |
| 8 | `Subsets` | pipe-list | 5.7 | 313 |
| 9 | `Designers` | free text | 0.0 | 589 |
| 10 | `Popularity Rank` | int | 0.0 | 1219 |
| 11 | `Trending Rank` | int | 0.0 | 1256 |
| 12 | `Is Noto` | **controlled**: Yes/No | 0.0 | 2 |
| 13 | `Date Added` | ISO date | 0.0 | 561 |
| 14 | `Last Modified` | ISO date | 0.0 | 56 |
| 15 | `Google Fonts URL` | url | 0.0 | 1934 |

```
Category        (5): ['Display','Handwriting','Monospace','Sans Serif','Serif']
Stroke          (3): ['Sans Serif','Serif','Slab Serif']
Classifications (8): ['Display','Display | Handwriting','Display | Monospace','Display | Symbols',
                      'Handwriting','Handwriting | Symbols','Monospace','Symbols']
```

`Variable Axes` is 71.7% empty — correct, most families are static. `Classifications` at 44.1% empty is a genuine gap if we wanted to filter by it.

### 2.8 `ux-guidelines.csv` — 119 rows, 10 columns

| # | Column | Type | Empty % | Distinct |
|---:|---|---|---:|---:|
| 1–10 | `No`, `Category`, `Issue`, `Platform`, `Description`, `Do`, `Don't`, `Code Example Good`, `Code Example Bad`, `Severity` | all text | 0.0 | — |

```
Category (20): ['AI Interaction','Accessibility','Animation','Content','Data Entry','Feedback','Forms',
'Forms / Accessibility','Interaction','Layout','Navigation','Onboarding','Performance','Responsive','Search',
'Security / Accessibility','Spatial UI','Sustainability','Touch','Typography']
Platform  (4): ['All','Mobile','VisionOS','Web']
Severity  (4): ['Critical','High','Low','Medium']   → Counter({'Medium': 62, 'High': 44, 'Low': 9, 'Critical': 4})
```

Note the taxonomy is already leaking: `Forms` and `Forms / Accessibility` are separate categories, as are `Accessibility` and `Security / Accessibility`.

### 2.9 Files we will not use — inventory for completeness

| File | Rows × Cols | What it is | Controlled vocabularies |
|---|---|---|---|
| `charts.csv` | 25 × 15 | Chart-type selection for dashboards | `Data Type` (25), `Best Chart Type` (25), `Accessibility Risk` (3: `risk:low/conditional/high`), `Interactive Level` (17). **`Accessibility Grade` is a single value: `"deprecated: use Accessibility Risk"` — a dead column left in place.** |
| `icons.csv` | 105 × 11 | Curated Phosphor icons with React import strings | `Library` (3), `Style` (1: `Outline`), `Semantic Role` (3), `Allowed Contexts` (1: `decorative\|meaningful\|interactive` — same value on all 105 rows, i.e. a constant masquerading as data) |
| `motion.csv` | 17 × 12 | GSAP animation presets | `Category` (7), `Intensity Tier` (3: Subtle/Standard/Complex), `Trigger` (9), `Duration` (13), `Easing` (12) |
| `app-interface.csv` | 32 × 11 | React Native mobile app UI rules | `Category` (12), `Platform` (1: `iOS/Android/React Native`), `Severity` (4) |
| `react-performance.csv` | 44 × 11 | React/Next perf rules | `Category` (8), `Platform` (1: `React/Next.js`), `Severity` (6 — note `Low-Medium`/`Medium-High` break the 4-value scale used elsewhere) |
| `data/stacks/*.csv` | 22 files, 1260 rows, 13 cols each | Per-framework guidance (React, Vue, WPF, SwiftUI, Avalonia, UWP…) | shared schema: `Category, Guideline, Description, Do, Don't, Code Good, Code Bad, Severity, Docs URL, Applies To, Status, Verified At` |
| `phosphor-icons-upstream.json` | 1512 icons | Upstream Phosphor manifest | — |
| `catalog-summary.json` | — | Counts + SHA-256 snapshots + promotion policy | — |
| `data-provenance.json` | 192+ records | Per-entity `status`, `verifiedAt`, `sla`, `confidence`, `sources` | `sla` ∈ {`manual-verified`, `needs-review`} |

Three verbatim rows from every one of these files: **Appendix B**.

---

## 3. The join model

### 3.1 Relationship map

```
                       products.csv  (192)
                     Product Type  ── PK, exact string
                            │
        ┌───────────────────┼───────────────────────┐
        │ exact string      │ exact string          │ ' + '-split, casefold
        ▼                   ▼                       ▼
   colors.csv (192)   ui-reasoning.csv (192)   styles.csv (88)
   Product Type       UI_Category              Style ID | Style Category | Aliases
                            │                       ▲
                            │ Style_Priority        │ ' + '-split, casefold
                            ├───────────────────────┘
                            │
                            │ Recommended_Pattern, casefold
                            ▼
                     landing.csv (34)
                     Pattern ID | Pattern Name | Aliases('|'-split)

   typography.csv (74) ──── NO FK AT ALL. Reached only by BM25 over
                            Mood/Style Keywords + Best For.

   google-fonts.csv (1934) ── validation-only; typography.Heading/Body Font
                              matches Family by exact string.
```

**The join key is an exact, case-sensitive string** for the products↔colors↔reasoning triple, and a **casefolded** string for the style and landing lookups (`design_system.py:304`, `:293`). It is not an ID, and it is not fuzzy — the fuzziness lives entirely in *getting to* a `Product Type` in the first place (BM25, §4).

`typography.csv` is the odd one out: **there is no foreign key from any industry to a font pairing.** The only route is a BM25 query built from `ui-reasoning.Typography_Mood` (`design_system.py:349–352`). That is the weakest link in the chain and the one we would most want to replace with an explicit table.

### 3.2 Are palettes 1:1 with product types?

**Confirmed — perfectly.** Script: `joins.py` (Appendix C).

```
counts: products=192 colors=192 reasoning=192 styles=88 landing=34 typography=74

-- products <-> colors (exact string key) --
products with no palette: []
palettes with no product: []
order identical: True

-- duplicates --
  products: none
  colors: none
  reasoning: none
```

Zero products without a palette, zero palettes without a product, and the two files are in **identical row order**. This is a 1:1:1 spine, not a lookup that can miss.

### 3.3 Does every product type have a reasoning row?

**Confirmed — yes, all 192.**

```
-- products <-> ui-reasoning --
products with no reasoning row: []
reasoning with no product: []
order identical: True
```

### 3.4 Where a lookup *can* miss

The `Product Type` spine cannot miss. Three other joins can:

**(a) Style references — clean.**
```
-- ui-reasoning.Style_Priority tokens -> styles.csv --
  total refs=383  unresolved distinct=0
-- products.Primary Style Recommendation tokens -> styles.csv --
  total refs=380  unresolved distinct=0
```
All 763 style references resolve through the `Style ID | Style Category | Aliases` lookup.

**(b) `ui-reasoning.Recommended_Pattern` → landing — clean.**
```
distinct patterns referenced=88, unresolved=0
```
88 distinct pattern names map onto 34 rows entirely via the `Aliases` column. This is the join the design-system generator actually uses (`design_system.py:344`).

**(c) `products.Landing Page Pattern` → landing — 36 of 77 distinct values are broken.**
```
-- products.Landing Page Pattern -> landing.csv --
  unresolved distinct=36
    UNRESOLVED 'Bot Fleet Dashboard'                    (1 rows, e.g. RPA / Automation Dashboard)
    UNRESOLVED 'Content-Index + Search'                 (1 rows, e.g. Academic Journal / Scholarly Publishing)
    UNRESOLVED 'Dashboard + Course Grid'                (1 rows, e.g. LMS (Learning Management System))
    UNRESOLVED 'Feature-Rich Showcase + Conversion'     (4 rows, e.g. Logistics/Delivery)
    UNRESOLVED 'Filter-Heavy Grid + Map'                (2 rows, e.g. Directory / Listing Site)
    UNRESOLVED 'Hero-Centric Design + Conversion'       (4 rows, e.g. Restaurant/Food Service)
    UNRESOLVED 'Hero-Centric Design + Social Proof'     (3 rows, e.g. Beauty/Spa/Wellness Service)
    UNRESOLVED 'N/A - Analytics focused'                (1 rows, e.g. Analytics Dashboard)
    UNRESOLVED 'N/A - Dashboard focused'                (1 rows, e.g. Financial Dashboard)
    UNRESOLVED 'Storytelling-Driven + Trust'            (1 rows, e.g. Non-profit/Charity)
    ... 26 more
```

This column is **dead data** — no code path reads it, which is why nobody noticed it rotted. If we import `products.csv` we must not treat column 6 as a foreign key.

### 3.5 The fallback path in the code

This is the part that matters most for batch use. There are two distinct fallbacks and they compose badly.

**Fallback 1 — search abstains.** `core.py:444–447`:

```python
abstain = (top_score <= threshold["min_score"]
           or coverage < threshold["min_coverage"]
           or (threshold["min_margin"] > 0
               and top_score - runner_up_score < threshold["min_margin"]))
```

with per-domain floors at `core.py:203–211`:

```python
_DOMAIN_SCORE_FLOORS = {
    "style": 4.3, "landing": 4.0, "product": 6.0, "icons": 5.8,
    "react": 3.3,
}
_SEARCH_THRESHOLDS = {
    domain: {"min_score": _DOMAIN_SCORE_FLOORS.get(domain, 0.0),
             "min_margin": 0.0, "min_coverage": 0.5 if domain == "landing" else 0.0}
    for domain in CSV_CONFIG
}
```

Note what is **absent**: there is no `"color"` and no `"typography"` key. Both fall through to `min_score: 0.0`, `min_coverage: 0.0`, `min_margin: 0.0` — **the colour and typography domains can never abstain.** They will always return their top-scoring row no matter how weak the match. This is the mechanism behind the optometrist getting a coding-app palette (§6.5).

**Fallback 2 — no reasoning row.** `design_system.py:369–383`:

```python
if not rule:
    return {
        "pattern": "Hero + Features + CTA",
        "style_priority": ["Minimalism", "Flat Design"],
        "color_mood": "Professional",
        "typography_mood": "Clean",
        "key_effects": "Subtle hover transitions",
        "anti_patterns": "",
        ...
        "is_default": True,
        "severity": "MEDIUM"
    }
```

**How they compose into a bug.** When product search abstains, `design_system.py:464–466` sets `category = "General"`:

```python
category = "General"
if product_results:
    category = product_results[0].get("Product Type", "General")
```

and `_multi_domain_search` then splices that literal string into every downstream query (`design_system.py:326–328`):

```python
resolved_query = " ".join(
    part for part in (query, category, constraints) if part
)
```

So the word **"General"** — a sentinel, not a description — becomes a *search token* in the colour and typography corpora. Because the colour domain has no score floor, it happily matches `SaaS (General)`. Verified directly:

```
QUERY: Professional NDIS disability support provider, culturally diverse communities, Melbourne General
 tokens: ['professional','ndis','disability','support','provider','culturally','diverse','communities','melbourne','general']
     4.291  SaaS (General)          Notes=Trust blue + orange CTA contrast [Accent adjusted fr
     3.600  B2B Service             Notes=Professional navy + blue CTA
     3.393  Real Estate/Property    Notes=Trust teal + professional blue
```

**Net effect for batch use:** a total retrieval failure does not produce an error, a null, or a low-confidence flag. It produces a complete, confident-looking design system assembled from a sentinel token. The only signal is `reasoning_default: true` buried in the JSON — which is *not* set when the product matched but matched wrongly (the Veterinary Clinic case), so it is not a sufficient guard.

### 3.6 Orphan rows

**Landing patterns — 14 of 34 (41%) are unreachable.** No `ui-reasoning.Recommended_Pattern` and no `products.Landing Page Pattern` references them:

```
ORPHAN: comparison-table-cta        | Comparison Table + CTA
ORPHAN: lead-magnet-form            | Lead Magnet + Form
ORPHAN: pricing-page-cta            | Pricing Page + CTA
ORPHAN: video-first-hero            | Video-First Hero
ORPHAN: ai-personalization-landing  | AI Personalization Landing
ORPHAN: waitlist-coming-soon        | Waitlist/Coming Soon
ORPHAN: comparison-table-focus      | Comparison Table Focus
ORPHAN: pricing-focused-landing     | Pricing-Focused Landing
ORPHAN: app-store-style-landing     | App Store Style Landing
ORPHAN: before-after-transformation | Before-After Transformation
ORPHAN: webinar-registration        | Webinar Registration
ORPHAN: horizontal-scroll-journey   | Horizontal Scroll Journey
ORPHAN: interactive-3d-configurator | Interactive 3D Configurator
ORPHAN: ai-driven-dynamic-landing   | AI-Driven Dynamic Landing
```

They are reachable by a *direct* landing-domain search (`search.py "Video-First Hero" --domain landing`), just never by the design-system pipeline. For us that's arguably fine — several of them (Before-After Transformation, Lead Magnet + Form) are patterns we'd *want* for a physio or a law firm, so the orphaning is upstream's loss, not a data defect.

**Styles — 38 of 88 unreachable by search.** `core.py:810–812` filters the style domain to `Status == "active"`:

```python
row_filter=(
    (lambda row: row.get("Status", "active") == "active")
    if search_domain == "style" else None
),
```

That excludes 29 `supplemental` + 9 `deprecated` = 38 rows. But three supplemental styles *are* referenced by reasoning rows and reached through the direct-resolve path in `_select_best_match` (`design_system.py:419–422`), bypassing the filter:

```
reasoning refs to non-active styles: {('Swiss Modernism 2.0','supplemental'): 8,
                                      ('Heat Map & Heatmap Style','supplemental'): 1,
                                      ('Real-Time Monitoring','supplemental'): 1}
```

**`products.Landing Page Pattern`** (column 6) is fully orphaned as described in §3.4 — no code path reads it.

**`charts.Accessibility Grade`** holds a single value on all 25 rows: `"deprecated: use Accessibility Risk"`. Dead column.

**`icons.Allowed Contexts`** holds the identical value `decorative|meaningful|interactive` on all 105 rows. A constant, not data.

---

## 4. The ranking algorithm

Files: `scripts/search.py` (171 lines, CLI only), `scripts/core.py` (993, retrieval), `scripts/design_system.py` (1643, aggregation + formatting + persistence), `scripts/reasoning_contract.py` (123, rule grammar).

### 4.1 End to end

`search.py:122–134` dispatches `--design-system` to `generate_design_system`, which is a thin wrapper (`design_system.py:919–957`) around `DesignSystemGenerator.generate` (`design_system.py:449–604`). That method is the whole algorithm:

1. **`search(query, "product", 1)`** — BM25 over `products.csv`, floor 6.0. Yields `category`, or the sentinel `"General"` on abstain (`:462–466`).
2. **`_apply_reasoning(category, query)`** (`:365–406`) — exact casefold lookup into `ui-reasoning.csv`; parse `Decision_Rules`; evaluate them against the *raw query string*; produce `pattern`, `style_priority`, `color_mood`, `typography_mood`, `anti_patterns`, `constraints`, `preferred_mode`.
3. **Variance dial** (`:474–476`) — if set, *prepends* hard-coded style keywords to `style_priority`.
4. **`_multi_domain_search`** (`:319–355`) — four more BM25 searches, each with a *differently constructed* query (below).
5. **Selection** (`:489–500`) — `_select_best_match` for style; mode resolution then `_select_palette_for_mode` for colour; `[0]` for typography; name-match-else-`[0]` for landing.
6. **Motion dial** (`:506–513`) — an independent 5th search into `motion.csv`.
7. **Assemble** the return dict (`:521–604`).

### 4.2 BM25 specifics

`core.py:282–347`. Textbook Robertson/Sparck-Jones with the `+1` IDF variant.

- **k1 = 1.5, b = 0.75** — `core.py:285`: `def __init__(self, k1=1.5, b=0.75)`. Never overridden anywhere in the codebase.
- **IDF** — `core.py:321`: `log((N - df + 0.5) / (df + 0.5) + 1)`.
- **Corpus** — one BM25 index *per CSV file per field-set*. Not a single joined corpus. `CSV_CONFIG` (`core.py:18–79`) declares `search_cols` per domain:

| Domain | File | Columns concatenated into the document |
|---|---|---|
| `product` | products.csv | `Product Type`, `Keywords`, `Primary Style Recommendation`, `Key Considerations` |
| `color` | colors.csv | `Product Type`, `Notes` |
| `style` | styles.csv | `Style ID`, `Style Category`, `Aliases`, `Keywords`, `Best For`, `Type`, `AI Prompt Keywords` |
| `landing` | landing.csv | `Pattern ID`, `Pattern Name`, `Aliases`, `Keywords`, `Conversion Optimization`, `Section Order` |
| `typography` | typography.csv | `Font Pairing Name`, `Category`, `Mood/Style Keywords`, `Best For`, `Heading Font`, `Body Font` |

- **Field weighting: none.** `core.py:397–398`:
  ```python
  documents = [" ".join(str(row.get(column, "")) for column in search_cols)
               for row in data]
  ```
  Every column is flattened into one bag of words with equal weight. A term in `Product Type` counts exactly as much as a term buried in `Key Considerations`. **This is the root cause of most of our misfires** — `Key Considerations` is a long prose field, so incidental words in it compete with the actual category name.
- **Index build: at runtime, on first use, then cached in-process.** `core.py:386–402`, keyed by `(filepath, tuple(search_cols), _INDEX_VERSION, cache_variant)` and invalidated by `(st_mtime_ns, st_size)`. Nothing is precomputed on disk. Cost measured below.

### 4.3 Tokenisation

`core.py:296–300`:

```python
def tokenize(self, text):
    text = _normalize(str(text).lower())
    text = re.sub(r'[^\w\s]', ' ', text)
    return [w for w in text.split() if len(w) >= 2 and w not in _STOPWORDS]
```

- **Case:** lowercased, always.
- **Punctuation:** every non-word char → space. So `Q&A` → `q a`, `nuxt.js` → `nuxt js`, `#0077B6` → `0077b6`.
- **Stopwords:** a deliberately tiny 24-word list (`core.py:241–244`) — `to in on at is of by or an if no so do be we it as the and for are was`. Short domain tokens (`ui`, `ux`, `ai`, `css`, `3d`, `js`) are preserved by design.
- **Minimum length 2** — single characters are dropped.
- **Stemming: none.** No Porter, no lemmatiser. `physiotherapy` and `physiotherapist` are unrelated tokens; `clinic` and `clinics` are unrelated tokens.
- **Multi-word phrases: not handled in scoring.** BM25 is pure bag-of-words. Phrases only exist in the *domain-routing* layer (`_contains_phrase`, `core.py:589–592`), which does a word-boundary regex over the raw query to pick which CSV to search — it never affects the ranking within a corpus.
- **Synonyms:** a 16-entry hand-written table (`core.py:248–265`) applied longest-first at word boundaries — `colour→color`, `a11y→accessibility`, `e-commerce→ecommerce`, `nav→navigation`, etc. Notably includes British spellings, which helps us slightly.

**Practical consequence for our verticals**, measured against the product corpus:

```
'physiotherapy': top1_tied_with_top2=True  [(0, 'SaaS (General)'), (0, 'Micro SaaS'), (0, 'E-commerce'), (0, 'E-commerce Luxury')]
'optometrist':   top1_tied_with_top2=True  [(0, 'SaaS (General)'), (0, 'Micro SaaS'), (0, 'E-commerce'), (0, 'E-commerce Luxury')]
'disability support':  [(3.8673,'Calculator & Unit Converter'), (3.6414,'Arcade & Retro Game'), (3.4887,'Photo Editor & Filters')]
'law firm':            [(9.4116,'Legal Services'), (0.0,'SaaS (General)'), (0.0,'Micro SaaS')]
'dental clinic':       [(7.5806,'Dental Practice'), (6.4089,'Veterinary Clinic'), (6.2582,'Medical Clinic')]
```

`physiotherapy` and `optometrist` **score literally zero against all 192 rows** — the tokens are not in the vocabulary at all. `disability support` ranks a unit converter first.

### 4.4 Tie-breaking and determinism

**Output is deterministic for identical input on a fixed data file.** Measured:

```
in-process 5 runs, distinct output hashes: 1
warm avg latency (index cached): 26.8 ms
cold (caches cleared) avg: 57.5 ms   runs=['55','59','59']
```

Three tie-breaking layers, all deterministic:

1. **Domain routing ties** — explicitly ordered, `core.py:619–625`:
   ```python
   _DOMAIN_TIEBREAK_ORDER = [
       "ux", "product", "style", "color", "typography", "google-fonts",
       "chart", "landing", "icons", "gsap", "react", "web",
   ]
   ```
2. **Row-score ties within a corpus** — *not* explicitly handled. `core.py:343` is `sorted(scores, key=lambda x: x[1], reverse=True)`. Python's sort is stable, so ties resolve by **original CSV row order**.
3. **Style selection** — `_select_best_match` (`design_system.py:408–443`) short-circuits on the first `style_priority` entry that resolves to a non-deprecated style, so BM25 rank is often irrelevant.

**The caveat that matters for us:** layer 2 is stable *given a fixed file*, but it is stable by accident of row order, not by design. Inserting a row above a tied pair silently flips the winner. If we import this data and later append rows, previously-generated pages would regenerate differently with no diff in our code. Any port must add an explicit deterministic tiebreak (e.g. by slug) rather than inherit implicit row order.

### 4.5 How `--design-system` aggregates the five domains

**They are five independent BM25 lookups over five different corpora, but the queries are chained — the product result constrains everything downstream.** Control flow, verbatim from `design_system.py:319–355`:

```python
def _multi_domain_search(self, query: str, category: str,
                         reasoning: dict, style_priority: list = None) -> dict:
    """Execute searches across multiple domains."""
    results = {}
    constraints = " ".join(
        item.replace("-", " ")
        for item in reasoning.get("constraints", [])
    )
    resolved_query = " ".join(
        part for part in (query, category, constraints) if part
    )
    for domain, config in SEARCH_CONFIG.items():
        if domain == "style" and style_priority:
            priority_query = " ".join(style_priority[:2])
            results[domain] = search(
                f"{resolved_query} {priority_query}", domain, config["max_results"])
        elif domain == "color":
            results[domain] = search(
                f"{reasoning.get('color_mood', '')} {resolved_query}",
                domain, config["max_results"])
        elif domain == "landing":
            pattern = reasoning.get("pattern", "")
            landing_query = pattern if pattern.casefold() in self.landing_lookup else (
                f"{pattern} {resolved_query}"
            )
            results[domain] = search(
                landing_query or query, domain, config["max_results"])
        elif domain == "typography":
            results[domain] = search(
                f"{reasoning.get('typography_mood', '')} {resolved_query}",
                domain, config["max_results"])
        else:
            results[domain] = search(query, domain, config["max_results"])
    return results
```

So the dependency graph is:

```
query ──► product BM25 ──► category ──► reasoning row ──► {color_mood, typography_mood, pattern, constraints, style_priority}
                              │                                     │
                              └───────────────► resolved_query ◄────┘
                                                     │
                       ┌──────────────┬──────────────┼──────────────┐
                       ▼              ▼              ▼              ▼
                  style BM25     color BM25     landing BM25   typography BM25
```

Every downstream search sees `resolved_query = query + " " + category + " " + constraints`. **The five domains are not independent** — a wrong product match poisons all four. That is exactly the Veterinary Clinic failure in §6.1.

Then `generate` (`:489–500`) does the final selection, including a *cross-domain coherence step* worth crediting — mode resolution:

```python
best_style = self._select_best_match(style_results, effective_style_priority)
color_mode = reasoning.get("preferred_mode") or _resolve_color_mode(query, best_style)
best_color = _select_palette_for_mode(color_results, color_mode, category)
best_typography = typography_results[0] if typography_results else {}
best_landing = next(
    (row for row in landing_results
     if row.get("Pattern Name") == reasoning.get("pattern")),
    landing_results[0] if landing_results else {},
)
```

`_select_palette_for_mode` (`:220–243`) first tries the palette whose `Product Type == category` — meaning **when the product matched, the palette join is exact, not BM25**. BM25 only wins the colour slot when the category has no matching palette, which given the 1:1 spine (§3.2) only happens on the `"General"` fallback. Good design; the failure mode is narrow but severe.

And `_filter_anti_patterns_for_mode` (`:246–254`) drops "avoid dark mode" clauses once dark mode is the resolved answer — a genuinely thoughtful consistency guard.

### 4.6 The reasoning rules — machine-readable, and better than I expected

**This is the single best thing in the repo for our purposes.** `Decision_Rules` is not prose for a model to interpret. It is a closed, validated, non-executable grammar (`reasoning_contract.py`), and it is enforced.

The condition vocabulary is 36 fixed names each bound to literal signal strings (`reasoning_contract.py:7–43`, excerpt):

```python
CONDITION_SIGNALS = {
    "if_booking": ("booking", "appointment", "calendar"),
    "if_boutique": ("boutique",),
    "if_health": ("health", "medical", "patient"),
    "if_luxury": ("luxury", "premium", "high-end"),
    "if_mobile": ("mobile", "phone", "tablet", "ios", "android"),
    "if_trust_needed": ("trust", "secure", "verified", "authority"),
    "if_ux_focused": ("ux", "usability", "accessibility", "accessible"),
    ...
}
ALLOWED_CONDITIONS = {"must_have", *CONDITION_SIGNALS}
ACTION_PREFIXES = {"constraint", "style", "pattern", "mode"}
```

Evaluation is a word-boundary regex over the lowercased query, with an audit trail — `reasoning_contract.py:101–123`:

```python
def apply_decision_rules(rules, query):
    """Return deterministic mutations and an audit trail; never execute data."""
    normalized = str(query or "").casefold()
    result = {"activated": [], "style_ids": [], "constraints": [],
              "pattern": None, "mode": None}
    for condition, actions in rules.items():
        active = condition == "must_have" or any(
            pattern.search(normalized)
            for pattern in CONDITION_PATTERNS.get(condition, ()))
        if not active:
            continue
        result["activated"].append({"condition": condition, "actions": list(actions)})
        for action in actions:
            prefix, value = action.split(":", 1)
            if prefix == "style" and value not in result["style_ids"]:
                result["style_ids"].append(value)
            elif prefix == "constraint" and value not in result["constraints"]:
                result["constraints"].append(value)
            elif prefix == "pattern":
                result["pattern"] = value
            elif prefix == "mode":
                result["mode"] = value
    return result
```

**A real rule and its consumer.** `ui-reasoning.csv`, row for `Legal Services`, verbatim:

```
UI_Category: Legal Services
Recommended_Pattern: Trust & Authority + Minimal
Style_Priority: Accessible & Ethical + Minimalism & Swiss Style
Color_Mood: Navy Blue (#1E3A5F) + Gold + White
Typography_Mood: Professional + Authoritative typography
Key_Effects: Practice area reveal + Attorney profile animations
Anti_Patterns: Outdated design + Hidden credentials + AI purple/pink gradients
Severity: HIGH
Decision_Rules: {"must_have":["constraint:case-results","constraint:credential-display"]}
```

Consumed at `design_system.py:385–386`:

```python
decision_rules = parse_decision_rules(rule.get("Decision_Rules", "{}"))
applied = apply_decision_rules(decision_rules, query)
```

**Measured coverage across all 192 rows** (script: `rules_ux_bias.py`):

```
rows=192  rows with empty/'{}' rules=0  parse errors=0
rule-count histogram (conditions per row): {1: 94, 2: 67, 3: 31}
condition usage: [('must_have',113), ('if_trust_needed',44), ('if_mobile',43), ('if_ux_focused',37),
 ('if_conversion_focused',16), ('if_light_mode_needed',13), ('if_content_focused',10),
 ('if_low_performance',6), ('if_dashboard',5), ('if_luxury',3), ... 26 more with count 1–3]
action-prefix usage: [('constraint',497), ('style',12), ('pattern',1), ('mode',1)]
conditions defined in reasoning_contract.py but NEVER used in data: []
```

**Now the honest part.** 497 of 511 actions are `constraint:` — and `constraint:` does **not** deterministically change anything. It is folded back into the query string as extra BM25 tokens (`design_system.py:322–328`, quoted in §4.5) and otherwise just echoed into the output for a human to read. Only 12 `style:` actions, one `pattern:`, one `mode:` actually alter selection, across 192 rows.

So: the *grammar* is excellent and portable. The *data expressed in it* is 97% advisory. We would be porting a well-designed rule engine that the upstream authors have barely used. That's fine — it means we can populate it ourselves with `style:` / `pattern:` / `mode:` actions that do real work.

`Anti_Patterns`, by contrast, **is prose** — 232 distinct clauses across 192 rows, 188 of which appear exactly once:

```
distinct clauses: 232  total clause instances: 435
clauses appearing exactly once: 188
top clauses:  29 Excessive decoration | 21 Complex shadows | 21 3D effects | 18 Muted colors
              18 Low energy | 14 AI purple/pink gradients | 13 Pure white backgrounds
              11 Inconsistent styling | 11 Poor contrast ratios | 5 Generic design
```

The top ~15 clauses cover most instances and are checkable; the 188 singletons are one-off English. Usable as a *prompt input* to our copy/design LLM step; not as machine rules without normalisation.

### 4.7 The three dials

| Dial | What it actually is | Code | Verified behaviour |
|---|---|---|---|
| `--variance` | **Hard override of style selection.** Buckets 1‑3 / 4‑7 / 8‑10 into three hard-coded keyword lists, *prepends* them to `style_priority`, and `_select_best_match` returns the first that resolves — so BM25 never gets a vote. | `design_system.py:71–87`, `:474–476`, `:419–422` | see below |
| `--motion` | **A separate 6th lookup**, not a modifier. Buckets to `Subtle`/`Standard`/`Complex`, runs `search(f"{query} {tier}", "gsap", 5)`, filters by exact `Intensity Tier`. Attaches a GSAP snippet; changes nothing else. | `design_system.py:502–513` | see below |
| `--density` | **Pure post-hoc token override.** Three hard-coded spacing tables. Does not touch the data files or any search. | `design_system.py:82–86`, `:603` | see below |

Measured, same query, dial swept:

```
--- variance=1 ---  style: Minimalism & Swiss Style | palette: Legal Services | type: EB Garamond / Lato
--- variance=5 ---  style: Accessible & Ethical     | palette: Legal Services | type: EB Garamond / Lato
--- variance=10 --- style: Brutalism                | palette: Legal Services | type: EB Garamond / Lato
--- density 9 ---   spacing: {'xs':'2px','sm':'4px','md':'8px','lg':'12px','xl':'16px','2xl':'24px','3xl':'32px'}
--- motion 8 ---    {'Category':'Page Transition','Intensity Tier':'Complex','Duration':'500-800ms','Easing':'expo.inOut'}
```

`--variance 10` gives a **premium Sydney family law firm a Brutalism design system**. The dial does not consult the industry at all. In an unattended batch this is a foot-gun; the useful reading is that variance is a *global* aesthetic lever, not a per-client one.

`--density` is worth stealing outright: it is three constant tables, ~15 lines of TypeScript, no data dependency.

### 4.8 Lines of logic to reimplement — honest estimate

Measured with `ast` over the three modules (function spans in Appendix C). Total Python: **2,759 lines** across `core.py` (993) + `design_system.py` (1643) + `reasoning_contract.py` (123).

What we would **not** port:

| Excluded | Lines | Why |
|---|---:|---|
| `format_ascii_box` + helpers | 189 | Terminal box drawing |
| `format_markdown` | 125 | Markdown report |
| Persistence (`safe_slug` → `_detect_page_type`) | ~660 | MASTER.md / page-override files — an interactive-assistant feature |
| Stack search (`_stack_*`, `search_stack`) | ~138 | 22 framework CSVs we don't want |
| Suggestion/typo recovery (`_suggest_terms`, `_suggest_identities`, `_passes_threshold`) | ~46 | Interactive "did you mean" |
| `search.py` CLI | 171 | We call a function |
| **Excluded total** | **~1,329** | |

What we **would** port, if we ported it faithfully:

| Included | Lines |
|---|---:|
| `BM25` class | 66 |
| CSV/index loading + cache | ~40 |
| `_search_csv_detailed` + `_query_coverage` + thresholds | ~60 |
| Domain routing (`detect_domain`, `_domain_keywords`, rewrites, `_contains_phrase`) | ~85 |
| Identity resolution (`_style_identity`, `_exact_row_identity`, `_row_identities`, `_style_search_destination`) | ~61 |
| `search()` | 91 |
| Config literals (`CSV_CONFIG`, floors, tiebreak order, synonyms, stopwords) | ~130 |
| Colour-mode block (`_relative_luminance` → `_filter_anti_patterns_for_mode`) | 110 |
| `DesignSystemGenerator` class | 347 |
| Dial config + `_resolve_dial` | ~30 |
| `reasoning_contract.py` | 123 |
| **Included total** | **~1,143 lines of Python** |

**TypeScript port effort: ~1,500–1,800 LOC** at the usual 1.3–1.6× expansion for types and explicit null handling, plus ~400–600 LOC of tests. Call it **7–9 working days** for a faithful port.

**But I would not do the faithful port.** Drop BM25 and the domain-routing layer (they are the source of every failure in §6) and replace them with an explicit industry→category table. Then the port is: `reasoning_contract` (123) + colour-mode block (110) + resolution/assembly (~250) + our own classifier (~150) ≈ **~630 LOC of TypeScript, 3–4 days.** See §9.

---

## 5. The output contract

### 5.1 Is it structured?

**Both.** `--design-system` prints a Unicode box by default (Appendix A) — that is presentation for a terminal/model reader. But `generate_design_system` returns the raw dict alongside it (`design_system.py:953–957`), and `--design-system --json` emits it:

```python
return {
    "text": text,
    "design_system": design_system,
    "persistence": persistence_result,
}
```

`search.py:136–140`:

```python
if args.json:
    print(json_module.dumps(
        {"design_system": result["design_system"], "persistence": result["persistence"]},
        indent=2, ensure_ascii=False,
    ))
```

**We would never parse prose.** The structured form is complete — every field shown in the box is present in the JSON, plus several that aren't (`source_identities`, `activated_rules`, `reasoning_default`). Good news for the port.

### 5.2 Complete raw output for one query

`python search.py "Boutique family law firm, premium positioning, Sydney" --design-system --json`:

```json
{
  "design_system": {
    "project_name": "BOUTIQUE FAMILY LAW FIRM, PREMIUM POSITIONING, SYDNEY",
    "category": "Legal Services",
    "pattern": {
      "name": "Trust & Authority + Conversion",
      "sections": "Hero (mission/credibility) > Proof (logos, certs, stats) > Solution overview > Clear CTA path",
      "cta_placement": "Contact Sales / Get Quote (primary) + Nav",
      "color_strategy": "Navy/Grey corporate. Trust blue. Accent for CTA only.",
      "conversion": "Security badges. Case studies. Transparent pricing. Low-friction form. Provide pause/stop and stop the logo carousel on focus, hover, and reduced motion. Previous/next controls provide the keyboard equivalent; pause offscreen/hidden and render a static logo set under reduced motion."
    },
    "style": {
      "id": "accessible-and-ethical",
      "name": "Accessible & Ethical",
      "type": "General",
      "effects": "Clear focus rings (3-4px), ARIA labels, skip links, responsive design, reduced motion, 44x44px touch targets",
      "keywords": "Accessible, inclusive interface, high contrast, large text (16px+), keyboard navigation, screen reader friendly, accessibility standards aware, focus state, semantic",
      "best_for": "Government, healthcare, education, inclusive products, large audience, legal compliance, public",
      "performance": "cost:low|drivers:none",
      "accessibility": "risk:low|requires:contrast-text-4.5,keyboard,visible-focus,reduced-motion",
      "light_mode": "supported",
      "dark_mode": "supported"
    },
    "colors": {
      "primary": "#1E3A8A",
      "on_primary": "#FFFFFF",
      "secondary": "#1E40AF",
      "on_secondary": "#FFFFFF",
      "accent": "#B45309",
      "on_accent": "#FFFFFF",
      "background": "#F8FAFC",
      "foreground": "#0F172A",
      "card": "#FFFFFF",
      "card_foreground": "#0F172A",
      "muted": "#E9EEF5",
      "muted_foreground": "#475569",
      "border": "#CBD5E1",
      "destructive": "#DC2626",
      "on_destructive": "#FFFFFF",
      "ring": "#1E3A8A",
      "notes": "Authority navy + trust gold",
      "cta": "#B45309",
      "text": "#0F172A",
      "on_cta": "#FFFFFF"
    },
    "typography": {
      "heading": "EB Garamond",
      "body": "Lato",
      "mood": "legal, professional, traditional, trustworthy, formal, authoritative",
      "best_for": "Law firms, legal services, contracts, formal documents, government",
      "google_fonts_url": "https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;500;600;700&family=Lato:wght@300;400;700&display=swap",
      "css_import": "@import url('https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;500;600;700&family=Lato:wght@300;400;700&display=swap');"
    },
    "key_effects": "Clear focus rings (3-4px), ARIA labels, skip links, responsive design, reduced motion, 44x44px touch targets",
    "anti_patterns": "Outdated design + Hidden credentials + AI purple/pink gradients",
    "decision_rules": {
      "must_have": [
        "constraint:case-results",
        "constraint:credential-display"
      ]
    },
    "activated_rules": [
      {
        "condition": "must_have",
        "actions": [
          "constraint:case-results",
          "constraint:credential-display"
        ]
      }
    ],
    "constraints": [
      "case-results",
      "credential-display"
    ],
    "reasoning_default": false,
    "source_identities": {
      "product": "Legal Services",
      "reasoning": "Legal Services",
      "style": "accessible-and-ethical",
      "color": "Legal Services",
      "typography": "Legal Professional",
      "landing": "Trust & Authority + Conversion"
    },
    "source_derivations": {
      "color_mode": null
    },
    "severity": "HIGH",
    "dials": {
      "variance": null,
      "variance_label": null,
      "motion": null,
      "motion_label": null,
      "density": null,
      "density_label": null
    },
    "motion_snippet": {},
    "spacing_scale": null
  },
  "persistence": null
}
```

### 5.3 Field-by-field contract

Determined by reading the return dict literal at `design_system.py:521–604`. Because every value uses `.get(key, default)` against a possibly-empty dict, **every field is always present** — but many can be the empty string.

| Field | Type | Always present? | Can be empty/null? | Default when the source row is missing |
|---|---|:--:|:--:|---|
| `project_name` | string | ✔ | no | `query.upper()` |
| `category` | string | ✔ | no | `"General"` |
| `pattern.name` | string | ✔ | no | `"Hero + Features + CTA"` |
| `pattern.sections` | string, ` > `-delimited | ✔ | no | `"Hero > Features > CTA"` |
| `pattern.cta_placement` | string | ✔ | no | `"Above fold"` |
| `pattern.color_strategy` | string | ✔ | **yes** (`""`) | `""` |
| `pattern.conversion` | string | ✔ | **yes** (`""`) | `""` |
| `style.id` | slug | ✔ | no | `"minimalism-and-swiss-style"` |
| `style.name` | string | ✔ | no | `"Minimalism"` |
| `style.type` | enum(6) | ✔ | no | `"General"` |
| `style.effects` / `.keywords` / `.best_for` / `.performance` / `.accessibility` / `.light_mode` / `.dark_mode` | string | ✔ | **yes** (`""`) | `""` |
| `colors.primary` | hex6 | ✔ | no | `"#2563EB"` |
| `colors.secondary` | hex6 | ✔ | no | `"#3B82F6"` |
| `colors.accent` | hex6 | ✔ | no | `"#F97316"` |
| `colors.background` | hex6 | ✔ | no | `"#F8FAFC"` |
| `colors.foreground` | hex6 | ✔ | no | `"#1E293B"` |
| `colors.on_primary`, `on_secondary`, `on_accent`, `card`, `card_foreground`, `muted`, `muted_foreground`, `destructive`, `on_destructive`, `ring` | hex6 **or `rgba()`** (`border`) | ✔ | **yes** (`""`) | `""` |
| `colors.border` | hex6 **or `rgba(...)`** | ✔ | **yes** | `""` |
| `colors.notes` | free text | ✔ | **yes** | `""` |
| `colors.cta` / `.text` / `.on_cta` | hex6 | ✔ | **yes** | aliases of accent/foreground/on_accent (legacy) |
| `typography.heading` / `.body` | family name | ✔ | no | `"Inter"` / `"Inter"` |
| `typography.mood` / `.best_for` / `.google_fonts_url` / `.css_import` | string | ✔ | **yes** | `""` |
| `key_effects` | string | ✔ | **yes** | `""` |
| `anti_patterns` | ` + `-delimited string | ✔ | **yes** (`""` on the General fallback) | `""` |
| `decision_rules` | object | ✔ | **yes** (`{}`) | `{}` |
| `activated_rules` | array of `{condition, actions[]}` | ✔ | **yes** (`[]`) | `[]` |
| `constraints` | string[] | ✔ | **yes** (`[]`) | `[]` |
| `reasoning_default` | boolean | ✔ | no | `true` on fallback |
| `source_identities.product` | string \| **null** | ✔ | **null on abstain** | `null` |
| `source_identities.reasoning` | string \| **null** | ✔ | **null on fallback** | `null` |
| `source_identities.style` / `.color` / `.typography` / `.landing` | string | ✔ | possible `""`/undefined | — |
| `source_derivations.color_mode` | `"derived-dark"` \| null | ✔ | usually null | `null` |
| `severity` | `"HIGH"` \| `"MEDIUM"` | ✔ | no | `"MEDIUM"` |
| `dials.*` | int \| null | ✔ | null when unset | `null` |
| `motion_snippet` | object | ✔ | `{}` unless `--motion` | `{}` |
| `spacing_scale` | object \| null | ✔ | null unless `--density` | `null` |

**The two fields a batch job must gate on** are `reasoning_default` and `source_identities.product`. Both are `true`/`null` exactly when the product search abstained. Neither fires when the product matched *wrongly* — which is the more common and more dangerous failure (§6.1).

---

## 6. Quality evaluation — our five verticals

Full box output for all five: **Appendix A**. Ranking diagnostics below come from `diag.py` (Appendix C), which scores the raw product corpus without the abstention gate so we can see what was rejected.

```
product domain floor: {'min_score': 6.0, 'min_margin': 0.0, 'min_coverage': 0.0}
```

### 6.1 Mobile physiotherapy and neurological rehabilitation clinic, Australia, home visits

```
tokens: ['mobile','physiotherapy','neurological','rehabilitation','clinic','australia','home','visits']
  1.   6.409  Veterinary Clinic
  2.   6.258  Medical Clinic
  3.   5.540  Smart Home/IoT Dashboard
  4.   5.305  Home Services (Plumber/Electrician)
  5.   5.167  Healthcare App
  abstained: False | returned: ['Veterinary Clinic']
  RESOLVED category: Veterinary Clinic | default reasoning: False
  source_identities: {"product":"Veterinary Clinic","reasoning":"Veterinary Clinic","style":"claymorphism",
                      "color":"Veterinary Clinic","typography":"Soft Rounded","landing":"Trust & Authority + Conversion"}
```

**Matched: Veterinary Clinic @ 6.409. 2nd: Medical Clinic @ 6.258. 3rd: Smart Home/IoT Dashboard @ 5.540.**

**Correct? No.** Margin over the right answer is **0.151 points — 2.4%.** The output is a **Claymorphism** system ("Soft 3D, chunky, playful, toy-like, bubbly") with Varela Round / Nunito Sans ("Children's products, pet apps") and a caring-teal palette. For a clinic treating stroke and MS patients this is not merely off-brand, it is close to disrespectful — and it clears the abstention floor comfortably, so nothing flags it.

The mechanism is §4.2's no-field-weighting: `Veterinary Clinic`'s `Keywords` is literally `"clinic, veterinary"` (short document, high term density for `clinic`), while `Medical Clinic`'s longer `Key Considerations` dilutes its length normalisation. The shortest document wins.

### 6.2 Boutique family law firm, premium positioning, Sydney

```
tokens: ['boutique','family','law','firm','premium','positioning','sydney']
  1.   9.412  Legal Services
  2.   7.686  Luxury/Premium Brand
  3.   6.704  E-commerce Luxury
  4.   4.837  Family Calendar & Chores
  5.   3.601  Senior Care/Elderly
  abstained: False | returned: ['Legal Services']
  RESOLVED category: Legal Services | default reasoning: False
  source_identities: {"product":"Legal Services","reasoning":"Legal Services","style":"accessible-and-ethical",
                      "color":"Legal Services","typography":"Legal Professional","landing":"Trust & Authority + Conversion"}
```

**Matched: Legal Services @ 9.412. 2nd: Luxury/Premium Brand @ 7.686. 3rd: E-commerce Luxury @ 6.704.**

**Correct? Yes — the best of the five.** Navy `#1E3A8A` + `#B45309` gold accent, EB Garamond / Lato ("Law firms, legal services, contracts"), Trust & Authority pattern, anti-patterns "Outdated design + Hidden credentials + AI purple/pink gradients". A designer would sign this off.

Two notes. First, the runner-up *Luxury/Premium Brand* at 7.686 is a defensible alternative for "premium positioning" and the system gives us no way to blend the two — `boutique` and `premium` fired `if_boutique`/`if_luxury` nowhere, because Legal Services' rule set is only `{"must_have": [...]}`. Second, the style resolved to **Accessible & Ethical**, whose `Best For` is "Government, healthcare, education … legal compliance, public" — accurate for compliance but the *opposite* of premium-boutique. The palette carries the premium signal; the style actively fights it.

### 6.3 NDIS disability support provider, culturally diverse communities, Melbourne

```
tokens: ['ndis','disability','support','provider','culturally','diverse','communities','melbourne']
  1.   4.338  Hyperlocal Services
  2.   3.924  Booking & Appointment App
  3.   3.867  Calculator & Unit Converter
  4.   3.641  Arcade & Retro Game
  5.   3.489  Photo Editor & Filters
  abstained: True | returned: []
  RESOLVED category: General | default reasoning: True
  source_identities: {"product":null,"reasoning":null,"style":"minimalism-and-swiss-style",
                      "color":"SaaS (General)","typography":"Geometric Modern","landing":"Hero + Features + CTA"}
```

**Matched: nothing — abstained (top score 4.338 vs floor 6.0). 1st/2nd/3rd rejected candidates: Hyperlocal Services, Booking & Appointment App, Calculator & Unit Converter.**

**Correct? The abstention is correct; the fallback is not.** There is no disability-services, aged-care-adjacent or community-services category in the 192. `Senior Care/Elderly` exists but scores 0 here.

The system then emits a complete generic-SaaS design system: `#2563EB` trust blue, Outfit / Work Sans, Hero + Features + CTA, and — critically — **`anti_patterns: ""`**. For the one vertical with the strongest accessibility and plain-language obligations in our whole book, the anti-pattern list is empty. `reasoning_default: true` and `product: null` do at least flag it, so a batch job *could* catch this one.

### 6.4 Agricultural and earthmoving machinery manufacturer, rural Australia, B2B

```
tokens: ['agricultural','earthmoving','machinery','manufacturer','rural','australia','b2b']
  1.   6.627  B2B Service
  2.   5.197  SaaS (General)
  3.   0.000  Micro SaaS
  4.   0.000  E-commerce
  5.   0.000  E-commerce Luxury
  abstained: False | returned: ['B2B Service']
  RESOLVED category: B2B Service | default reasoning: False
  source_identities: {"product":"B2B Service","reasoning":"B2B Service","style":"accessible-and-ethical",
                      "color":"B2B Service","typography":"Enterprise SaaS Mobile (Plus Jakarta Sans)",
                      "landing":"Trust & Authority + Conversion"}
```

**Matched: B2B Service @ 6.627 (barely clears the 6.0 floor). 2nd: SaaS (General) @ 5.197. 3rd–5th: everything else scores exactly 0.000.**

Look at the shape of that distribution: **only two rows in 192 scored above zero.** The single token carrying the whole match is `b2b`. `agricultural`, `earthmoving`, `machinery`, `manufacturer`, `rural` are all out-of-vocabulary. There *is* an `Agriculture/Farm Tech` category in the taxonomy (row 52) and it scored zero — its `Keywords` don't include "agricultural".

**Correct? Technically defensible, substantively wrong.** The output is professional navy `#0F172A` + `#0369A1`, **Plus Jakarta Sans as both heading and body** (`Best For: "B2B SaaS apps, productivity tools, government and finance mobile apps, admin dashboards"`). It is a design system for enterprise software. EZ Machinery sells compost turners to farmers at field days. Nothing in this output knows the difference between a SaaS vendor and a steel fabricator.

### 6.5 Independent optometry practice, two suburban locations, Brisbane

```
tokens: ['independent','optometry','practice','two','suburban','locations','brisbane']
  1.   5.553  Dental Practice
  2.   4.969  Legal Services
  3.   4.917  Coding Challenge & Practice
  4.   4.817  Music Instrument Learning
  5.   4.386  Booking & Appointment App
  abstained: True | returned: []
  RESOLVED category: General | default reasoning: True
  source_identities: {"product":null,"reasoning":null,"style":"minimalism-and-swiss-style",
                      "color":"Coding Challenge & Practice","typography":"Geometric Modern",
                      "landing":"Hero + Features + CTA"}
```

**Matched: nothing — abstained (5.553 vs floor 6.0). 1st/2nd/3rd rejected: Dental Practice, Legal Services, Coding Challenge & Practice.**

**Correct? This is the worst result of the five, and it is worse than "generic".** The product domain abstained — good. But because the colour domain has **no score floor** (§3.5), it ran anyway on the poisoned `"… Brisbane General"` query:

```
QUERY: Professional Independent optometry practice, two suburban locations, Brisbane General
 tokens: ['professional','independent','optometry','practice','two','suburban','locations','brisbane','general']
     4.466  Coding Challenge & Practice   Notes=Code green + difficulty amber on dark
     4.291  SaaS (General)                Notes=Trust blue + orange CTA contrast [...]
     4.028  Dental Practice               Notes=Fresh blue + smile yellow [...]
     3.600  B2B Service                   Notes=Professional navy + blue CTA
```

Optometry **practice** ≈ Coding Challenge & **Practice**. Result: a suburban Brisbane optometrist gets

```
Background:  #0F172A   (near-black)
Foreground:  #FFFFFF
Primary:     #22C55E   (code green)
Accent/CTA:  #D97706   (amber)
Border:      rgba(255,255,255,0.08)
Notes:       Code green + difficulty amber on dark
```

— a **dark-mode terminal palette**, while `style`, `pattern` and `typography` all came from the light-mode "General" default. The output is internally incoherent: `Minimalism & Swiss Style` (light-friendly, white-space-led) rendered on a `#0F172A` ground with a `rgba(255,255,255,0.08)` border. And `reasoning_default: true` is set, but `source_identities.color` is a confident non-null `"Coding Challenge & Practice"` — a batch job checking "did we get a palette?" sees success.

### 6.6 Are the five distinguishable? Honest answer

**Two of five are identifiable; three are not.**

| | Palette | Type | Style | Pattern | Reads as its industry? |
|---|---|---|---|---|---|
| Physio | teal `#0D9488` / orange | Varela Round / Nunito Sans | Claymorphism | Trust & Authority | **No** — reads as a pet app |
| Family law | navy `#1E3A8A` / gold `#B45309` | EB Garamond / Lato | Accessible & Ethical | Trust & Authority | **Yes** |
| NDIS | blue `#2563EB` / orange `#EA580C` | Outfit / Work Sans | Minimalism & Swiss | Hero + Features + CTA | **No** — generic SaaS |
| Machinery | navy `#0F172A` / blue `#0369A1` | Plus Jakarta Sans ×2 | Accessible & Ethical | Trust & Authority | **Partly** — reads as B2B software, not heavy industry |
| Optometry | dark `#0F172A` / green `#22C55E` | Outfit / Work Sans | Minimalism & Swiss | Hero + Features + CTA | **No** — reads as a dev tool |

Three of the five share **Trust & Authority + Conversion** as their landing pattern; two share **Hero + Features + CTA**. Two share **Accessible & Ethical**; two share **Minimalism & Swiss Style**. Two share the exact same typography pairing (Outfit / Work Sans). Shown the five side by side with the labels removed, a stranger would confidently identify the law firm, guess "B2B something" for the machinery, and have no chance on the other three.

**Where the convergence comes from.** I ran the generator against all 192 product types using their exact canonical names — i.e. the *best possible* input, zero retrieval error (`sweep.py`, Appendix C):

```
queried all 192 product types by their exact name; 9.6 ms/query warm
queries whose resolved category != the exact product name: 0/192

distinct PALETTES used:            192 (of 192)   ← perfect
distinct TYPOGRAPHY pairings used:  48 (of 74)
distinct LANDING patterns used:     19 (of 34)
distinct STYLES used:               25 (of 88, and only 50 are 'active')

top styles:      40 Minimalism & Swiss Style | 26 Vibrant & Block-based | 21 Flat Design | 19 Dark Mode (OLED) | 13 Claymorphism
top typography:  25 Modern Professional | 21 Bold Typography Mobile | 20 Flat Design Mobile | 8 Accessibility First
top patterns:    36 Hero + Testimonials + CTA | 28 Product Demo + Features | 25 Trust & Authority + Conversion
```

So even under perfect retrieval, **the palette layer is fully differentiated (192/192) and every other layer collapses.** One style covers 21% of all industries; three landing patterns cover 46%. The differentiation this dataset actually delivers is *colour*, plus a bit of typography. Style and pattern are close to noise.

That is a useful, actionable finding: it tells us exactly which slice is worth importing.

---

## 7. Data quality checks

All computed, not estimated. Scripts in Appendix C.

### 7.1 Contrast audit — the palettes are genuinely good

Script: `contrast.py`. WCAG 2.x relative luminance and contrast ratio, computed over all 192 palettes for every text-on-surface pair the role schema implies, plus the two non-text UI pairs.

```
PALETTES: 192

== FAIL COUNTS BY PAIR ==
  Foreground on Background           AA body 4.5:1  failures:   0 / 192
  Card Foreground on Card            AA body 4.5:1  failures:   0 / 192
  Muted Foreground on Background     AA body 4.5:1  failures:   1 / 192
  Muted Foreground on Muted          AA body 4.5:1  failures:   0 / 192
  On Primary on Primary              AA body 4.5:1  failures:   0 / 192
  On Secondary on Secondary          AA body 4.5:1  failures:   0 / 192
  On Accent on Accent                AA body 4.5:1  failures:   0 / 192
  On Destructive on Destructive      AA body 4.5:1  failures:   0 / 192
  Border on Background (UI 3:1)      UI 3:1         failures: 173 / 192
  Ring on Background (UI 3:1)        UI 3:1         failures:   0 / 192

== PALETTES WITH >=1 BODY-TEXT AA FAILURE: 1 / 192  (0.5%) ==
  Spatial Computing OS / App    Muted Foreground on Background   #5F6673 on #888888 = 1.63:1

== SEVERE (below 3:1, fails even AA large text): 1 palettes ==
  Spatial Computing OS / App    Muted Foreground on Background   #5F6673 on #888888 = 1.63:1
```

**One failure in 1,536 text pairs.** `Spatial Computing OS / App` is a VisionOS-style palette whose `Background: #888888` is clearly a placeholder for a translucent glass surface — it is also the only palette whose `Card` is `#999999`. Not relevant to us; we would exclude that row anyway.

The 173 `Border`-on-`Background` sub-3:1 results are **not** defects. WCAG 1.4.11 requires 3:1 only for boundaries *essential* to identifying a component; a decorative hairline between cards is explicitly exempt, and a 1.3:1 hairline is standard practice. I report it because we asked for every implied pair, but I would not act on it. If any of our templates uses `border` as the sole affordance for an input field, that specific usage would need a separate token.

**Also found:** 19 `Border` values are unparseable as hex because they use `rgba(255,255,255,0.08)`:

```
('Personal Finance Tracker','Border on Background','rgba(255,255,255,0.08)','#0F172A')
('Ride Hailing / Transportation', ... ) ('Timer & Pomodoro', ...) ('Password Manager', ...)
('Calculator & Unit Converter', ... '#1C1917') ('Alarm & World Clock', ...) ('Card & Board Game', ...)
('Arcade & Retro Game', ...) ('Photo Editor & Filters', ...) ('Short Video Editor', ...)
('Drawing & Sketching Canvas', ... '#1C1917') ('Music Creation & Beat Maker', ...) ('Running & Cycling GPS', ...)
('Sleep Tracker', ...) ('Fasting & Intermittent Timer', ...) ('Anonymous Community / Confession', ...)
('Coding Challenge & Practice', ...) ('VPN & Privacy Tool', ...) ('White Noise & Ambient Sound', ...)
```

All 19 are dark palettes. An importer must normalise or the value lands in our CSS as-is (which actually works, but breaks any downstream colour maths).

**Verdict on this section: the contrast risk we were worried about does not exist.** This is a genuinely well-curated colour dataset and 56 of 192 rows carry visible evidence of automated contrast repair in `Notes` (§7.2). If anything, this is the strongest argument in the repo's favour.

### 7.2 Palette distinctiveness

Script: `distinct.py`. Roles `{Primary, Secondary, Accent, Background, Foreground}` → sRGB → CIELAB (D65) → **CIEDE2000**. Palette distance = max per-role ΔE00. Clustering = single-linkage connected components under threshold.

```
palettes with all 5 roles parseable: 192/192

== EXACT duplicate role-tuples: 21 groups covering 47 palettes ==
  ['#0F172A','#1E293B','#16A34A','#020617','#F8FAFC'] -> 4: ['Auction Platform','Feature Flag / Config Management','RPA / Automation Dashboard','Ticketing / Box Office']
  ['#0F172A','#1E293B','#22C55E','#020617','#F8FAFC'] -> 3: ['Financial Dashboard','Coding Bootcamp','API Developer Portal']
  ['#2563EB','#3B82F6','#059669','#F8FAFC','#0F172A'] -> 3: ['CRM & Client Management','Calendar & Scheduling App','Study Together / Virtual Coworking']
  ['#1E3A5F','#2563EB','#16A34A','#F8FAFC','#0F172A'] -> 3: ['E-signature / Document Workflow','Grant / Funding Portal','Resume / CV Builder']
  ['#059669','#10B981','#EA580C','#ECFDF5','#064E3B'] -> 2: ['E-commerce','Hyperlocal Services']
  ['#1C1917','#44403C','#A16207','#FAFAF9','#0C0A09'] -> 2: ['E-commerce Luxury','Luxury/Premium Brand']
  ['#0F172A','#334155','#0369A1','#F8FAFC','#020617'] -> 2: ['B2B Service','Government/Public Service']
  ['#0D9488','#14B8A6','#EA580C','#F0FDFA','#134E4A'] -> 2: ['Productivity Tool','Veterinary Clinic']
  ['#0891B2','#22D3EE','#16A34A','#F0FDFA','#134E4A'] -> 2: ['Medical Clinic','Telemedicine Platform']
  ... 12 more groups of 2

== threshold max-role ΔE2000 <  2.0: 166 distinct clusters | 26 near-duplicates
== threshold max-role ΔE2000 <  5.0: 165 distinct clusters | 27 near-duplicates
== threshold max-role ΔE2000 < 10.0: 148 distinct clusters | 44 near-duplicates

== nearest-neighbour max-role ΔE2000 distribution ==
   p  0: 0.00   p 10: 0.00   p 25: 4.84   p 50: 12.45
   p 75: 17.81  p 90: 26.09  p100: 41.97
   palettes whose nearest neighbour is <  5 ΔE: 48
   palettes whose nearest neighbour is < 10 ΔE: 68

   distinct Background hexes: 33 | distinct Primary hexes: 50
```

**Effective count: ~165 visually distinct palettes against a nominal 192** at ΔE00 < 5 (roughly "a designer would call these the same palette"). At the looser ΔE00 < 10 it falls to **148**.

The sharper number is the **33 distinct backgrounds and 50 distinct primaries**. Backgrounds are the single biggest driver of how a page "feels", and 192 palettes draw from a pool of 33. Two-thirds of the palettes differentiate only in accent/secondary.

**For us this is close to irrelevant**, because we do not want the primary from this table — we want the client's crawled brand colour (§8.4). What we want from `colors.csv` is the *neutral scaffolding* (background/card/muted/border/foreground ramps) and the role relationships, and 33 backgrounds is plenty for that.

### 7.3 Font pairing validity

Script: `fonts_styles_landing.py`, sections A and B. Validated against the pinned `google-fonts.csv` catalogue (1934 families).

```
### families in catalogue: 1934

A. TYPOGRAPHY FAMILY RESOLUTION
unresolved family references: 0

B. WEIGHT AVAILABILITY (weights requested in Google Fonts URL vs catalogue Styles/Variable Axes)
weight/family problems: 0
```

**Every family resolves, and every weight requested in every `Google Fonts URL` is available** — either as a static style in the `Styles` column or inside the `wght` variable axis range. Zero broken references in 74 pairings. Combined with §1.4 (all OFL bar one Apache), `typography.csv` is the cleanest asset in the repo.

**Heading == body — 20 of 74 pairings (27%) are single-family:**

```
#5  Minimal Swiss:                          Inter
#13 Friendly SaaS:                          Plus Jakarta Sans
#17 Brutalist Raw:                          Space Mono
#20 Premium Sans (DM Sans):                 DM Sans
#23 Korean Modern:                          Noto Sans KR
#25 Chinese Simplified:                     Noto Sans SC
#27 Thai Modern:                            Noto Sans Thai
#28 Hebrew Modern:                          Noto Sans Hebrew
#31 Financial Trust:                        IBM Plex Sans
#48 Accessibility First:                    Atkinson Hyperlegible
#55 Spatial Clear:                          Inter
#58 Bauhaus Geometric:                      Outfit
#60 Modern Dark Cinema (Inter System):      Inter
#62 Terminal CLI Monospace:                 JetBrains Mono
#63 Kinetic Brutalism (Space Grotesk):      Space Grotesk
#64 Flat Design Mobile (System Bold):       Inter
#65 Material You MD3 (Roboto System):       Roboto
#66 Neo Brutalism Mobile (Space Grotesk):   Space Grotesk
#72 Enterprise SaaS Mobile (Plus Jakarta):  Plus Jakarta Sans
#74 Neumorphism Mobile (Plus Jakarta + Sys):Plus Jakarta Sans
```

Most are deliberate and named as such — the `Category` column labels them "Geometric Sans (Single Family)", "Mono + Mono (Single Family)", "Sans (System Default)". They are legitimate design choices for app UI, but for a *landing page* a single-family pairing gives us no heading/body contrast to work with. **13 of the 20 are mobile-app or system-font pairings we would exclude anyway.** Note that #72 is what vertical 4 (machinery) landed on — Plus Jakarta Sans for both heading and body.

The remaining 54 pairings all have genuinely distinct heading and body families.

### 7.4 Style taxonomy

Script: `fonts_styles_landing.py`, section C.

```
Status counts: Counter({'active': 50, 'supplemental': 29, 'deprecated': 9})   [total 88]

Type × Status:
    ('BI/Analytics','active') 1        ('BI/Analytics','supplemental') 9
    ('General','active') 43            ('General','supplemental') 4      ('General','deprecated') 1
    ('Landing Page','deprecated') 8
    ('Mobile','active') 2              ('Mobile','supplemental') 15
    ('Platform/Material','active') 1
    ('Platform/System','active') 3     ('Platform/System','supplemental') 1
```

**What distinguishes active from inactive: the `Status` column (col 25), and it is enforced in code**, not just documentation. `core.py:810–812` filters the style domain to `Status == "active"`, so the 29 supplemental + 9 deprecated rows are invisible to search. The README's "79 searchable UI styles (50 active)" reconciles as 88 total − 9 deprecated = 79 searchable-in-principle, of which 50 are active. `catalog-summary.json` confirms: `{"total": 88, "searchable": 79, "active": 50, "supplemental": 29, "deprecated": 9}`.

**The three statuses mean different things:**

- **`deprecated` (9)** — all are *page compositions mislabelled as visual styles*, now redirected. Every one carries a cross-domain replacement:
  ```
  hero-centric-design        → landing:hero-centric-design
  conversion-optimized       → landing:funnel-3-step-conversion
  feature-rich-showcase      → landing:feature-rich-showcase
  minimal-and-direct         → landing:minimal-single-column
  social-proof-focused       → landing:hero-testimonials-cta
  interactive-product-demo   → landing:product-demo-features
  trust-and-authority        → landing:trust-authority-conversion
  storytelling-driven        → landing:scroll-triggered-storytelling
  bento-grids                → style:bento-box-grid
  ```
  This is a well-executed migration, not rot. **Not usable — and shouldn't be.**

- **`supplemental` (29)** — 24 of the 29 are `Mobile` (15) or `BI/Analytics` (9) variants. **Usable but deliberately de-ranked**, and three are in fact reached via the direct-resolve path (§3.6). Perfectly usable for us if we address them by ID rather than by search — but 24/29 are mobile-app or dashboard styles we don't want.

- **`active` (50)** — 43 General + 2 Mobile + 4 platform + 1 BI. This is the real working set for web.

**Do any styles conflict in ways the reasoning rules don't catch?** Yes, one systematic conflict, and it bit us in §6.5. Style rows carry `Preferred Mode` (auto/dark), `Light Mode ✓` and `Dark Mode ✓`, and the code does resolve a coherent mode (`_resolve_color_mode`, `design_system.py:186–190`) and even derives a dark ramp if needed (`_derive_dark_palette`, `:193–217`). But the check runs **style → palette**, never **palette → style**. If the palette arrives dark by an independent BM25 route (the optometry case), a `Light Mode ✓ supported` style is rendered on a `#0F172A` background with nothing objecting. `_palette_is_dark` already exists at `:147–150`; it is simply not used as a post-condition. **A port must add that assertion.**

Second conflict, softer: `Conversion-Focused` (10 glyph-prefixed values including `✗ Low-Conversion` and `✗ Not applicable`) is never consulted by the design-system generator at all. Styles marked explicitly low-conversion can be and are selected for landing pages.

### 7.5 Landing patterns — the weakest data in the repo

Script: `fonts_styles_landing.py`, section D.

**Is there a controlled vocabulary of section names? No. Emphatically no.**

```
total section tokens: 152   distinct: 138
tokens used in >1 pattern:  6
tokens used in exactly 1 pattern: 132
```

**138 distinct section names across 152 total slots.** Only six strings are reused at all:

```
 7  CTA
 5  Hero
 2  Footer
 2  Solution overview
 2  Final CTA
 2  How it works
```

Everything else is a one-off free-text phrase. A sample of the 132 singletons, verbatim:

```
Hero with headline/image | Value prop | Key features (3-5) | CTA section | Problem statement
Testimonials carousel | Product video/mockup (center) | Feature breakdown per section
Comparison (optional) | Hero headline | Short description | Benefit bullets (3 max)
Step 1 (problem) | Step 2 (solution) | Step 3 (action) | CTA progression | Problem intro
Comparison table (product vs competitors) | Pricing (optional) | Hero (benefit headline)
Lead magnet preview (ebook cover, checklist, etc) | Form (minimal fields) | CTA submit
Hero (pricing headline) | Price comparison cards | Feature comparison table | FAQ section
Hero with video background | Key features overlay | Benefits section | Intro hook
Chapter 1 (problem) | Chapter 2 (journey) | Chapter 3 (solution) | Climax CTA
Dynamic hero (personalized) | Relevant features | Tailored testimonials | Smart CTA
Hero with countdown | Product teaser/preview | Email capture form | Social proof (waitlist count)
Hero (problem statement) | Comparison matrix (you vs competitors) | Feature deep-dive | Winner CTA
Hero (value proposition) | Pricing cards (3 tiers) | Feature comparison | FAQ
Hero with device mockup | Screenshots carousel | Features with icons | Reviews/ratings | Download CTAs
Hero with search bar | Popular categories | FAQ accordion | Contact/support CTA
Full-screen interactive element | Guided product tour | Key benefits revealed | CTA after completion
Hero (date/location/countdown) | Speakers grid | Agenda/schedule | Sponsors | Register CTA
Hero (product + aggregate rating) | Rating breakdown | Individual reviews | Buy/CTA
Hero (community value prop) | Popular topics/categories | Active members showcase | Join CTA
Hero (problem state) | Transformation slider/comparison | Results CTA
Hero (Search focused) | Categories | Featured Listings | Trust/Safety | CTA (Become a host/seller)
Hero (Value Prop + Form) | Recent Issues/Archives | Social Proof (Subscriber count) | About Author
Hero (Topic + Timer + Form) | What you'll learn | Speaker Bio | Urgency/Bonuses | Form (again)
Hero (Video/Mission) | Solutions by Industry | Solutions by Role | Client Logos | Contact Sales
Hero (Name/Role) | Project Grid (Masonry) | About/Philosophy | Contact
Intro (Vertical) | The Journey (Horizontal Track) | Detail Reveal | Vertical Footer
Bento Grid (Key Features) | Detail Cards | Tech Specs
Hero (Configurator) | Feature Highlight (synced) | Price/Specs | Purchase
Prompt/Input Hero | Generated Result Preview | How it Works | Value Prop
Hero (value prop) | Feature grid/cards (4-6) | Use cases or benefits | Social proof or logos
Full-bleed Hero (headline + visual) | Single value prop strip | Key benefit or proof | Primary CTA
Hero (mission/credibility) | Proof (logos, certs, stats) | Clear CTA path
Hero (product + live preview or status) | Key metrics/indicators | CTA (Start trial / Contact)
```

Note the casing is inconsistent too — `Hero (value prop)` vs `Hero (Value Prop + Form)`, `How it works` vs `How it Works`.

**Is required-vs-optional explicit? No.** Exactly two of 34 patterns carry any marker at all, and it's inline English inside the section name:

```
MARKER: product-demo-features | Hero > Product video/mockup (center) > Feature breakdown per section > Comparison (optional) > CTA
MARKER: comparison-table-cta  | Hero > Problem intro > Comparison table (product vs competitors) > Pricing (optional) > CTA
```

Section counts per pattern are uniformly 4 or 5, so there is no "core + extras" structure to infer.

**Does the data support filtering patterns to ones we can populate from a prospect's content and images? No — not as-is, not close.**

To do that filtering we need, per section, a machine-readable requirement: *needs a hero image*, *needs ≥3 services*, *needs ≥2 testimonials*, *needs a price*, *needs a phone number*. None of that exists. `Comparison table (product vs competitors)` and `Speakers grid` and `Rating breakdown` are exactly the sections we could not populate for a suburban optometrist, and there is no field that says so — we would have to read the English and decide.

Cost to annotate ourselves: 34 patterns × ~4.5 sections = **152 section slots to hand-map** onto a controlled vocabulary plus a requirements predicate. That is a day or two of careful work, and at the end of it we would have re-derived — with worse coverage — the `requires` model Kondo already has in `lib/templates/suitability.ts`:

```typescript
if (requires.heroImage && !content.heroImageUrl) { ... }
if (requires.phone && !content.contactPhone) { ... }
if (requires.minServices !== undefined && content.services.length < requires.minServices) { ... }
if (requires.minGallery !== undefined) { ... }
```

**Recommendation: don't import `landing.csv`.** Extend `TemplateMeta.requires` instead.

### 7.6 UX guidelines and anti-patterns — mostly prose

Script: `rules_ux_bias.py`, section C.

```
Severity: Counter({'Medium': 62, 'High': 44, 'Low': 9, 'Critical': 4})
rows whose Good/Bad examples contain code-like syntax: 18/119
rows with CSS declaration syntax in Good: 6
rows with HTML/ARIA tokens in Good/Bad: 17
```

**Prose advice, not machine rules.** There is no condition field, no selector, no assertion — just `Do` / `Don't` / `Code Example Good` / `Code Example Bad` as English or tiny snippets. First eight rows verbatim:

```
- [High]   Navigation / Smooth Scroll
    Do: Use scroll-behavior: smooth on html element
    Don't: Jump directly without transition
    Good: html { scroll-behavior: smooth; }
    Bad : <a href='#section'> without CSS
- [Medium] Navigation / Sticky Navigation
    Do: Add padding-top to body equal to nav height
    Don't: Let nav overlap first section content
    Good: pt-20 (if nav is h-20)
    Bad : No padding compensation
- [Medium] Navigation / Active State
    Do: Highlight active nav item with color/underline
    Don't: No visual feedback on current location
    Good: text-primary border-b-2
    Bad : All links same style
- [High]   Navigation / Back Button
    Do: Preserve navigation history properly
    Don't: Break browser/app back button behavior
    Good: history.pushState()
    Bad : location.replace()
- [Medium] Navigation / Deep Linking
    Do: Update URL on state/view changes
    Don't: Static URLs for dynamic content
    Good: Use query params or hash
    Bad : Single URL for all states
- [Low]    Navigation / Breadcrumbs
    Do: Use for sites with 3+ levels of depth
    Don't: Use for flat single-level sites
    Good: Home > Category > Product
    Bad : Only on deep nested pages
- [High]   Animation / Excessive Motion
    Do: Animate 1-2 key elements per view maximum
    Don't: Animate everything that moves
    Good: Single hero animation
    Bad : animate-bounce on 5+ elements
- [Medium] Animation / Duration Timing
    Do: Use shared motion tokens and test that feedback stays responsive
    Don't: Present 150-300ms or any cutoff as a universal requirement
    Good: transition-colors duration-200
    Bad : One duration copied to every transition
```

Note `pt-20`, `text-primary border-b-2`, `transition-colors duration-200`, `animate-bounce` — **Tailwind class names as the canonical "good" example.** We emit inlined plain CSS; these are unusable verbatim.

**How many could become automated checks against generated HTML?** I count **19** that are mechanically checkable on a static self-contained page, listed here so you can judge:

| # | Guideline | Automated check on our emitted HTML/CSS |
|---:|---|---|
| 1 | Smooth Scroll | assert `html { scroll-behavior: smooth }` present when any `href="#…"` exists |
| 2 | Sticky Navigation overlap | if a `position:sticky/fixed` nav exists, assert `body`/first-section top offset ≥ nav height |
| 3 | Active nav state | assert the current-page nav item has a distinguishing class/style |
| 4 | Excessive Motion | count elements with `animation`/`transition` on load; fail if > 2 in the hero |
| 5 | Reduced motion | assert a `@media (prefers-reduced-motion: reduce)` block exists whenever any animation does |
| 6 | Touch target size | compute rendered box for every `a`/`button`; fail below 44×44 CSS px |
| 7 | Touch spacing | assert ≥8px gap between adjacent interactive elements |
| 8 | Icon button labels | assert every button whose only child is an `svg`/`img` has `aria-label` or visible text |
| 9 | Decorative icons | assert decorative `svg` has `aria-hidden="true"` |
| 10 | Form control labels | assert every `input`/`select`/`textarea` has a `<label for>` or `aria-label` (placeholder alone fails) |
| 11 | Focus visibility | assert no `outline: none` without a replacement `:focus-visible` style |
| 12 | Base font size | assert computed body font-size ≥ 16px |
| 13 | Light-mode text contrast | recompute every text/background pair in the emitted CSS against 4.5:1 |
| 14 | Colour-only indicators | assert error/success states carry an icon or text, not just a colour class |
| 15 | Image sizing | assert every `img` has explicit `width`/`height` or `aspect-ratio` (CLS) |
| 16 | Alt text | assert every content `img` has non-empty `alt`; decorative has `alt=""` |
| 17 | Heading order | assert exactly one `h1` and no skipped heading levels |
| 18 | Deep linking / anchors | assert every in-page `href="#x"` has a matching `id="x"` |
| 19 | Breadcrumbs | assert absent on a single-level page |

The other ~100 are judgement calls ("Balance modern feel with clarity"), platform-specific (VisionOS, React Native), or about interaction states a static page doesn't have.

**Value assessment:** the *list of 19* is worth having as a checklist. The CSV itself is not worth importing — we would write those 19 assertions from scratch regardless, and the file's Tailwind bias makes its snippets actively misleading for our output format. **Treat `ux-guidelines.csv` as a source of ideas, not as data.**

`Anti_Patterns` from `ui-reasoning.csv` is more useful, because it is *per-industry* — but as measured in §4.6 it is 232 clauses of which 188 are singletons. The top ~15 clauses (`Excessive decoration`, `Complex shadows`, `3D effects`, `Muted colors`, `AI purple/pink gradients`, `Pure white backgrounds`, `Poor contrast ratios`, …) cover the bulk of instances and normalise to a small enum. Worth importing *after* clustering those 232 clauses down to ~20 canonical tokens.

### 7.7 General hygiene — clean

Script: `hygiene.py`.

**Encoding, BOM, ragged rows — all clean.** All 35 CSVs decode as UTF-8, none carries a BOM, and **not one has a ragged row** (every data row's field count matches its header):

```
  app-interface.csv         cols=11  nonascii_bytes=9      CRLF(33)
  charts.csv                cols=15  nonascii_bytes=117    CRLF(26)
  colors.csv                cols=19  nonascii_bytes=0      CRLF(193)
  google-fonts.csv          cols=15  nonascii_bytes=571    CRLF(1935)
  icons.csv                 cols=11  nonascii_bytes=3      CRLF(106)
  landing.csv               cols=10  nonascii_bytes=0      CRLF(35)
  motion.csv                cols=12  nonascii_bytes=0      CRLF(18)
  products.csv              cols=9   nonascii_bytes=23     CRLF(193)
  react-performance.csv     cols=11  nonascii_bytes=0      CRLF(45)
  styles.csv                cols=29  nonascii_bytes=2159   CRLF(89)
  typography.csv            cols=11  nonascii_bytes=156    CRLF(75)
  ui-reasoning.csv          cols=12  nonascii_bytes=9      CRLF(193)
  ux-guidelines.csv         cols=10  nonascii_bytes=0      CRLF(120)
  … 22 stack files, all clean
```

The CRLF is the local checkout artefact from §1.5, not a repo property.

**Duplicate rows: none.** Whole-row hash (excluding the `No` column) across all 35 files found zero duplicated row bodies.

**Colour formats — one real inconsistency.** Per-column breakdown of `colors.csv`:

```
-- colors.csv per-column format breakdown --
    Border: {'hex6': 173, 'rgba': 19}
```

Every other column in `colors.csv` is uniformly `#RRGGBB`. Elsewhere in the repo formats are mixed but those files are descriptive prose, not tokens:

```
  colors.csv       {'hex6': 3109, 'rgb/rgba': 19, 'named': 4}
  styles.csv       {'hex6': 636, 'hex3': 12, 'rgb/rgba': 49, 'named': 63}
  products.csv     {'hex6': 22, 'named': 34}
  ui-reasoning.csv {'hex6': 19, 'named': 37}
  landing.csv      {'hex6': 9, 'hex3': 2, 'named': 9}
  stacks/shadcn.csv, stacks/laravel.csv, stacks/html-tailwind.csv  {'oklch': 1 each}
```

`styles.csv` mixing hex6 / hex3 / rgba / named ("Beige #F5F1E8, Grey #808080, Taupe #B3A394") inside `Primary Colors` and `Secondary Colors` matters if we ever parse those columns. We shouldn't — they are design descriptions, not tokens.

**Casing / naming conventions — one clear inconsistency across files.**

```
distinct header names: 131
snake_case headers (8): ['Anti_Patterns','Color_Mood','Decision_Rules','Key_Effects',
                         'Recommended_Pattern','Style_Priority','Typography_Mood','UI_Category']
headers containing non-ascii: ['Light Mode ✓', 'Dark Mode ✓']
ui-reasoning.csv is the ONLY snake_case file
```

Every file uses `Title Case With Spaces` except `ui-reasoning.csv`, which uses `Snake_Case`. And the same concept is named four different ways across files: `Product Type` (products, colors) / `UI_Category` (ui-reasoning) / `Style Category` (styles) / `Data Type` (charts). Two headers embed a `✓` glyph, which will trip naive column access in any language that doesn't normalise Unicode.

**Verdict: hygiene is good.** Nothing here blocks an import; it's a normalisation pass, not a cleanup project.

---

## 8. Fit for our use case

### 8.1 Designed for interactive back-and-forth — what breaks in batch

**(a) There is no confidence signal a batch job can trust.** Covered at length in §3.5 and §6. `reasoning_default` and `source_identities.product == null` catch the *abstain* case (2 of our 5), but nothing catches the *wrong confident match* (1 of our 5, and the most damaging one). A human running this interactively reads "Veterinary Clinic" in the output and immediately retries with a better query. A cron job does not.

**(b) The abstain message is written to a model, not a caller.** `search.py:73–78`:

```python
output.append(
    "No matches. This is not a match with an empty value -- the query "
    "did not hit the database. Retry with broader/different keywords "
    "before falling back to general defaults, and say explicitly that "
    "no database match was found if you do fall back."
)
```

That is a prompt. The whole retrieval layer assumes an agent in the loop that will reformulate. In JSON mode you get `count: 0` plus `suggestions` — and the suggestions are useless for us:

```
NDIS query      → "suggestions": ["sports"]
Optometry query → "suggestions": ["caption"]
```

Single-token Levenshtein-ish neighbours (`difflib.SequenceMatcher` ≥ 0.72, `core.py:498`) of an out-of-vocabulary term. No batch job can act on "caption".

**(c) The persistence layer is an interactive-session feature.** ~660 lines (`design_system.py:960–1628`) write `design-system/<slug>/MASTER.md` and `pages/<page>.md`, with `--force` guarding overwrite so "prior design decisions aren't lost" (`search.py:24–25`). This is a *conversation memory* mechanism — irrelevant and unwanted for us. We would drop all of it.

**(d) The dials are global, not per-client.** `--variance 10` turns a law firm into Brutalism regardless of industry (§4.7). In batch, a dial set once applies to every page in the run.

**(e) Everything else is batch-friendly.** Output is fully deterministic (5/5 identical hashes), fast (**26.8 ms warm, 57.5 ms cold** per full design system; 9.6 ms/query in a warm loop over 192), pure-stdlib Python with no network calls, and the index is built in-memory in under 60 ms. There is no state, no randomness, no clock dependency. **The performance requirement is comfortably met** — the problem is accuracy, not speed.

### 8.2 Framework and build-step assumptions

Measured across the non-stack CSVs:

```
  app-interface.csv        {'react/jsx': 51}
  charts.csv               {}
  colors.csv               {}
  google-fonts.csv         {}
  icons.csv                {'react/jsx': 214}
  landing.csv              {}
  motion.csv               {'react/jsx': 10, 'next.js': 1, 'gsap': 27}
  products.csv             {}
  react-performance.csv    {'react/jsx': 31, 'next.js': 45}
  styles.csv               {'tailwind': 37, 'react/jsx': 32, 'gsap': 8, 'tw-class-strings': 91, 'css-vars': 595}
  typography.csv           {'tailwind': 1, 'react/jsx': 1}
  ui-reasoning.csv         {}
  ux-guidelines.csv        {'react/jsx': 1, 'tw-class-strings': 5}
```

**Zero framework coupling in the four files we most want:** `colors.csv`, `products.csv`, `ui-reasoning.csv`, `landing.csv` are pure data. `typography.csv` has one Tailwind mention (the optional `Tailwind Config` column, which we ignore) and is otherwise plain — its `CSS Import` column is a bare `@import url(...)`, exactly what we need.

**`styles.csv` is the coupled one:** 37 Tailwind mentions, 91 Tailwind class strings, a `Framework Compatibility` column of `tailwind|bootstrap|mui` values. But note the **595 CSS custom properties** in `Design System Variables` — that column is framework-agnostic and is genuinely useful for inlined CSS. It is also the column I flagged in §2.4 as unsafe to split on commas. Net: harvest that one column by hand, ignore the rest of the file.

`icons.csv`, `app-interface.csv`, `react-performance.csv`, `motion.csv` and all 22 stack files are React/RN/GSAP-bound and irrelevant.

**Bundler assumption: none in the data.** The runtime is pure stdlib Python (`csv`, `re`, `math`, `difflib`, `pathlib`) — no numpy, no scikit-learn, no external index. Nothing assumes a build step. That part ports cleanly.

### 8.3 US / Northern-Hemisphere bias

Scanned for locale markers across the seven relevant CSVs:

```
  products.csv:      {'HIPAA': 1, 'WCAG': 3, 'state': 1, 'metric': 1}
  ui-reasoning.csv:  {'WCAG': 4, 'state': 12}
  colors.csv:        {}
  styles.csv:        {'$': 1, 'GDPR': 1, 'WCAG': 3, 'state': 18, 'metric': 13}
  landing.csv:       {'state': 30}
  ux-guidelines.csv: {'WCAG': 10, 'state': 16}
  typography.csv:    {'WCAG': 1}
```

*(`state` hits are overwhelmingly "focus state", "loading state" — UI state, not US states. `metric` is "metrics"/"key metrics".)*

**Explicit regulatory bias is mild** — one HIPAA reference (in `Healthcare App`'s `Key Considerations`), one GDPR. No FDA, no Section 508, no ADA, no Fahrenheit, no zip codes, no Thanksgiving/seasonal assumptions. Standards references are WCAG, which is global. Better than I expected.

**The real bias is taxonomic, and it is significant.** The 192 product types (full list generated in §2, reproduced in the audit scripts) are dominated by US-style venture-backed software and consumer apps: `Micro SaaS`, `NFT/Web3 Platform`, `Creator Economy Platform`, `Micro-Credentials/Badges Platform`, `Quantum Computing Interface`, `Biohacking / Longevity App`, `Autonomous Drone Fleet Manager`, `Spatial Computing OS / App`, `Meme & Sticker Maker`, `Wallpaper & Theme App`, `Link-in-Bio Page Builder`, `Anonymous Community / Confession`, `Idle & Clicker Game`, `Fasting & Intermittent Timer`. Roughly 90 of the 192 are consumer mobile apps.

Against that, the Australian-SME service-business categories we actually sell to are thin:

| Our book | Nearest category in the 192 | Adequate? |
|---|---|---|
| Physiotherapy / allied health / NDIS therapy | `Medical Clinic`, `Healthcare App`, `Senior Care/Elderly` | Partly — no allied-health or mobile-practitioner concept |
| NDIS / disability support / CALD community services | **none** | **No** |
| Family law (boutique) | `Legal Services` | Yes |
| Optometry / audiology / podiatry | `Dental Practice` (closest) | **No** |
| Agricultural & earthmoving machinery manufacture | `Agriculture/Farm Tech`, `Construction/Architecture` | **No** — both are software-flavoured |
| Trades (plumber, electrician, builder) | `Home Services (Plumber/Electrician)` | Yes |
| RTOs / training organisations | `Online Course/E-learning`, `Coding Bootcamp` | Partly |
| Aged care providers | `Senior Care/Elderly` | Partly |

Three of our five audit verticals have **no home in the taxonomy at all** — which is precisely why three of five failed. There is also a specifically Northern-Hemisphere colour/imagery assumption baked into a few `Color Palette Focus` and `Key Effects` values (autumn/harvest palettes for agriculture, "winter" seasonal cues), though at low volume.

**Conclusion: the taxonomy needs replacing, not translating.** We would keep the *schema* of `products.csv` and write our own ~40–60 rows for the Australian SME service market.

### 8.4 Can we anchor a palette to a crawled brand colour?

**Yes — and this is the most valuable structural finding in the audit. The palettes are not fixed sets; they are role-assigned, and the role relationships are consistent enough to be treated as generative rules.**

Script: `roles.py`.

```
== ROLE INVARIANTS ACROSS 192 PALETTES ==
  Card Foreground == Foreground:  192/192   (100%)
  Ring == Primary:                161/192   (84%)
  Card == #FFFFFF:                148/192   (77%)
  Ring == Accent:                   4/192
  hue(Primary→Secondary) delta: median= 4.0°   <15° in 164/192
  hue(Primary→Accent)    delta: median=103.0°  >60° in 135/192

== EVIDENCE OF AUTOMATED CONTRAST REPAIR IN Notes ==
   56  [Accent adjusted from #XXXXXX]
  palettes with at least one [...] adjustment note: 56/192

== ANCHOR TEST: substitute a crawled brand primary into each palette's structure ==
Rule the repo already encodes: 'On Primary' is one of only 3 values ['#000000','#0F172A','#FFFFFF']
  brand #7A1F3D (deep maroon):  best On Primary = #FFFFFF at 10.04:1  -> AA body PASS
  brand #1B7F4C (forest green): best On Primary = #FFFFFF at  5.02:1  -> AA body PASS
  brand #F2C200 (brand yellow): best On Primary = #000000 at 12.49:1  -> AA body PASS
  brand #00A3AD (teal):         best On Primary = #000000 at  6.84:1  -> AA body PASS
  brand #111111 (near black):   best On Primary = #FFFFFF at 18.88:1  -> AA body PASS
  => the On-* columns are a 3-value lookup, trivially recomputable for ANY primary.

== distinct values per role ==
  Primary 50 | Secondary 61 | Accent 33 | Ring 46 | Muted 72 | Border 57
  Background 33 | Foreground 34 | Card 17 | Card Foreground 34 | Muted Foreground 4
  Destructive 3 | On Primary 3 | On Secondary 3 | On Accent 3 | On Destructive 2
```

Read that as a rule set:

1. **`Card Foreground` is always `Foreground`** — 192/192, no exceptions. One token, not two.
2. **`Ring` is `Primary`** in 84% of cases.
3. **`Secondary` is the same hue as `Primary`**, differing only in lightness/saturation (median 4° hue delta, <15° in 85% of palettes). It is a tint/shade, not a second brand colour.
4. **`Accent` is near-complementary to `Primary`** (median 103° hue delta, >60° in 70%). It is the CTA colour and it is deliberately *opposed* to the brand colour.
5. **The four `On *` columns are a 3-value lookup** (`#FFFFFF`, `#000000`, `#0F172A`) chosen for contrast — and picking the best of three for an arbitrary brand colour passes AA on every test case I threw at it.
6. **`Muted Foreground` is one of four values**, chosen by whether the surface is light or dark.
7. **Neutrals are decoupled from brand.** `Background` (33), `Card` (17), `Foreground` (34) come from a small shared pool that is independent of the 50 primaries.
8. **56 of 192 palettes carry `[Accent adjusted from #XXXXXX]` in `Notes`** — the maintainers ran an automated contrast repair over the accent column and recorded it. That is why §7.1 came back so clean.

**So the answer to the question as posed: we can substitute our own extracted primary and keep every role assignment.** Rules 1, 2, 5, 6, 7 are pure functions of the primary and the surface; rules 3 and 4 tell us how to *derive* secondary and accent from a single crawled hue.

**But note what Kondo already has.** `lib/content/normalize-brand-colors.ts` does exactly this, and its header comment shows the team already learned the same lesson the hard way:

```
 * Extracted colours are frequently unusable as-is: Princeton Dental came back
 * as black + two near-identical greens, BC Security as black + two greys.
 * Using those raw produces a black-to-grey "gradient" that reads as broken
 * rather than deliberate.
 *
 * So we don't use the raw hex. We pick the single most usable HUE from what
 * was extracted, then derive every colour in the template from it at
 * lightness/saturation values we control.
```

with a `Palette` type of `accent / accentInk / accentSoft / deep / deepSoft / mist / ink / inkMuted / line / paper / derivedFrom`.

That is the same idea with 11 roles instead of 16. **What `colors.csv` adds is not a palette table we need — it's 192 worked examples we can validate our derivation function against, plus four roles we're missing** (`destructive`/`on destructive` for form errors, `ring` for focus, and an explicit `secondary` distinct from `accent`). That is a real but modest contribution.

---

## 9. Port recommendation

### 9.1 Verdict — committing to one

**Port the structure and a curated subset of the data; write our own taxonomy; do not port the retrieval logic.**

Concretely: import **`typography.csv` in full**, import **`colors.csv` as a validation corpus and a source of four missing role tokens**, import the **`Decision_Rules` grammar** from `reasoning_contract.py`, and import the **industry→mood/anti-pattern columns of `ui-reasoning.csv` after re-keying to a taxonomy we write ourselves**. Leave `landing.csv`, `styles.csv`, `ux-guidelines.csv`, and the entire BM25 layer.

**Why.**

The data we want is real and verifiably good: 192 palettes with **one** WCAG AA text failure in 1,536 pairs, 74 font pairings where **every family and every weight resolves** against a pinned `google/fonts` snapshot and 90 of 91 families are OFL, and a decision-rule grammar that is closed, validated and non-executable. That is months of curation we would otherwise do ourselves, under MIT, from an actively maintained upstream. Not importing it would be leaving money on the table.

The selection logic is the opposite. On our five verticals it produced one good answer, one defensible-but-wrong answer, and three failures, two of which are silent. The root causes are structural, not tunable: no field weighting means the shortest document wins (§4.2, §6.1); no stemming means `physiotherapy` and `optometrist` score exactly zero against 192 rows (§4.3); no score floor on the colour domain means it can never abstain (§3.5); and the `"General"` sentinel leaks into downstream queries as a literal search token (§3.5, §6.5). Fixing all four is a rewrite, and at the end of it we would have a fuzzy text matcher solving a problem where we already know the answer — **we know what industry the prospect is in.** Kondo's crawler produces `detectedIndustry`; we should look up, not search.

And the taxonomy is wrong for us regardless. Ninety of 192 categories are consumer mobile apps. Three of our five verticals have no home in it at all. Translating won't fix that; replacing will.

### 9.2 Which files to import, and which to leave

| File | Decision | Rationale |
|---|---|---|
| `colors.csv` | **Import — 192 rows, as reference + role tokens** | 0.5% AA failure rate; role invariants (§8.4) validate our derivation function. Drop `Spatial Computing OS / App` (the one failure). Normalise 19 `rgba()` borders. |
| `typography.csv` | **Import — all 74 rows** | Zero unresolved families, zero weight problems, all OFL/Apache-2. Flag the 20 single-family pairings; exclude the 13 mobile/system ones. Keep `Mood/Style Keywords` as the join key and `CSS Import` verbatim. |
| `ui-reasoning.csv` | **Import — columns 3,5,6,7,8,9,10 only, re-keyed** | `Recommended_Pattern`, `Color_Mood`, `Typography_Mood`, `Key_Effects`, `Decision_Rules`, `Anti_Patterns`, `Severity`. Drop `Reasoning` and `Confidence` (83.9% empty). Re-key `UI_Category` onto our taxonomy. |
| `products.csv` | **Import schema, not rows** | Keep columns 2,3,4,9. **Do not import column 6** — 36 of 77 values are broken FKs (§3.4). Write our own ~40–60 Australian SME rows. |
| `google-fonts.csv` | **Import — build-time validation only** | 1934 families; used to assert every weight we request exists. Never shipped to runtime. |
| `google-font-licenses.json` | **Import — audit trail** | Pins `google/fonts@038b637d`. Keep for the licence file. |
| `styles.csv` | **Do not import; harvest one column by hand** | 595 CSS custom properties in `Design System Variables` are useful; the other 28 columns are Tailwind-coupled, 38/88 rows are unreachable, and `Design System Variables` isn't safely splittable (§2.4). Extract manually for the ~8 styles we'd actually use. |
| `landing.csv` | **Do not import** | 138 distinct section names across 152 slots, no required/optional schema, 14/34 orphaned (§7.5). Extend `TemplateMeta.requires` instead. |
| `ux-guidelines.csv` | **Do not import; keep the list of 19** | 18/119 machine-checkable, Tailwind-flavoured snippets (§7.6). The 19 checks I enumerated are the deliverable, not the file. |
| `motion.csv` | **Do not import** | 17 GSAP snippets; we emit static CSS. Steal the three-tier `Duration`/`Easing` values as constants if useful. |
| `charts.csv`, `icons.csv`, `app-interface.csv`, `react-performance.csv`, `data/stacks/*` | **Do not import** | Dashboards, React Native, framework guidance. Out of scope. |
| `catalog-summary.json`, `data-provenance.json` | **Do not import** | Upstream bookkeeping. Read once at pin time to record counts. |

### 9.3 Proposed TypeScript module structure

Sitting alongside the existing `lib/content/` and `lib/templates/`, following Kondo's existing conventions:

```
lib/design/
├── data/                              # generated, checked in, never hand-edited
│   ├── palettes.json                  # 191 palettes from colors.csv (Spatial Computing dropped)
│   ├── typography.json                #  74 pairings from typography.csv
│   ├── verticals.json                 #  OUR taxonomy: ~40-60 AU SME industries
│   ├── reasoning.json                 #  mood/anti-pattern/decision-rules, keyed to verticals.json
│   └── PROVENANCE.md                  #  upstream SHA, import date, MIT notice, per-file lineage
│
├── build/                             # dev-time only, excluded from the Next bundle
│   ├── import-uupm.ts                 #  CSV -> JSON; normalises rgba borders, CRLF, casing
│   ├── validate-fonts.ts              #  every requested weight exists in google-fonts.csv
│   └── validate-contrast.ts           #  every palette passes AA on all text pairs; CI gate
│
├── types.ts                           # DesignSystem, Palette, Pairing, Vertical, DecisionRule
├── classify-vertical.ts               # crawled site -> Vertical | null.  EXPLICIT, not BM25.
├── decision-rules.ts                  # port of reasoning_contract.py: parse + apply + audit trail
├── resolve-palette.ts                 # brand hue + vertical -> full 16-role palette
├── resolve-typography.ts              # vertical mood -> Pairing (explicit table, tie-broken by slug)
├── resolve-anti-patterns.ts           # vertical -> canonical anti-pattern tokens (~20 enum values)
├── contrast.ts                        # sRGB -> luminance -> WCAG ratio; pickOnColor(bg)
├── resolve-design-system.ts           # the one public entry point; composes the above
└── resolve-design-system.test.ts      # golden-file tests: our 5 verticals + 20 more, frozen output
```

**Responsibilities, and the non-obvious calls:**

- **`classify-vertical.ts` is the file that replaces BM25.** Input is the crawler's structured output (`detectedIndustry`, page titles, nav labels, service names), not a free-text blurb. Implementation: an explicit keyword→vertical table with a deterministic priority order, returning `null` rather than guessing. **`null` must be a first-class outcome** — the whole §6 failure set exists because the Python version refuses to return nothing. When it's `null`, we fall back to a *neutral* system and flag the page for review; we never synthesise a category from a sentinel.
- **`resolve-palette.ts` extends, not replaces, `lib/content/normalize-brand-colors.ts`.** That file already derives 11 roles from a crawled hue. Add the four roles it lacks (`secondary`, `ring`, `destructive`, `onDestructive`) using the invariants in §8.4, and add `pickOnColor()` from `contrast.ts`. The 191 imported palettes are the **test corpus**, not the runtime source — `validate-contrast.ts` asserts our derivation reproduces AA-passing output for all 191 brand primaries.
- **`decision-rules.ts` is the one near-verbatim port.** 123 lines of Python → ~170 lines of TypeScript. Keep the closed grammar, keep the `activated` audit trail, keep the "never execute data" property. Change one thing: populate it with `style:` / `pattern:` / `mode:` actions that actually do something, instead of upstream's 497-out-of-511 advisory `constraint:` tokens.
- **`resolve-design-system.ts`** must return a **discriminated union**, not a always-populated object: `{ ok: true, system: DesignSystem } | { ok: false, reason: "no-vertical-match", partial: NeutralSystem }`. This is the single most important departure from upstream. Every §6 failure would have been caught by this type.
- **Every resolver takes an explicit tiebreak by slug**, never implicit array order (§4.4).

### 9.4 What we'd have to build that this repo doesn't give us

1. **An Australian SME vertical taxonomy.** ~40–60 rows. Physio/allied health, NDIS & disability support, aged care, optometry/audiology/podiatry, dental, GP & specialist clinics, family/criminal/property law, accounting & bookkeeping, trades, civil & earthmoving, agricultural machinery, RTOs, childcare, veterinary, real estate, hospitality. Three of our five audit verticals have no upstream equivalent.
2. **A deterministic classifier from crawled site content to that taxonomy.** Nothing upstream does this — it takes a human-written prompt. Ours takes a crawl.
3. **A `null`-returning contract with a neutral fallback and a review flag.** Upstream cannot express "I don't know."
4. **A palette↔style mode coherence assertion.** `_palette_is_dark` exists at `design_system.py:147` and is never used as a post-condition; that's the optometry bug (§7.4).
5. **Section→content requirement predicates.** `landing.csv` has none (§7.5); Kondo's `TemplateMeta.requires` is the right home. Needs extending with `minTestimonials`, `needsPricing`, `needsTeamPhotos`, `needsCredentials`.
6. **The 19 automated HTML checks** from §7.6. The CSV gives us the ideas, not the assertions.
7. **A canonical anti-pattern enum.** 232 free-text clauses → ~20 tokens.
8. **Golden-file regression tests.** Upstream has 90 relevance cases of which only 8 are design-system mode and 2 are product-domain — far too thin to protect a batch pipeline. We need our own, frozen, per-vertical.

### 9.5 What we'd have to annotate or clean before the data is usable

| Task | Scope | Effort |
|---|---|---|
| Normalise 19 `rgba()` borders in `colors.csv` to hex or a documented alpha token | 19 rows | trivial, scripted |
| Drop `Spatial Computing OS / App` (the one AA failure, `#5F6673` on `#888888` = 1.63:1) | 1 row | trivial |
| Re-key `ui-reasoning.csv`'s 192 `UI_Category` values onto our ~40–60 verticals (many-to-one, some unmapped, several new) | 192 → ~50 | **2–3 days, the bulk of the work** |
| Cluster 232 anti-pattern clauses → ~20 canonical tokens | 232 clauses | 0.5 day |
| Tag the 20 single-family typography pairings; exclude the 13 mobile/system ones | 74 rows | 0.5 day |
| Extract `Design System Variables` for the ~8 styles we'd use (not safely splittable — manual) | 8 rows | 0.5 day |
| Normalise header casing (`UI_Category` → `vertical`, strip `✓` glyphs) | 8 headers | trivial, scripted |
| LF-normalise before hashing anything (§1.5) | all files | trivial |
| Write `THIRD_PARTY_NOTICES.md` with the MIT text + pinned SHA | 1 file | trivial |

### 9.6 Realistic effort estimate

| Phase | Work | Days |
|---|---:|---|
| **Data import** | `import-uupm.ts`, normalisation, `validate-fonts.ts`, `validate-contrast.ts`, provenance + licence file | **1.5–2** |
| **Taxonomy** | Write ~40–60 AU SME verticals; re-key 192 reasoning rows onto them; cluster anti-patterns; tag typography | **2.5–3.5** |
| **Logic reimplementation** | `decision-rules.ts`, `contrast.ts`, `resolve-palette.ts` (extending the existing file), `resolve-typography.ts`, `resolve-anti-patterns.ts`, `resolve-design-system.ts`, `classify-vertical.ts` | **3–4** |
| **Tests + CI gates** | Golden files for 25 verticals; contrast gate; font-weight gate; determinism assertion | **1–1.5** |
| **Total** | | **8–11 working days** |

Split as asked: **data import ≈ 4–5.5 days** (import mechanics 1.5–2, annotation 2.5–3.5), **logic reimplementation ≈ 4–5.5 days**.

For contrast, the faithful port of the upstream pipeline (BM25 and all, §4.8) is ~1,500–1,800 LOC and **7–9 days for the logic alone** — and it would ship the §6 failures with it. The recommended path is both cheaper and better.

### 9.7 Pinning and versioning against a moving upstream

Upstream is doing ~20 commits/month from 53 contributors (§1.5). A `main`-tracking dependency would drift under us silently, and because ties resolve by CSV row order (§4.4), an upstream row insertion can change our output with no change to our code.

**Vendor, don't depend.**

1. **Pin by commit SHA, not tag.** Record `a38d04c3d5c298c851dbe5e6ee1965ee3de42cb5` in `lib/design/data/PROVENANCE.md` alongside the import date and the per-file row counts we imported (192 palettes, 74 pairings, 192 reasoning rows).
2. **Commit the generated JSON, not the CSVs.** The build script is dev-time only; runtime reads checked-in JSON. No CSV parsing in production, no parse-failure mode at request time.
3. **Hash after LF normalisation.** §1.5 — otherwise every Windows checkout produces a different digest. Store `sha256(content.replace(/\r\n/g, "\n"))` per source file.
4. **Never edit the generated JSON by hand.** Corrections go in a sibling `overrides.json` merged at build time, so a re-import doesn't silently discard our fixes. This is the single rule most likely to be broken under deadline pressure; put it in the file header.
5. **Gate re-imports on the two validators.** `validate-contrast.ts` (no AA regression) and `validate-fonts.ts` (no unresolvable weight) must pass before a refreshed import is accepted. Both are cheap and both would have caught real upstream defects.
6. **Freeze output with golden files.** Our 25-vertical golden test is the actual contract. Any upstream refresh that changes a byte of generated output must show up as a reviewed diff.
7. **Re-import deliberately, not on a schedule.** Quarterly at most, and only when there's a reason (new font families, a palette correction). There is no security surface here — it's static data — so there's no pressure to stay current.

---

## Confidence table

| # | Claim | Status |
|---:|---|---|
| 1 | Repo is MIT; no separate data licence; no per-file headers | **Verified in code** — `LICENSE`, `skill.json:8`, `find src -iname "*licen*"` |
| 2 | Data directory is covered by the root MIT grant | **Verified in code** — no path scoping, no carve-out found |
| 3 | Nothing in this clone is premium content | **Verified in code** — `README.md:200–217` names palettes/pairings/product types as Basic |
| 4 | 90 of 91 typography families are OFL, 1 is Apache-2, all in the pinned manifest | **Computed from data** — `google-font-licenses.json` vs `typography.csv` |
| 5 | Fonts pinned to `google/fonts@038b637da7b3fd956a4ed93ffc607c3d5e4ce172` | **Verified in code** — `google-font-licenses.json.source` |
| 6 | Actively maintained: 121 commits / 53 contributors in 6 months, HEAD 14 Aug 2026 | **Verified in code** — `git log`, `git shortlog` |
| 7 | `validate_data.py` exits 1 on a Windows clone, purely from CRLF | **Verified in code** — exit code captured; LF-normalised SHAs match expected exactly |
| 8 | products ↔ colors ↔ ui-reasoning are 1:1:1, 192 rows, identical order, no dupes | **Computed from data** — `joins.py` |
| 9 | All 763 style references and all 88 reasoning→landing patterns resolve | **Computed from data** — `joins.py` |
| 10 | `products.Landing Page Pattern` has 36 broken FK values and is read by no code path | **Computed from data** + **Verified in code** (absent from `CSV_CONFIG` output/search cols and from `design_system.py`) |
| 11 | 14 of 34 landing patterns are orphaned from the design-system pipeline | **Computed from data** — `joins.py` |
| 12 | BM25 k1=1.5, b=0.75, no field weighting, index built at runtime | **Verified in code** — `core.py:285`, `:397–398`, `:386–402` |
| 13 | No stemming; `physiotherapy` and `optometrist` score 0 across all 192 products | **Computed from data** — `determinism.py` |
| 14 | Colour and typography domains have no score floor and can never abstain | **Verified in code** — `core.py:203–211`, no `"color"`/`"typography"` key |
| 15 | The `"General"` sentinel is spliced into downstream search queries | **Verified in code** — `design_system.py:326–328`, `:464–466`; traced live |
| 16 | Output is byte-identical across runs; 26.8 ms warm / 57.5 ms cold | **Computed from data** — `determinism.py`, 5 runs, 1 distinct hash |
| 17 | Row-score ties resolve by CSV row order (stable sort), not an explicit key | **Verified in code** — `core.py:343` |
| 18 | `Decision_Rules` is a closed validated grammar; all 192 rows parse; no unknown conditions | **Verified in code** + **Computed from data** — `reasoning_contract.py`, `rules_ux_bias.py` |
| 19 | 497 of 511 rule actions are advisory `constraint:`; only 14 change selection | **Computed from data** — `rules_ux_bias.py` |
| 20 | `--variance` hard-overrides style selection; `--density` is a constant table | **Verified in code** + live sweep — `design_system.py:71–87`, `:419–422`, `:603` |
| 21 | JSON output is fully structured; no prose parsing required | **Verified in code** — `search.py:136–140`, `design_system.py:953–957` |
| 22 | 1 of 192 palettes fails WCAG AA on body text (1 failure / 1,536 pairs) | **Computed from data** — `contrast.py` |
| 23 | 173/192 borders fall below 3:1 vs background (not a defect under WCAG 1.4.11) | **Computed from data** — `contrast.py` |
| 24 | ~165 effectively distinct palettes at ΔE00 < 5; 33 distinct backgrounds | **Computed from data** — `distinct.py`, CIEDE2000 |
| 25 | Zero unresolved font families; zero weight problems across all 74 pairings | **Computed from data** — `fonts_styles_landing.py` |
| 26 | 20 of 74 pairings are single-family | **Computed from data** — `fonts_styles_landing.py` |
| 27 | styles: 50 active / 29 supplemental / 9 deprecated; `Status` enforced at `core.py:810` | **Computed from data** + **Verified in code** |
| 28 | 138 distinct section names across 152 slots; only 2 patterns mark anything optional | **Computed from data** — `fonts_styles_landing.py` |
| 29 | 18 of 119 UX guidelines contain code-like syntax; the rest is prose | **Computed from data** — `rules_ux_bias.py` |
| 30 | No ragged rows, no BOM, no duplicate rows, all UTF-8 across 35 CSVs | **Computed from data** — `hygiene.py` |
| 31 | `Border` is the only format-inconsistent column (173 hex / 19 rgba) | **Computed from data** — `hygiene.py` |
| 32 | Palette roles are generative: CardFg==Fg 192/192, Ring==Primary 161/192, Secondary same hue (median 4°), Accent complementary (median 103°) | **Computed from data** — `roles.py` |
| 33 | `On *` is a 3-value contrast lookup that passes AA for arbitrary brand primaries | **Computed from data** — `roles.py`, 5 brand colours tested |
| 34 | 56 of 192 palettes record automated accent contrast repair in `Notes` | **Computed from data** — `roles.py` |
| 35 | Under perfect retrieval: 192/192 palettes but only 25 styles, 48 pairings, 19 patterns | **Computed from data** — `sweep.py` |
| 36 | Vertical 1 matched Veterinary Clinic @ 6.409 vs Medical Clinic @ 6.258 (2.4% margin) | **Computed from data** — `diag.py` |
| 37 | Verticals 3 and 5 abstained; V5's palette came from Coding Challenge & Practice | **Computed from data** — `diag.py` + colour-domain trace |
| 38 | Zero framework coupling in colors/products/ui-reasoning/landing; styles.csv is Tailwind-bound | **Computed from data** — `hygiene.py` |
| 39 | No US-specific regulatory bias beyond 1 HIPAA / 1 GDPR reference | **Computed from data** — `rules_ux_bias.py` locale scan |
| 40 | The 192-row taxonomy has no category for NDIS/disability, optometry, or machinery manufacture | **Computed from data** — full taxonomy enumerated and cross-checked |
| 41 | ~1,143 lines of Python logic to port faithfully → ~1,500–1,800 LOC TS | **Computed from data** — `ast` function spans, minus excluded modules |
| 42 | Kondo's `normalize-brand-colors.ts` already derives 11 roles from a crawled hue | **Verified in code** — `lib/content/normalize-brand-colors.ts:1–30` |
| 43 | Kondo's `suitability.ts` already implements the `requires` model landing.csv lacks | **Verified in code** — `lib/templates/suitability.ts:9–43` |
| 44 | Effort: 8–11 working days (4–5.5 data, 4–5.5 logic) | **Estimate** — my judgement from the measured scope above, not a measurement |
| 45 | Substituting our brand primary would keep all role assignments valid in production | **Needs a run to confirm** — validated arithmetically on 5 brand colours; not yet validated by rendering real pages. Settle with: implement `resolve-palette.ts`, run `validate-contrast.ts` over all 191 imported primaries, then render 10 real prospect pages and eyeball. |
| 46 | The 19 nominated UX checks are all implementable against our emitted HTML | **Needs a run to confirm** — I read our output format but did not write the assertions. Settle with: prototype checks 6, 8, 10, 13, 17 against three existing generated pages. |
| 47 | Upstream `validate_data.py` passes on a Linux/LF checkout | **Needs a run to confirm** — inferred from matching LF hashes. Settle with: `git -c core.autocrlf=false clone <repo> /tmp/uupm && cd /tmp/uupm/src/ui-ux-pro-max/scripts && python validate_data.py; echo $?` |
| 48 | The 90-case relevance suite passes at upstream's own thresholds | **Needs a run to confirm** — `pytest` is not installed here (`No module named pytest`). Settle with: `pip install pytest && cd src/ui-ux-pro-max/scripts && python -m pytest tests -q` |

---

## Open questions for you

1. **Do we already have a vertical taxonomy?** The 2.5–3.5 days of annotation in §9.5 assumes we're writing one. If Kondo's `detectedIndustry` already resolves to a fixed enum (I saw the field in `TemplateContent` but not its value domain), that work shrinks a lot and the re-keying target is already decided. If not, this is the decision that sets the shape of everything else.

2. **How much does the palette actually matter, given `normalize-brand-colors.ts`?** My §8.4 read is that we already derive from the client hue and `colors.csv` mainly buys us four missing roles plus a 191-case test corpus. If you disagree — if you'd rather select a curated palette per industry and *tint* it toward the brand — then `colors.csv` becomes the centrepiece rather than a validation set, and the import is worth more than I've credited it.

3. **Is a `null` classification acceptable operationally?** §9.3 makes "I don't know this industry" a first-class outcome that flags a page for review. That's the fix for three of our five failures. But it means some fraction of a batch stops and waits for a human. What fraction is tolerable — 5%? 20%? — determines how aggressive the classifier can be, and whether we need a "neutral but competent" fallback design system as a hard requirement rather than a nice-to-have.

4. **How many typography pairings do we actually want?** We currently ship one (Instrument Sans + Newsreader across all three templates). Going to 74 — or 54 after excluding the single-family ones — is a big jump in visual variety but also in QA surface, since each pairing needs checking against each template's type scale. Is the target 5? 15? All of them?

5. **Do we want the `Decision_Rules` engine at all, or just the outputs?** It's the best-engineered thing upstream and it's cheap to port (~170 LOC), but upstream barely uses it — 497 of 511 actions do nothing. Porting it is only worth it if we intend to author real `style:`/`pattern:`/`mode:` rules. If the answer is "just give me a mood string per industry", skip it and save a day.

6. **Who owns the quarterly re-import?** §9.7 works only if someone actually runs it and reviews the golden-file diff. With upstream at ~20 commits/month, a vendored copy nobody refreshes is fine for a year and then quietly stale. Worth deciding now whether this is a real cadence or a one-time snapshot we're honest about.

7. **Is there appetite to contribute back?** We'd be adding ~50 Australian SME verticals to a taxonomy that has none. Upstream takes PRs (53 contributors in six months). Not urgent, and it does hand competitors our vertical list — but it's the cheapest possible way to keep our additions from rotting.

---

## Appendix A — the five verticals, full verbatim output

Produced with, from `src/ui-ux-pro-max/scripts/`:

```bash
python search.py "<query>" --design-system
```

Nothing below is edited, summarised or reflowed. The box is 90 columns wide and a few long
values overflow it — that overflow is in the tool's own output, not an artefact of this document.

### A.1 — Mobile physiotherapy and neurological rehabilitation clinic, Australia, home visits

```
╔═════════════════════════════════════════════════════════════════════════════════════════╗
║  TARGET: MOBILE PHYSIOTHERAPY AND NEUROLOGICAL REHABILITATION CLINIC, AUSTRALIA, HOME VISITS - RECOMMENDED DESIGN SYSTEM║
╚═════════════════════════════════════════════════════════════════════════════════════════╝
┌─────────────────────────────────────────────────────────────────────────────────────────┐
├─── PATTERN ──────────────────────────────────────────────────────────────────────────────┤
│  Name: Trust & Authority + Conversion                                                   │
│     Conversion: Security badges. Case studies. Transparent pricing. Low-friction form. Provide pause/stop and stop the logo carousel on focus, hover, and reduced motion. Previous/next controls provide the keyboard equivalent; pause offscreen/hidden and render a static logo set under reduced motion.│
│     CTA: Contact Sales / Get Quote (primary) + Nav                                      │
│     Sections:                                                                           │
│       1. Hero (mission/credibility)                                                     │
│       2. Proof (logos, certs, stats)                                                    │
│       3. Solution overview                                                              │
│       4. Clear CTA path                                                                 │
├─── STYLE ────────────────────────────────────────────────────────────────────────────────┤
│  Name: Claymorphism                                                                     │
│     Mode Support: Light supported  Dark conditional                                     │
│     Keywords: Soft 3D, chunky, playful, toy-like, bubbly, thick borders (3-4px),        │
│     double shadows, rounded (16-24px)                                                   │
│     Best For: Educational apps, children's apps, SaaS platforms, creative tools,        │
│     fun-focused, onboarding, casual games                                               │
│     Performance: cost:low|drivers:none | Accessibility: risk:conditional|requires:contrast-text-4.5,keyboard,visible-focus,reduced-motion│
├─── COLORS ───────────────────────────────────────────────────────────────────────────────┤
│     Primary:       #0D9488    (--color-primary)                                         │
│     On Primary:    #000000    (--color-on-primary)                                      │
│     Secondary:     #14B8A6    (--color-secondary)                                       │
│     On Secondary:  #0F172A    (--color-on-secondary)                                    │
│     Accent/CTA:    #EA580C    (--color-accent)                                          │
│     On Accent/CTA: #000000    (--color-on-accent)                                       │
│     Background:    #F0FDFA    (--color-background)                                      │
│     Foreground:    #134E4A    (--color-foreground)                                      │
│     Card:          #FFFFFF    (--color-card)                                            │
│     Card Foreground: #134E4A    (--color-card-foreground)                               │
│     Muted:         #E8F1F4    (--color-muted)                                           │
│     Muted Foreground: #475569    (--color-muted-foreground)                             │
│     Border:        #99F6E4    (--color-border)                                          │
│     Destructive:   #DC2626    (--color-destructive)                                     │
│     On Destructive: #FFFFFF    (--color-on-destructive)                                 │
│     Ring:          #0D9488    (--color-ring)                                            │
│     Notes: Caring teal + warm orange [Accent adjusted from #F97316]                     │
├─── TYPOGRAPHY ───────────────────────────────────────────────────────────────────────────┤
│  Varela Round / Nunito Sans                                                             │
│     Mood: soft, rounded, friendly, approachable, warm, gentle                           │
│     Best For: Children's products, pet apps, friendly brands, wellness, soft UI         │
│     Google Fonts: https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@300;400;500;600;700&family=Varela+Round&display=swap│
│     CSS Import: @import url('https://fonts.googleapis.com/css2?family=Nunito+Sans:wght...│
├─── KEY EFFECTS ──────────────────────────────────────────────────────────────────────────┤
│     Inner+outer shadows (subtle, no hard lines), soft press (200ms ease-out), fluffy    │
│     elements, smooth transitions                                                        │
├─── AVOID ────────────────────────────────────────────────────────────────────────────────┤
│     Generic design + Hidden services                                                    │
├─── PRE-DELIVERY CHECKLIST ───────────────────────────────────────────────────────────────┤
│     [ ] No emojis as icons (use SVG: Heroicons/Lucide)                                  │
│     [ ] cursor-pointer on all clickable elements                                        │
│     [ ] Hover states with smooth transitions (150-300ms)                                │
│     [ ] Light mode: text contrast 4.5:1 minimum                                         │
│     [ ] Focus states visible for keyboard nav                                           │
│     [ ] prefers-reduced-motion respected                                                │
│     [ ] Responsive: 375px, 768px, 1024px, 1440px                                        │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### A.2 — Boutique family law firm, premium positioning, Sydney

```
╔═════════════════════════════════════════════════════════════════════════════════════════╗
║  TARGET: BOUTIQUE FAMILY LAW FIRM, PREMIUM POSITIONING, SYDNEY - RECOMMENDED DESIGN SYSTEM║
╚═════════════════════════════════════════════════════════════════════════════════════════╝
┌─────────────────────────────────────────────────────────────────────────────────────────┐
├─── PATTERN ──────────────────────────────────────────────────────────────────────────────┤
│  Name: Trust & Authority + Conversion                                                   │
│     Conversion: Security badges. Case studies. Transparent pricing. Low-friction form. Provide pause/stop and stop the logo carousel on focus, hover, and reduced motion. Previous/next controls provide the keyboard equivalent; pause offscreen/hidden and render a static logo set under reduced motion.│
│     CTA: Contact Sales / Get Quote (primary) + Nav                                      │
│     Sections:                                                                           │
│       1. Hero (mission/credibility)                                                     │
│       2. Proof (logos, certs, stats)                                                    │
│       3. Solution overview                                                              │
│       4. Clear CTA path                                                                 │
├─── STYLE ────────────────────────────────────────────────────────────────────────────────┤
│  Name: Accessible & Ethical                                                             │
│     Mode Support: Light supported  Dark supported                                       │
│     Keywords: Accessible, inclusive interface, high contrast, large text (16px+),       │
│     keyboard navigation, screen reader friendly, accessibility standards aware, focus   │
│     state, semantic                                                                     │
│     Best For: Government, healthcare, education, inclusive products, large audience,    │
│     legal compliance, public                                                            │
│     Performance: cost:low|drivers:none | Accessibility: risk:low|requires:contrast-text-4.5,keyboard,visible-focus,reduced-motion│
├─── COLORS ───────────────────────────────────────────────────────────────────────────────┤
│     Primary:       #1E3A8A    (--color-primary)                                         │
│     On Primary:    #FFFFFF    (--color-on-primary)                                      │
│     Secondary:     #1E40AF    (--color-secondary)                                       │
│     On Secondary:  #FFFFFF    (--color-on-secondary)                                    │
│     Accent/CTA:    #B45309    (--color-accent)                                          │
│     On Accent/CTA: #FFFFFF    (--color-on-accent)                                       │
│     Background:    #F8FAFC    (--color-background)                                      │
│     Foreground:    #0F172A    (--color-foreground)                                      │
│     Card:          #FFFFFF    (--color-card)                                            │
│     Card Foreground: #0F172A    (--color-card-foreground)                               │
│     Muted:         #E9EEF5    (--color-muted)                                           │
│     Muted Foreground: #475569    (--color-muted-foreground)                             │
│     Border:        #CBD5E1    (--color-border)                                          │
│     Destructive:   #DC2626    (--color-destructive)                                     │
│     On Destructive: #FFFFFF    (--color-on-destructive)                                 │
│     Ring:          #1E3A8A    (--color-ring)                                            │
│     Notes: Authority navy + trust gold                                                  │
├─── TYPOGRAPHY ───────────────────────────────────────────────────────────────────────────┤
│  EB Garamond / Lato                                                                     │
│     Mood: legal, professional, traditional, trustworthy, formal, authoritative          │
│     Best For: Law firms, legal services, contracts, formal documents, government        │
│     Google Fonts: https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;500;600;700&family=Lato:wght@300;400;700&display=swap│
│     CSS Import: @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:wght...│
├─── KEY EFFECTS ──────────────────────────────────────────────────────────────────────────┤
│     Clear focus rings (3-4px), ARIA labels, skip links, responsive design, reduced      │
│     motion, 44x44px touch targets                                                       │
├─── AVOID ────────────────────────────────────────────────────────────────────────────────┤
│     Outdated design + Hidden credentials + AI purple/pink gradients                     │
├─── PRE-DELIVERY CHECKLIST ───────────────────────────────────────────────────────────────┤
│     [ ] No emojis as icons (use SVG: Heroicons/Lucide)                                  │
│     [ ] cursor-pointer on all clickable elements                                        │
│     [ ] Hover states with smooth transitions (150-300ms)                                │
│     [ ] Light mode: text contrast 4.5:1 minimum                                         │
│     [ ] Focus states visible for keyboard nav                                           │
│     [ ] prefers-reduced-motion respected                                                │
│     [ ] Responsive: 375px, 768px, 1024px, 1440px                                        │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### A.3 — NDIS disability support provider, culturally diverse communities, Melbourne

```
╔═════════════════════════════════════════════════════════════════════════════════════════╗
║  TARGET: NDIS DISABILITY SUPPORT PROVIDER, CULTURALLY DIVERSE COMMUNITIES, MELBOURNE - RECOMMENDED DESIGN SYSTEM║
╚═════════════════════════════════════════════════════════════════════════════════════════╝
┌─────────────────────────────────────────────────────────────────────────────────────────┐
├─── PATTERN ──────────────────────────────────────────────────────────────────────────────┤
│  Name: Hero + Features + CTA                                                            │
│     Conversion: Deep CTA placement. For CTA label text, verify at least 4.5:1 against the button fill; use 7:1 only when the product explicitly targets AAA normal-text contrast. Keep focus and component boundaries independently visible. Disable hero parallax under reduced motion and render its static final state.│
│     CTA: Hero (sticky) + Bottom                                                         │
│     Sections:                                                                           │
│       1. Hero with headline/image                                                       │
│       2. Value prop                                                                     │
│       3. Key features (3-5)                                                             │
│       4. CTA section                                                                    │
│       5. Footer                                                                         │
├─── STYLE ────────────────────────────────────────────────────────────────────────────────┤
│  Name: Minimalism & Swiss Style                                                         │
│     Mode Support: Light supported  Dark supported                                       │
│     Keywords: Clean, simple, spacious, functional, white space, high contrast,          │
│     geometric, sans-serif, grid-based, essential                                        │
│     Best For: Enterprise apps, dashboards, documentation sites, SaaS platforms,         │
│     professional tools                                                                  │
│     Performance: cost:low|drivers:none | Accessibility: risk:low|requires:contrast-text-4.5,keyboard,visible-focus,reduced-motion│
├─── COLORS ───────────────────────────────────────────────────────────────────────────────┤
│     Primary:       #2563EB    (--color-primary)                                         │
│     On Primary:    #FFFFFF    (--color-on-primary)                                      │
│     Secondary:     #3B82F6    (--color-secondary)                                       │
│     On Secondary:  #000000    (--color-on-secondary)                                    │
│     Accent/CTA:    #EA580C    (--color-accent)                                          │
│     On Accent/CTA: #000000    (--color-on-accent)                                       │
│     Background:    #F8FAFC    (--color-background)                                      │
│     Foreground:    #1E293B    (--color-foreground)                                      │
│     Card:          #FFFFFF    (--color-card)                                            │
│     Card Foreground: #1E293B    (--color-card-foreground)                               │
│     Muted:         #E9EFF8    (--color-muted)                                           │
│     Muted Foreground: #475569    (--color-muted-foreground)                             │
│     Border:        #E2E8F0    (--color-border)                                          │
│     Destructive:   #DC2626    (--color-destructive)                                     │
│     On Destructive: #FFFFFF    (--color-on-destructive)                                 │
│     Ring:          #2563EB    (--color-ring)                                            │
│     Notes: Trust blue + orange CTA contrast [Accent adjusted from #F97316]              │
├─── TYPOGRAPHY ───────────────────────────────────────────────────────────────────────────┤
│  Outfit / Work Sans                                                                     │
│     Mood: geometric, modern, clean, balanced, contemporary, versatile                   │
│     Best For: General purpose, portfolios, agencies, modern brands, landing pages       │
│     Google Fonts: https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Work+Sans:wght@300;400;500;600;700&display=swap│
│     CSS Import: @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;...│
├─── KEY EFFECTS ──────────────────────────────────────────────────────────────────────────┤
│     Subtle hover (200-250ms), smooth transitions, sharp shadows if any, clear type      │
│     hierarchy, fast loading                                                             │
├─── PRE-DELIVERY CHECKLIST ───────────────────────────────────────────────────────────────┤
│     [ ] No emojis as icons (use SVG: Heroicons/Lucide)                                  │
│     [ ] cursor-pointer on all clickable elements                                        │
│     [ ] Hover states with smooth transitions (150-300ms)                                │
│     [ ] Light mode: text contrast 4.5:1 minimum                                         │
│     [ ] Focus states visible for keyboard nav                                           │
│     [ ] prefers-reduced-motion respected                                                │
│     [ ] Responsive: 375px, 768px, 1024px, 1440px                                        │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### A.4 — Agricultural and earthmoving machinery manufacturer, rural Australia, B2B

```
╔═════════════════════════════════════════════════════════════════════════════════════════╗
║  TARGET: AGRICULTURAL AND EARTHMOVING MACHINERY MANUFACTURER, RURAL AUSTRALIA, B2B - RECOMMENDED DESIGN SYSTEM║
╚═════════════════════════════════════════════════════════════════════════════════════════╝
┌─────────────────────────────────────────────────────────────────────────────────────────┐
├─── PATTERN ──────────────────────────────────────────────────────────────────────────────┤
│  Name: Trust & Authority + Conversion                                                   │
│     Conversion: Security badges. Case studies. Transparent pricing. Low-friction form. Provide pause/stop and stop the logo carousel on focus, hover, and reduced motion. Previous/next controls provide the keyboard equivalent; pause offscreen/hidden and render a static logo set under reduced motion.│
│     CTA: Contact Sales / Get Quote (primary) + Nav                                      │
│     Sections:                                                                           │
│       1. Hero (mission/credibility)                                                     │
│       2. Proof (logos, certs, stats)                                                    │
│       3. Solution overview                                                              │
│       4. Clear CTA path                                                                 │
├─── STYLE ────────────────────────────────────────────────────────────────────────────────┤
│  Name: Accessible & Ethical                                                             │
│     Mode Support: Light supported  Dark supported                                       │
│     Keywords: Accessible, inclusive interface, high contrast, large text (16px+),       │
│     keyboard navigation, screen reader friendly, accessibility standards aware, focus   │
│     state, semantic                                                                     │
│     Best For: Government, healthcare, education, inclusive products, large audience,    │
│     legal compliance, public                                                            │
│     Performance: cost:low|drivers:none | Accessibility: risk:low|requires:contrast-text-4.5,keyboard,visible-focus,reduced-motion│
├─── COLORS ───────────────────────────────────────────────────────────────────────────────┤
│     Primary:       #0F172A    (--color-primary)                                         │
│     On Primary:    #FFFFFF    (--color-on-primary)                                      │
│     Secondary:     #334155    (--color-secondary)                                       │
│     On Secondary:  #FFFFFF    (--color-on-secondary)                                    │
│     Accent/CTA:    #0369A1    (--color-accent)                                          │
│     On Accent/CTA: #FFFFFF    (--color-on-accent)                                       │
│     Background:    #F8FAFC    (--color-background)                                      │
│     Foreground:    #020617    (--color-foreground)                                      │
│     Card:          #FFFFFF    (--color-card)                                            │
│     Card Foreground: #020617    (--color-card-foreground)                               │
│     Muted:         #E8ECF1    (--color-muted)                                           │
│     Muted Foreground: #475569    (--color-muted-foreground)                             │
│     Border:        #E2E8F0    (--color-border)                                          │
│     Destructive:   #DC2626    (--color-destructive)                                     │
│     On Destructive: #FFFFFF    (--color-on-destructive)                                 │
│     Ring:          #0F172A    (--color-ring)                                            │
│     Notes: Professional navy + blue CTA                                                 │
├─── TYPOGRAPHY ───────────────────────────────────────────────────────────────────────────┤
│  Plus Jakarta Sans / Plus Jakarta Sans                                                  │
│     Mood: enterprise, saas, b2b, professional, indigo, modern, approachable, legible,   │
│     ios dynamic type, android scaling                                                   │
│     Best For: B2B SaaS apps, productivity tools, government and finance mobile apps,    │
│     admin dashboards, enterprise onboarding                                             │
│     Google Fonts: https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,600;0,700;0,800;1,400│
│     CSS Import: @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+San...│
├─── KEY EFFECTS ──────────────────────────────────────────────────────────────────────────┤
│     Clear focus rings (3-4px), ARIA labels, skip links, responsive design, reduced      │
│     motion, 44x44px touch targets                                                       │
├─── AVOID ────────────────────────────────────────────────────────────────────────────────┤
│     Playful design + Hidden credentials + AI purple/pink gradients                      │
├─── PRE-DELIVERY CHECKLIST ───────────────────────────────────────────────────────────────┤
│     [ ] No emojis as icons (use SVG: Heroicons/Lucide)                                  │
│     [ ] cursor-pointer on all clickable elements                                        │
│     [ ] Hover states with smooth transitions (150-300ms)                                │
│     [ ] Light mode: text contrast 4.5:1 minimum                                         │
│     [ ] Focus states visible for keyboard nav                                           │
│     [ ] prefers-reduced-motion respected                                                │
│     [ ] Responsive: 375px, 768px, 1024px, 1440px                                        │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### A.5 — Independent optometry practice, two suburban locations, Brisbane

```
╔═════════════════════════════════════════════════════════════════════════════════════════╗
║  TARGET: INDEPENDENT OPTOMETRY PRACTICE, TWO SUBURBAN LOCATIONS, BRISBANE - RECOMMENDED DESIGN SYSTEM║
╚═════════════════════════════════════════════════════════════════════════════════════════╝
┌─────────────────────────────────────────────────────────────────────────────────────────┐
├─── PATTERN ──────────────────────────────────────────────────────────────────────────────┤
│  Name: Hero + Features + CTA                                                            │
│     Conversion: Deep CTA placement. For CTA label text, verify at least 4.5:1 against the button fill; use 7:1 only when the product explicitly targets AAA normal-text contrast. Keep focus and component boundaries independently visible. Disable hero parallax under reduced motion and render its static final state.│
│     CTA: Hero (sticky) + Bottom                                                         │
│     Sections:                                                                           │
│       1. Hero with headline/image                                                       │
│       2. Value prop                                                                     │
│       3. Key features (3-5)                                                             │
│       4. CTA section                                                                    │
│       5. Footer                                                                         │
├─── STYLE ────────────────────────────────────────────────────────────────────────────────┤
│  Name: Minimalism & Swiss Style                                                         │
│     Mode Support: Light supported  Dark supported                                       │
│     Keywords: Clean, simple, spacious, functional, white space, high contrast,          │
│     geometric, sans-serif, grid-based, essential                                        │
│     Best For: Enterprise apps, dashboards, documentation sites, SaaS platforms,         │
│     professional tools                                                                  │
│     Performance: cost:low|drivers:none | Accessibility: risk:low|requires:contrast-text-4.5,keyboard,visible-focus,reduced-motion│
├─── COLORS ───────────────────────────────────────────────────────────────────────────────┤
│     Primary:       #22C55E    (--color-primary)                                         │
│     On Primary:    #0F172A    (--color-on-primary)                                      │
│     Secondary:     #059669    (--color-secondary)                                       │
│     On Secondary:  #000000    (--color-on-secondary)                                    │
│     Accent/CTA:    #D97706    (--color-accent)                                          │
│     On Accent/CTA: #000000    (--color-on-accent)                                       │
│     Background:    #0F172A    (--color-background)                                      │
│     Foreground:    #FFFFFF    (--color-foreground)                                      │
│     Card:          #192134    (--color-card)                                            │
│     Card Foreground: #FFFFFF    (--color-card-foreground)                               │
│     Muted:         #10242E    (--color-muted)                                           │
│     Muted Foreground: #94A3B8    (--color-muted-foreground)                             │
│     Border:        rgba(255,255,255,0.08) (--color-border)                              │
│     Destructive:   #DC2626    (--color-destructive)                                     │
│     On Destructive: #FFFFFF    (--color-on-destructive)                                 │
│     Ring:          #22C55E    (--color-ring)                                            │
│     Notes: Code green + difficulty amber on dark                                        │
├─── TYPOGRAPHY ───────────────────────────────────────────────────────────────────────────┤
│  Outfit / Work Sans                                                                     │
│     Mood: geometric, modern, clean, balanced, contemporary, versatile                   │
│     Best For: General purpose, portfolios, agencies, modern brands, landing pages       │
│     Google Fonts: https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Work+Sans:wght@300;400;500;600;700&display=swap│
│     CSS Import: @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;...│
├─── KEY EFFECTS ──────────────────────────────────────────────────────────────────────────┤
│     Subtle hover (200-250ms), smooth transitions, sharp shadows if any, clear type      │
│     hierarchy, fast loading                                                             │
├─── PRE-DELIVERY CHECKLIST ───────────────────────────────────────────────────────────────┤
│     [ ] No emojis as icons (use SVG: Heroicons/Lucide)                                  │
│     [ ] cursor-pointer on all clickable elements                                        │
│     [ ] Hover states with smooth transitions (150-300ms)                                │
│     [ ] Light mode: text contrast 4.5:1 minimum                                         │
│     [ ] Focus states visible for keyboard nav                                           │
│     [ ] prefers-reduced-motion respected                                                │
│     [ ] Responsive: 375px, 768px, 1024px, 1440px                                        │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## Appendix B — three verbatim rows from every CSV

Emitted programmatically (script `rowdump.py`, Appendix C) rather than transcribed, so these are
byte-exact field values. Row numbers are 1-based data rows, excluding the header.


#### `products.csv` — 3 verbatim rows (row numbers are 1-based data rows)

```
--- row 1 ---
No: 1
Product Type: SaaS (General)
Keywords: app, b2b, cloud, general, saas, software, subscription
Primary Style Recommendation: Glassmorphism + Flat Design
Secondary Styles: Soft UI Evolution , Minimalism & Swiss Style
Landing Page Pattern: Hero + Features + CTA
Dashboard Style (if applicable): Data-Dense + Real-Time Monitoring
Color Palette Focus: Trust blue + accent contrast
Key Considerations: Balance modern feel with clarity. Focus on CTAs.

--- row 60 ---
No: 60
Product Type: Dental Practice
Keywords: dental, practice
Primary Style Recommendation: Soft UI Evolution + Minimalism & Swiss Style
Secondary Styles: Accessible & Ethical , Inclusive Design
Landing Page Pattern: Social Proof-Focused + Conversion
Dashboard Style (if applicable): Patient Analytics
Color Palette Focus: Fresh Blue + White + Smile Yellow accent
Key Considerations: Services. Dentist profiles. Before/after. Online booking. Insurance. Patient testimonials. Friendly imagery.

--- row 177 ---
No: 177
Product Type: Government Portal / Civic Services
Keywords: government-portal, civic-services, city-hall, permit-application, tax-payment, voter-registration, public-records, municipal-online
Primary Style Recommendation: Accessible & Ethical + Inclusive Design
Secondary Styles: Flat Design , Inclusive Design
Landing Page Pattern: Service Directory + Search
Dashboard Style (if applicable): N/A - Service focused
Color Palette Focus: Professional blue + accessibility high contrast + service category colors
Key Considerations: Multilingual toggle. Service A-Z index. Form wizard with save-progress. Document upload. Appointment booking. Status tracker. WCAG AAA. Plain language.

```

#### `colors.csv` — 3 verbatim rows (row numbers are 1-based data rows)

```
--- row 1 ---
No: 1
Product Type: SaaS (General)
Primary: #2563EB
On Primary: #FFFFFF
Secondary: #3B82F6
On Secondary: #000000
Accent: #EA580C
On Accent: #000000
Background: #F8FAFC
Foreground: #1E293B
Card: #FFFFFF
Card Foreground: #1E293B
Muted: #E9EFF8
Muted Foreground: #475569
Border: #E2E8F0
Destructive: #DC2626
On Destructive: #FFFFFF
Ring: #2563EB
Notes: Trust blue + orange CTA contrast [Accent adjusted from #F97316]

--- row 60 ---
No: 60
Product Type: Dental Practice
Primary: #0EA5E9
On Primary: #0F172A
Secondary: #38BDF8
On Secondary: #0F172A
Accent: #0EA5E9
On Accent: #0F172A
Background: #F0F9FF
Foreground: #0C4A6E
Card: #FFFFFF
Card Foreground: #0C4A6E
Muted: #E8F2F8
Muted Foreground: #475569
Border: #BAE6FD
Destructive: #DC2626
On Destructive: #FFFFFF
Ring: #000000
Notes: Fresh blue + smile yellow [Accent adjusted from #FBBF24]

--- row 177 ---
No: 177
Product Type: Government Portal / Civic Services
Primary: #1E40AF
On Primary: #FFFFFF
Secondary: #3B82F6
On Secondary: #000000
Accent: #16A34A
On Accent: #000000
Background: #EFF6FF
Foreground: #1E3A8A
Card: #FFFFFF
Card Foreground: #1E3A8A
Muted: #E9EFF5
Muted Foreground: #475569
Border: #BFDBFE
Destructive: #DC2626
On Destructive: #FFFFFF
Ring: #1E40AF
Notes: Professional blue + service green + accessibility

```

#### `ui-reasoning.csv` — 3 verbatim rows (row numbers are 1-based data rows)

```
--- row 1 ---
No: 1
UI_Category: SaaS (General)
Recommended_Pattern: Hero + Features + CTA
Style_Priority: Glassmorphism + Flat Design
Color_Mood: Trust blue + Accent contrast
Typography_Mood: Professional + Hierarchy
Key_Effects: Subtle hover (200-250ms) + Smooth transitions
Decision_Rules: {"if_ux_focused":["style:minimalism-and-swiss-style"],"if_data_heavy":["style:glassmorphism"]}
Anti_Patterns: Excessive animation + Dark mode by default
Severity: HIGH
Reasoning: 
Confidence: 

--- row 40 ---
No: 40
UI_Category: Legal Services
Recommended_Pattern: Trust & Authority + Minimal
Style_Priority: Accessible & Ethical + Minimalism & Swiss Style
Color_Mood: Navy Blue (#1E3A5F) + Gold + White
Typography_Mood: Professional + Authoritative typography
Key_Effects: Practice area reveal + Attorney profile animations
Decision_Rules: {"must_have":["constraint:case-results","constraint:credential-display"]}
Anti_Patterns: Outdated design + Hidden credentials + AI purple/pink gradients
Severity: HIGH
Reasoning: 
Confidence: 

--- row 177 ---
No: 177
UI_Category: Government Portal / Civic Services
Recommended_Pattern: Enterprise Gateway
Style_Priority: Accessible & Ethical + Inclusive Design
Color_Mood: Professional blue + accessibility high contrast + service category colors
Typography_Mood: Clear + Large typography
Key_Effects: Skip-link focus states + save-progress forms
Decision_Rules: {"must_have":["constraint:plain-language-copy","constraint:service-a-z","constraint:save-progress","constraint:document-upload","constraint:appointment-booking"],"if_trust_needed":["constraint:prioritize-clarity"],"if_mobile":["constraint:optimize-touch-targets"]}
Anti_Patterns: Ornate design + low contrast + motion effects + AI purple/pink gradients
Severity: HIGH
Reasoning: civic flows must stay plain, accessible, and resilient for interrupted form completion
Confidence: 0.95

```

#### `styles.csv` — 3 verbatim rows (row numbers are 1-based data rows)

```
--- row 1 ---
No: 1
Style Category: Minimalism & Swiss Style
Type: General
Keywords: Clean, simple, spacious, functional, white space, high contrast, geometric, sans-serif, grid-based, essential
Primary Colors: Monochromatic, Black #000000, White #FFFFFF
Secondary Colors: Neutral (Beige #F5F1E8, Grey #808080, Taupe #B38B6D), Primary accent
Effects & Animation: Subtle hover (200-250ms), smooth transitions, sharp shadows if any, clear type hierarchy, fast loading
Best For: Enterprise apps, dashboards, documentation sites, SaaS platforms, professional tools
Do Not Use For: Creative portfolios, entertainment, playful brands, artistic experiments
Light Mode ✓: supported
Dark Mode ✓: supported
Performance: cost:low|drivers:none
Accessibility: risk:low|requires:contrast-text-4.5,keyboard,visible-focus,reduced-motion
Mobile-Friendly: adaptable
Conversion-Focused: ◐ Medium
Framework Compatibility: tailwind|bootstrap|mui
Era/Origin: 1950s Swiss
Complexity: Low
AI Prompt Keywords: Design a minimalist landing page. Use: white space, geometric layouts, sans-serif fonts, high contrast, grid-based structure, essential elements only. Avoid shadows and gradients. Focus on clarity and functionality.
CSS/Technical Keywords: display: grid, gap: 2rem, font-family: sans-serif, color: #000 or #FFF, max-width: 1200px, clean borders, no box-shadow unless necessary
Implementation Checklist: ☐ Grid-based layout 12-16 columns, ☐ Typography hierarchy clear, ☐ No unnecessary decorations, ☐ text contrast measured against the chosen project target, ☐ Mobile responsive grid
Design System Variables: --spacing: 2rem, --border-radius: 0px, --font-weight: 400-700, --shadow: none, --accent-color: single primary only
Style ID: minimalism-and-swiss-style
Aliases: Minimal|Minimalism|Minimalism (Frame)
Status: active
Parent Style ID: 
Replacement Domain: 
Replacement ID: 
Preferred Mode: auto

--- row 9 ---
No: 9
Style Category: Claymorphism
Type: General
Keywords: Soft 3D, chunky, playful, toy-like, bubbly, thick borders (3-4px), double shadows, rounded (16-24px)
Primary Colors: Pastel: Soft Peach #FDBCB4, Baby Blue #ADD8E6, Mint #98FF98, Lilac #E6E6FA, light BG
Secondary Colors: Soft gradients (pastel-to-pastel), light/dark variations (20-30%), gradient subtle
Effects & Animation: Inner+outer shadows (subtle, no hard lines), soft press (200ms ease-out), fluffy elements, smooth transitions
Best For: Educational apps, children's apps, SaaS platforms, creative tools, fun-focused, onboarding, casual games
Do Not Use For: Formal corporate, professional services, data-critical, serious/medical, legal apps, finance
Light Mode ✓: supported
Dark Mode ✓: conditional
Performance: cost:low|drivers:none
Accessibility: risk:conditional|requires:contrast-text-4.5,keyboard,visible-focus,reduced-motion
Mobile-Friendly: adaptable
Conversion-Focused: ✓ High
Framework Compatibility: tailwind|css-in-js
Era/Origin: 2020s Modern
Complexity: Medium
AI Prompt Keywords: Design a playful, toy-like interface with soft 3D, chunky elements, bubbly aesthetic, rounded edges (16-24px), thick borders (3-4px), double shadows (inner + outer), pastel colors, smooth animations. Perfect for children's apps and creative tools.
CSS/Technical Keywords: border-radius: 16-24px, border: 3-4px solid, box-shadow: inset -2px -2px 8px, 4px 4px 8px, background: pastel-gradient, animation: soft bounce (cubic-bezier 0.34, 1.56)
Implementation Checklist: ☐ Border-radius 16-24px, ☐ Thick borders 3-4px, ☐ Double shadows (inner+outer), ☐ Pastel colors used, ☐ Soft bounce animations, ☐ Playful interactions
Design System Variables: --border-radius: 20px, --border-width: 3-4px, --shadow-inner: inset -2px -2px 8px, --shadow-outer: 4px 4px 8px, --color-palette: pastels, --animation: bounce
Style ID: claymorphism
Aliases: Claymorphism (for patients)
Status: active
Parent Style ID: 
Replacement Domain: 
Replacement ID: 
Preferred Mode: auto

--- row 80 ---
No: 81
Style Category: Bitcoin DeFi (Mobile)
Type: Mobile
Keywords: web3, bitcoin, defi, digital gold, fintech, wallet, orange, glassmorphism, gradient, blur, holographic, trust, precision
Primary Colors: Bitcoin Orange #F7931A, Burnt Orange #EA580C, Digital Gold #FFD600
Secondary Colors: Void #030304, Dark Matter #0F1115, Pure Light #FFFFFF, Stardust #94A3B8, Border Dim rgba(30,41,59,0.2)
Effects & Animation: Deep void + dark matter surfaces, Bitcoin orange/gold gradients for CTAs, pill buttons with glowing shadows, glassmorphic BlurView nav, monospace data rows, gradient text balances + masked orange-gold, pulsing status indicators and vertical ledger timelines, ultra-thin borders, high-precision typography
Best For: DeFi dashboards, wallets, NFT marketplaces, Web3 social, metaverse utilities, high-tech fintech brands
Do Not Use For: Playful casual apps, low-tech brands, ultra-minimal editorial apps
Light Mode ✓: not-recommended
Dark Mode ✓: supported
Performance: cost:moderate|drivers:animation,blur
Accessibility: risk:conditional|requires:contrast-text-4.5,keyboard,visible-focus,reduced-motion
Mobile-Friendly: native
Conversion-Focused: ✓ High
Framework Compatibility: react-native|expo|react-native-reanimated
Era/Origin: Fintech/Web3
Complexity: High
AI Prompt Keywords: Design a Bitcoin DeFi (Mobile) mobile interface using web3, bitcoin, defi, digital gold, fintech, wallet, orange, glassmorphism. Prioritize clear hierarchy, safe areas, touch targets, visible focus, and reduced-motion alternatives.
CSS/Technical Keywords: backgroundColor: '#030304', cardBg: '#0F1115', textColor: '#FFFFFF', mutedText: '#94A3B8', borderColor: 'rgba(30,41,59,0.2)', accentBitcoin: '#F7931A', accentBurnt: '#EA580C', accentGold: '#FFD600', borderRadius: 24 for cards, radiusPill: 999 for buttons, BlurView intensity 20, LinearGradient on CTAs, shadowColor '#F7931A' shadowRadius up to 10, JetBrains Mono for numeric text
Implementation Checklist: ☐ Void/dark-matter palette applied, ☐ Bitcoin orange/gold gradient buttons, ☐ BlurView nav implemented, ☐ Monospace for numeric data, ☐ Hairline borders on blocks, ☐ Gradient text on balances, ☐ Pulsing network status indicators, ☐ Ledger vertical timeline, ☐ Haptics on money actions, ☐ SafeArea + FlashList for heavy lists
Design System Variables: --bg-void: #030304, --bg-surface: #0F1115, --fg: #FFFFFF, --fg-muted: #94A3B8, --border-dim: rgba(30,41,59,0.2), --accent-bitcoin: #F7931A, --accent-burnt: #EA580C, --accent-gold: #FFD600, --radius-card: 24px, --radius-pill: 999px, --blur-intensity: 20, --font-heading: Space Grotesk, --font-body: Inter, --font-mono: JetBrains Mono
Style ID: bitcoin-defi-mobile
Aliases: 
Status: supplemental
Parent Style ID: dark-mode-oled
Replacement Domain: 
Replacement ID: 
Preferred Mode: dark

```

#### `landing.csv` — 3 verbatim rows (row numbers are 1-based data rows)

```
--- row 1 ---
No: 1
Pattern Name: Hero + Features + CTA
Keywords: hero, hero-centric, hero-centric design, features, feature-rich, feature-rich showcase, cta, call-to-action
Section Order: Hero with headline/image > Value prop > Key features (3-5) > CTA section > Footer
Primary CTA Placement: Hero (sticky) + Bottom
Color Strategy: Hero: Brand primary or vibrant. Features: Card bg #FAFAFA. CTA: Contrasting accent color
Recommended Effects: Hero parallax, feature card hover lift, CTA glow on hover
Conversion Optimization: Deep CTA placement. For CTA label text, verify at least 4.5:1 against the button fill; use 7:1 only when the product explicitly targets AAA normal-text contrast. Keep focus and component boundaries independently visible. Disable hero parallax under reduced motion and render its static final state.
Pattern ID: hero-features-cta
Aliases: 

--- row 31 ---
No: 31
Pattern Name: Feature-Rich Showcase
Keywords: feature-rich, feature-rich showcase, features, showcase, product showcase
Section Order: Hero (value prop) > Feature grid/cards (4-6) > Use cases or benefits > Social proof or logos > CTA
Primary CTA Placement: Hero (sticky) + After features + Bottom
Color Strategy: Brand primary + card bg #FAFAFA. Feature icons accent. CTA contrasting.
Recommended Effects: Feature card hover lift, scroll reveal, icon micro-interactions
Conversion Optimization: Clear feature hierarchy. One key message per card. Strong CTA repetition.
Pattern ID: feature-rich-showcase
Aliases: Feature-Rich + Data|Showcase + Feature-Rich

--- row 34 ---
No: 34
Pattern Name: Real-Time / Operations Landing
Keywords: real-time, real-time monitor, operations, dashboard, telemetry, live data, live ticker accessibility, pause live updates, verified live status, reduced motion final state
Section Order: Hero (product + live preview or status) > Key metrics/indicators > How it works > CTA (Start trial / Contact)
Primary CTA Placement: Primary CTA in nav + After metrics
Color Strategy: Dark or neutral. Status colors (green/amber/red). Data-dense but scannable.
Recommended Effects: Live data ticker, status pulse, minimal decoration
Conversion Optimization: Offer a demo or sandbox and show trust signals. Label telemetry as live only when backed by a current source, with update time and stale state. Provide pause/hide or update-frequency controls for tickers and previews, stop offscreen/hidden work, support keyboard controls, and render a static final snapshot under reduced motion.
Pattern ID: real-time-operations-landing
Aliases: Feature-Rich + Real-Time|Feature-Rich Showcase + Real-Time|Real-Time + Feature-Rich|Real-Time Monitoring|Trust & Authority + Real-Time

```

#### `typography.csv` — 3 verbatim rows (row numbers are 1-based data rows)

```
--- row 1 ---
No: 1
Font Pairing Name: Classic Elegant
Category: Serif + Sans
Heading Font: Playfair Display
Body Font: Inter
Mood/Style Keywords: elegant, luxury, sophisticated, timeless, premium, editorial
Best For: Luxury brands, fashion, spa, beauty, editorial, magazines, high-end e-commerce
Google Fonts URL: https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@400;500;600;700&display=swap
CSS Import: @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@400;500;600;700&display=swap');
Tailwind Config: fontFamily: { serif: ['Playfair Display', 'serif'], sans: ['Inter', 'sans-serif'] }
Notes: High contrast between elegant heading and clean body. Perfect for luxury/premium.

--- row 31 ---
No: 31
Font Pairing Name: Financial Trust
Category: Sans + Sans
Heading Font: IBM Plex Sans
Body Font: IBM Plex Sans
Mood/Style Keywords: financial, trustworthy, professional, corporate, banking, serious
Best For: Banks, finance, insurance, investment, fintech, enterprise
Google Fonts URL: https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&display=swap
CSS Import: @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&display=swap');
Tailwind Config: fontFamily: { sans: ['IBM Plex Sans', 'sans-serif'] }
Notes: IBM Plex conveys trust and professionalism. Excellent for data.

--- row 48 ---
No: 48
Font Pairing Name: Accessibility First
Category: Sans + Sans
Heading Font: Atkinson Hyperlegible
Body Font: Atkinson Hyperlegible
Mood/Style Keywords: accessible, readable, inclusive, WCAG, dyslexia-friendly, clear
Best For: Accessibility-critical sites, government, healthcare, inclusive design
Google Fonts URL: https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&display=swap
CSS Import: @import url('https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&display=swap');
Tailwind Config: fontFamily: { sans: ['Atkinson Hyperlegible', 'sans-serif'] }
Notes: Designed for maximum legibility. Excellent for accessibility.

```

#### `ux-guidelines.csv` — 3 verbatim rows (row numbers are 1-based data rows)

```
--- row 1 ---
No: 1
Category: Navigation
Issue: Smooth Scroll
Platform: Web
Description: Anchor links should scroll smoothly to target section
Do: Use scroll-behavior: smooth on html element
Don't: Jump directly without transition
Code Example Good: html { scroll-behavior: smooth; }
Code Example Bad: <a href='#section'> without CSS
Severity: High

--- row 41 ---
No: 41
Category: Accessibility
Issue: Keyboard Navigation
Platform: Web
Description: Web users need complete keyboard navigation with visible focus on every operable control
Do: Keep tab order aligned with visual order and test every action without a pointer
Don't: Keyboard traps or illogical tab order
Code Example Good: tabIndex for custom order
Code Example Bad: Unreachable elements
Severity: High

--- row 101 ---
No: 101
Category: Accessibility
Issue: Focus Not Obscured (Enhanced)
Platform: Web
Description: WCAG 2.2 AAA requires keyboard focus to remain fully visible
Do: Keep the entire focused component unobscured by author-created content
Don't: Present this enhanced AAA criterion as an AA requirement or allow persistent UI to hide any part of focus
Code Example Good: close persistent overlay before focus moves behind it
Code Example Bad: sticky footer covers half the focused button
Severity: Medium

```

#### `motion.csv` — 3 verbatim rows (row numbers are 1-based data rows)

```
--- row 1 ---
No: 1
Category: Hover Micro-interaction
Intensity Tier: Subtle
Keywords: hover, button, opacity, lift, press feedback
Trigger: hover
Duration: 150-200ms
Easing: power1.out
GSAP Snippet: gsap.to(el, { y: -1, opacity: 0.9, duration: 0.15, ease: 'power1.out' });
Framework Notes: Bind on mouseenter/mouseleave; in React wrap in a ref + useEffect (or onMouseEnter/onMouseLeave props directly calling gsap.to); Use matchMedia('(prefers-reduced-motion: reduce)') to skip non-essential motion and render the final state immediately
Do: Keep displacement under 2px so it reads as feedback not motion
Don't: Don't animate layout-affecting props (width/height/margin) on hover
Performance Notes: Runs on transform/opacity only so it stays on the compositor thread

--- row 9 ---
No: 9
Category: Stagger List
Intensity Tier: Complex
Keywords: stagger, wave, text reveal, split text
Trigger: load or scroll
Duration: 400-700ms
Easing: expo.out
GSAP Snippet: const split = new SplitText(headline, { type: 'chars' }); gsap.from(split.chars, { opacity: 0, y: 20, rotateX: -40, duration: 0.6, stagger: 0.015, ease: 'expo.out' });
Framework Notes: SplitText is included with GSAP 3.13+; register it before use, review the current GSAP license, and keep a plain-text fade fallback; Use gsap.matchMedia('(prefers-reduced-motion: reduce)') to skip character motion and render the readable final state immediately
Do: Revert SplitText on unmount/cleanup (split.revert()) to restore original text nodes for accessibility tools
Don't: Don't split-animate long paragraphs; reserve for short headlines (under ~8 words)
Performance Notes: Splitting text creates one element per character; keep it to headline-length copy only for DOM size

--- row 17 ---
No: 17
Category: Carousel / Auto-Rotation
Intensity Tier: Standard
Keywords: carousel, auto-rotate, pause, focus, hover, reduced-motion, stop animation offscreen, visibility pause, timer cleanup, final state
Trigger: timer / focus / hover / visibility
Duration: user-controlled or stopped
Easing: none
GSAP Snippet: const reduced = matchMedia('(prefers-reduced-motion: reduce)'); let timer; let onscreen = true; const stop = () => { clearInterval(timer); timer = undefined; }; const start = () => { stop(); if (!reduced.matches && !document.hidden && onscreen) timer = setInterval(nextSlide, 5000); }; const sync = () => reduced.matches ? (stop(), showSlide(activeIndex)) : start(); const observer = new IntersectionObserver(([entry]) => { onscreen = entry.isIntersecting; onscreen ? sync() : stop(); }); const onVisibility = () => document.hidden ? stop() : sync(); observer.observe(root); root.addEventListener('focusin', stop); root.addEventListener('pointerenter', stop); document.addEventListener('visibilitychange', onVisibility); reduced.addEventListener('change', sync); sync(); return () => { stop(); observer.disconnect(); root.removeEventListener('focusin', stop); root.removeEventListener('pointerenter', stop); document.removeEventListener('visibilitychange', onVisibility); reduced.removeEventListener('change', sync); };
Framework Notes: Use one cancellable timer; pause on focus, hover, offscreen, or hidden visibility; remove every listener and clear the timer on unmount; reduced motion stops rotation and renders the active slide as the final state
Do: Provide previous/next and play/pause controls; announce the current slide without moving focus
Don't: Don't auto-advance without a visible stop control or continue while focus is inside
Performance Notes: IntersectionObserver stops animation offscreen; visibilitychange stops hidden-tab work; cleanup disconnects the observer and clears the timer and listeners

```

#### `charts.csv` — 3 verbatim rows (row numbers are 1-based data rows)

```
--- row 1 ---
No: 1
Data Type: Trend Over Time
Keywords: trend, time-series, line, growth, timeline, progress, accessible chart, keyboard accessible chart
Best Chart Type: Line Chart
Secondary Options: Area Chart, Smooth Area
When to Use: Data has a time axis; user needs to observe rise/fall trends or rate of change over a continuous period
When NOT to Use: Fewer than 4 data points (use stat card); more than 6 series (visual noise); no time dimension exists
Data Volume Threshold: <1000 pts: SVG; ≥1000 pts: Canvas + downsampling; >10000: aggregate to intervals
Color Guidance: Primary: #0080FF. Multiple series: distinct colors + distinct line styles. Fill: 20% opacity
Accessibility Grade: deprecated: use Accessibility Risk
Accessibility Risk: risk:low
Accessibility Notes: Use solid, dashed, and dotted line styles plus direct series labels; never distinguish series by hue alone.
A11y Fallback: Visible data table plus concise trend summary. Keyboard: focus reveals hover values; +/- buttons zoom; Reset restores the full range.
Library Recommendation: Chart.js, Recharts, ApexCharts
Interactive Level: Hover + Zoom

--- row 10 ---
No: 10
Data Type: Anomaly Detection
Keywords: anomaly, outlier, spike, alert, detection, monitoring, deviation, accessible chart, keyboard accessible chart
Best Chart Type: Line Chart with Highlights
Secondary Options: Scatter with Alert
When to Use: Monitoring a time-series for outliers; alerting users to unexpected spikes or dips in operational data
When NOT to Use: Anomalies are predefined categories (use bar with highlight); real-time context without a pause control
Data Volume Threshold: Stream at ≤60fps with Canvas; batch: up to 10,000 pts; mark anomalies as a separate data layer
Color Guidance: Normal: #0080FF solid line. Anomaly marker: #FF0000 circle + filled. Alert band: #FFF3CD background zone
Accessibility Grade: deprecated: use Accessibility Risk
Accessibility Risk: risk:conditional
Accessibility Notes: Mark anomalies with a distinct shape and text annotation as well as color. Do not rely on color alone.
A11y Fallback: Anomaly event list/table plus narrative alert summary. Keyboard: focus reveals point details; alerts are available in the persistent list without hover.
Library Recommendation: D3.js, Plotly, ApexCharts
Interactive Level: Hover + Alert

--- row 25 ---
No: 25
Data Type: Process Mining
Keywords: process, mining, variants, path, bottleneck, log, event, accessible chart, keyboard accessible chart
Best Chart Type: Process Map / Graph
Secondary Options: Directed Acyclic Graph (DAG), Petri Net
When to Use: Analyzing event logs to visualize actual process flows; identifying bottlenecks and deviations in ops/product funnels
When NOT to Use: No event log data available; audience expects a static flowchart (use diagram tool); node count > 100 without pre-filtering
Data Volume Threshold: <30 nodes: SVG; 30–100: Canvas; >100: apply variant filtering (top 80% of cases) before rendering
Color Guidance: Happy path: #10B981 thick line. Deviations: #F59E0B thin line. Bottleneck nodes: #EF4444 fill
Accessibility Grade: deprecated: use Accessibility Risk
Accessibility Risk: risk:conditional
Accessibility Notes: Label nodes and paths and use shapes/line styles in addition to color; bottlenecks require text annotations. Do not rely on color alone.
A11y Fallback: Path summary table plus bottleneck narrative. Keyboard: Move buttons replace drag; focus reveals node details; Enter activates a node; Back returns.
Library Recommendation: React-Flow, Cytoscape.js, Recharts
Interactive Level: Drag + Node-Click

```

#### `icons.csv` — 3 verbatim rows (row numbers are 1-based data rows)

```
--- row 1 ---
No: 1
Category: Navigation
Icon Name: list
Keywords: hamburger menu navigation toggle bars
Library: Phosphor
Import Code: import { List } from '@phosphor-icons/react'
Usage: <List size={20} weight="regular" />; Context is chosen by use: if decorative beside visible text, set aria-hidden="true"; if meaningful without equivalent visible text, provide a text alternative; if inside an interactive control, give the control an accessible name and expose applicable state (for example aria-pressed or aria-expanded).
Best For: Mobile navigation drawer toggle sidebar
Style: Outline
Semantic Role: interactive
Allowed Contexts: decorative|meaningful|interactive

--- row 51 ---
No: 51
Category: Commerce
Icon Name: gift
Keywords: present reward bonus offer
Library: Phosphor
Import Code: import { Gift } from '@phosphor-icons/react'
Usage: <Gift size={20} weight="regular" />; Context is chosen by use: if decorative beside visible text, set aria-hidden="true"; if meaningful without equivalent visible text, provide a text alternative; if inside an interactive control, give the control an accessible name and expose applicable state (for example aria-pressed or aria-expanded).
Best For: Gift reward offer
Style: Outline
Semantic Role: meaningful
Allowed Contexts: decorative|meaningful|interactive

--- row 105 ---
No: 105
Category: Guideline
Icon Name: icon-context-accessibility
Keywords: decorative icon aria hidden, meaningful icon text alternative, icon button accessible label, accessible name, aria pressed, aria expanded, semantic context, phosphor, heroicons
Library: Phosphor (primary) + Heroicons (fallback)
Import Code: import { Question } from '@phosphor-icons/react'; import { QuestionMarkCircleIcon } from '@heroicons/react/24/outline';
Usage: Prefer the most semantically precise Phosphor icon, even if it is outside this curated subset. Use Heroicons only as a consistent fallback. Keep one visual family per surface. Context is chosen by use: if decorative beside visible text, set aria-hidden="true"; if meaningful without equivalent visible text, provide a text alternative; if inside an interactive control, give the control an accessible name and expose applicable state (for example aria-pressed or aria-expanded).
Best For: Contextual icon semantics, icon accessibility, and library fallback rules
Style: Outline
Semantic Role: guideline
Allowed Contexts: decorative|meaningful|interactive

```

#### `app-interface.csv` — 3 verbatim rows (row numbers are 1-based data rows)

```
--- row 1 ---
No: 1
Category: Accessibility
Issue: Icon Button Labels
Keywords: icon button accessibilityLabel
Platform: iOS/Android/React Native
Description: Icon-only buttons must expose an accessible label
Do: Set accessibilityLabel or label prop on icon buttons
Don't: Icon buttons without accessible names
Code Example Good: <Pressable accessibilityLabel="Close"><XIcon /></Pressable>
Code Example Bad: <Pressable><XIcon /></Pressable>
Severity: Critical

--- row 16 ---
No: 16
Category: Forms
Issue: Inline Validation
Keywords: onBlur validation
Platform: iOS/Android/React Native
Description: Validate inputs on blur or submit with clear messaging
Do: Validate onBlur and onSubmit
Don't: Validate on every keystroke causing jank
Code Example Good: onBlur={() => validateEmail(value)}
Code Example Bad: onChangeText={v => validateEmail(v)} // every char
Severity: Medium

--- row 32 ---
No: 32
Category: Forms
Issue: Authentication Reuse
Keywords: password manager passkey paste redundant entry
Platform: iOS/Android/React Native
Description: Authentication and multi-step flows should reuse prior values
Do: Support password managers passkeys paste and prefilled confirmed values
Don't: Force users to retype credentials or the same data in one flow
Code Example Good: textContentType="password" autoComplete="current-password"
Code Example Bad: onPaste disabled
Severity: Critical

```

#### `react-performance.csv` — 3 verbatim rows (row numbers are 1-based data rows)

```
--- row 1 ---
No: 1
Category: Async Waterfall
Issue: Defer Await
Keywords: async await defer branch
Platform: React/Next.js
Description: Move await into branches where actually used to avoid blocking unused code paths
Do: Move await operations into branches where they're needed
Don't: Await at top of function blocking all branches
Code Example Good: if (skip) return { skipped: true }; const data = await fetch()
Code Example Bad: const data = await fetch(); if (skip) return { skipped: true }
Severity: Critical

--- row 21 ---
No: 21
Category: Rerender
Issue: Derived State
Keywords: derived boolean subscription
Platform: React/Next.js
Description: Subscribe to derived booleans instead of continuous values
Do: Use derived boolean state
Don't: Subscribe to continuous values
Code Example Good: const isMobile = useMediaQuery('(max-width: 767px)')
Code Example Bad: const width = useWindowWidth(); const isMobile = width < 768
Severity: Medium

--- row 44 ---
No: 44
Category: Advanced
Issue: Latest Value Refs
Keywords: useref latest value callback escape hatch effect synchronization
Platform: React/Next.js
Description: Use refs only when a latest value must be read without causing a render
Do: Synchronize the ref after commit and read current from asynchronous callbacks
Don't: Mutate ref.current during render or use refs to bypass reactive dependencies
Code Example Good: const valueRef = useRef(value); useEffect(() => { valueRef.current = value }, [value]); setTimeout(() => use(valueRef.current), 0)
Code Example Bad: valueRef.current = value // render-phase mutation
Severity: Low

```

#### `google-fonts.csv` — 3 verbatim rows (row numbers are 1-based data rows)

```
--- row 1 ---
Family: ABeeZee
Category: Sans Serif
Stroke: Sans Serif
Classifications: 
Keywords: clean modern minimal professional readable neutral geometric humanist grotesque italic english western european extended-latin european well-known common
Styles: 400 | 400i
Variable Axes: 
Subsets: latin | latin-ext
Designers: Anja Meiners
Popularity Rank: 103
Trending Rank: 389
Is Noto: No
Date Added: 2012-09-30
Last Modified: 2025-09-08
Google Fonts URL: https://fonts.google.com/specimen/ABeeZee

--- row 901 ---
Family: Major Mono Display
Category: Monospace
Stroke: Sans Serif
Classifications: Display | Monospace
Keywords: code developer technical fixed-width terminal programming geometric humanist grotesque mono fixed-width tabular data code headline hero decorative large-text attention english western european extended-latin european vietnamese
Styles: 400
Variable Axes: 
Subsets: latin | latin-ext | vietnamese
Designers: Emre Parlak
Popularity Rank: 411
Trending Rank: 81
Is Noto: No
Date Added: 2018-12-11
Last Modified: 2025-09-02
Google Fonts URL: https://fonts.google.com/specimen/Major+Mono+Display

--- row 1934 ---
Family: Zilla Slab Highlight
Category: Serif
Stroke: Slab Serif
Classifications: 
Keywords: elegant traditional classic refined literary editorial slab mechanical sturdy strong english western european extended-latin european
Styles: 400 | 700
Variable Axes: 
Subsets: latin | latin-ext
Designers: Typotheque
Popularity Rank: 732
Trending Rank: 916
Is Noto: No
Date Added: 2017-07-26
Last Modified: 2025-09-11
Google Fonts URL: https://fonts.google.com/specimen/Zilla+Slab+Highlight

```

## Appendix C — every script used, so you can re-run the numbers

All scripts are standalone Python 3.12, stdlib only except `distinct.py` which needs numpy.
Each hardcodes the absolute path to the UUPM data directory — change `DATA` / `ROOT` at the top if
the repo moves. Save them anywhere and run:

```bash
python inventory.py            # §2  — columns, types, null rates, controlled vocabularies
python joins.py                # §3  — join integrity, broken FKs, orphan rows
python diag.py                 # §6  — BM25 product ranking + resolved design system per vertical
python determinism.py          # §4.4/§8.1 — output stability, latency, tie behaviour
python contrast.py             # §7.1 — WCAG audit over all 192 palettes
python distinct.py             # §7.2 — CIEDE2000 clustering (needs numpy)
python fonts_styles_landing.py # §7.3/§7.4/§7.5 — font validity, style taxonomy, section vocabulary
python rules_ux_bias.py        # §4.6/§7.6/§8.3 — decision rules, anti-patterns, UX rows, locale scan
python hygiene.py              # §7.7 — encoding, ragged rows, dupes, colour formats, framework coupling
python sweep.py                # §6.6 — design system for all 192 product types
python rowdump.py              # Appendix B
```

`diag.py`, `determinism.py` and `sweep.py` import the UUPM modules directly, so run them from
`src/ui-ux-pro-max/scripts/` (or leave the `sys.path.insert` at the top of each, which handles it).

### `inventory.py`

```python
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""CSV inventory: columns, types, rowcount, null rate, distinct values."""
import csv, io, json, sys, os, re
from pathlib import Path
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

DATA = Path(r"C:\Users\acer\Documents\project room\JRNY-Digital\ui-ux-pro-max-skill\src\ui-ux-pro-max\data")

def infer(vals):
    v = [x for x in vals if x.strip()]
    if not v: return "empty"
    if all(re.fullmatch(r"#[0-9A-Fa-f]{3,8}", x.strip()) for x in v): return "hex-color"
    if all(re.fullmatch(r"-?\d+", x.strip()) for x in v): return "int"
    if all(re.fullmatch(r"-?\d+(\.\d+)?", x.strip()) for x in v): return "float"
    if all(x.strip().startswith(("{","[")) for x in v): return "json-in-string"
    if sum("|" in x for x in v) > len(v)*0.5: return "pipe-list"
    if sum(">" in x for x in v) > len(v)*0.5: return "arrow-list"
    if sum("," in x for x in v) > len(v)*0.5: return "comma-list"
    if all(x.strip().startswith("http") for x in v): return "url"
    avg = sum(len(x) for x in v)/len(v)
    return "text-long" if avg > 80 else "text-short"

targets = sys.argv[1:] if len(sys.argv)>1 else sorted(p.name for p in DATA.glob("*.csv"))
for name in targets:
    p = DATA / name
    with open(p, encoding="utf-8", newline="") as f:
        rows = list(csv.DictReader(f))
    cols = list(rows[0].keys()) if rows else []
    print("="*100)
    print(f"FILE: {name}   rows={len(rows)}   cols={len(cols)}")
    print("-"*100)
    print(f"{'#':>2} {'column':<34} {'type':<15} {'empty%':>7} {'distinct':>9}  sample")
    for i,c in enumerate(cols,1):
        vals = [ (r.get(c) or "") for r in rows ]
        nonempty = [v for v in vals if v.strip()]
        distinct = len(set(v.strip() for v in nonempty))
        emptypct = 100*(len(vals)-len(nonempty))/max(1,len(vals))
        s = (nonempty[0][:46].replace("\n","\\n") if nonempty else "")
        print(f"{i:>2} {c[:34]:<34} {infer(vals):<15} {emptypct:>6.1f}% {distinct:>9}  {s}")
    # controlled vocab
    print("-- controlled vocabularies (<=40 distinct, non-empty) --")
    for c in cols:
        vals = [(r.get(c) or "").strip() for r in rows]
        ne = [v for v in vals if v]
        d = sorted(set(ne))
        if ne and 1 <= len(d) <= 40 and max(len(x) for x in d) <= 90:
            print(f"   {c} ({len(d)}): {d}")
    print()
```

### `joins.py`

```python
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Join integrity across products / colors / ui-reasoning / styles / landing / typography."""
import csv, io, sys, re
from pathlib import Path
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
DATA = Path(r"C:\Users\acer\Documents\project room\JRNY-Digital\ui-ux-pro-max-skill\src\ui-ux-pro-max\data")

def load(n):
    with open(DATA/n, encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))

products = load("products.csv"); colors = load("colors.csv"); reason = load("ui-reasoning.csv")
styles   = load("styles.csv");   landing = load("landing.csv"); typo = load("typography.csv")

P = [r["Product Type"].strip() for r in products]
C = [r["Product Type"].strip() for r in colors]
R = [r["UI_Category"].strip() for r in reason]

print("counts: products=%d colors=%d reasoning=%d styles=%d landing=%d typography=%d"
      % (len(P), len(C), len(R), len(styles), len(landing), len(typo)))
print("\n-- products <-> colors (exact string key) --")
print("products with no palette:", sorted(set(P)-set(C)))
print("palettes with no product:", sorted(set(C)-set(P)))
print("order identical:", P == C)
print("\n-- products <-> ui-reasoning --")
print("products with no reasoning row:", sorted(set(P)-set(R)))
print("reasoning with no product:", sorted(set(R)-set(P)))
print("order identical:", P == R)
print("\n-- duplicates --")
for name, keys in (("products",P),("colors",C),("reasoning",R)):
    dupes = sorted({k for k in keys if keys.count(k)>1})
    print(f"  {name}: {dupes or 'none'}")

# style lookup as design_system builds it
style_lookup = {}
for s in styles:
    ks = [s.get("Style ID",""), s.get("Style Category","")] + s.get("Aliases","").split("|")
    for k in ks:
        if k.strip(): style_lookup[k.strip().casefold()] = s
print("\n-- ui-reasoning.Style_Priority tokens -> styles.csv --")
missing = {}
tot = 0
for r in reason:
    for tok in [t.strip() for t in r.get("Style_Priority","").split("+") if t.strip()]:
        tot += 1
        if tok.casefold() not in style_lookup:
            missing.setdefault(tok, []).append(r["UI_Category"])
print(f"  total refs={tot}  unresolved distinct={len(missing)}")
for k,v in sorted(missing.items())[:40]:
    print(f"    UNRESOLVED '{k}'  (e.g. {v[0]}; {len(v)} rows)")

print("\n-- products.Primary Style Recommendation tokens -> styles.csv --")
missing2 = {}
tot2=0
for r in products:
    for tok in [t.strip() for t in r.get("Primary Style Recommendation","").split("+") if t.strip()]:
        tot2+=1
        if tok.casefold() not in style_lookup:
            missing2.setdefault(tok, []).append(r["Product Type"])
print(f"  total refs={tot2}  unresolved distinct={len(missing2)}")
for k,v in sorted(missing2.items())[:40]:
    print(f"    UNRESOLVED '{k}'  (e.g. {v[0]}; {len(v)} rows)")

# landing lookup
land_lookup = {}
for r in landing:
    for k in [r.get("Pattern ID",""), r.get("Pattern Name","")] + r.get("Aliases","").split("|"):
        if k.strip(): land_lookup[k.strip().casefold()] = r
print("\n-- ui-reasoning.Recommended_Pattern -> landing.csv --")
miss = {}
for r in reason:
    pat = r.get("Recommended_Pattern","").strip()
    if pat.casefold() not in land_lookup:
        miss.setdefault(pat, []).append(r["UI_Category"])
print(f"  distinct patterns referenced={len(set(r.get('Recommended_Pattern','').strip() for r in reason))}, unresolved={len(miss)}")
for k,v in sorted(miss.items()):
    print(f"    UNRESOLVED '{k}'  ({len(v)} rows, e.g. {v[0]})")

print("\n-- products.Landing Page Pattern -> landing.csv --")
miss = {}
for r in products:
    pat = r.get("Landing Page Pattern","").strip()
    if pat.casefold() not in land_lookup:
        miss.setdefault(pat, []).append(r["Product Type"])
print(f"  unresolved distinct={len(miss)}")
for k,v in sorted(miss.items()):
    print(f"    UNRESOLVED '{k}'  ({len(v)} rows, e.g. {v[0]})")

print("\n-- orphan landing patterns (never referenced by reasoning or products) --")
refd = set(r.get("Recommended_Pattern","").strip().casefold() for r in reason) | \
       set(r.get("Landing Page Pattern","").strip().casefold() for r in products)
for r in landing:
    ids = {r.get("Pattern ID","").strip().casefold(), r.get("Pattern Name","").strip().casefold()} | \
          {a.strip().casefold() for a in r.get("Aliases","").split("|") if a.strip()}
    if not (ids & refd):
        print("    ORPHAN:", r.get("Pattern ID"), "|", r.get("Pattern Name"))

print("\n-- typography join --")
print("  typography.csv has no Product Type column. columns:", list(typo[0].keys()))
```

### `diag.py`

```python
#!/usr/bin/env python3
# Diagnostic: raw BM25 product-domain ranking + design-system resolution
import sys, json
sys.path.insert(0, r"C:\Users\acer\Documents\project room\JRNY-Digital\ui-ux-pro-max-skill\src\ui-ux-pro-max\scripts")
import core
from core import DATA_DIR, CSV_CONFIG, _load_csv, _get_bm25, _SEARCH_THRESHOLDS, search
from design_system import DesignSystemGenerator

QUERIES = [
 "Mobile physiotherapy and neurological rehabilitation clinic, Australia, home visits",
 "Boutique family law firm, premium positioning, Sydney",
 "NDIS disability support provider, culturally diverse communities, Melbourne",
 "Agricultural and earthmoving machinery manufacturer, rural Australia, B2B",
 "Independent optometry practice, two suburban locations, Brisbane",
]

path = DATA_DIR / "products.csv"
rows = _load_csv(path)
idx = _get_bm25(path, CSV_CONFIG["product"]["search_cols"], rows)
print("product floor min_score =", _SEARCH_THRESHOLDS["product"])
gen = DesignSystemGenerator()
for q in QUERIES:
    ranked = idx.score(q)
    print("\n" + "="*100)
    print("QUERY:", q)
    print("tokens:", idx.tokenize(q))
    for rank,(i,s) in enumerate(ranked[:5],1):
        print(f"  {rank}. {s:7.3f}  {rows[i]['Product Type']}")
    r = search(q, "product", 1, diagnostics=True)
    print("  abstained:", r.get("diagnostics",{}).get("abstained"), "| returned:", [x['Product Type'] for x in r['results']])
    ds = gen.generate(q)
    print("  RESOLVED category:", ds["category"], "| default reasoning:", ds["reasoning_default"])
    print("  source_identities:", json.dumps(ds["source_identities"]))
```

### `determinism.py`

```python
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Determinism + latency + tie behaviour."""
import sys, io, json, time, hashlib
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.insert(0, r"C:\Users\acer\Documents\project room\JRNY-Digital\ui-ux-pro-max-skill\src\ui-ux-pro-max\scripts")
from design_system import generate_design_system
from core import DATA_DIR, CSV_CONFIG, _load_csv, _get_bm25

Q = "Boutique family law firm, premium positioning, Sydney"
hashes=set()
t0=time.perf_counter()
for i in range(5):
    r = generate_design_system(Q, "X")
    hashes.add(hashlib.sha256(json.dumps(r["design_system"], sort_keys=True).encode()).hexdigest())
t1=time.perf_counter()
print("in-process 5 runs, distinct output hashes:", len(hashes))
print(f"warm avg latency (index cached): {(t1-t0)/5*1000:.1f} ms")

# cold-ish: clear caches
import core
t=[]
for i in range(3):
    core._csv_cache.clear(); core._bm25_cache.clear()
    core._DOMAIN_KEYWORDS=None
    s=time.perf_counter(); generate_design_system(Q,"X"); t.append(time.perf_counter()-s)
print(f"cold (caches cleared) avg: {sum(t)/len(t)*1000:.1f} ms   runs={['%.0f'%(x*1000) for x in t]}")

# ties in product BM25
path = DATA_DIR/"products.csv"; rows=_load_csv(path)
idx=_get_bm25(path, CSV_CONFIG["product"]["search_cols"], rows)
for q in ["dental clinic","physiotherapy","optometrist","disability support","law firm"]:
    ranked=idx.score(q)
    top=[(round(s,4), rows[i]["Product Type"]) for i,s in ranked[:4]]
    tie = ranked[0][1]==ranked[1][1]
    print(f"  '{q}': top1_tied_with_top2={tie}  {top}")
print("\nsort is Python's stable `sorted(..., key=score, reverse=True)` (core.py:343) ->")
print("  ties resolve by ORIGINAL CSV ROW ORDER, so output is stable for a fixed file")
print("  but silently changes if a row is inserted above the tied pair.")
```

### `contrast.py`

```python
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""WCAG contrast audit over colors.csv (all 192 palettes)."""
import csv, io, sys
from pathlib import Path
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
DATA = Path(r"C:\Users\acer\Documents\project room\JRNY-Digital\ui-ux-pro-max-skill\src\ui-ux-pro-max\data")

def lum(h):
    v = (h or "").strip().lstrip("#")
    if len(v) == 3: v = "".join(c*2 for c in v)
    if len(v) != 6: return None
    try: ch = [int(v[i:i+2],16)/255 for i in (0,2,4)]
    except ValueError: return None
    lin = [c/12.92 if c <= 0.04045 else ((c+0.055)/1.055)**2.4 for c in ch]
    return 0.2126*lin[0] + 0.7152*lin[1] + 0.0722*lin[2]

def cr(a,b):
    la, lb = lum(a), lum(b)
    if la is None or lb is None: return None
    hi, lo = max(la,lb), min(la,lb)
    return (hi+0.05)/(lo+0.05)

with open(DATA/"colors.csv", encoding="utf-8", newline="") as f:
    rows = list(csv.DictReader(f))

# (label, fg col, bg col, required ratio, is_body_text)
PAIRS = [
    ("Foreground on Background",       "Foreground",      "Background",  4.5, True),
    ("Card Foreground on Card",        "Card Foreground", "Card",        4.5, True),
    ("Muted Foreground on Background", "Muted Foreground","Background",  4.5, True),
    ("Muted Foreground on Muted",      "Muted Foreground","Muted",       4.5, True),
    ("On Primary on Primary",          "On Primary",      "Primary",     4.5, True),
    ("On Secondary on Secondary",      "On Secondary",    "Secondary",   4.5, True),
    ("On Accent on Accent",            "On Accent",       "Accent",      4.5, True),
    ("On Destructive on Destructive",  "On Destructive",  "Destructive", 4.5, True),
    ("Border on Background (UI 3:1)",  "Border",          "Background",  3.0, False),
    ("Ring on Background (UI 3:1)",    "Ring",            "Background",  3.0, False),
]

fail_counts = {p[0]:0 for p in PAIRS}
unparse = []
palettes_failing_body = {}
rows_all = []
for r in rows:
    pt = r["Product Type"]
    for label, fgc, bgc, req, body in PAIRS:
        fg, bg = r.get(fgc,""), r.get(bgc,"")
        ratio = cr(fg,bg)
        if ratio is None:
            unparse.append((pt,label,fg,bg)); continue
        rows_all.append((pt,label,fg,bg,ratio,req,body))
        if ratio < req:
            fail_counts[label]+=1
            if body:
                palettes_failing_body.setdefault(pt,[]).append((label,fg,bg,round(ratio,2)))

print("PALETTES:", len(rows))
print("\n== FAIL COUNTS BY PAIR ==")
for label,_,_,req,body in PAIRS:
    kind = "AA body 4.5:1" if body else "UI 3:1"
    print(f"  {label:<34} {kind:<14} failures: {fail_counts[label]:>3} / {len(rows)}")
nbody = len(palettes_failing_body)
print(f"\n== PALETTES WITH >=1 BODY-TEXT AA FAILURE: {nbody} / {len(rows)}  ({100*nbody/len(rows):.1f}%) ==")
for pt in sorted(palettes_failing_body):
    for label,fg,bg,ratio in palettes_failing_body[pt]:
        print(f"  {pt:<44} {label:<32} {fg} on {bg} = {ratio}:1")
if unparse:
    print("\n== UNPARSEABLE COLOR VALUES ==")
    for u in unparse: print("  ", u)

# Large-text-only tolerance view (3:1)
severe = {}
for pt,label,fg,bg,ratio,req,body in rows_all:
    if body and ratio < 3.0:
        severe.setdefault(pt,[]).append((label,fg,bg,round(ratio,2)))
print(f"\n== SEVERE (below 3:1, fails even AA large text): {len(severe)} palettes ==")
for pt in sorted(severe):
    for label,fg,bg,ratio in severe[pt]:
        print(f"  {pt:<44} {label:<32} {fg} on {bg} = {ratio}:1")
```

### `distinct.py`

```python
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Palette distinctiveness: CIEDE2000 over role colours + agglomerative clustering."""
import csv, io, sys, math, itertools
from pathlib import Path
import numpy as np
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
DATA = Path(r"C:\Users\acer\Documents\project room\JRNY-Digital\ui-ux-pro-max-skill\src\ui-ux-pro-max\data")

def hex2rgb(h):
    v=(h or "").strip().lstrip("#")
    if len(v)==3: v="".join(c*2 for c in v)
    if len(v)!=6: return None
    try: return tuple(int(v[i:i+2],16)/255 for i in (0,2,4))
    except ValueError: return None

def rgb2lab(rgb):
    r,g,b = [c/12.92 if c<=0.04045 else ((c+0.055)/1.055)**2.4 for c in rgb]
    X = r*0.4124564+g*0.3575761+b*0.1804375
    Y = r*0.2126729+g*0.7151522+b*0.0721750
    Z = r*0.0193339+g*0.1191920+b*0.9503041
    Xn,Yn,Zn = 0.95047,1.0,1.08883
    def f(t): return t**(1/3) if t>216/24389 else (841/108)*t+4/29
    fx,fy,fz = f(X/Xn),f(Y/Yn),f(Z/Zn)
    return (116*fy-16, 500*(fx-fy), 200*(fy-fz))

def de2000(lab1,lab2):
    L1,a1,b1 = lab1; L2,a2,b2 = lab2
    C1 = math.hypot(a1,b1); C2 = math.hypot(a2,b2); Cb=(C1+C2)/2
    G = 0.5*(1-math.sqrt(Cb**7/(Cb**7+25**7))) if Cb>0 else 0.5
    a1p,a2p = (1+G)*a1,(1+G)*a2
    C1p,C2p = math.hypot(a1p,b1), math.hypot(a2p,b2)
    h1p = math.degrees(math.atan2(b1,a1p))%360 if (a1p or b1) else 0
    h2p = math.degrees(math.atan2(b2,a2p))%360 if (a2p or b2) else 0
    dLp = L2-L1; dCp = C2p-C1p
    if C1p*C2p==0: dhp=0
    elif abs(h2p-h1p)<=180: dhp=h2p-h1p
    elif h2p-h1p>180: dhp=h2p-h1p-360
    else: dhp=h2p-h1p+360
    dHp = 2*math.sqrt(C1p*C2p)*math.sin(math.radians(dhp)/2)
    Lbp=(L1+L2)/2; Cbp=(C1p+C2p)/2
    if C1p*C2p==0: hbp=h1p+h2p
    elif abs(h1p-h2p)<=180: hbp=(h1p+h2p)/2
    elif h1p+h2p<360: hbp=(h1p+h2p+360)/2
    else: hbp=(h1p+h2p-360)/2
    T = (1-0.17*math.cos(math.radians(hbp-30))+0.24*math.cos(math.radians(2*hbp))
         +0.32*math.cos(math.radians(3*hbp+6))-0.20*math.cos(math.radians(4*hbp-63)))
    dth = 30*math.exp(-(((hbp-275)/25)**2))
    Rc = 2*math.sqrt(Cbp**7/(Cbp**7+25**7)) if Cbp>0 else 0
    Sl = 1+(0.015*(Lbp-50)**2)/math.sqrt(20+(Lbp-50)**2)
    Sc = 1+0.045*Cbp; Sh = 1+0.015*Cbp*T
    Rt = -math.sin(math.radians(2*dth))*Rc
    return math.sqrt((dLp/Sl)**2+(dCp/Sc)**2+(dHp/Sh)**2+Rt*(dCp/Sc)*(dHp/Sh))

ROLES = ["Primary","Secondary","Accent","Background","Foreground"]
with open(DATA/"colors.csv", encoding="utf-8", newline="") as f:
    rows=list(csv.DictReader(f))

labs=[]; names=[]; hexes=[]
for r in rows:
    v=[]
    ok=True
    for role in ROLES:
        rgb=hex2rgb(r.get(role,""))
        if rgb is None: ok=False; break
        v.append(rgb2lab(rgb))
    if ok:
        labs.append(v); names.append(r["Product Type"]); hexes.append(tuple(r.get(x,"").upper() for x in ROLES))
n=len(labs)
print(f"palettes with all {len(ROLES)} roles parseable: {n}/{len(rows)}   roles={ROLES}")

# exact duplicate role tuples
from collections import Counter, defaultdict
c=Counter(hexes)
exact = {k:v for k,v in c.items() if v>1}
print(f"\n== EXACT duplicate role-tuples: {len(exact)} groups covering {sum(exact.values())} palettes ==")
bykey=defaultdict(list)
for nm,h in zip(names,hexes): bykey[h].append(nm)
for k,v in sorted(exact.items(), key=lambda x:-x[1])[:20]:
    print(f"  {list(k)}  -> {len(bykey[k])} palettes: {bykey[k]}")

# pairwise max-role DE2000 distance
D=np.zeros((n,n))
for i in range(n):
    for j in range(i+1,n):
        d=max(de2000(labs[i][k],labs[j][k]) for k in range(len(ROLES)))
        D[i,j]=D[j,i]=d

for thr in (2.0,5.0,10.0):
    # single-linkage agglomerative: connected components under threshold
    parent=list(range(n))
    def find(x):
        while parent[x]!=x: parent[x]=parent[parent[x]]; x=parent[x]
        return x
    for i in range(n):
        for j in range(i+1,n):
            if D[i,j]<thr:
                a,b=find(i),find(j)
                if a!=b: parent[a]=b
    groups=defaultdict(list)
    for i in range(n): groups[find(i)].append(names[i])
    multi={k:v for k,v in groups.items() if len(v)>1}
    dupes=sum(len(v)-1 for v in multi.values())
    print(f"\n== threshold max-role ΔE2000 < {thr}: {len(groups)} distinct clusters "
          f"({n} nominal) | {dupes} palettes are near-duplicates of another ==")
    if thr==5.0:
        for k,v in sorted(multi.items(), key=lambda x:-len(x[1]))[:15]:
            print(f"   cluster n={len(v)}: {v}")

# nearest-neighbour distribution
nn=[min(D[i,j] for j in range(n) if j!=i) for i in range(n)]
nn=np.array(nn)
print(f"\n== nearest-neighbour max-role ΔE2000 distribution ==")
for q in (0,10,25,50,75,90,100):
    print(f"   p{q:>3}: {np.percentile(nn,q):.2f}")
print(f"   palettes whose nearest neighbour is < 5 ΔE: {(nn<5).sum()}")
print(f"   palettes whose nearest neighbour is < 10 ΔE: {(nn<10).sum()}")

# background-only diversity (drives page 'feel' most)
bg=[l[3] for l in labs]
bgd=set()
for i in range(n):
    for j in range(i+1,n):
        pass
uniq_bg = len(set(h[3] for h in hexes))
uniq_pri = len(set(h[0] for h in hexes))
print(f"\n   distinct Background hexes: {uniq_bg} | distinct Primary hexes: {uniq_pri}")
```

### `fonts_styles_landing.py`

```python
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Font pairing validity, styles taxonomy, landing section vocabulary."""
import csv, io, sys, re, json
from collections import Counter, defaultdict
from pathlib import Path
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
DATA = Path(r"C:\Users\acer\Documents\project room\JRNY-Digital\ui-ux-pro-max-skill\src\ui-ux-pro-max\data")
def load(n):
    with open(DATA/n, encoding="utf-8", newline="") as f: return list(csv.DictReader(f))

typo = load("typography.csv"); gf = load("google-fonts.csv"); styles = load("styles.csv"); landing = load("landing.csv")

print("### google-fonts.csv columns:", list(gf[0].keys()))
fam = {r["Family"].strip(): r for r in gf}
print("### families in catalogue:", len(fam))

print("\n" + "="*90)
print("A. TYPOGRAPHY FAMILY RESOLUTION")
print("="*90)
missing=set(); pairs_same=[]; sys_fonts=defaultdict(list)
for r in typo:
    h,b = r["Heading Font"].strip(), r["Body Font"].strip()
    for f_ in (h,b):
        # strip system stacks
        base = f_.split(",")[0].strip().strip("'\"")
        if base and base not in fam:
            missing.add((base, r["Font Pairing Name"]))
    if h.casefold()==b.casefold():
        pairs_same.append((r["No"], r["Font Pairing Name"], h))
print(f"unresolved family references: {len(missing)}")
for base,pn in sorted(missing): print(f"   NOT IN google-fonts.csv: '{base}'  (pairing: {pn})")
print(f"\nheading == body (single-family pairings): {len(pairs_same)}")
for n,pn,f_ in pairs_same: print(f"   #{n} {pn}: {f_}")

print("\n" + "="*90)
print("B. WEIGHT AVAILABILITY (weights requested in Google Fonts URL vs catalogue Styles/Variable Axes)")
print("="*90)
def catalogue_weights(family):
    row = fam.get(family)
    if not row: return None
    styles_field = row.get("Styles","")
    ws = set(int(x) for x in re.findall(r"\b([1-9]00)\b", styles_field))
    axes = row.get("Variable Axes","")
    m = re.search(r"wght\s*[:=]?\s*(\d+)\s*[-–]\s*(\d+)", axes)
    rng = (int(m.group(1)), int(m.group(2))) if m else None
    return ws, rng, styles_field, axes
problems=[]
for r in typo:
    url = r.get("Google Fonts URL","")
    for famspec in re.findall(r"family=([^&]+)", url):
        parts = famspec.split(":")
        name = parts[0].replace("+"," ")
        req=set()
        if len(parts)>1:
            for w in re.findall(r"\b(\d{3})\b", parts[1]): req.add(int(w))
        info = catalogue_weights(name)
        if info is None:
            problems.append((r["Font Pairing Name"], name, "FAMILY NOT IN CATALOGUE", sorted(req)))
            continue
        ws, rng, sf, axes = info
        for w in sorted(req):
            ok = (w in ws) or (rng and rng[0] <= w <= rng[1])
            if not ok:
                problems.append((r["Font Pairing Name"], name, f"weight {w} not in catalogue [{sf[:60]} | axes={axes[:40]}]", sorted(req)))
print(f"weight/family problems: {len(problems)}")
for p in problems[:60]: print("   ", p[0], "|", p[1], "|", p[2])

print("\n" + "="*90)
print("C. STYLES TAXONOMY")
print("="*90)
print("Status counts:", Counter(s["Status"] for s in styles))
print("Type x Status:")
for t,c in sorted(Counter((s["Type"], s["Status"]) for s in styles).items()):
    print("   ", t, c)
print("\ndeprecated rows (Style ID -> Parent / Replacement):")
for s in styles:
    if s["Status"]=="deprecated":
        print(f"   {s['Style ID']:<38} parent={s['Parent Style ID'] or '-':<28} repl={s['Replacement Domain'] or '-'}:{s['Replacement ID'] or '-'}")
print("\nsupplemental rows:")
supp=[s['Style ID'] for s in styles if s['Status']=='supplemental']
print("   ", len(supp), supp)
print("\nactive rows:", len([s for s in styles if s['Status']=='active']))
# are supplemental reachable? core.py filters style domain search to Status=='active'
print("\n-- reachability: reasoning Style_Priority / products Primary Style referencing non-active styles --")
byid={s['Style ID']:s for s in styles}
lookup={}
for s in styles:
    for k in [s.get("Style ID",""), s.get("Style Category","")]+s.get("Aliases","").split("|"):
        if k.strip(): lookup[k.strip().casefold()]=s
reason=load("ui-reasoning.csv"); products=load("products.csv")
nonactive=Counter()
for r in reason:
    for tok in [t.strip() for t in r.get("Style_Priority","").split("+") if t.strip()]:
        s=lookup.get(tok.casefold())
        if s and s["Status"]!="active": nonactive[(tok,s["Status"])]+=1
print("   reasoning refs to non-active styles:", dict(nonactive))

print("\n" + "="*90)
print("D. LANDING SECTION VOCABULARY")
print("="*90)
allsec=Counter(); per={}
for r in landing:
    secs=[s.strip() for s in r["Section Order"].split(">") if s.strip()]
    per[r["Pattern ID"]]=secs
    for s in secs: allsec[s]+=1
print(f"total section tokens: {sum(allsec.values())}   distinct: {len(allsec)}")
print(f"tokens used in >1 pattern: {sum(1 for v in allsec.values() if v>1)}")
print(f"tokens used in exactly 1 pattern: {sum(1 for v in allsec.values() if v==1)}")
print("\nsection counts per pattern:")
for pid,secs in per.items(): print(f"   {pid:<36} {len(secs)} sections")
print("\nALL DISTINCT SECTION NAMES (count, name):")
for s,c in allsec.most_common(): print(f"   {c:>2}  {s}")
print("\nany 'optional'/'required' marker in Section Order?",
      any(re.search(r"optional|required|\(opt", r["Section Order"], re.I) for r in landing))
for r in landing:
    if re.search(r"optional|required|\(opt", r["Section Order"], re.I):
        print("   MARKER:", r["Pattern ID"], "|", r["Section Order"][:160])
```

### `rules_ux_bias.py`

```python
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Decision-rule coverage, anti-pattern shape, UX-guideline machine-readability, locale bias."""
import csv, io, sys, json, re
from collections import Counter, defaultdict
from pathlib import Path
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
ROOT = Path(r"C:\Users\acer\Documents\project room\JRNY-Digital\ui-ux-pro-max-skill\src\ui-ux-pro-max")
DATA = ROOT/"data"
sys.path.insert(0, str(ROOT/"scripts"))
from reasoning_contract import parse_decision_rules, CONDITION_SIGNALS
def load(n):
    with open(DATA/n, encoding="utf-8", newline="") as f: return list(csv.DictReader(f))
reason=load("ui-reasoning.csv"); ux=load("ux-guidelines.csv"); products=load("products.csv")

print("="*90); print("A. DECISION_RULES COVERAGE")
print("="*90)
empty=0; conds=Counter(); acts=Counter(); nrules=Counter(); bad=[]
for r in reason:
    raw=r.get("Decision_Rules","").strip()
    try: rules=parse_decision_rules(raw or "{}")
    except ValueError as e: bad.append((r["UI_Category"], str(e))); continue
    if not rules: empty+=1
    nrules[len(rules)]+=1
    for c,a in rules.items():
        conds[c]+=1
        for x in a: acts[x.split(":",1)[0]]+=1
print(f"rows={len(reason)}  rows with empty/'{{}}' rules={empty}  parse errors={len(bad)}")
print("rule-count histogram (conditions per row):", dict(sorted(nrules.items())))
print("condition usage:", conds.most_common())
print("action-prefix usage:", acts.most_common())
print("conditions defined in reasoning_contract.py but NEVER used in data:",
      sorted(set(CONDITION_SIGNALS) - set(conds)))
print("\nREAL EXAMPLE ROWS:")
for name in ("Legal Services","B2B Service","Medical Clinic"):
    row=next(r for r in reason if r["UI_Category"]==name)
    print(f"\n--- {name} ---")
    for k in ("Recommended_Pattern","Style_Priority","Color_Mood","Typography_Mood","Key_Effects","Anti_Patterns","Severity","Reasoning","Confidence"):
        print(f"  {k}: {row.get(k)}")
    print(f"  Decision_Rules (raw): {row.get('Decision_Rules')}")

print("\n" + "="*90); print("B. ANTI_PATTERNS SHAPE")
print("="*90)
ap=[r["Anti_Patterns"].strip() for r in reason]
nonempty=[a for a in ap if a]
print(f"non-empty: {len(nonempty)}/{len(ap)}   distinct: {len(set(nonempty))}")
clauses=Counter()
for a in nonempty:
    for c in a.split("+"): clauses[c.strip()]+=1
print(f"distinct clauses: {len(clauses)}  total clause instances: {sum(clauses.values())}")
print("top 25 clauses:")
for c,n in clauses.most_common(25): print(f"   {n:>3}  {c}")
print(f"clauses appearing exactly once: {sum(1 for v in clauses.values() if v==1)}")

print("\n" + "="*90); print("C. UX-GUIDELINES MACHINE-READABILITY")
print("="*90)
print("Severity:", Counter(r["Severity"] for r in ux))
print("Category:", Counter(r["Category"] for r in ux).most_common())
codeish=0; cssish=0; selectorish=0
for r in ux:
    g=r["Code Example Good"]; b=r["Code Example Bad"]
    if re.search(r"[<{]", g) or re.search(r"[<{]", b): codeish+=1
    if re.search(r"[a-z-]+\s*:\s*[^;]+;", g): cssish+=1
    if re.search(r"aria-|role=|<\w+", g+b): selectorish+=1
print(f"rows whose Good/Bad examples contain code-like syntax: {codeish}/{len(ux)}")
print(f"rows with CSS declaration syntax in Good: {cssish}")
print(f"rows with HTML/ARIA tokens in Good/Bad: {selectorish}")
print("\nFIRST 8 ROWS VERBATIM (Category | Issue | Do | Don't | Good | Bad | Severity):")
for r in ux[:8]:
    print(f"  - [{r['Severity']}] {r['Category']} / {r['Issue']}")
    print(f"      Do: {r['Do']}")
    print(f"      Don't: {r['Don''t'] if False else r[chr(68)+'on'+chr(39)+'t']}")
    print(f"      Good: {r['Code Example Good']}")
    print(f"      Bad : {r['Code Example Bad']}")

print("\n" + "="*90); print("D. LOCALE / REGION BIAS SCAN")
print("="*90)
terms = ["USD","$","US ","United States","America","FDA","HIPAA","ADA compliance","508",
         "GDPR","EU ","Europe","UK ","Australia","AUD","NDIS","AHPRA","Medicare","WCAG",
         "Thanksgiving","Christmas","winter","summer","fall ","autumn","Fahrenheit","Celsius",
         "zip code","postcode","state","province","imperial","metric","miles","km"]
files = ["products.csv","ui-reasoning.csv","colors.csv","styles.csv","landing.csv","ux-guidelines.csv","typography.csv"]
for fn in files:
    text = (DATA/fn).read_text(encoding="utf-8")
    hits = {t: len(re.findall(r"(?<!\w)"+re.escape(t.strip())+r"(?!\w)", text, re.I)) for t in terms}
    hits = {k:v for k,v in hits.items() if v}
    print(f"  {fn}: {hits}")

print("\n" + "="*90); print("E. PRODUCT TAXONOMY — full list of 192 Product Types")
print("="*90)
for i,r in enumerate(products,1):
    print(f"  {i:>3}. {r['Product Type']}")
```

### `hygiene.py`

```python
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""General data hygiene: encoding, malformed rows, dupes, colour formats, casing, framework coupling."""
import csv, io, sys, re, hashlib
from collections import Counter, defaultdict
from pathlib import Path
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
DATA = Path(r"C:\Users\acer\Documents\project room\JRNY-Digital\ui-ux-pro-max-skill\src\ui-ux-pro-max\data")
files = sorted(DATA.glob("*.csv")) + sorted((DATA/"stacks").glob("*.csv"))

print("="*90); print("A. ENCODING / BOM / LINE ENDINGS / RAGGED ROWS")
print("="*90)
for p in files:
    raw = p.read_bytes()
    bom = raw.startswith(b'\xef\xbb\xbf')
    try: raw.decode("utf-8"); enc_ok=True
    except UnicodeDecodeError: enc_ok=False
    crlf = raw.count(b'\r\n'); lf = raw.count(b'\n')
    nonascii = sum(1 for b in raw if b > 127)
    with open(p, encoding="utf-8", newline="") as f:
        rdr = csv.reader(f); header = next(rdr)
        ragged = [(i+2, len(r)) for i,r in enumerate(rdr) if len(r)!=len(header) and r]
    flag = []
    if bom: flag.append("BOM")
    if not enc_ok: flag.append("NOT-UTF8")
    if crlf: flag.append(f"CRLF({crlf})")
    if ragged: flag.append(f"RAGGED{ragged[:3]}")
    print(f"  {p.relative_to(DATA).as_posix():<34} cols={len(header):<3} nonascii_bytes={nonascii:<6} {' '.join(flag) or 'clean'}")

print("\n" + "="*90); print("B. DUPLICATE ROWS (whole-row hash, excluding 'No' column)")
print("="*90)
for p in files:
    with open(p, encoding="utf-8", newline="") as f:
        rows = list(csv.DictReader(f))
    if not rows: continue
    keyed = [tuple((k,v) for k,v in r.items() if k != "No") for r in rows]
    c = Counter(keyed)
    d = [k for k,v in c.items() if v>1]
    if d:
        print(f"  {p.name}: {len(d)} duplicated row-bodies")
        for k in d[:3]: print("     ", dict(k).get("Product Type") or dict(k).get("Style Category") or list(dict(k).values())[0])

print("\n" + "="*90); print("C. COLOUR FORMAT CONSISTENCY (all csvs)")
print("="*90)
pat = {
 "hex6": re.compile(r"(?<![\w#])#[0-9A-Fa-f]{6}(?![0-9A-Fa-f])"),
 "hex3": re.compile(r"(?<![\w#])#[0-9A-Fa-f]{3}(?![0-9A-Fa-f])"),
 "hex8": re.compile(r"(?<![\w#])#[0-9A-Fa-f]{8}(?![0-9A-Fa-f])"),
 "rgb/rgba": re.compile(r"\brgba?\("),
 "hsl": re.compile(r"\bhsla?\("),
 "oklch": re.compile(r"\boklch\("),
 "named": re.compile(r"(?<!\w)(?:White|Black|Grey|Gray|Beige|Taupe|Navy|Gold|Teal|Coral)(?!\w)"),
}
for p in files:
    t = p.read_text(encoding="utf-8")
    hits = {k: len(v.findall(t)) for k,v in pat.items()}
    hits = {k:v for k,v in hits.items() if v}
    if hits: print(f"  {p.relative_to(DATA).as_posix():<34} {hits}")

print("\n  -- colors.csv per-column format breakdown --")
with open(DATA/"colors.csv", encoding="utf-8", newline="") as f: rows=list(csv.DictReader(f))
for col in rows[0]:
    if col in ("No","Product Type","Notes"): continue
    kinds=Counter()
    for r in rows:
        v=r[col].strip()
        kinds["hex6" if re.fullmatch(r"#[0-9A-Fa-f]{6}",v) else
              "rgba" if v.startswith("rgba(") else
              "other:"+v] += 1
    if len(kinds)>1: print(f"    {col}: {dict(kinds)}")

print("\n" + "="*90); print("D. CASING / NAMING CONVENTION ACROSS FILES")
print("="*90)
hdrs={}
for p in files:
    with open(p, encoding="utf-8", newline="") as f: h=next(csv.reader(f))
    hdrs[p.relative_to(DATA).as_posix()]=h
allh=Counter(x for h in hdrs.values() for x in h)
snake=[x for x in allh if "_" in x]; title=[x for x in allh if " " in x]
print(f"  distinct header names: {len(allh)}")
print(f"  snake_case headers ({len(snake)}): {sorted(snake)}")
print(f"  headers containing non-ascii: {[x for x in allh if any(ord(c)>127 for c in x)]}")
print(f"  same concept different names: 'Product Type' vs 'UI_Category' vs 'Data Type' vs 'Style Category'")
print(f"  ui-reasoning.csv is the ONLY snake_case file: {hdrs['ui-reasoning.csv']}")

print("\n" + "="*90); print("E. FRAMEWORK COUPLING IN THE NON-STACK DATA")
print("="*90)
fw = {"tailwind": re.compile(r"tailwind", re.I),
      "react/jsx": re.compile(r"\breact\b|=>\s*\{|<[A-Z]\w+[ />]", ),
      "next.js": re.compile(r"next\.js|nextjs", re.I),
      "shadcn": re.compile(r"shadcn", re.I),
      "gsap": re.compile(r"\bgsap\b", re.I),
      "tw-class-strings": re.compile(r"\b(?:pt|pb|px|py|mt|mb|gap|text|bg|border)-(?:\d|primary|b-2)\b"),
      "css-vars": re.compile(r"--[a-z][a-z0-9-]*\s*:")}
for p in sorted(DATA.glob("*.csv")):
    t=p.read_text(encoding="utf-8")
    hits={k:len(v.findall(t)) for k,v in fw.items()}
    hits={k:v for k,v in hits.items() if v}
    print(f"  {p.name:<28} {hits}")
```

### `sweep.py`

```python
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Full sweep: generate a design system for every one of the 192 product types,
   measure how much variety the output layer actually produces."""
import csv, io, sys, time
from collections import Counter
from pathlib import Path
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
ROOT = Path(r"C:\Users\acer\Documents\project room\JRNY-Digital\ui-ux-pro-max-skill\src\ui-ux-pro-max")
sys.path.insert(0, str(ROOT/"scripts"))
from design_system import DesignSystemGenerator

rows=list(csv.DictReader(open(ROOT/"data"/"products.csv",encoding="utf-8",newline="")))
gen=DesignSystemGenerator()
styles=Counter(); typos=Counter(); pats=Counter(); pals=Counter(); mism=0; t0=time.perf_counter()
for r in rows:
    q=r["Product Type"]
    ds=gen.generate(q)
    styles[ds["style"]["name"]]+=1
    typos[ds["source_identities"]["typography"]]+=1
    pats[ds["pattern"]["name"]]+=1
    pals[ds["source_identities"]["color"]]+=1
    if ds["category"] != q: mism+=1
t1=time.perf_counter()
n=len(rows)
print(f"queried all {n} product types by their exact name; {(t1-t0)/n*1000:.1f} ms/query warm")
print(f"queries whose resolved category != the exact product name they were queried with: {mism}/{n}")
print(f"\ndistinct STYLES used across 192 products:      {len(styles)}")
for k,v in styles.most_common(15): print(f"    {v:>4}  {k}")
print(f"\ndistinct TYPOGRAPHY pairings used:             {len(typos)} (of 74 in typography.csv)")
for k,v in typos.most_common(15): print(f"    {v:>4}  {k}")
print(f"\ndistinct LANDING patterns used:                {len(pats)} (of 34 in landing.csv)")
for k,v in pats.most_common(15): print(f"    {v:>4}  {k}")
print(f"\ndistinct PALETTES used:                        {len(pals)} (of 192 in colors.csv)")
print("    top palette reuse:", pals.most_common(6))
```

### `rowdump.py`

```python
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Three representative rows, verbatim, per CSV — emitted as markdown."""
import csv, io, sys
from pathlib import Path
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
DATA = Path(r"C:\Users\acer\Documents\project room\JRNY-Digital\ui-ux-pro-max-skill\src\ui-ux-pro-max\data")

# (file, [row indices chosen to be representative])
PICKS = {
 "products.csv":      [0, 59, 176],
 "colors.csv":        [0, 59, 176],
 "ui-reasoning.csv":  [0, 39, 176],
 "styles.csv":        [0, 8, 79],
 "landing.csv":       [0, 30, 33],
 "typography.csv":    [0, 30, 47],
 "ux-guidelines.csv": [0, 40, 100],
 "motion.csv":        [0, 8, 16],
 "charts.csv":        [0, 9, 24],
 "icons.csv":         [0, 50, 104],
 "app-interface.csv": [0, 15, 31],
 "react-performance.csv": [0, 20, 43],
 "google-fonts.csv":  [0, 900, 1933],
}
for fn, idxs in PICKS.items():
    rows = list(csv.DictReader(open(DATA/fn, encoding="utf-8", newline="")))
    print(f"\n#### `{fn}` — 3 verbatim rows (row numbers are 1-based data rows)\n")
    print("```")
    for i in idxs:
        if i >= len(rows): continue
        print(f"--- row {i+1} ---")
        for k, v in rows[i].items():
            print(f"{k}: {v}")
        print()
    print("```")
```

