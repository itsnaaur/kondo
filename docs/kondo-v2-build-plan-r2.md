# Kondo v2 — Build Plan (Revision 2)

Fresh-generated landing pages, no templates, design intelligence from a **narrow** uupm import.

Supersedes `kondo-v2-build-plan.md`. Revised against the uupm port audit.

---

## 0. What changed in this revision, and why

The uupm audit ran the generator across all 192 product types using their exact canonical names —
zero retrieval error, best possible input — and found:

```
distinct PALETTES used:            192 / 192   ← perfect
distinct TYPOGRAPHY pairings used:  48 / 74
distinct LANDING patterns used:     19 / 34
distinct STYLES used:               25 / 88
```

One style covers 21% of all industries. Three landing patterns cover 46%.

**This dataset is a colour library with a typography library attached — not a design intelligence
engine.** Its industry differentiation lives almost entirely in the palette layer, which is the
one layer Kondo already handles better, because we anchor to the prospect's own brand hue rather
than an industry average.

Separately, its retrieval is unusable on our book: three of five of our verticals failed, two
silently. `physiotherapy` and `optometrist` score *literally zero* against all 192 product rows.
Ninety of the 192 categories are consumer mobile apps.

Four consequences, which are what this revision is:

1. **The uupm import shrinks** from a design engine to typography, four palette roles, and a
   validation corpus.
2. **Style differentiation must come from us.** New task: author 6–10 style bundles.
3. **`suitability.ts` must survive the template deletion** — it becomes pattern eligibility.
4. **Classification must be able to return nothing.** Silent wrong answers are the failure mode
   that scales worst.

---

## 1. What we're building

Kondo takes a prospect's website URL and produces a bespoke landing page mockup for cold
outreach. Every page is generated fresh — no fixed templates. Design is resolved per prospect from
a small local dataset, anchored to the prospect's own brand colours where we can read them
confidently.

The pitch to the recipient is *"this is what your landing page could look like."* It is a
concept, not a claim.

**Out of scope:** loosening what content we're willing to invent. Framing and copy quality can
improve inside the current fact discipline. Changing `ContentRecord`'s shape is the expensive
change and this build doesn't need it.

---

## 2. Prerequisites

**2.1 Answer why the July architecture was removed.** A "design spec / interpreted brief / AI
generation" pipeline was deliberately torn out on 31 July. This plan rebuilds a cousin of it. If
it died on output-token limits, §6.4 addresses that directly. If it died on cost, latency or
unusable output, we need to know first. This gates everything.

**2.2 Build the evaluation harness.** Extend `scripts/check-extraction.ts` to write outputs, diff
against a saved baseline, and cover generation as well as extraction. Without it we tune two new
prompts and a design layer blind, paying for a full Playwright crawl per experiment.

**2.3 Confirm production reality.** Is the Railway worker running? Are the Upstash env vars set?

**2.4 Drop `'unsafe-inline'` from production CSP `script-src`.** After this build the entire page
is model-authored and served unauthenticated at `/p/[slug]`. One config line, cheapest risk
reduction available.

**2.5 Answer the taxonomy question.** Does `detectedIndustry` already resolve to a fixed enum, or
is it free text? This sets the shape of §5.5 and is the single biggest swing in effort.

---

## 3. The uupm import — narrow

Repo is MIT, and the audit confirmed the licence covers the data directory. All 91 typography
families are OFL or Apache-2 against a pinned `google/fonts` SHA. Nothing premium is bundled.

### 3.1 Import

| File | What we take | Why |
|---|---|---|
| `typography.csv` | All 74 pairings | **Highest value per day in the whole import.** Every family and weight resolves; all OFL/Apache. We currently ship one pairing across all three templates. |
| `colors.csv` | 191 rows as a **test corpus**, plus 4 missing role tokens | Drop `Spatial Computing OS / App` (the single AA failure). Normalise 19 `rgba()` borders. |
| `google-fonts.csv` | Build-time validation only | Assert every weight we request exists. Never shipped to runtime. |
| `google-font-licenses.json` | Audit trail | Pins the upstream fonts SHA for our notices file. |

### 3.2 Do not import

`landing.csv` (138 distinct section names across 152 slots, no required/optional schema — our own
`suitability.ts` is strictly better), `styles.csv` (Tailwind-coupled, 38 of 88 rows unreachable —
harvest `Design System Variables` by hand for the few we use), `ux-guidelines.csv` (the 19
machine-checkable rules are the deliverable, not the file), `products.csv` rows (90 of 192 are
consumer mobile apps; column 6 has 36 of 77 broken foreign keys), `motion.csv`, `charts.csv`,
`icons.csv`, `app-interface.csv`, `react-performance.csv`, `data/stacks/*`, and **the entire BM25
retrieval layer**.

### 3.3 `ui-reasoning.csv` — deferred, deliberately

The audit recommends re-keying its 192 `UI_Category` values onto a taxonomy we write, at 2.5–3.5
days. That is the bulk of its estimate, and it buys mood strings and anti-patterns per industry.

**We already have a model reading the prospect's entire website that returns `moodSignals` and
`positioningTier`.** The taxonomy exists to serve BM25 retrieval; without BM25 much of its purpose
goes with it — and a per-prospect mood signal differentiates better than a per-industry lookup,
since two physio clinics can legitimately come out different.

So: **defer the re-keying.** Take only a hand-written anti-pattern enum (~20 canonical tokens
clustered from the 232 free-text clauses) for hard constraints. Revisit if the model's mood signal
proves noisy in practice — by then we'll have evidence.

What a taxonomy genuinely buys that a model doesn't is *consistency*: same industry, same
treatment, every time, human-auditable. That's real. It isn't obviously worth three days before
we know we need it.

### 3.4 Vendoring rules

- Pin by commit SHA in `lib/design/data/PROVENANCE.md`, with import date and per-file row counts.
- Commit the **generated JSON**, not the CSVs. No CSV parsing at runtime.
- Hash after LF normalisation, or every Windows checkout produces a different digest.
- Corrections go in a sibling `overrides.json` merged at build time. **Never hand-edit generated
  JSON** — a re-import would silently discard the fix. Put this in the file header.
- Gate re-imports on `validate-contrast.ts` and `validate-fonts.ts`.
- `THIRD_PARTY_NOTICES.md` with the MIT text and pinned SHA.
- Re-import deliberately, quarterly at most. It's static data; there's no security pressure to
  stay current.

---

## 4. Architecture

```
Add client
   ↓
[Phase A — job: ANALYZE_SITE]
   crawl + computed styles → select pages → images → brand colour
   → extraction call (content + classification) → image classification (cached)
   → persist ContentRecord + ImageManifest
   ↓
[Human] Extraction display + Continue          ← informational, not approval
   ↓
[Phase B — job: GENERATE_PAGE]
   design system resolution (deterministic, free)
   → generate stylesheet (deterministic)
   → generate markup (one Claude call)
   → validate → persist Concept
   ↓
[Human] Review the page                        ← the real gate
   ↓
Publish → /p/[slug]
```

---

## 5. Phase A — analysis

### 5.1 Crawl (extended)

While each page is open in Playwright, capture `getComputedStyle` for a fixed selector set:
primary button background, link colour, nav/header background, H1 colour, `:root` custom
properties. Store as JSON on `CrawledPage`.

### 5.2 Brand colour — better input, existing derivation

**Correction to Revision 1.** I previously described colour extraction as broken. In fact
`lib/content/normalize-brand-colors.ts` already solves the hard half — its header comment records
the same lesson the audit reached independently (Princeton Dental came back as black plus two
near-identical greens), and it derives 11 roles from a single chosen hue at controlled lightness
and saturation.

The derivation layer is good. The **input** is the weak part. Computed-style capture feeds that
function the prospect's actual brand hue instead of the least-bad hue from a poor extraction —
better raw material into a function that already works, not a replacement for it.

Extend it with the four roles it lacks — `secondary`, `ring`, `destructive`, `onDestructive` —
using the invariants the audit derived from 192 palettes:

- `Card Foreground` == `Foreground`, 192/192
- `Ring` == `Primary`, 84%
- `Secondary` is the same hue as primary, median 4° delta — a tint, not a second brand colour
- `Accent` is near-complementary, median 103° delta — deliberately opposed, it's the CTA
- The four `On *` roles are a **3-value lookup** (`#FFFFFF`, `#000000`, `#0F172A`) picked for
  contrast; the audit tested arbitrary brand primaries and all passed AA

The 191 imported palettes become the **test corpus**: assert our derivation produces AA-passing
output for all 191 primaries.

### 5.3 Image manifest

Deterministic first, no call: dimensions, aspect ratio, orientation, file size, bytes-per-pixel,
alpha channel, colour entropy, saturation-filtered dominant colours, page position and cross-page
frequency.

Then a vision call, **separate from extraction and cached on `Asset.contentHash`**:

```
subject: person | people | product | interior | exterior | equipment |
         abstract | graphic | screenshot | map | icon
isHeadshot, peopleCount
shotQuality: professional | competent | amateur
hasBurnedInText, hasWatermark
focalPoint: {x, y}        // normalised — crop to this, never stretch
clearSpace: none | left | right | top | bottom | centre
heroSuitable: bool + reason
caption                   // short; doubles as alt text
confidence
```

Ask what an image *is*, never what it *feels like*. Caching on `contentHash` means an image is
classified once, ever — which fixes the non-determinism the Kondo audit found.

Assign roles by rule: `logo`, `hero`, `section-background`, `gallery`, `team`, `feature-inline`,
`unusable`. Emit a capability summary that constrains pattern eligibility in Phase B.

### 5.4 Extraction call (extended)

Adds a `classification` object: `businessDescriptor`, `audience`, `moodSignals[]`,
`positioningTier`, `confidence`.

### 5.5 Vertical classification — explicit, and allowed to fail

**Revised from Revision 1**, which proposed BM25-snapping the model's descriptor to a uupm
category. The audit killed that: no stemming, no field weighting, and our own vocabulary scores
zero against theirs.

Instead: an explicit keyword→vertical table over the crawler's structured output, with a
deterministic priority order and **`null` as a first-class return.**

`resolveDesignSystem()` returns a discriminated union:

```ts
{ ok: true;  system: DesignSystem }
| { ok: false; reason: "no-vertical-match"; partial: NeutralSystem }
```

This is the single most important structural decision in the plan. Three of five upstream failures
were silent — the optometry case shipped a dark-mode dev-tool palette to an eye clinic and
reported success. A system that can't say "I don't know" ships wrong design at batch scale and
never tells you.

On `null`: neutral-but-competent design system, page flagged for review.

### 5.6 Human step — Continue, not Approve

Extraction displayed and editable. `reviewedAt` → `acknowledgedAt`: keep the timestamp, change
the semantics. Decide whether the `flagged`/`confidence` machinery stays as advisory badges or
goes; don't leave it running with no consumer.

---

## 6. Phase B — generation

### 6.1 Design system resolution (deterministic, milliseconds, $0)

- **Palette** — derived from the crawled brand hue via §5.2. Not selected from a table.
- **Typography** — explicit table from the imported pairings, keyed on mood and tier, tie-broken
  by slug, never by array order.
- **Style bundle** — from our own set (§6.2).
- **Pattern** — filtered by eligibility (§6.3), then ranked.
- **Anti-patterns** — from the canonical enum.

Deterministic and local, so showing the 2nd, 3rd and 4th ranked options costs nothing. Give the
reviewer a "next variant" control.

### 6.2 Style bundles — new task, ours to author

Upstream achieves 25 distinct styles across 192 industries with one covering 21%. Authoring
**6–10 bundles ourselves** gives comparable real coverage, fully under our control, tuned to
Australian SME service businesses rather than the consumer mobile apps that make up 90 of their
192 categories.

A bundle is a named set of surface treatments: shadow depth, border radius, border weight, blur,
spacing scale, image treatment, section rhythm. Harvest `Design System Variables` from
`styles.csv` by hand for the handful worth starting from.

Each bundle must declare whether it is light-mode, dark-mode or either — see §6.5.

### 6.3 Pattern eligibility — keep `suitability.ts`

`lib/templates/suitability.ts` already implements the `requires` model `landing.csv` lacks:
`heroImage`, `phone`, `minServices`, `minGallery`.

**It must survive the template deletion.** Lift it out of `lib/templates/`, repurpose it as
pattern eligibility, and extend with `minTestimonials`, `needsPricing`, `needsTeamPhotos`,
`needsCredentials`. Feed it both content coverage and the image capability summary from §5.3.

### 6.4 The token split — deterministic CSS, model markup

Our templates run ~450–600 lines of HTML plus ~350 of CSS each. A model writing both is north of
15,000–25,000 output tokens against a 16,000 ceiling. It truncates, and the existing
`stop_reason === "max_tokens"` retry resends the whole payload and truncates again. **Primary
suspicion for why the July architecture didn't survive.**

- **Deterministic layer owns the stylesheet.** Generated from resolved tokens, inlined in a
  `<style>` block so `Concept.html` stays self-contained.
- **Model owns markup only.** ~4,000–6,000 tokens. Comfortably inside budget.

Contrast becomes guaranteed by construction, the design system actually controls the design rather
than suggesting it, and output stays consistent across a batch of fifty.

### 6.5 Validation before persisting (mandatory)

- Parses as well-formed HTML
- Every `data-kondo-section` marker present
- No `<script>`, inline handlers, `javascript:`/`data:` URIs, `<iframe>`, `<object>`, `<embed>`,
  `<form>`, `<meta http-equiv>`
- Every referenced image is one we supplied; none reused; nothing marked `unusable`
- Contrast ≥ 4.5:1 on every text/background pair used
- **Mode coherence: palette lightness matches the style bundle's declared mode.** Upstream computes
  `_palette_is_dark` and never asserts it — that is precisely the optometry bug. A coherence check
  you compute but don't assert is not a check.
- No empty sections; Google Fonts import matches the chosen pairing

Fail → retry with the specific failure appended. Exhaust → fallback renderer.

Build these as tests, not only runtime checks. They replace the 12 template tests being deleted.

---

## 7. Delete, keep, add

**Delete:** `lib/templates/atlas|ledger|showcase` (~2,800 lines), `registry.ts` scoring and
`pickDefaultTemplate`, `TemplateGallery.tsx`, `/clients/[id]/templates`,
`/clients/[id]/preview/[templateKey]`, `render.test.ts`. Also the dead `adm-zip` dependency,
`lib/media/prepare-image.ts`, and the stale comments in `anthropic-retry.ts` and
`goto-and-settle.ts`.

**Keep and repurpose:**
- `suitability.ts` — pattern eligibility (§6.3). **Do not let this go out with the templates.**
- `normalize-brand-colors.ts` — extend, don't replace (§5.2).
- `to-template-content.ts` — something still flattens `ContentRecord` for the generation prompt.
- `section-editor.ts` and the per-section editor — the escape hatch matters *more* when output
  varies more.
- **One template as a fallback renderer.** Not user-facing, not a choice. Without it, a failed
  generation leaves a dead client with no degraded mode.

**Add:** `lib/design/` (data, build scripts, resolvers, contrast utilities, golden tests),
`DesignSystem` and `ImageManifest` persistence, a second `Job.type`, stylesheet generator, markup
generator, validator.

Store the resolved design system **on the `Concept`**, not only the client — `Concept.html` is a
frozen snapshot and regenerating a design system must not retroactively change existing concepts.

---

## 8. Do not do

**Content and claims**
- Do not invent facts: statistics, testimonials, credentials, qualifications, years in business,
  prices, guarantees, hours, service areas. Framing, headlines, section order and service
  descriptions are fair game; specifics are not.
- Do not relax this for regulated verticals under any framing. AHPRA restricts testimonials in
  health advertising outright, and physio, family law and NDIS are all in our book.
- Do not generate photographic imagery depicting the prospect's premises, staff or work. If
  there aren't enough usable photos, choose a layout that doesn't need them.

**uupm import**
- Do not port the BM25 retrieval layer. We know the industry; look up, don't search.
- Do not import `landing.csv`. Extend `suitability.ts`.
- Do not import `products.csv` column 6 — 36 of 77 values are broken foreign keys.
- Do not hand-edit generated JSON. Corrections go in `overrides.json`.
- Do not track upstream `main`. Vendor by SHA.

**Architecture**
- Do not let the model author CSS.
- Do not shell out to Python from the worker.
- Do not let classification guess. `null` is a valid, expected outcome with a neutral fallback and
  a review flag.
- Do not return an always-populated design system object. Discriminated union, so the type system
  forces the failure path to be handled.
- Do not fold image classification back into the extraction call.
- Do not persist a `Concept` that hasn't passed validation.
- Do not delete the fallback renderer to keep things clean.
- Do not delete `suitability.ts` with the templates.
- Do not let `reviewedAt` keep its name while its meaning changes.

**Images**
- Do not ask a vision model how an image *feels*. Ask what it is, its quality, and where its focal
  point and clear space are.
- Do not stretch to fit. Crop to focal point.
- Do not upscale. Use a layout that doesn't need the image, or a duotone treatment into the brand
  palette.

**Process**
- Do not start feature work before the eval harness exists.
- Do not ship before `'unsafe-inline'` is dropped from production CSP.
- Do not leave `STALE_JOB_TIMEOUT_MS` at 90 minutes; Phase B adds a call it doesn't account for.

---

## 9. Build sequence

Each phase ends in something demonstrable. Don't run them in parallel — the point is knowing which
change moved the needle.

**Phase 0 — Prerequisites.** Eval harness, CSP fix, production checks, the July conversation, the
taxonomy question.

**Phase 1 — Colour and images.** Computed-style capture, brand colour input fix, four extra roles
on `normalize-brand-colors.ts`, contrast utilities, 191-palette validation corpus, image manifest
with cached classification. Ship into the **existing templates**.

**Phase 2 — Typography and style bundles.** Import typography, build the resolver, author 6–10
style bundles, feed tokens into existing templates as CSS custom properties. Still deterministic,
still safe. **Last cheap point to back out.**

**Phase 3 — Fresh generation.** Stylesheet generator, markup generator, validator, fallback,
second job type. Lift `suitability.ts` out and extend it. Delete the template gallery and preview
routes; keep one renderer.

**Phase 4 — Checkpoint move.** `reviewedAt` → `acknowledgedAt`, extraction becomes informational,
page review becomes the gate.

Phases 1 and 2 are independently valuable. If Phase 3 proves harder than expected, you still have
a materially better tool — and going from one typography pairing to a dozen, with brand-anchored
palettes, is a visible improvement on its own.

---

## 10. Effort and cost

**uupm work, revised down.** The audit's 8–11 days assumed the taxonomy re-key. Deferring it
(§3.3):

| | Audit estimate | This plan |
|---|---|---|
| Data import + validators | 1.5–2 | 1.5–2 |
| Taxonomy re-key | 2.5–3.5 | **deferred** |
| Logic reimplementation | 3–4 | 1.5–2 (no BM25, no decision-rule engine) |
| Tests + CI gates | 1–1.5 | 1–1.5 |
| **Total** | **8–11 days** | **4–5.5 days** |

Style bundle authoring (§6.2) is new: **1–2 days**, and it's design work rather than engineering.

**Per-run cost**, assumed Sonnet-tier pricing, order of magnitude:

| | Current | v2 |
|---|---|---|
| Extraction | ~$0.30 | ~$0.30 |
| Image classification | folded in | ~$0.03 first run, ~$0 cached |
| Design system | — | $0.00 |
| Markup generation | — | ~$0.10–0.15 |
| **Per run** | **~$0.30** | **~$0.43–0.48** |

---

## 11. Risks

| Risk | Mitigation |
|---|---|
| Output token ceiling on generation | Token split (§6.4); markup only |
| Silent wrong classification | `null` return + discriminated union (§5.5) |
| Palette/style mode mismatch | Mode coherence as a validator post-condition (§6.5) |
| Quality variance across a batch | Deterministic CSS; validator; fallback renderer |
| Model-authored HTML on a public route | Validator blocklist; drop `unsafe-inline`; keep `noindex` |
| Rebuilding what was already abandoned | §2.1 before anything else |
| Loss of test coverage | Validator written as tests, replacing `render.test.ts` |
| Style variety thinner than hoped | 6–10 own bundles (§6.2), not upstream's 25 |
| Upstream drift changing our output | Vendor by SHA; golden files (§3.4) |

---

## 12. Open decisions

1. Does `detectedIndustry` resolve to a fixed enum? Sets the shape of §5.5.
2. What fraction of a batch can acceptably stop for human review? Determines how aggressive the
   classifier can be, and whether the neutral fallback is a hard requirement.
3. How many typography pairings to start with — 10–15 is my suggestion over all 74, since each
   needs checking against the type scale.
4. Does Phase B auto-run on Continue, or is it a separate click? Separate makes spend explicit and
   gives a free design-system re-roll before paying for generation.
5. Keep the flag machinery as advisory warnings, or remove it?
6. Does a regenerated page replace the existing `Concept` or create a new one?
7. What's the actual success signal — cold email reply rate, or your own judgement? It determines
   what Phases 1 and 2 get measured against.
