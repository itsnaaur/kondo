# Kondo

Internal JRNY Digital tool: point it at a prospect's existing website, and it crawls the
site, uses Claude to extract and rewrite the business's content (services, testimonials,
brand colours, photos, and more), and turns that into a hand-built landing-page "concept"
— a sales asset a rep can preview and publish to a shareable link while pitching a
website refresh.

The flow: **Add client → Analyse Site → Review Extraction → Choose Template → Generate &
Preview → Publish**. Everything after Analyse Site is manual and reversible; nothing
downstream ever runs without a human explicitly approving the extracted content first.

See [SECURITY-CHECKLIST.md](./SECURITY-CHECKLIST.md) for the security posture, the
dashboard/account setup steps only someone with production access can do, and the
pre-launch checklist.

## Architecture

Two separate deployments, not one:

- **The Next.js app** (this repo, App Router) — deployed to **Vercel**. Handles auth, the
  UI, and every fast operation (template rendering, publish, trash). Uses
  [Prisma](https://prisma.io) 7 against Postgres (Supabase-hosted), and
  [Supabase Auth](https://supabase.com/auth) with mandatory MFA.
- **The background worker** (`scripts/worker.ts`) — deployed separately (Railway by
  default, see `railway.toml`), as a plain long-running Node process. Vercel serverless
  functions are killed once the response is sent, so the one slow, AI-touching step
  (crawling a site with Playwright, then running it through Claude) can't run as a
  fire-and-forget call from a server action — it has to be a durable row in the `Job`
  table that this separate process polls and executes. It needs Playwright's Chromium
  installed (`npx playwright install --with-deps chromium`) and the same `DATABASE_URL`,
  `ANTHROPIC_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, and `SUPABASE_SECRET_KEY` as the main
  app (it uploads crawled images to Supabase Storage directly — see
  `lib/storage/upload-asset.ts`).

Both deployments talk to the same Postgres database and the same Supabase Storage bucket
(`kondo-assets`, public-read, created once by hand in the Supabase dashboard) — there's no
other coupling between them.

## Local setup

Requires Node 22.12+ (see `.nvmrc`) and a Postgres database (a free
[Supabase](https://supabase.com) project is the easiest way to get one that matches
production).

1. `npm install`
2. Copy `.env.example` to `.env` and fill in every value — see the comments in that file
   for what each one is for. `DATABASE_URL`/`DIRECT_URL` come from your Supabase project's
   connection settings; `NEXT_PUBLIC_SUPABASE_*`/`SUPABASE_SECRET_KEY` from its API
   settings; `ANTHROPIC_API_KEY` from [console.anthropic.com](https://console.anthropic.com).
   `UPSTASH_REDIS_REST_URL`/`TOKEN` are optional locally (rate limiting just fails open
   with a warning if unset) but required before any real usage — see the security
   checklist.
3. Apply migrations: `npx prisma migrate dev` (creates the schema and generates the
   Prisma client; use `migrate deploy` instead in any shared/non-local environment — see
   Migrations below).
4. Create the `kondo-assets` bucket in your Supabase project's Storage tab (public
   read access) if it doesn't already exist.
5. `npm run dev` — the Next.js app on <http://localhost:3000>.
6. In a **second terminal**, `npm run worker` — without this running, Analyse Site will
   enqueue a job that never gets picked up and the client will sit at "Analyzing"
   forever. This is the single most common "why isn't anything happening" issue in local
   dev.

Self-signup is disabled by design (see the security checklist) — create your own user
directly in the Supabase dashboard (Authentication → Users → Add user) to log in locally.

## Migrations

`prisma/migrations/` is the source of truth for the schema. Locally, `npx prisma migrate
dev` both creates new migrations from schema changes and applies them. In production,
migrations are applied automatically by the `migrate-deploy` job in
`.github/workflows/ci.yml` on every push to `main` — neither the Vercel build (`npm run
build`, which only runs `prisma generate`) nor the Railway worker build touch the schema,
so there's exactly one place a schema change actually reaches the database. That job needs
a `PRODUCTION_DIRECT_URL` repository secret set in GitHub (Settings → Secrets and
variables → Actions) — see the security checklist's "New GitHub secret this round".

## Templates

Landing-page templates live in `lib/templates/<key>/` (currently `atlas`, `ledger`,
`showcase`) — each is a plain string-builder (`render<Name>`) that takes the shared
`TemplateContent` shape (`lib/templates/types.ts`) and returns HTML + CSS, not a React
component (react-dom/server can't be used in Next's Server Component/Action module graph).
`lib/templates/registry.ts` is where a new template gets registered and scored for
suitability against a given client's content.

## Testing

`npm run test` runs [Vitest](https://vitest.dev) against `**/*.test.ts` (also run in CI).
Deliberately scoped to pure, deterministic logic only — URL normalization, the
page-selection budget, template rendering, and the SSRF IP-blocklist — not server actions
or pages, which would need Prisma/Supabase/Anthropic mocked from scratch. This is real
but partial coverage: the async pipeline (crawl → extract → structure) and every server
action are untested. Extend `vitest.config.mts`'s scope as that becomes worth the
mocking investment.

## Known limitations

- **English-language sites only.** Several content-extraction heuristics
  (`lib/content/content-guards.ts`'s team/stat detection) are English-language regex
  patterns. A non-English client site can come back with thinner extraction (empty team/
  stat sections even when the site has real content) — not a crash, just weaker results.
  Not fixed because JRNY's client base is English-language businesses; revisit if that
  changes.

## Useful scripts

- `npm run worker` — run the background worker locally, loading `.env`.
- `npm run check-extraction` — a manual diagnostic that re-runs the Claude structuring
  call against a client's already-crawled pages in the database, for debugging extraction
  quality. Costs real Anthropic spend; never run in CI.
- `npm run lint` — ESLint.

## Deploying

- **Vercel**: standard zero-config Next.js deploy. Set Production-scoped env vars
  (`DATABASE_URL`, `ANTHROPIC_API_KEY`, the Upstash pair, etc.) — see the security
  checklist for which should stay out of Preview/Development. Enable Deployment
  Protection on previews.
- **Railway** (or Fly/Render/a small VM): deploy `scripts/worker.ts` as a standalone
  process using `railway.toml`'s build/start commands, or replicate them manually
  elsewhere. Confirm both `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SECRET_KEY` are set
  there specifically — it's a separate environment from Vercel's and doesn't inherit
  those vars automatically.
- **CI** (`.github/workflows/ci.yml`): lint, build, a bundle grep for leaked secret
  patterns, an `npm audit` gate, and (on push to `main` only) the migration deploy.

Before inviting anyone beyond the core team, work through
[SECURITY-CHECKLIST.md](./SECURITY-CHECKLIST.md) in full.
