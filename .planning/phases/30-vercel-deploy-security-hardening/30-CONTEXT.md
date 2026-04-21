# Phase 30: Vercel Deploy + Security Hardening - Context

**Gathered:** 2026-04-21
**Status:** Ready for planning
**Mode:** `--auto` (recommended defaults selected)

<domain>
## Phase Boundary

Ship Centik to production on Vercel with Prisma Postgres, security headers (CSP + HSTS + X-Frame-Options + X-Content-Type-Options + Referrer-Policy + Permissions-Policy), a production-only seed script, boot-time validation of all required production env vars, and an extended cross-user isolation test suite that proves Phase 27's per-user filter discipline holds across every entity (including `MonthlySummary` / history) AND across every Server Action mutation path.

Requirements delivered: ISOL-05, DEPLOY-01, DEPLOY-02, DEPLOY-03, DEPLOY-04, TEST-03.

Out of scope (deferred to v4.x or later phases): CI/CD pipeline beyond Vercel's git-integration default, monitoring/alerting beyond Vercel's built-in logs, custom domain + DNS automation, multi-region / edge runtime, log aggregation (Datadog/Sentry), uptime monitoring (Better Uptime / Pingdom), automated dependency scanning, WAF/Cloudflare in front of Vercel.

</domain>

<decisions>
## Implementation Decisions

### Prisma Postgres Provisioning (DEPLOY-01)
- **D-01:** Provision via the **Vercel Marketplace Prisma Postgres integration** (not external Neon/Supabase). The integration auto-injects three env vars at deploy time: `DATABASE_URL` (pooled, runtime), `POSTGRES_PRISMA_URL` (pooled, alias for Prisma adapter), `POSTGRES_URL_NON_POOLING` (direct, migrations). Single source of truth; no manual provisioning to forget.
- **D-02:** Update `src/lib/prisma.ts` only minimally — it already uses `@prisma/adapter-pg` with `process.env.DATABASE_URL`. Vercel's Prisma Postgres injects DATABASE_URL as the **pooled** connection string in serverless runtime, so no code change strictly required. Document the env-var contract in `.env.example` so the runtime lookup is explicit.
- **D-03:** Migrations and the production seed use `POSTGRES_URL_NON_POOLING` (the direct connection) — pooled connection's transaction-mode pgbouncer is incompatible with migrations. Override locally via `DIRECT_URL=$POSTGRES_URL_NON_POOLING npx prisma migrate deploy` OR add a `DIRECT_URL` field to `prisma/schema.prisma` `datasource db { directUrl = env("DIRECT_URL") }` and set it in Vercel env vars.
- **D-04:** No connection-pool tuning beyond Vercel-Prisma-Postgres defaults in this phase. Pool size + idle timeout get attention only if the first production deploy shows latency. Premature tuning otherwise.

### Security Headers (DEPLOY-02)
- **D-05:** Set headers in **two places** (CSP in middleware for nonce, everything else in `next.config.ts` `headers()`):
  - `next.config.ts` → static headers: `Strict-Transport-Security`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`. These never change per request, so static config is correct.
  - `src/proxy.ts` (existing auth middleware) → extend to set `Content-Security-Policy` with a per-request `nonce`. Generate `nonce = crypto.randomBytes(16).toString('base64')`. Inject `nonce` into the request via `request.headers.set('x-nonce', nonce)` so Server Components can read it via `headers()` and pass to `<Script nonce={nonce}>` if any inline scripts are needed (Next.js 16 supports this pattern).
- **D-06:** **CSP policy** (strict, but pragmatic for a Next 16 + Tailwind v4 + Recharts app):
  - `default-src 'self'`
  - `script-src 'self' 'nonce-{nonce}' 'strict-dynamic'` (no unsafe-inline; nonce gates any inline scripts; strict-dynamic lets nonce'd scripts load others)
  - `style-src 'self' 'unsafe-inline'` (Tailwind v4 emits inline styles; nonce on style is brittle in Next 16 — accept inline styles as the trade-off, document the rationale)
  - `img-src 'self' data: blob:` (data: URLs needed for QR codes from Phase 29; blob: needed for the backup-codes "download .txt" feature)
  - `font-src 'self' data:` (next/font subset emission inlines fonts as data URIs)
  - `connect-src 'self' https://*.upstash.io` (Upstash Redis REST API is the only external connect target — rate limiter)
  - `frame-ancestors 'none'` (matches X-Frame-Options: DENY; defense-in-depth)
  - `base-uri 'self'`
  - `form-action 'self'`
  - No `report-uri` / `report-to` in this phase (Vercel logs sufficient for v3.0; revisit if violations appear)
- **D-07:** **HSTS:** `max-age=63072000; includeSubDomains; preload` (2 years, subdomain coverage, preload-list eligible). Only emit in production (`NODE_ENV === 'production'`) to avoid breaking local dev where http://localhost:3000 cannot upgrade.
- **D-08:** No `Cross-Origin-Opener-Policy` / `Cross-Origin-Embedder-Policy` in this phase — they have low blast-radius for a single-page financial app and would trip third-party iframes if ever added. Out of scope.

### Production Seed Strategy (DEPLOY-03)
- **D-09:** Create a NEW file `prisma/seed.prod.ts` distinct from the dev `prisma/seed.ts`. Production seed creates ONLY the admin user — no demo categories, no demo transactions, no demo debts. Reads `ADMIN_EMAIL` + `ADMIN_PASSWORD` from env (fails fast if either is missing), hashes with bcrypt cost 12, upserts to `User` with `isAdmin: true, isApproved: true, totpEnabled: false`.
- **D-10:** Production seed is **idempotent** (upsert-by-email semantics) but **does not** reset password if the user already exists. Re-running `npm run db:seed:prod` on an existing admin user is a no-op — protects against accidental password rotation via re-seed.
- **D-11:** Add `package.json` scripts: `"db:seed:prod": "tsx prisma/seed.prod.ts"`. Document in the deploy runbook (see D-22) that this runs ONCE manually after the first deploy via `vercel env pull` + a local one-shot — NOT in the build command. Production should never seed on every deploy.
- **D-12:** Default categories (Comida, Servicios, etc.) are NOT seeded for the admin in production. The admin creates them via `/configuracion` after first login OR via a documented one-time admin tool. Rationale: the production app is invite-only and each user creates their own categories; pre-seeding would create global-looking but actually admin-scoped categories that confuse the model.

### Vercel Project Config (DEPLOY-04)
- **D-13:** Use Vercel's **Project Settings UI for env vars** (not `vercel.json`). Env vars: `AUTH_SECRET`, `AUTH_TOTP_ENCRYPTION_KEY`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`. The `DATABASE_URL` / `POSTGRES_PRISMA_URL` / `POSTGRES_URL_NON_POOLING` / `DIRECT_URL` come from the Prisma Postgres integration (D-01).
- **D-14:** Add a minimal `vercel.json` ONLY if needed (functions config, regions). For v3.0 default Vercel detection of Next.js 16 should suffice — start with no `vercel.json`. If the build needs region pinning (Mexico → `iad1` US East default OR `sfo1` US West) document in deploy runbook but keep it as a CLI/UI setting unless Vercel's default isn't acceptable.
- **D-15:** **Build command** in Vercel: `npx prisma migrate deploy && next build`. This runs `migrate deploy` (idempotent — only applies pending migrations) before every build. No risk on no-pending-migrations builds; new migrations land at deploy time. If a migration fails, the build fails — ideal fail-fast behavior.
- **D-16:** **Install command** in Vercel: leave default (`npm install`). `postinstall` already runs `prisma generate` — Prisma Client gets regenerated on every install. No change needed.
- **D-17:** **Output directory** in Vercel: leave default. Next.js 16 standard.

### Boot-Time Env Validation (cross-cutting safety net)
- **D-18:** Create `src/lib/env.ts` — a single module that validates ALL production-required env vars at boot. Exports a `validatedEnv` object (typed) and runs validation **on first import**. Any missing or malformed required var throws immediately, preventing the app from ever serving traffic with bad config. Runtime cost: one synchronous check at cold start, then memoized.
- **D-19:** Validation rules:
  - `NODE_ENV` — required, one of `development|test|production`
  - `DATABASE_URL` — required (any non-empty string; format-checking left to Prisma)
  - `AUTH_SECRET` — required, minimum 32 chars (NextAuth requirement)
  - `AUTH_TOTP_ENCRYPTION_KEY` — required, exactly 64 hex chars (32 bytes for AES-256)
  - `ADMIN_EMAIL` — required for the seed script (validated when seed module loads, not on every cold start)
  - `ADMIN_PASSWORD` — same as above; minimum 12 chars
  - `UPSTASH_REDIS_REST_URL` — required IF `NODE_ENV === 'production'` (dev/test bypass per Phase 29 D-26)
  - `UPSTASH_REDIS_REST_TOKEN` — same conditional
  - `RATE_LIMIT_DISABLED` — optional, only honored when NODE_ENV !== 'production' (safety against accidental prod bypass)
- **D-20:** **Production-only validation:** when `NODE_ENV === 'production'`, also assert that `RATE_LIMIT_DISABLED !== 'true'` — production must NEVER bypass rate limiting. Log a loud error and throw if violated.
- **D-21:** Use this `validatedEnv` from `src/lib/totp-crypto.ts`, `src/lib/rate-limit.ts`, `src/lib/prisma.ts`, `src/auth.ts` — replaces the scattered `process.env.X` lookups with one centralized validated source. Prevents drift.

### Cross-User Isolation Test Expansion (ISOL-05, TEST-03)
- **D-22:** **Extend** the existing `tests/integration/isolation.test.ts` (already covers Transaction/Category/IncomeSource/Debt/Budget/Period) to add:
  - `MonthlySummary` (history) — User B sees zero of User A's monthly summaries
  - `Asset` + `ValueUnit` + `UnitRate` (v1.x stubs) — defense for when v4.0 ships
  - `BackupCode` (Phase 29 addition) — User B cannot enumerate User A's backup-code rows via any query path
- **D-23:** **Create** a NEW file `tests/integration/isolation-actions.test.ts` that exercises Server Actions defense-in-depth:
  - For each mutation Server Action (`createTransactionAction`, `updateTransactionAction`, `deleteTransactionAction`, `createDebtAction`, etc. — at least one CRUD path per entity), call the action with User A authenticated targeting User B's row id. Expect either explicit error OR silent no-op. NEVER expect successful mutation.
  - Verify the IDOR-protection pattern from Phase 27 D-IDOR (`findFirst({ where: { id, userId } })` pre-check) holds for every action.
  - Critical for `disableTotpAction` and `regenerateBackupCodesAction` (Phase 29) — these MUST be scoped by current session userId, not by request param.
- **D-24:** Pages do NOT need a separate isolation test file — Phase 27 already established the `auth() + connection() + lib(userId)` chain at the page level. The mutation surface (D-23) is where IDOR risk concentrates.
- **D-25:** Test data: each isolation test seeds two real users (User A + User B) in a `beforeAll`, creates representative data for User A, asserts User B's queries return zero. Use the `tests/setup.ts` Prisma helper. Truncate test DB between test files (existing pattern in `tests/integration/`).
- **D-26:** Acceptance: ALL existing integration tests still pass; `tests/integration/isolation.test.ts` adds 3 new entity tests; `tests/integration/isolation-actions.test.ts` covers ≥1 mutation per entity (10+ test cases). Both files run in `npm run test:integration` and exit 0.

### Smoke Tests Post-Deploy
- **D-27:** Create `30-VERIFICATION.md` in the phase dir with a manual smoke checklist for the operator (single admin) to run AFTER the first production deploy:
  1. Visit production URL → redirected to /login (proxy.ts works in prod)
  2. Login with admin email + password → land on dashboard
  3. Create a transaction → appears in list, KPIs update
  4. Navigate to /configuracion → "Activar 2FA" visible
  5. Enable 2FA, scan QR with real authenticator app, save backup codes
  6. Logout → land on /login
  7. Login again → land on TOTP step → enter code → land on dashboard
  8. Logout → login with backup code (replaces TOTP for one attempt) → success
  9. Inspect response headers via `curl -I` → CSP, HSTS, X-Frame-Options, etc. all present
  10. Hit login form 6 times rapidly with wrong password → 6th attempt shows generic error (rate limit fired) — REAL Upstash test
  11. Generate an invite token, paste URL into a fresh browser, register a second user, log in as User B, verify zero access to User A's data via the UI
- **D-28:** Smoke checklist is part of the phase verification artifact, NOT automated. Playwright E2E covers part of this (Phase 29 happy path), but the full checklist requires a real authenticator phone + real Upstash + production env, which can't be reliably automated in agent runtime.

### Logs / Observability
- **D-29:** Use Vercel's built-in deployment logs + function logs as the v3.0 observability surface. No custom logger, no Sentry, no Datadog this phase. Document the dashboard URL in the deploy runbook.
- **D-30:** Add a runtime warning: if `NODE_ENV === 'production'` AND `process.env.DEBUG` is set, log a single warning at boot (`console.warn('DEBUG should not be set in production')`). Cheap guardrail against forgotten env vars.
- **D-31:** Confirm the existing grep gates from Phase 29 still hold: no `console.log` in `src/lib/totp-crypto.ts`, `src/lib/backup-codes.ts`, `src/lib/challenge.ts`, `src/app/(app)/configuracion/totp-actions.ts`, `src/actions/auth.ts`. Phase 30 adds: no `console.log` in `src/lib/env.ts` (validation errors must throw, not log).

### Carried Forward (locked, do not re-decide)
- JWT 30d (Phase 26); bcryptjs cost 12 (Phases 25, 26, 28); `requireAuth()` mandatory (Phase 27 / CVE-2025-29927); `connection()` on every (app) page (Phase 27); ambiguous error messages (Phases 26, 28, 29); npm not pnpm (memory); Spanish UI; Lucide icons only; files <300 lines; functions <50 lines.
- Phase 29 Open-Question RESOLVED choices stand: TOTP `totpEnabled` is read from DB on every login (NOT denormalized into JWT), HMAC challenge token (NOT cookie), zero DB writes in `prepareTotpSecretAction`.
- BackupCode model exists; cross-user isolation already proven for Phase 29's backup codes in `tests/integration/totp.test.ts` (extending it is the easy delta).
- Prisma adapter is `@prisma/adapter-pg` (Vercel-Postgres-compatible).

### Claude's Discretion (downstream agents may choose)
- Exact CSP header string formatting (line-wrapping vs single line in middleware code)
- Whether `vercel.json` ends up needed (start without; add only if defaults are insufficient)
- Whether to add `prisma/migrations.test.ts` to assert all migrations apply cleanly to a fresh DB (nice-to-have, not required by acceptance)
- Plan-file split (1 schema + 1 headers + 1 seed + 1 vercel + 1 isolation OR fewer larger plans — planner's call)
- Whether `validatedEnv` is a named export `env` or default export — pick the more readable one
- Exact text/order of the smoke checklist in 30-VERIFICATION.md (the items in D-27 are the floor, not the ceiling)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Specs
- `.planning/REQUIREMENTS.md` §Vercel Deploy + Security — DEPLOY-01..05 (DEPLOY-05 already complete) + ISOL-05 + TEST-03
- `.planning/ROADMAP.md` §Phase 30 — goal + success criteria
- `.planning/PROJECT.md` §Constraints + §Key Decisions — npm/Spanish/Lucide/file-size rules

### Prior Phase Decisions (carry-forward)
- `.planning/phases/27-per-user-data-isolation/27-CONTEXT.md` — `requireAuth()` discipline, IDOR `findFirst({ where: { id, userId } })` pattern, `connection()` placement, isolation.test.ts pattern (extended here)
- `.planning/phases/29-totp-two-factor-authentication/29-CONTEXT.md` — D-26 dev/test rate-limit bypass; AES-256-GCM key format (64 hex); HMAC challenge; Upstash env vars
- `.planning/phases/29-totp-two-factor-authentication/29-RESEARCH.md` — Open Question 7 RESOLVED (`getClientIp` co-located in rate-limit.ts); Upstash REST library shape
- `.planning/phases/26-auth-wiring-login/26-CONTEXT.md` — JWT 30d; AUTH_SECRET role; signIn redirect discipline

### Codebase
- `next.config.ts` — currently empty; add `headers()` per D-05/D-06
- `src/proxy.ts` — extend to set CSP nonce + invoke headers chain
- `src/lib/prisma.ts` — already adapter-pg; verify env-var contract per D-01..D-03
- `prisma/schema.prisma` — add `directUrl = env("DIRECT_URL")` to `datasource db {}` per D-03
- `prisma/seed.ts` — keep as dev seed; do NOT modify
- `prisma/seed.prod.ts` — NEW per D-09..D-12
- `src/lib/env.ts` — NEW per D-18..D-21
- `src/lib/rate-limit.ts` — already short-circuits on `RATE_LIMIT_DISABLED || NODE_ENV !== 'production'`; refactor to consume `validatedEnv`
- `src/lib/totp-crypto.ts` — refactor to consume `validatedEnv` instead of raw `process.env`
- `src/auth.ts` — verify AUTH_SECRET via validatedEnv; Auth.js v5 reads it directly but the validator surfaces the failure earlier
- `tests/integration/isolation.test.ts` — extend per D-22
- `tests/integration/isolation-actions.test.ts` — NEW per D-23
- `package.json` — add `db:seed:prod` script per D-11; possibly update `build` script (Vercel build command override is preferable per D-15)
- `.env.example` — add UPSTASH_* (already added in Phase 29) + DATABASE_URL contract docs (POSTGRES_PRISMA_URL, POSTGRES_URL_NON_POOLING, DIRECT_URL alias) + DEBUG-must-not-be-set comment

### External Docs
- Vercel Prisma Postgres docs — https://vercel.com/docs/storage/vercel-postgres
- Next.js 16 security headers + middleware — https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy
- OWASP Secure Headers Project — informational reference for header values
- Upstash rate-limit production setup — already cited in Phase 29 RESEARCH

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/proxy.ts` — already a NextAuth-aware middleware; extending it to set CSP nonce + headers requires ~20 lines (don't create a second middleware)
- `src/lib/prisma.ts` — already uses `@prisma/adapter-pg` with explicit `connectionString` from env; works with Vercel Prisma Postgres without code changes (DATABASE_URL is the pooled URL in serverless)
- `tests/integration/isolation.test.ts` — full pattern for two-user setup; just add new `it('User B sees zero monthly summaries')` blocks
- `tests/integration/totp.test.ts` (Phase 29) — proves cross-user-mutation defense works for backup-code consumption; copy that pattern for the new isolation-actions.test.ts
- `tests/setup.ts` + `vitest.integration.config.mts` — test-DB infra (port 5433); no changes needed
- `prisma/seed.ts` — pattern reference for `seed.prod.ts` (admin upsert with bcrypt-12)

### Established Patterns
- Server Actions: `'use server'` at top, `requireAuth()` first line, Zod validation, `findFirst({ where: { id, userId } })` IDOR pre-check, `prisma.$transaction([...])` for multi-table writes
- Pages: `await connection()` first line, `await auth()` for session, pass `userId` to lib functions
- Validators: Zod with Spanish locale already configured in `src/lib/validators.ts`
- Hash-before-`$transaction` (bcrypt cost-12 must not pin a DB connection)
- NEXT_REDIRECT re-throw discipline (catch AuthError only)

### Integration Points
- `next.config.ts` — exports `nextConfig.headers` async function with array of `{ source: '/:path*', headers: [...] }`
- `src/proxy.ts` — extend the existing `auth()` wrapper; add `nonce` generation + `request.headers.set('x-nonce', nonce)` + `response.headers.set('Content-Security-Policy', cspString)` AFTER the existing redirect logic. Do NOT break Phase 26's redirect behavior.
- `prisma/schema.prisma` `datasource db` block — add `directUrl = env("DIRECT_URL")` per D-03
- `package.json` `scripts` — add `db:seed:prod`
- `.env.example` — append production-env contract section
- All lib modules currently doing `process.env.X` — refactor to import `validatedEnv` (sweep)
- New test files in `tests/integration/`
- Optionally a new `vercel.json` (start without — D-14)

### Notes for the Researcher
- Confirm Vercel Prisma Postgres injects exactly the env vars listed in D-01 (DATABASE_URL, POSTGRES_PRISMA_URL, POSTGRES_URL_NON_POOLING) — versions of the integration have varied; check current docs.
- Confirm Next.js 16 middleware's CSP-nonce pattern — the docs URL above is the canonical source. Verify the exact `request.headers.set` + `response.headers.set` API.
- Confirm `prisma migrate deploy` in Vercel build command is idempotent and does not require a TTY (it doesn't — but worth a citation).
- Confirm the Vercel Prisma Postgres integration creates `DIRECT_URL` automatically OR if the developer must set it manually (reflects D-03's wording).
- Check if `@prisma/adapter-pg` v latest needs any change for Vercel Postgres specifically (it doesn't, but cite the docs).

</code_context>

<specifics>
## Specific Ideas

- The deploy must be **boring**. The whole point of Phase 30 is to land Centik on Vercel without surprises. Every decision favors the most idiomatic Vercel + Next.js 16 + Prisma Postgres path; no clever workarounds.
- The smoke checklist in 30-VERIFICATION.md is the operator's safety net. It must read like a production runbook, not like test instructions.
- The boot-time env validator (D-18..D-21) is the cross-cutting deliverable that prevents the entire class of "shipped to prod with empty AUTH_SECRET" bugs. It's the most valuable item in this phase even though it's not in any acceptance criterion verbatim.
- Cross-user isolation expansion (D-22..D-26) is the second-most-valuable: it catches the regression risk that all the per-user-userId discipline of Phases 27-29 quietly broke somewhere. Treat it as a gate, not a checkbox.

</specifics>

<deferred>
## Deferred Ideas

- CI/CD beyond Vercel git-integration — Phase 30 ships via push-to-main; GitHub Actions for unit/integration tests on PR is a v4.x phase
- Sentry / Datadog / structured logging beyond Vercel built-in — v4.x
- Custom domain + DNS automation — manual via Vercel UI for v3.0
- Multi-region / edge runtime — `node:crypto` requires Node runtime; edge migration is a separate phase
- WAF / Cloudflare in front of Vercel — out of scope; Vercel's DDoS + Upstash rate limit are sufficient for v3.0
- Automated dependency scanning (Dependabot, Snyk) — v4.x
- Uptime monitoring (Better Uptime, Pingdom) — v4.x
- Backup/restore strategy for Prisma Postgres — Vercel handles snapshots; document recovery procedure when first incident demands it
- Audit log of admin actions (invite generation, 2FA disable, etc.) — v4.x; document as a recommended future hardening
- Email delivery for invites (currently admin sends URL manually per Phase 28) — v4.x
- Password reset flow — explicitly out of scope (admin resets via DB / seed)
- Per-IP geographic / device fingerprint heuristics — v4.x
- COOP/COEP headers — low ROI for single-page financial app; revisit if 3rd-party iframes added
- CSP report-uri / report-to — Vercel logs sufficient for v3.0; add when violations appear

</deferred>

---

*Phase: 30-vercel-deploy-security-hardening*
*Context gathered: 2026-04-21*
*Mode: --auto (recommended defaults)*
