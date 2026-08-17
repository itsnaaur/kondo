# Provenance — lib/design/data/palettes.json

**GENERATED FILE. Do not hand-edit `palettes.json`.** It is fully overwritten every time
`lib/design/build/import-uupm.ts` runs — a hand edit survives only until the next re-import,
which silently discards it. Corrections belong in a sibling `lib/design/data/overrides.json`
(not created by this import — wire it in at the point something actually needs correcting),
merged at build time by whatever reads `palettes.json`. This is the same warning
`import-uupm.ts`'s own header comment carries — repeated here because JSON has no comment
syntax, so it can't live inside `palettes.json` itself without breaking `jq 'length'` on what
must stay a plain 191-element array.

## Source

- Repository: https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
- Pinned commit SHA: `a38d04c3d5c298c851dbe5e6ee1965ee3de42cb5`
- Import date: 2026-08-17
- File imported: `src/ui-ux-pro-max/data/colors.csv`
- Source file SHA-256 (after CRLF→LF normalisation — the committed blob is CRLF on disk, and
  hashing before normalising would make the digest depend on the checkout's line-ending
  behaviour, not just the content): `8162429222bce22df62b564085946a30d07cc9722c58d0a3a494bd0d1d00841c`
- License: MIT — see /THIRD_PARTY_NOTICES.md at the repo root.

## Row counts

| File | Upstream rows | Imported rows | Dropped |
|---|---:|---:|---|
| `colors.csv` | 192 | 191 | 1 — `Spatial Computing OS / App` (No. 89), the single WCAG AA body-text failure the audit found (Background/Foreground contrast) |

## Normalisation applied

- 19 `Border` values in `rgba(r,g,b,a)` form were converted to 8-digit hex
  (`#RRGGBBAA`) so the whole `Border` column is uniformly hex; alpha is preserved, not dropped.
  All other columns were already consistently `#RRGGBBXX`/`#RRGGBB` and untouched.
- Original upstream row numbers (the CSV's own `No` column) are preserved as each palette's
  `id` rather than renumbered 1..191 — there is a gap at `89` where the
  dropped row was. This keeps every `id` traceable back to the exact upstream row it came from.

## Re-import

Re-import deliberately, quarterly at most — this is static reference data, not something with
security pressure to stay current (build plan §3.4). Before re-importing, gate on
`validate-contrast.ts`/`validate-fonts.ts` if/when those exist (not built by this import; see
Task 1.4's log entry in `docs/kondo-v2-execution.md` for why they're out of scope here).

    npx tsx lib/design/build/import-uupm.ts --source <path-to-clone-or-colors.csv> --sha <commit-sha>
