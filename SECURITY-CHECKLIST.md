# Pre-launch checklist — things only you can do

Everything code-level from `security-requirements.md` is implemented and verified (see
the summary at the bottom). This file is the remainder: dashboard clicks, account setup,
and deployment steps that need your access, not mine. Go through it in order — don't
invite colleagues until every item under "Before anyone logs in" is done.

## New environment variables this round

Set these in Vercel (Production environment) and in `.env` for local dev:

| Variable | Required for | Where to get it |
|---|---|---|
| `UPSTASH_REDIS_REST_URL` | Rate limiting, daily spend ceiling (Section 4) | Upstash console, after creating a Redis database |
| `UPSTASH_REDIS_REST_TOKEN` | Same | Same |

**Without these, rate limiting and the spend ceiling are silently disabled** (the app
still runs — it fails open with a `console.warn` — but there's no protection against a
runaway loop or one user flooding the queue). Do this before real client work starts.

Setup: [console.upstash.com](https://console.upstash.com) → create a Redis database
(the free tier is enough to start) → copy the REST URL and token from the database's
detail page.

No new secret was needed for MFA recovery — it reuses your existing `DATABASE_URL`.

## Before anyone logs in

- [ ] **Disable self-signup.** Supabase Dashboard → Authentication → Providers → Email
  → turn off "Allow new users to sign up." You're likely already here since you create
  accounts manually — this just makes it explicit and permanent.
- [ ] **Wire the Before User Created hook.** Dashboard → Authentication → Hooks →
  Before User Created → select `hook_restrict_signup_by_email_domain` (created by
  migration `20260728000002_signup_domain_restriction`). **Test it**: attempt signup
  with a personal Gmail address and confirm it's rejected. I verified the function's
  logic directly against the database (allows `@jrnydigital.com.au`, rejects
  `gmail.com`, rejects the `attacker@jrnydigital.com.au.evil.com` suffix-evasion
  attempt) but could not test it through Supabase's actual signup flow — verify the
  hook's event/response shape still matches what's wired up, since Supabase versions
  this.
- [ ] **Confirm MFA is what you want, and know what happens on first login.** MFA is
  now mandatory for everyone (Sections 1 + your explicit ask) — the middleware and
  every server action/API route independently require AAL2, not just a password. This
  means **the next time anyone (including you) logs in, they'll be forced into
  `/mfa` to scan a QR code with an authenticator app** before reaching anything else.
  This is intended, not a bug — just don't be surprised by it. I could not complete a
  real end-to-end TOTP verification myself (no authenticator app available in this
  environment) — the enrollment screen (QR code, manual secret fallback, verify form)
  is confirmed rendering and functioning correctly via live testing, including
  recovering cleanly from an abandoned/incomplete enrollment attempt, but **you should
  personally complete one real enrollment and confirm login works end-to-end** before
  rolling this out to colleagues.
- [ ] **Set up Upstash** (see table above) so rate limiting is actually active.
- [ ] **Deploy the background worker.** The whole pipeline (crawl, Call 0/1/2) now runs
  as a queued job a separate process picks up — `npm run worker`, deployed to Railway,
  Fly, Render, or a small VM, alongside the Vercel app. It needs:
  - The same `DATABASE_URL` and `ANTHROPIC_API_KEY` as the main app.
  - Playwright's Chromium installed on that host: `npx playwright install --with-deps chromium`.
  - Nothing else — it's a plain `node`/`tsx` process, no Next.js runtime needed.
  Verify it's actually running before relying on it: enqueue a real audit and confirm
  the client's status progresses past `AUDITING`.
- [ ] **Vercel Deployment Protection on preview deployments.** Project Settings →
  Deployment Protection → Vercel Authentication (SSO) — or password protection as the
  weaker fallback. Without this, every PR publishes a working, unauthenticated copy of
  the tool at a guessable-adjacent URL.
- [ ] **Scope environment variables correctly.** Production secrets (`ANTHROPIC_API_KEY`,
  `DATABASE_URL`, the Upstash pair) should be set for the Production environment only,
  not exposed to Preview/Development in Vercel's env var settings — preview builds run
  untrusted branch code.
- [ ] **Set an Anthropic billing alert.** [console.anthropic.com](https://console.anthropic.com)
  → billing → usage alerts. Independent of the app's own rate limiting, so it still
  fires if there's a bug in that accounting.
- [ ] **Enable GitHub secret scanning + push protection.** Repo Settings → Code security
  → both toggles on. The CI workflow (`.github/workflows/ci.yml`) also greps the built
  bundle for secret patterns on every push — this is the second layer, not the only one.

## Within the first fortnight

- [ ] **Verify RLS on every table, individually.** Prisma connects via a direct Postgres
  connection (`DATABASE_URL`), not through Supabase's PostgREST layer — confirmed this
  session that 100% of the app's own data access goes through Prisma, never the
  Supabase JS client for data queries. This means RLS policies don't protect the app's
  *own* queries; they're a backstop if the `anon`/`authenticated` keys are ever used
  directly against a table (a leaked key, a debugging script, a future feature). Worth
  doing regardless, but know what it does and doesn't cover here.
- [ ] **Least-privilege database role for the app connection.** Check what Postgres
  role your `DATABASE_URL` actually connects as — if it's the default `postgres`
  superuser-equivalent, it bypasses RLS entirely regardless of policies (superusers and
  table owners aren't subject to RLS unless `FORCE ROW LEVEL SECURITY` is set). Consider
  a dedicated role with only the grants Prisma actually needs.
- [ ] **Test a backup restore** to a scratch Supabase project. An untested backup is a
  hope, not a backup.
- [ ] **Write an offboarding runbook.** When someone leaves, deleting their Supabase
  user needs to be a checklist step, not something remembered. One line: "Dashboard →
  Authentication → Users → delete."
- [ ] **Consider a genuinely separate origin for previews.** The current fix (a strict
  `Content-Security-Policy: sandbox` header) makes the browser treat generated-site
  previews as an opaque origin even though they're served from the same domain —
  verified live that this blocks cookie access, localStorage, and same-origin fetch
  from a script embedded in generated content. This is a real, working mitigation, but
  a literal separate domain/Vercel project remains the more robust structural fix the
  original doc recommended. Worth doing once you have bandwidth to stand up a second
  project.
- [ ] **Retention policy for generated sites and crawled content.** You're storing
  screenshots and copy belonging to client businesses indefinitely. Decide a window.

## Post-launch smoke tests (do these yourself, once deployed)

- [ ] Point the crawler at a client site, then separately confirm it refuses
  `http://169.254.169.254/latest/meta-data/` if you want to re-confirm in your actual
  production environment (already verified live in dev this session, including at the
  actual Playwright navigation level — should carry over, but Vercel's network
  environment could differ from local dev).
- [ ] Attempt signup with a personal Gmail address, confirm rejection with a clear
  message (this is the Before User Created hook test above, repeated as a formal
  post-launch check).
- [ ] Log in as yourself and confirm the MFA challenge actually blocks access without
  the correct code — try an intentionally wrong code first.
- [ ] Open a generated preview and confirm the page renders correctly (the CSP sandbox
  shouldn't break normal rendering, only cross-origin-style access from scripts) — check
  browser console for any unexpected CSP violations on real generated output, since my
  testing used a hand-written test page, not real Call 2 output.

## What's already done and verified this round

Auth: three-layer domain restriction (self-signup disabled is dashboard-only above;
Before User Created hook SQL written and logic-tested; app-level `endsWith` check on
every request), `getUser()` not `getSession()` everywhere, mandatory MFA (AAL2) enforced
in middleware and independently in every server action/API route, audit trail logging
login/client-created/client-deleted/generation-started/brief-approved/spec-approved/
export-downloaded to a new `AuditLog` table.

App-specific risks: SSRF blocklist (RFC1918, link-local/cloud-metadata, loopback) with
per-request redirect re-validation via Playwright interception, verified live against
the actual metadata IP; generated-preview isolation via CSP sandbox, verified live that
cookie/localStorage/same-origin-fetch are all blocked.

Secrets: bundle grepped for secret patterns in CI on every push; confirmed no
`NEXT_PUBLIC_*` leaks and no service-role key anywhere in the codebase.

Rate limiting: per-user hourly/daily generation limits, per-user crawl limit, a global
daily job ceiling, and a per-user concurrency cap — all via Upstash (not yet active
until you set the env vars above) plus a Postgres-backed concurrency check (active now,
no dependency).

Input handling: Zod schemas validating the two review-screen JSON textareas exhaustively
(not just top-level keys), length caps on free-text fields, path-traversal boundary fix
on the preview/export routes.

Database: no raw SQL injection surface found; the one new raw query (MFA cleanup) is
parameterized, not string-interpolated.

Platform: security headers (HSTS, nosniff, X-Frame-Options, Referrer-Policy, CSP) on the
main app, verified live with no console errors and no broken functionality; no wildcard
CORS anywhere in the app.

Logging: audited — nothing logs full prompts, generated HTML, or crawled content; the
one line that logs a slice of generated JSON is gated behind a debug env var that won't
be set in production.

Dependencies: `npm audit` — the dev-tooling vulnerability chain (prisma/find-my-way/
valibot) fixed via `npm audit fix`; Next.js/postcss/sharp upgraded to the latest
available patch (16.2.12) fixing several real advisories including an SSRF-in-Server-
Actions issue directly relevant to this doc. A handful of high-severity findings remain
in `npm audit`'s output for postcss/sharp bundled inside `next` itself — I checked and
16.2.12 is genuinely the latest stable release (16.3.0 is still pre-release); the
advisory's version range in npm's database is broader than any real available fix, and
`npm audit fix --force`'s suggested "fix" is to downgrade to `next@9.3.3`, which would
be actively harmful. Re-check this if a newer Next.js patch ships.
