# Phase 30 — Verification & Deploy Runbook

**Written:** 2026-04-22 (Plan 30-06)
**Scope:** First-time Vercel production deploy of Centik v3.0 — operator runbook + 11-item post-deploy smoke checklist + HSTS preload submission + known post-deploy watch-items + rollback plan.
**Automation status:** Code is fully tested (710 unit + 71 integration green). The deploy itself and the 11-item smoke checklist are **manual by design** (D-28) — they require real Vercel provisioning, real Upstash credentials, a real authenticator app, and a real production DB that cannot be reliably automated from an agent runtime.
**Audience:** The operator executing the first production deploy. Read top-to-bottom; no prior Claude context required.
**Prerequisite:** Plans 30-01 through 30-05 are merged to `main`. This runbook assumes that baseline.

---

## 1. Pre-Deploy Prep

### 1.1 Local Automated Quality Gate (must be green BEFORE deploying)

Before touching Vercel, confirm the code baseline is green on your workstation:

```bash
npm run quality && npm run test:integration
```

Expected: both commands exit 0. `npm run quality` chains build + lint + format:check + unit tests. `npm run test:integration` runs the 8 integration files (71 tests) against the local Docker test DB on port 5433.

If either fails, stop here and fix the regression before deploying. Do NOT deploy a red baseline.

What this gate accumulates from Plans 30-01..30-05:
- `src/lib/env.ts` Zod validator — 7 tests, 100% coverage (30-02)
- `src/lib/prisma.ts` / `totp-crypto.ts` / `rate-limit.ts` / `challenge.ts` / `src/auth.ts` all consume the validated `env` export (30-02 consumer sweep)
- `next.config.ts` static security headers + prod-only HSTS (30-03)
- `src/proxy.ts` per-request CSP nonce + `x-nonce` request header injection (30-03)
- `prisma/seed.prod.ts` admin-only idempotent seed, no password rotation (30-04)
- `tests/integration/isolation.test.ts` 12 read-isolation tests (30-05)
- `tests/integration/isolation-actions.test.ts` 11 mutation-IDOR tests (30-05)
- `tests/integration/isolation-actions-totp.test.ts` 2 session-scope TOTP tests (30-05)

### 1.2 Vercel Account + Project Setup

1. Sign in to https://vercel.com.
2. Create a new Project: **Add New** → **Project** → import from GitHub (`FReptar0/centik`).
3. On the import screen, **do not deploy yet** — click the framework detection (Next.js) and continue, but stop before the first build. You still need to set env vars and override the build command (§1.4, §3).

### 1.3 Generate Secrets Locally

Generate the cryptographic secrets before opening the Vercel env-var UI. Paste them into the UI — do NOT commit them anywhere.

```bash
# AUTH_SECRET — minimum 32 chars, use 48 bytes for margin
openssl rand -base64 48

# AUTH_TOTP_ENCRYPTION_KEY — exactly 64 hex chars (32 bytes for AES-256-GCM)
openssl rand -hex 32
```

Both values are one-time — record them in a password manager. Rotating either requires a re-deploy AND (for `AUTH_TOTP_ENCRYPTION_KEY`) would invalidate every existing user's TOTP secret, breaking 2FA logins.

### 1.4 Environment Variables to Set in Vercel Project Settings

Navigate to **Project** → **Settings** → **Environment Variables**. Set the following with scope **Production** (add to Preview too only if you intentionally want previews hitting the same DB — usually not recommended).

Required — deploy will fail (via `src/lib/env.ts` Zod superRefine) if any of these are missing in production:

| Variable | Source | Example / Notes |
| -------- | ------ | --------------- |
| `AUTH_SECRET` | Generated via `openssl rand -base64 48` (§1.3) | 64+ chars |
| `AUTH_TOTP_ENCRYPTION_KEY` | Generated via `openssl rand -hex 32` (§1.3) | exactly 64 hex chars |
| `ADMIN_EMAIL` | Your production admin email | e.g. `fmemije00@gmail.com` |
| `ADMIN_PASSWORD` | Your production admin password | minimum 12 chars; bcrypt cost-12 hashed by `prisma/seed.prod.ts` |
| `UPSTASH_REDIS_REST_URL` | Upstash Console after provisioning (§2.2) | `https://xxx.upstash.io` |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Console after provisioning (§2.2) | long opaque token |
| `DIRECT_URL` | Prisma Postgres Console after provisioning (§2.1) | `postgres://...@db.prisma.io:5432/...` |

Auto-injected by the Vercel Marketplace Prisma Postgres integration (you do NOT set these manually):

| Variable | Who sets it |
| -------- | ----------- |
| `DATABASE_URL` | Vercel Marketplace (pooled connection, hostname `pooled.db.prisma.io`) |
| `POSTGRES_PRISMA_URL` | Vercel Marketplace (alias) |
| `POSTGRES_URL_NON_POOLING` | Vercel Marketplace (alias for direct) |

Must NOT be set in production (either will break the build or emit a runtime warning):

| Variable | Why |
| -------- | --- |
| `RATE_LIMIT_DISABLED` | `src/lib/env.ts` superRefine rejects `RATE_LIMIT_DISABLED=true` when `NODE_ENV=production` (D-20). Build fails with a clear Zod error. |
| `DEBUG` | `src/lib/env.ts` emits `console.warn('DEBUG should not be set in production')` at cold start (D-30). Not blocking, but a sign of misconfiguration. |

---

## 2. Provisioning

### 2.1 Provision Prisma Postgres via Vercel Marketplace

1. In the Vercel dashboard: **Storage** → **Connect Database** → **Prisma Postgres**.
2. Follow the Marketplace flow:
   - Region: `iad1` (US East — closest to Mexico latency-wise with current Vercel defaults)
   - Instance size: Hobby tier is fine for single-admin v3.0 traffic
3. After provisioning, Vercel auto-injects `DATABASE_URL` (the pooled connection, hostname `pooled.db.prisma.io`) into Project → Settings → Environment Variables.
4. Open the Prisma Console (the URL Vercel shows immediately after provisioning). Find the **direct connection string** (hostname `db.prisma.io`, NOT `pooled.db.prisma.io`). Copy the full connection string.
5. Return to Vercel Project Settings → Environment Variables. Paste the direct connection string into the `DIRECT_URL` variable (scope: Production). This is required because `prisma migrate deploy` (run in the build command) cannot go through the pgbouncer pooler — transaction-mode pgbouncer is DDL-incompatible.

### 2.2 Provision Upstash Redis

1. Sign in to https://console.upstash.com.
2. **Create Database** → Redis → Global. Free tier is sufficient for v3.0 — rate-limit writes are low-volume.
3. After creation, go to the database detail page. Copy:
   - **UPSTASH_REDIS_REST_URL** (e.g. `https://xxx.upstash.io`)
   - **UPSTASH_REDIS_REST_TOKEN** (opaque string)
4. Paste both into Vercel Project Settings → Environment Variables (scope: Production).

Note: `src/lib/rate-limit.ts` uses `Redis.fromEnv()` — the Upstash SDK reads `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` from `process.env` directly (not via our `env.ts` wrapper). `src/lib/env.ts` has already validated both vars exist in production via the Zod superRefine.

---

## 3. Deploy Configuration

### 3.1 Override the Build Command

Navigate to **Project** → **Settings** → **Build & Development Settings** → **Build Command** → toggle **Override** and set:

```
npx prisma migrate deploy && next build
```

Why: `prisma migrate deploy` applies any pending migrations to production before `next build` runs. It is idempotent — on subsequent deploys with no pending migrations it exits 0 immediately. On first deploy, it applies the entire migration history against `DIRECT_URL` (configured via `prisma.config.ts` — Plan 30-01).

The `postinstall` script in `package.json` already runs `prisma generate` on every `npm install`, so the Prisma Client is regenerated on every Vercel build. No additional change needed.

### 3.2 Install Command

Leave as default: `npm install`. Centik uses npm (not pnpm — project memory).

### 3.3 Output Directory

Leave as default. Next.js 16 standard.

### 3.4 Framework Preset

Leave as default: `Next.js` (Vercel auto-detects).

### 3.5 Node.js Version

Leave as default (`22.x` at time of writing). Node 20.9+ required for the `crypto.randomUUID()` used in `src/proxy.ts` CSP nonce generation (30-03).

---

## 4. First Deploy

1. Commit your env-var + build-command configuration in the Vercel UI (these persist automatically — they are not in `vercel.json`).
2. `git push origin main` — Vercel auto-deploys on push. Or trigger a redeploy manually from the Vercel dashboard.
3. Watch the build logs in real-time at **Deployments** → [latest] → **Building**. Key milestones:
   - `npm install` — 5–20 seconds; `postinstall` invokes `prisma generate`.
   - `npx prisma migrate deploy` — on first deploy applies every migration; logs each as `Applied migration X`. On subsequent deploys: `No pending migrations to apply`.
   - `next build` — 10–30 seconds; emits 12 routes (including `/login`, `/register`, `/configuracion`, `/api/auth/[...nextauth]`, and 7 app routes under `(app)`).
   - `src/lib/env.ts` runs its Zod validator at module load. If any required production env var is missing or malformed, the build fails with a clear aggregated error listing every failing var. Fix and redeploy.
4. When the build succeeds, Vercel assigns a deploy URL (e.g. `centik.vercel.app` or `centik-<hash>.vercel.app`). The first hit to `/` should 302-redirect to `/login` for an unauthenticated visitor — confirms `src/proxy.ts` is live.

---

## 5. One-Time Admin Seed (Run AFTER First Deploy)

The production admin user is NOT created by the build. Seed it manually, once, after the first successful deploy.

### 5.1 Pull Production Env Vars Locally

From your local checkout of `main`:

```bash
# Link your local checkout to the Vercel project (first time only)
npx vercel link

# Pull production env vars into a gitignored file (writes .env.production.local)
npx vercel env pull .env.production.local
```

`.env.production.local` is already gitignored via the default `.env*.local` pattern in `.gitignore` — confirm before proceeding.

### 5.2 Run the Production Seed

```bash
# Source the production env vars from the pulled file, then run the seed
set -a
source .env.production.local
set +a

npm run db:seed:prod
```

Expected output on first run:

```
Admin user fmemije00@gmail.com created.
```

Expected output on any subsequent re-run (idempotency proof):

```
Admin user fmemije00@gmail.com already exists -- flags verified (password NOT rotated).
```

Per D-10, the seed's `update` branch only touches `{ isAdmin: true, isApproved: true }` — the `hashedPassword` column is NEVER written by an update. This is structurally enforced (not by convention): the `hashedPassword` field appears ONLY inside the `create` branch of the `findUnique-then-branch` pattern.

### 5.3 Verify Login

Navigate to `https://<your-deploy>.vercel.app/login` and log in with `ADMIN_EMAIL` + `ADMIN_PASSWORD`. You should land on the dashboard. If 2FA is not yet enabled, you go straight in; otherwise see §6 item 7 for the two-step flow.

### 5.4 Do NOT Wire the Seed Into CI/CD

Per D-11, `npm run db:seed:prod` is a **one-shot** manual command. Do NOT add it to:
- The Vercel build command (§3.1)
- `postinstall` in `package.json`
- Any GitHub Action
- The `quality` npm script

Re-running on an existing admin is harmless (no-op), but wiring it into automation risks future additions to the seed accidentally writing non-idempotent data.

---

## 6. Smoke Checklist (11 Items — Operator Executes AFTER First Deploy)

Run these 11 items in order against the production deploy URL. Mark pass/fail for each. If any item fails, file a follow-up issue or regression and do NOT promote the deploy to "verified" until resolved.

1. **Unauthenticated redirect.** Visit `https://<your-deploy>.vercel.app` in a fresh browser (or incognito window). Expected: 302 redirect to `/login`. Proves `src/proxy.ts` is operational in prod.
2. **Admin login (pre-2FA).** On `/login`, enter `ADMIN_EMAIL` + `ADMIN_PASSWORD` and submit. Expected: land on dashboard (`/`). KPIs and empty transaction list render.
3. **Create a transaction.** Click the FAB (floating action button, bottom-right). If no categories exist, first go to `/configuracion` → create a category "Comida". Return to dashboard, open the FAB, fill in an EXPENSE of 100.00 MXN under Comida. Submit. Expected: transaction appears in the Movimientos list; dashboard KPIs update with the 100.00 expense.
4. **2FA setup visible.** Navigate to `/configuracion`. Scroll to the **Seguridad** section. Expected: "Activar 2FA" button is visible and enabled.
5. **Enable 2FA + backup codes.** Click "Activar 2FA". Step 1 displays a QR code and a manual secret string. Scan the QR with a real authenticator app (Google Authenticator, 1Password, Authy, Bitwarden, etc.). Enter the current 6-digit code from the app and submit. Step 2 displays 10 backup codes. Click the **Download** button — the browser issues a `.txt` file download (uses a `blob:` URL, allowed by the CSP policy in `src/proxy.ts`). Save the file in your password manager. Expected: 2FA is now enabled; the Seguridad section shows "Regenerar codigos de respaldo" and "Desactivar 2FA" buttons.
6. **Logout.** Click the user menu → Logout (or navigate to `/api/auth/signout`). Expected: redirected to `/login`.
7. **Two-step TOTP login.** Enter `ADMIN_EMAIL` + `ADMIN_PASSWORD` again. After the password step, you land on the TOTP step (not the dashboard). Enter the current 6-digit code from your authenticator. Submit. Expected: land on dashboard.
8. **Backup-code login.** Logout again. Login with email + password. On the TOTP step, enter one of your saved backup codes (format `ab12-cd34` or `ab12cd34` — both accepted; the dash is decorative). Submit. Expected: land on dashboard. The backup code is now consumed (single-use). Re-attempting the same code on a later login MUST fail.
9. **Security headers emission.** From a terminal:
   ```
   curl -sI https://<your-deploy>.vercel.app/login
   ```
   Expected headers (order may vary):
   - `content-security-policy: default-src 'self'; script-src 'self' 'nonce-...' 'strict-dynamic'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https://*.upstash.io; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'; upgrade-insecure-requests`
   - `strict-transport-security: max-age=63072000; includeSubDomains; preload`
   - `x-frame-options: DENY`
   - `x-content-type-options: nosniff`
   - `referrer-policy: strict-origin-when-cross-origin`
   - `permissions-policy: camera=(), microphone=(), geolocation=(), browsing-topics=()`

   Contrast: `curl -I http://localhost:3000/login` (your local dev server) MUST NOT include `strict-transport-security` — HSTS is gated on `NODE_ENV==='production'` in `next.config.ts` to prevent locking localhost into HTTPS-only.

   Also open `https://<your-deploy>.vercel.app/` in the browser → open DevTools → Console tab. Expected: ZERO CSP violations. Any Tailwind v4 inline-style warnings should be absorbed by the `style-src 'self' 'unsafe-inline'` allowance (documented trade-off per CONTEXT D-06).

10. **Rate-limit trigger (real Upstash).** On `/login`, submit the form 6 times rapidly (within ~30 seconds) with the SAME email and an incorrect password. Expected: the 6th submit shows the generic form error and the request never reaches the DB password-check path — the sliding-window rate limiter (5 req / 60s, configured in `src/lib/rate-limit.ts` per Phase 29) has fired against real Upstash. Confirm via Upstash Console: **Databases** → [your DB] → **Metrics** → `Requests` count incremented. A counter on the `login:<email>` key appears in **Data Browser** with TTL ~60s.

11. **Invite User B + cross-user UI isolation.** Logged in as admin, navigate to `/configuracion` → **Invitaciones** section. Click "Generar invitacion" and copy the returned invite URL (shape: `/register?token=<32-byte-hex>`). Paste the URL into a fresh browser (different browser profile or a second incognito window). Register a new user — pick a distinct email (e.g. `userb@test.com`) and password. Log in as User B. Visit in turn: `/movimientos`, `/presupuesto`, `/historial`. Expected: all three pages render User B's (empty) state — zero transactions, zero budgets, zero periods from admin visible. Cross-user isolation end-to-end confirmed.

After all 11 pass, Phase 30 is ready for final sign-off (§10).

---

## 7. HSTS Preload Submission (Post-Smoke, After ~1 Week of Stable HTTPS)

HSTS preload gets your domain baked into browser preload lists (Chrome, Firefox, Safari, Edge) so even a FIRST visit goes over HTTPS. Requires a stable production deploy.

1. Wait at least 1 week after the first successful deploy. Confirm:
   - Cert renews correctly (Vercel handles this automatically via Let's Encrypt).
   - `curl -sI https://<your-deploy>.vercel.app/login` still emits `strict-transport-security: max-age=63072000; includeSubDomains; preload` (via the Plan 30-03 config in `next.config.ts`).
   - No HTTPS regressions in logs (Vercel dashboard → **Deployments** → [latest] → **Logs**).
2. Visit https://hstspreload.org.
3. Enter your production domain (the Vercel-assigned `*.vercel.app` subdomain is preload-eligible, though a custom domain is stronger).
4. The site automatically checks all preload requirements:
   - `max-age >= 31536000` (1 year) — Centik emits `63072000` (2 years), passes
   - `includeSubDomains` directive — present, passes
   - `preload` directive — present, passes
   - Valid TLS cert on the root domain
   - HTTP-to-HTTPS redirect on the root domain
   - All subdomains serve HTTPS
5. Submit for inclusion. Approval takes ~2 weeks to propagate to browser release channels.
6. **Warning:** Preload submission is semi-permanent. Removal from browser preload lists takes months and requires opening a formal removal request at hstspreload.org. Only submit if you are committed to serving the domain over HTTPS indefinitely.

For a personal deployment without a long-term custom domain, preload submission can be deferred indefinitely — HSTS without preload still protects every returning visitor.

---

## 8. Known Post-Deploy Watch-Items

Items discovered during Plans 30-01..30-05 that should be monitored or addressed post-deploy.

### 8.1 `upsertBudgets` partial-IDOR finding (from Plan 30-05 deferred)

**Severity:** Low — NO mutation of another user's data. The attacker creates a stale User-A-owned `Budget` row that points at User B's `Period` and `Category`. User B's own budget row is never read, written, or altered. However, stale rows will accumulate over time if exploited.

**Reproduction:**

```
User A (authenticated session)
  → upsertBudgetsAction(userB_periodId, { entries: [{ categoryId: userB_categoryId, quincenalAmount: '999' }] })
  → findFirst({ periodId: userB_periodId, categoryId: userB_categoryId, userId: userA_id }) → null
  → create({ periodId: userB_periodId, categoryId: userB_categoryId, userId: userA_id, quincenalAmount: 999n })
  → returns { success: true }
```

Result: a row in `Budget` with `userId=userA, periodId=userB_period, categoryId=userB_category`. Stale, never surfaced in User B's UI, never surfaced in User A's UI (because User A's UI only shows User A's own periods).

**Why it slipped past Phase 27:** Phase 27's `findFirst({ id, userId })` IDOR pattern protects UPDATE/DELETE paths that take a row id. `upsertBudgetsAction` takes a `periodId` (not a budget row id) and the existing guard checks `{ periodId, categoryId, userId }` — which correctly protects against hijacking another user's existing budget row, but does NOT protect against creating a fresh row in another user's period.

**Proposed fix:** add a period-ownership guard at the top of `src/app/(app)/presupuesto/actions.ts upsertBudgetsAction`:

```ts
const period = await prisma.period.findFirst({ where: { id: periodId, userId } })
if (!period) return { error: { _form: ['Periodo no encontrado'] } }
```

This matches the existing `closePeriod` / `reopenPeriod` pattern in the same file.

**Action item:** file a follow-up issue titled "upsertBudgets period-ownership guard" OR open a Phase 30.1 gap-closure plan that adds the guard + a matching test in `tests/integration/isolation-actions.test.ts` asserting `prisma.budget.count({ where: { periodId: userB_periodId, userId: userA_id } })` remains 0 after the attack.

**Source:** `.planning/phases/30-vercel-deploy-security-hardening/deferred-items.md` (once appended; currently documented in `30-05-SUMMARY.md` §Deferred Issues). **Location:** `src/app/(app)/presupuesto/actions.ts` L21-60.

### 8.2 Real-Upstash rate-limit verification

Covered by smoke-checklist item 10. The first real exercise of `src/lib/rate-limit.ts` against a real Upstash instance happens at that point. If item 10 fails, check:

- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set in Vercel (§1.4)
- Upstash Console shows recent requests under **Metrics**
- `RATE_LIMIT_DISABLED` is NOT set in Vercel env vars (§1.4) — would make the gate a no-op, but `src/lib/env.ts` superRefine would have aborted the build if it were set to `'true'`

### 8.3 HSTS emission prod-only

Confirmed via smoke-checklist item 9 (HSTS present on prod; absent on dev). If HSTS accidentally appears on localhost, review `next.config.ts` — the `isProduction` ternary gate in `staticSecurityHeaders` is the load-bearing defense (30-03).

### 8.4 CSP violations in browser DevTools

Open `https://<your-deploy>.vercel.app/` in the browser post-deploy, open DevTools → Console tab. Expected: zero CSP violations. Known allowances:

- Tailwind v4 emits inline styles — absorbed by `style-src 'self' 'unsafe-inline'` (D-06 trade-off)
- QR codes in 2FA setup use `data:` URIs — absorbed by `img-src 'self' data: blob:`
- Backup-codes download uses `blob:` URLs — absorbed by the same directive

If unexpected violations appear (e.g. a missing `connect-src` for a new external domain), update the CSP string in `src/proxy.ts` and redeploy.

### 8.5 Boot-time env validation errors surface in Vercel build logs

`src/lib/env.ts` throws an AGGREGATED error at module-load time listing EVERY failing var. If a build fails because of env validation, the error message in Vercel build logs tells you exactly which vars are missing or malformed. Fix in Vercel Project Settings → Environment Variables and redeploy.

---

## 9. Rollback Plan

### 9.1 Code-Level Rollback

Vercel retains every successful deploy. To roll back:

1. Vercel dashboard → **Deployments**.
2. Find the last known-green deploy (timestamp before the regression).
3. Click the three-dot menu → **Promote to Production**.
4. Confirm. Vercel switches the production alias to the selected deploy within ~30 seconds.

No DB rollback is needed for a code-only regression (migrations are additive; the older build is compatible with the newer schema if no new migrations landed with the regression).

### 9.2 Database-Level Rollback

Prisma Postgres handles snapshots at the infrastructure level via Vercel. No automated user-facing backup interface ships with v3.0 — if you need a data-level rollback, you have two options:

**Option A: Point-in-time restore via Vercel Marketplace support.** Open a support ticket through the Vercel dashboard — specify the target timestamp. This is the supported path for data-loss incidents.

**Option B: Manual migration rollback (for a bad schema migration only).** Against `DIRECT_URL`:

```bash
# Pull prod env first (§5.1)
set -a; source .env.production.local; set +a

# Mark a specific migration as rolled back (Prisma will not re-apply it)
npx prisma migrate resolve --rolled-back <migration-folder-name>
```

Only use this if a migration was applied but introduced a schema-level regression. It does NOT undo data writes — it only tells Prisma's `_prisma_migrations` table that the migration should be considered reverted. You must then manually revert the schema changes via a new corrective migration.

### 9.3 What NOT To Do

- **Never force-push to `main`.** Vercel auto-deploys the divergent state, and the prior "green" deploy's git tree no longer matches what's in `main`.
- **Never drop the production database.** Prisma Postgres via Vercel Marketplace has no "undo drop" button for you — support-ticket recovery is the only path and may lose data.
- **Never hand-edit `AUTH_TOTP_ENCRYPTION_KEY` after 2FA users exist.** All existing users' encrypted TOTP secrets become unrecoverable. They would need to disable 2FA via DB manipulation (clear `totpEnabled`, `totpSecret`, and all `BackupCode` rows) and re-enroll.
- **Never hand-rotate `AUTH_SECRET`.** All existing JWTs invalidate immediately — every user gets a forced logout on next request. Only rotate if the old secret is known-compromised.

---

## 10. Final Sign-Off — Phase 30 Complete

Phase 30 is considered shipped when ALL of the following are true:

- [ ] §1.1 automated quality gate green — `npm run quality && npm run test:integration` exits 0 against `main`
- [ ] §1.4 env vars set in Vercel Project Settings
- [ ] §2 Prisma Postgres + Upstash provisioned
- [ ] §3 build command overridden to `npx prisma migrate deploy && next build`
- [ ] §4 first deploy green — build logs show migrations applied + next build succeeded
- [ ] §5 admin seed run once — first run prints "created", second run prints "already exists -- flags verified"
- [ ] §6 all 11 smoke-checklist items pass
- [ ] §7 HSTS preload submitted (or explicitly deferred — note reason)
- [ ] §8.1 upsertBudgets IDOR finding filed as follow-up issue
- [ ] Vercel logs show no cold-start errors or env validation throws

After sign-off:

1. Update `.planning/STATE.md` to mark milestone `v3.0 shipped` with today's date.
2. Update `.planning/ROADMAP.md` Phase 30 row to `Complete`.
3. Mark `DEPLOY-04` as Complete in `.planning/REQUIREMENTS.md`.
4. Open a commit titled `docs: mark phase 30 complete after production deploy verification`.

---

## 11. Appendix — Verification Commands

### 11.1 Full Pre-Deploy Verification

Run against local checkout of `main` before pushing:

```bash
npm run build && npm run lint && npm run format:check && npm run test:run && npm run test:integration
```

Or the shorthand (which chains all of the above except integration):

```bash
npm run quality && npm run test:integration
```

### 11.2 Post-Deploy Header Check

```bash
curl -sI https://<your-deploy>.vercel.app/login | grep -E 'Strict-Transport-Security|X-Frame-Options|X-Content-Type-Options|Referrer-Policy|Permissions-Policy|Content-Security-Policy'
```

Expected: 6 matching lines (one per header). Missing any line indicates a config regression against `next.config.ts` or `src/proxy.ts`.

### 11.3 Post-Deploy Seed Idempotency Check

```bash
set -a; source .env.production.local; set +a
npm run db:seed:prod  # first run: "created"
npm run db:seed:prod  # second run: "already exists -- flags verified (password NOT rotated)"
```

The two runs must print different messages, and a DB-level check of `SELECT "hashedPassword" FROM "User" WHERE email = '<ADMIN_EMAIL>';` must return the same hash byte-for-byte across runs.

### 11.4 Rate-Limit Key Inspection (Upstash)

In the Upstash Console → **Data Browser**, after smoke-checklist item 10:

```
Key pattern: ratelimit:login:<email-lowercased>
Expected TTL: ~60 seconds
Expected value: count of failed attempts in the current window
```

### 11.5 CSP Nonce Freshness Check

Two successive requests MUST get distinct nonces:

```bash
for i in 1 2; do
  curl -sI https://<your-deploy>.vercel.app/login | grep -o "'nonce-[^']*'"
done
```

Expected: two different `'nonce-xxxxx'` values. If the same nonce appears on both requests, a caching layer is serving stale CSP headers — investigate Vercel caching config.

### 11.6 Observability via Vercel Logs

Per D-29, v3.0 observability is Vercel's built-in logs only (no Sentry, Datadog, etc.).

- **Function Logs:** Vercel Project → **Deployments** → [latest] → **Logs** tab. Filter by status code:
  - `4xx` surfaces auth failures, IDOR attempts (null returns from `findFirst`), rate-limit trips.
  - `5xx` surfaces real server errors — investigate immediately.
- **Build Logs:** Vercel Project → **Deployments** → [any] → **Build Output**. Zod validation errors in `src/lib/env.ts` appear here.
- **Prisma Postgres Metrics:** Linked from Vercel Storage page → Prisma Console. Connection count + query latency visible.

---

*Phase: 30-vercel-deploy-security-hardening*
*Plan: 06 (runbook)*
*Written: 2026-04-22*
*Author: GSD Plan Executor (Claude Opus 4.7 1M context)*
*Standalone readable — no Claude assistance required to follow*
