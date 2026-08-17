# Extraction replay fixtures

Hand-picked, committed raw responses for `replayStructuredContent` (`lib/content/structure-and-rewrite.ts`)
to run against in tests — no network, no model call, exercising the exact deterministic chain the live
path uses (`normalizeStringifiedJson` → `validateShape` → `resolveStructuredContent`). This is the
"replay" half of the replay/live split discussed in `docs/kondo-v2-execution.md`'s log (entries `0.1`
through `0.1c`); the "live" half is `scripts/check-extraction.ts`, which still hits the real API and is
never a hard gate because the model's own output is not reproducible run to run.

## Format

Each fixture is a single JSON file:

```json
{
  "id": "…",
  "scenario": "…",                          // what this fixture demonstrates, and why
  "capturedFrom": { "client": "…", "clientId": "…", "capturedAt": "…", "outputTokens": …, "maxOutputTokens": 16000 },
  "synthetic": false,                        // true only if hand-modified after capture — see syntheticNote
  "syntheticNote": null,                     // required, non-null, if synthetic is true
  "imageCandidateAssetIds": [],               // ordered asset IDs the original call's imageCandidates used —
                                               // index N in a fixture's images array must mean the same
                                               // photo on replay as it did on the original live call
  "rawResponse": { … }                        // the raw tool_use.input, unprocessed — this is what gets
                                               // fed into replayStructuredContent
}
```

**Never hand-edit `rawResponse` outside of building a deliberate `synthetic: true` fixture, and never
flip `synthetic` to `false` after doing so.** A fixture's whole value is that it's either real captured
model output, or an honestly-labelled, minimal, documented departure from one.

## Provenance and known limitations

All four fixtures below were sourced or attempted during `docs/kondo-v2-execution.md`'s log entry
`0.1c` (2026-08-17). Full detail, including the live-call search for fixtures 3 and 4, is in that entry
— summarised here for anyone reading only this file:

| File | Scenario | Sourced from |
|---|---|---|
| `empty-array-field.json` | A field the model correctly returns empty (`testimonials`, `process`) | Real capture, Princeton Dental |
| `coercion-drop.json` | One malformed item silently dropped by `coerceTextArray` | **Synthetic** — see `syntheticNote` in the file. Zero natural drops observed across ~18 live calls spanning 4 clients while sourcing these fixtures, so this was hand-built from a real capture by deleting one required field from one real item. |
| `near-token-ceiling-best-available.json` | A response using as much of the 16,000-token ceiling as possible | Real capture, Princeton Dental, 4,809/16,000 tokens (≈30%). **Not genuinely near the ceiling** — this is the highest-output response any client in the dev database produced at capture time (Propell Property, Downseal Solutions, and Allen Evans Family Lawyers all produced lower). Labelled honestly rather than fabricated to look more extreme. Shares its `rawResponse` with `empty-array-field.json` — one real capture happens to usefully demonstrate both properties, not two independent captures. |
| *(a `validateShape`-retry fixture)* | A response that failed shape validation on attempt 1 and needed a retry | **Not sourced.** Every live call made while building these fixtures — and every one made across this log's prior entries — succeeded on attempt 1. No fixture exists for this scenario. See `lib/content/replay-fixture.test.ts`'s `test.todo` for the visible reminder. Do not fabricate a two-attempt interaction to fill this gap without a human decision first — it's a materially harder thing to fake plausibly than a single dropped field. |

None of the four fixtures include real images — every capture used `imageCandidates: []`, matching how
`scripts/check-extraction.ts` has always run (fast, text-only, no Playwright/image-download step). The
`imageCandidateAssetIds` field and the index-matching logic it exists to test are therefore present in
the format but **not actually exercised** by any current fixture. A fifth fixture sourced from a client
with real downloaded images would be needed to cover that path.
