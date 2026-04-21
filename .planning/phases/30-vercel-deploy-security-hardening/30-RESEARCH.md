# Phase 30: Vercel Deploy + Security Hardening - Research

**Researched:** 2026-04-21
**Domain:** Production deploy (Vercel + Prisma Postgres + Next.js 16) & defense-in-depth security hardening (CSP with nonce, HSTS, Server-Action IDOR coverage)
**Confidence:** HIGH

## Summary

Phase 30 is deliberately a "boring" infrastructure phase. Every building block is already in the codebase — `src/proxy.ts` already uses Next.js 16's new proxy convention (renamed from middleware), `src/lib/prisma.ts` already uses `@prisma/adapter-pg`, `tests/integration/isolation.test.ts` already covers 6 entities with the two-user pattern, and Phase 29 delivered rate-limit + AES-256-GCM plumbing that reads `process.env` lookups this phase will centralize through a new `src/lib/env.ts` validator. The research surfaces **two significant deviations** from CONTEXT.md that the planner MUST resolve before implementation:

1. **Prisma 7 removed `directUrl` from the datasource block.** CONTEXT D-03 prescribes adding `directUrl = env("DIRECT_URL")` to `prisma/schema.prisma` `datasource db {}`. This is no longer valid in Prisma 7.6.0 (the installed version). In Prisma 7 the datasource URL lives in `prisma.config.ts` (which this project already has), and there is no first-class `directUrl` key. The implementation pattern becomes: point `prisma.config.ts` `datasource.url` at `env('DIRECT_URL')` so the Prisma CLI (`migrate deploy`, `migrate dev`, seed) uses the direct/non-pooled connection for schema operations, while the runtime `PrismaPg` adapter in `src/lib/prisma.ts` keeps reading `DATABASE_URL` (pooled). This requires `DIRECT_URL` to be set in `.env` / Vercel env vars alongside `DATABASE_URL`. [VERIFIED: `npx prisma --version` → 7.6.0; `prisma.config.ts` L10-12; Prisma 7 upgrade guide confirms `directUrl` removal]

2. **Vercel Marketplace Prisma Postgres injects ONLY `DATABASE_URL` — not the legacy trio.** CONTEXT D-01 describes the 2023-era Vercel Postgres (Neon-backed) which auto-injected `DATABASE_URL` + `POSTGRES_PRISMA_URL` + `POSTGRES_URL_NON_POOLING`. That product was sunset in Dec 2024. The current Prisma Postgres integration (the correct "Vercel Marketplace Prisma Postgres" per the CONTEXT's intent) injects ONLY `DATABASE_URL` (format: `postgres://user:pass@pooled.db.prisma.io:5432/db?sslmode=require`). The separate direct URL (`postgres://user:pass@db.prisma.io:5432/...`) is visible in the Prisma Console but must be copy-pasted into Vercel as `DIRECT_URL` manually. [VERIFIED: https://vercel.com/marketplace/prisma — "sets the DATABASE_URL environment variable"; https://www.prisma.io/docs/postgres/database/connecting-to-your-database — two hostnames documented]

Every other CONTEXT decision (D-05 through D-31) is directly implementable: Next.js 16 ships an official CSP-with-nonce proxy example (word-for-word matches D-05/D-06 shape), static headers in `next.config.ts` via `async headers()` is the documented path, `prisma migrate deploy` is idempotent and non-interactive (runs in Vercel build by design), and the isolation test pattern extends naturally to cover `MonthlySummary` + `Asset`/`ValueUnit`/`UnitRate` + `BackupCode` (D-22) and a new `isolation-actions.test.ts` that authenticates as User A and targets User B's row IDs via every mutation Server Action (D-23).

**Primary recommendation:** Six plans in dependency order — (1) Prisma Postgres schema/config surgery + DIRECT_URL wiring, (2) `src/lib/env.ts` boot-time validator + consumer refactor sweep, (3) `next.config.ts` static headers + `src/proxy.ts` CSP-nonce extension, (4) `prisma/seed.prod.ts` + `package.json` script + `.env.example` update, (5) Isolation test expansion (`isolation.test.ts` +3 entities, NEW `isolation-actions.test.ts` covering ≥10 Server Action IDOR cases), (6) `30-VERIFICATION.md` smoke checklist + final `quality` pass.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Prisma Postgres Provisioning (DEPLOY-01)**
- **D-01:** Provision via the Vercel Marketplace Prisma Postgres integration. The integration auto-injects env vars at deploy time. ⚠️ See §Pitfalls — the "three env var" trio described in the CONTEXT (DATABASE_URL + POSTGRES_PRISMA_URL + POSTGRES_URL_NON_POOLING) was the legacy Vercel Postgres (Neon) product, which is sunset. The current Prisma Postgres integration injects DATABASE_URL only; DIRECT_URL must be copied from the Prisma Console into Vercel manually.
- **D-02:** Update `src/lib/prisma.ts` minimally — already uses `@prisma/adapter-pg` with `process.env.DATABASE_URL`. No code change strictly required.
- **D-03:** Migrations and production seed use the direct connection (`DIRECT_URL`). ⚠️ See §Pitfalls — Prisma 7 removed `datasource.directUrl`. The actual implementation pattern is to point `prisma.config.ts` `datasource.url` at `env('DIRECT_URL')` for CLI operations, while runtime keeps `DATABASE_URL`.
- **D-04:** No connection-pool tuning beyond defaults.

**Security Headers (DEPLOY-02)**
- **D-05:** Set headers in two places — `next.config.ts` (static: HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy) and `src/proxy.ts` (per-request CSP with nonce). Generate `nonce` per request, inject via `request.headers.set('x-nonce', nonce)` and `response.headers.set('Content-Security-Policy', csp)`.
- **D-06:** CSP policy: `default-src 'self'`; `script-src 'self' 'nonce-{nonce}' 'strict-dynamic'`; `style-src 'self' 'unsafe-inline'` (Tailwind v4 + React 19 inline styles trade-off); `img-src 'self' data: blob:`; `font-src 'self' data:`; `connect-src 'self' https://*.upstash.io`; `frame-ancestors 'none'`; `base-uri 'self'`; `form-action 'self'`. No `report-uri`.
- **D-07:** HSTS: `max-age=63072000; includeSubDomains; preload` — ONLY in production.
- **D-08:** No COOP/COEP this phase.

**Production Seed Strategy (DEPLOY-03)**
- **D-09:** NEW file `prisma/seed.prod.ts` — creates admin only, no demo data. Reads `ADMIN_EMAIL` + `ADMIN_PASSWORD` from env, bcrypt cost 12, upserts with `isAdmin: true, isApproved: true, totpEnabled: false`.
- **D-10:** Idempotent via upsert-by-email. DOES NOT rotate password if user exists.
- **D-11:** Add `package.json` script `db:seed:prod`. Runs manually after first deploy, NOT in build command.
- **D-12:** No default categories in production seed (each user creates their own).

**Vercel Project Config (DEPLOY-04)**
- **D-13:** Vercel Project Settings UI for env vars (no `vercel.json` by default). Env vars: `AUTH_SECRET`, `AUTH_TOTP_ENCRYPTION_KEY`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `DATABASE_URL` (auto), `DIRECT_URL` (manual).
- **D-14:** Start with no `vercel.json`; add only if needed.
- **D-15:** Vercel build command override: `npx prisma migrate deploy && next build`.
- **D-16:** Install command default; `postinstall` already runs `prisma generate`.
- **D-17:** Output directory default.

**Boot-Time Env Validation**
- **D-18:** NEW `src/lib/env.ts` — single source of truth for all production env vars. Validates on first import. Throws immediately on missing/malformed required vars.
- **D-19:** Validation rules: NODE_ENV enum; DATABASE_URL non-empty; AUTH_SECRET ≥32 chars; AUTH_TOTP_ENCRYPTION_KEY exactly 64 hex chars; ADMIN_EMAIL + ADMIN_PASSWORD required only when seed module loads; UPSTASH_* required when NODE_ENV=production; RATE_LIMIT_DISABLED optional (only honored when NODE_ENV!=production).
- **D-20:** Production guard — assert RATE_LIMIT_DISABLED!=='true' when NODE_ENV=='production'. Throw loudly.
- **D-21:** Consume `validatedEnv` from `src/lib/totp-crypto.ts`, `src/lib/rate-limit.ts`, `src/lib/prisma.ts`, `src/auth.ts` — replaces scattered `process.env.X` lookups.

**Cross-User Isolation Test Expansion (ISOL-05, TEST-03)**
- **D-22:** Extend `tests/integration/isolation.test.ts` — add MonthlySummary, Asset+ValueUnit+UnitRate, BackupCode coverage.
- **D-23:** NEW `tests/integration/isolation-actions.test.ts` — for each mutation Server Action (create/update/delete per entity), call as User A targeting User B's row ID. Expect either explicit error OR silent no-op; NEVER successful mutation. Critical for `disableTotpAction` and `regenerateBackupCodesAction`.
- **D-24:** No new page isolation tests (Phase 27 established `auth() + connection() + lib(userId)` chain).
- **D-25:** Two-user `beforeAll` setup + truncate-between-files pattern.
- **D-26:** Acceptance: all existing integration tests pass; `isolation.test.ts` adds 3 new entity tests; `isolation-actions.test.ts` covers ≥10 mutation IDOR cases.

**Smoke Tests Post-Deploy**
- **D-27:** NEW `30-VERIFICATION.md` with 11-item manual smoke checklist (production URL → login → transaction create → 2FA enable → QR scan → backup codes → logout → TOTP login → backup-code login → curl -I headers → rate-limit trigger → User-B register + isolation).
- **D-28:** Manual, not automated.

**Logs / Observability**
- **D-29:** Vercel built-in logs only. No Sentry/Datadog.
- **D-30:** Warn if `NODE_ENV=production && DEBUG` is set.
- **D-31:** Extend Phase 29 grep gate — no `console.log` in `src/lib/env.ts`.

**Carried Forward (locked, do not re-decide)**
- JWT 30d (Phase 26); bcryptjs cost 12 (25/26/28); requireAuth() mandatory in every Server Action (CVE-2025-29927, Phase 27); connection() on every (app) page (Phase 27); ambiguous error messages (26/28/29); npm not pnpm (MEMORY.md); Spanish UI; Lucide icons only; files <300 lines; functions <50 lines.
- Phase 29 RESOLVED: TOTP `totpEnabled` read from DB on every login; HMAC challenge token (not cookie); zero DB writes in `prepareTotpSecretAction`.
- BackupCode model exists; Phase 29 cross-user isolation proven in `tests/integration/totp.test.ts`.
- Prisma adapter is `@prisma/adapter-pg`.

### Claude's Discretion
- Exact CSP header string formatting (single line vs multi-line template literal).
- Whether `vercel.json` ends up needed.
- Whether to add `prisma/migrations.test.ts` (nice-to-have).
- Plan split (1 schema + 1 headers + 1 seed + 1 vercel + 1 isolation OR fewer larger plans).
- Whether `validatedEnv` is named export `env` or default export.
- Exact copy and order of smoke checklist beyond the 11 required items.

### Deferred Ideas (OUT OF SCOPE)
- CI/CD beyond Vercel git-integration (v4.x).
- Sentry/Datadog/structured logging (v4.x).
- Custom domain + DNS automation (manual for v3.0).
- Multi-region / edge runtime (separate phase).
- WAF / Cloudflare in front (out of scope).
- Automated dependency scanning (v4.x).
- Uptime monitoring (v4.x).
- Backup/restore strategy (Vercel snapshots; document when first incident demands).
- Audit log of admin actions (v4.x).
- Email delivery for invites (v4.x).
- Password reset flow (out of scope — admin resets via DB/seed).
- Per-IP geographic / device fingerprint (v4.x).
- COOP/COEP headers.
- CSP report-uri / report-to.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ISOL-05 | Cross-user integration tests — User B authenticates and gets zero access to User A's data | Extend `tests/integration/isolation.test.ts` with MonthlySummary + Asset + BackupCode coverage (D-22); NEW `tests/integration/isolation-actions.test.ts` proves the Phase 27 `findFirst({ where: { id, userId } })` IDOR pattern holds for every mutation (D-23) |
| DEPLOY-01 | Prisma Postgres provisioned via Vercel Marketplace with pooled + direct connection strings | Vercel Marketplace Prisma integration injects `DATABASE_URL` (pooled); user copies `DIRECT_URL` (direct) from Prisma Console. Prisma 7.6.0 `prisma.config.ts` `datasource.url` uses `DIRECT_URL` for migrations; runtime `@prisma/adapter-pg` uses `DATABASE_URL` |
| DEPLOY-02 | Security headers in next.config.ts — CSP w/ per-request nonce, HSTS, X-Frame-Options DENY, X-Content-Type-Options nosniff | Next.js 16 official CSP-with-nonce proxy example (node_modules docs); static headers via `async headers()` in `next.config.ts` using `source: '/(.*)'` for catch-all |
| DEPLOY-03 | Production seed script creates admin user with hashed password | Pattern from `prisma/seed.ts` `seedAdminUser()` (L23-42) — keep bcrypt cost 12, upsert-by-email, no-rotate-on-existing semantics. Register via `prisma.config.ts` `migrations.seed` or bespoke `package.json` script `db:seed:prod` |
| DEPLOY-04 | Vercel deployment configuration with all env vars | Project Settings UI env vars (scope: Production for all; Preview excluded per smoke-test discipline); build command override `npx prisma migrate deploy && next build`; `postinstall: prisma generate` already wired |
| TEST-03 | Cross-user isolation integration tests pass | Same as ISOL-05 above (tests deliver both requirements) |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|--------------|----------------|-----------|
| CSP nonce generation per request | Proxy (Node runtime) | — | Must be fresh per request; middleware/proxy runs before response body |
| Nonce read in RSC + attached to `<Script nonce>` | Frontend Server (SSR) | — | Next.js auto-applies nonce to framework scripts once CSP header is set; manual `headers()` read needed only for `<Script>` components |
| Static security headers (HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy) | Next config (`headers()`) | — | Never change per request; static config is the documented pattern |
| Prisma Client runtime queries | API / Backend | — | Uses `DATABASE_URL` (pooled) via `@prisma/adapter-pg`; already wired in `src/lib/prisma.ts` |
| Prisma CLI schema operations (`migrate deploy`, seed) | Vercel build step / local CLI | — | Uses `DIRECT_URL` (direct) via `prisma.config.ts` datasource; runs non-interactively in Vercel build |
| Boot-time env validation | All tiers (single module) | — | Imported by every module that needed a `process.env.X`; validation happens on first import (singleton) |
| Production seed (admin user upsert) | Manual one-shot (Vercel env pull → local `tsx`) | — | NOT in build command; operator runs post-deploy |
| Cross-user isolation tests (query-level) | Vitest integration runner | — | Real Prisma + test DB; extends existing `tests/integration/isolation.test.ts` |
| Cross-user isolation tests (mutation-level, Server Action IDOR) | Vitest integration runner | — | Mocks `auth()` to return different session userIds; drives real Server Actions against real test DB |
| Smoke verification checklist | Human operator (manual) | — | Real authenticator phone + real Upstash + real production DB — can't be automated |

## Standard Stack

### Core

| Library / Tool | Version | Purpose | Why Standard |
|----------------|---------|---------|--------------|
| `next` | 16.2.2 (installed) | CSP-with-nonce proxy API; `headers()` config | Canonical Next.js 16 pattern — official docs ship an almost-identical example. [VERIFIED: `node_modules/next/package.json`; `node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md`] |
| `prisma` + `@prisma/client` | 7.6.0 (installed) | Schema, migrations, runtime Client | Already wired. v7 requires `prisma.config.ts` for URL configuration — project already has this file. [VERIFIED: `npx prisma --version` → 7.6.0] |
| `@prisma/adapter-pg` | latest (installed) | Runtime connection pool via `node-postgres` | Official Prisma adapter; already used in `src/lib/prisma.ts` L2,10; compatible with Prisma Postgres pooled URL. [VERIFIED: `src/lib/prisma.ts` L2; https://www.prisma.io/docs/postgres/database/connecting-to-your-database] |
| `bcryptjs` | ^3.0.3 (installed) | Admin password hash in prod seed (cost 12) | Consistent with Phase 25/26/28. [VERIFIED: `package.json` L27] |
| `tsx` | latest (devDep) | Runner for `prisma/seed.prod.ts` | Already used for `prisma/seed.ts` via `prisma.config.ts` L8 `seed: 'npx tsx prisma/seed.ts'`. [VERIFIED: `prisma.config.ts` L8] |
| `zod` | latest (installed) | Env var validation in `src/lib/env.ts` | Already used project-wide (`src/lib/validators.ts`); keeps validation style consistent. |

### Supporting (Infrastructure)

| Provider / Service | Purpose | Why Standard |
|--------------------|---------|--------------|
| Vercel (hosting) | Next.js 16 build + serverless runtime + env vars | The Next.js vendor; "just works" for `proxy.ts`, `async headers()`, `postinstall: prisma generate`. Built-in logs serve as v3.0 observability (D-29). |
| Vercel Marketplace Prisma Postgres | Production database | Auto-injects `DATABASE_URL`; managed pooler at `pooled.db.prisma.io`; no cold starts; no manual Prisma Accelerate setup. [VERIFIED: https://vercel.com/marketplace/prisma] |
| Upstash Redis (existing) | Rate-limit store (@upstash/ratelimit) | Already provisioned via Phase 29 env vars; REST API is serverless-friendly; no Node TCP socket. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Vercel Marketplace Prisma Postgres | Vercel Marketplace Neon / Supabase / Planetscale | D-01 locks Prisma Postgres. Prisma Postgres is "first-party" — Prisma team maintains it and guarantees adapter/migration compatibility. |
| Prisma 7 `prisma.config.ts` datasource | `schema.prisma datasource { directUrl }` (Prisma ≤ 6.18) | Not supported in Prisma 7 — `directUrl` is removed. Must use `prisma.config.ts`. [VERIFIED: https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-versions/upgrading-to-prisma-7 — "url, directUrl, and shadowDatabaseUrl in the datasource block are deprecated"] |
| CSP nonce in proxy.ts | CSP without nonce + `'unsafe-inline'` script-src in `next.config.ts` | D-05/D-06 locks nonce. Nonce is genuinely stronger (prevents any inline script from running except Next.js's own bundle) at the cost of forcing dynamic rendering — but `connection()` already makes every (app) page dynamic. |
| `node:crypto.randomUUID()` for nonce | `crypto.randomBytes(16).toString('base64')` | Next.js official example uses `Buffer.from(crypto.randomUUID()).toString('base64')`. Both are cryptographically secure; UUID is 128-bit entropy and is the documented pattern — match it. [CITED: `node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md` L48] |
| Static HSTS in `next.config.ts` | Dynamic HSTS in proxy | Static is simpler and never fires on localhost (doesn't match the dev host) unless misconfigured — but we gate via `source: '/(.*)'` + runtime NODE_ENV check in the config function itself. See §Code Excerpts. |
| `@prisma/adapter-pg` | `@prisma/extension-accelerate` (Prisma Accelerate) | Prisma Postgres has BUILT-IN pooling — Accelerate is not needed (and would double-hop). [CITED: Vercel Marketplace Prisma page — "Built-in global caching and connection pooling"] |
| `openssl rand -hex 32` for AUTH_SECRET | `crypto.randomBytes(32).toString('base64url')` | Both valid. Keep what `AUTH_TOTP_ENCRYPTION_KEY` docs already use (`openssl rand -hex 32`) for operator consistency. |

### Installation / Tooling

No new npm packages in Phase 30 (zod, tsx, bcryptjs, prisma, next, @prisma/adapter-pg all already installed). Vercel Marketplace integration is a UI-driven action, not a code change.

## Architecture Patterns

### System Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        PHASE 30 — VERCEL PRODUCTION TOPOLOGY                           │
└────────────────────────────────────────────────────────────────────────────────────────┘

                         ┌────────────────────────────────┐
   HTTPS request ───────▶│  Vercel Edge / Node runtime    │
                         │  (matcher = all except statics)│
                         │                                │
                         │  1. src/proxy.ts runs first    │
                         │     ├─ generate nonce          │
                         │     ├─ auth() check (Phase 26) │
                         │     ├─ redirect if needed      │
                         │     ├─ set req.x-nonce         │
                         │     └─ set resp.CSP header     │
                         │                                │
                         │  2. next.config.ts headers()   │
                         │     append static headers:     │
                         │     HSTS, X-Frame-Options,     │
                         │     nosniff, Referrer-Policy,  │
                         │     Permissions-Policy         │
                         └──────────┬─────────────────────┘
                                    │
                         ┌──────────▼───────────────────────────────┐
                         │   Next.js 16 Server Component / Action   │
                         │   ├─ connection() makes it dynamic       │
                         │   ├─ auth() → userId from JWT            │
                         │   ├─ lib/prisma.ts (pooled via           │
                         │   │   @prisma/adapter-pg, DATABASE_URL)  │
                         │   └─ validatedEnv ensures boot integrity │
                         └──────────┬───────────────────────────────┘
                                    │
                 ┌──────────────────┼────────────────────┐
                 │                  │                    │
        ┌────────▼──────────┐ ┌────▼─────────────┐ ┌─────▼──────────┐
        │  Prisma Postgres  │ │  Upstash Redis   │ │  Vercel Logs   │
        │  pooled.db.prisma │ │  (rate limiter)  │ │  (observability)│
        │  (DATABASE_URL)   │ │                  │ │                │
        └───────────────────┘ └──────────────────┘ └────────────────┘
                 ▲
                 │  (DIRECT_URL — ONLY used by CLI)
                 │
        ┌────────┴──────────────────────────────────────┐
        │  Vercel Build Step (non-TTY)                   │
        │  ├─ npm install                                │
        │  │   └─ postinstall: prisma generate           │
        │  ├─ npx prisma migrate deploy (uses DIRECT_URL │
        │  │   via prisma.config.ts datasource.url)      │
        │  └─ next build                                 │
        └─────────────────────────────────────────────────┘

        ┌─────────────────────────────────────────────────┐
        │  Manual one-shot (operator laptop)              │
        │  ├─ vercel env pull .env.production             │
        │  └─ npm run db:seed:prod                        │
        │     └─ tsx prisma/seed.prod.ts                  │
        │         └─ upserts admin user (no-op if exists) │
        └─────────────────────────────────────────────────┘
```

### Recommended File Layout Delta

```
centik/
├── next.config.ts             # EXTEND — async headers() with static security headers (runtime NODE_ENV gate for HSTS)
├── prisma.config.ts           # EXTEND — datasource.url = env('DIRECT_URL') (NOT DATABASE_URL); keeps CLI on direct connection
├── src/
│   ├── proxy.ts               # EXTEND — nonce + CSP header (preserve existing auth() redirect chain; order matters)
│   └── lib/
│       ├── env.ts             # NEW — Zod-based validator, runs on first import, exports `env` (validatedEnv)
│       ├── prisma.ts          # EXTEND — read DATABASE_URL via env.ts instead of process.env directly
│       ├── rate-limit.ts      # EXTEND — read UPSTASH_* via env.ts; production-guard RATE_LIMIT_DISABLED
│       └── totp-crypto.ts     # EXTEND — read AUTH_TOTP_ENCRYPTION_KEY via env.ts
├── src/auth.ts                # NO CHANGE — Auth.js reads AUTH_SECRET directly; env.ts validation surfaces failure earlier
├── prisma/
│   └── seed.prod.ts           # NEW — admin-only, idempotent, reads ADMIN_EMAIL + ADMIN_PASSWORD
├── tests/integration/
│   ├── isolation.test.ts      # EXTEND — +MonthlySummary, +Asset+ValueUnit+UnitRate, +BackupCode
│   └── isolation-actions.test.ts  # NEW — Server Action IDOR coverage (≥10 test cases)
├── .env.example               # EXTEND — document DATABASE_URL (pooled) vs DIRECT_URL (direct), production scope notes
├── package.json               # EXTEND — add "db:seed:prod": "tsx prisma/seed.prod.ts"
└── .planning/phases/30-vercel-deploy-security-hardening/
    └── 30-VERIFICATION.md     # NEW — 11-item manual smoke checklist
```

### Pattern 1: Prisma 7 Dual-URL (Pooled Runtime + Direct CLI)

**What:** Runtime uses pooled connection (`DATABASE_URL` → `pooled.db.prisma.io`). Prisma CLI (migrations, seed) uses direct connection (`DIRECT_URL` → `db.prisma.io`). Because Prisma 7 removed `datasource.directUrl`, we point `prisma.config.ts` `datasource.url` at the direct URL, and runtime code reads `DATABASE_URL` explicitly in `src/lib/prisma.ts`.

**When to use:** Any production Prisma Postgres deployment. Running migrations through the pooler fails on prepared statements and DDL locks; running runtime queries through the direct connection exhausts connections under serverless concurrency. [VERIFIED: web search; see §Pitfalls #9]

**Example:**
```typescript
// prisma.config.ts — CLI always uses DIRECT_URL (migrate deploy, seed, introspect)
import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'npx tsx prisma/seed.ts',  // dev seed; prod seed via package.json script
  },
  datasource: {
    url: env('DIRECT_URL'),  // ⚠ CHANGED from DATABASE_URL — CLI needs direct connection
  },
})
```

```typescript
// src/lib/prisma.ts — Runtime uses pooled DATABASE_URL (unchanged)
import { env } from './env'
import { PrismaClient } from '../../generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: env.DATABASE_URL })
  return new PrismaClient({ adapter })
}

const prisma = globalForPrisma.prisma || createPrismaClient()
if (env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
export default prisma
```

### Pattern 2: CSP Nonce via `src/proxy.ts` + Static Headers via `next.config.ts`

**What:** Nonce is per-request and requires dynamic rendering; set it in proxy.ts after the existing auth() redirect logic. Static headers (HSTS, XFO, nosniff, Referrer-Policy, Permissions-Policy) never change per request — set them in `next.config.ts` `async headers()` via a `source: '/(.*)'` matcher.

**When to use:** Every request (the proxy matcher already excludes `_next/static` and statics — D-05 confirms).

**Key insight:** Next.js 16 automatically attaches the nonce from the CSP header to framework scripts (React runtime, page bundles, inline styles generated by Next). You do NOT need to manually wire the nonce into `<Script nonce>` unless you have a third-party script. Our codebase has none as of Phase 29. [CITED: Next.js docs CSP L179-193]

**Example:** See §Code Excerpts → `src/proxy.ts` and `next.config.ts`.

### Pattern 3: Boot-Time Env Validation Singleton

**What:** One module (`src/lib/env.ts`) validates all production env vars at first import using Zod, exports a typed `env` object. Any missing/malformed required var throws at module load — the app cannot serve traffic with bad config. Importing modules use `env.X` instead of `process.env.X`.

**When to use:** Every `process.env` lookup in the production code path. Exception: `src/auth.ts` (Auth.js reads `AUTH_SECRET` from `process.env` internally — can't intercept, but env.ts validation still runs before any request because the proxy.ts file imports `@/auth`, which transitively pulls env.ts).

**Import-chain verification:**
- Cold start → Vercel boots Node runtime → `src/proxy.ts` executes on first request
- `src/proxy.ts` imports `@/auth`, which imports `@/lib/prisma`, which imports `@/lib/env`
- `env.ts` runs its validator at module-load (top-level throw, not lazy)
- If any required var is missing or malformed: entire process fails with a clear Zod error
- Cold start that passes validation → module is memoized (`globalThis` cached) → no re-validation cost per request

This matches the "fail fast at boot" pattern already established in `src/lib/totp-crypto.ts` L8-17 (`loadKey()` throws on first import). [VERIFIED: existing code]

**Example:** See §Code Excerpts → `src/lib/env.ts`.

### Pattern 4: Server-Action IDOR Test (`isolation-actions.test.ts`)

**What:** Mock `auth()` to return User A's session userId. Call each mutation Server Action with a row ID that belongs to User B. Assert: (a) action returns an error OR silent no-op, (b) DB state for User B is unchanged post-action. Covers every mutation path Phase 27's `findFirst({ where: { id, userId } })` IDOR check protects.

**Critical mechanics:**
1. Mock `@/auth` (`auth`) and `@/lib/auth-utils` (`requireAuth`) to return `{ userId: userAId }` per-test via `vi.mocked()`.
2. Mock `next-auth` init to prevent next/server ESM load chain — copy the mock from `tests/integration/totp.test.ts` L10-25.
3. Create User A + User B + one row per entity owned by User B in `beforeAll`.
4. For each action: call with `(prev, formData)` where formData.id = User B's row ID.
5. Read the row post-action to verify no mutation occurred.
6. Truncate in `afterAll` by userId cascade (onDelete: Cascade handles relations).

**When to use:** Every phase that adds a new mutation Server Action. This file becomes a permanent regression net.

**Example:** See §Code Excerpts → `tests/integration/isolation-actions.test.ts`.

### Anti-Patterns to Avoid

- **Setting HSTS on localhost.** Browsers cache HSTS; once set for `localhost:3000`, the browser refuses http:// for that origin for the max-age duration. Gate HSTS emission on `NODE_ENV === 'production'` inside the `headers()` function (or, simpler, set it only in the Vercel runtime which always has `NODE_ENV=production`).
- **Running migrations through the pooled connection.** Pgbouncer transaction mode breaks DDL + prepared statements. Always `DIRECT_URL` for `prisma migrate deploy`.
- **Seeding the production DB on every deploy.** `seed.prod.ts` runs manually once. Never wire into the Vercel build command.
- **Amending `src/auth.ts` to import from env.ts.** Auth.js v5 reads `process.env.AUTH_SECRET` internally via `@auth/core/lib/utils/env.ts`; you cannot intercept that. What env.ts does is surface the failure earlier (at boot time, with a clear Zod error) instead of letting Auth.js throw a vague `MissingSecret` on first sign-in attempt.
- **`'unsafe-inline'` in `script-src`.** Destroys the entire point of CSP. Keep `script-src 'self' 'nonce-{nonce}' 'strict-dynamic'`. `'unsafe-inline'` is acceptable ONLY in `style-src` as a Tailwind v4 trade-off (D-06 accepts this).
- **Skipping `connection()` on a new page.** Without `connection()`, the page becomes statically rendered and the nonce is baked into the prerendered HTML — which breaks the next request (stale nonce in page body, fresh nonce in header). Every (app) page must call `connection()` (Phase 27 pattern).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSP nonce generation | A custom random-bytes wrapper or UUID generator | `Buffer.from(crypto.randomUUID()).toString('base64')` — the exact pattern from Next.js docs | Matches official example; UUID is 128-bit random; Node's built-in guarantees cryptographic quality. |
| Security-header formatting | A wrapper class that stringifies headers | Next.js `headers()` config returns plain `{ key, value }` pairs | Every framework-integration concern (locale, basePath, ordering) is already handled. |
| Env var validation | `if (!process.env.X) throw` scattered across files | One `src/lib/env.ts` Zod module | Centralized: one place to see what prod needs; types flow; no drift. |
| Admin user seed on production | Re-running `prisma/seed.ts` with guards | Separate `prisma/seed.prod.ts` with ONLY admin upsert | Dev seed creates demo transactions/categories/debts; production should be blank except for the admin account (D-12). |
| Cross-user-mutation integration test framework | A BDD DSL for IDOR tests | Plain Vitest `describe/it` following `totp.test.ts` pattern | Existing pattern works; don't reinvent. |
| Build-time HSTS check | Custom "don't serve HSTS in dev" guard | `NODE_ENV === 'production'` check inside `async headers()` — standard Next.js idiom | Vercel always sets `NODE_ENV=production` in prod runtime. Local `next dev` has `NODE_ENV=development`. Zero-code gate. |
| Prisma Postgres connection pooling | A custom pool / pgbouncer sidecar | The built-in `pooled.db.prisma.io` hostname | Prisma Postgres has pooling baked in. Adding a layer gets you duplicate pooling, not better pooling. |

**Key insight:** Phase 30 is a configuration exercise. Every runtime primitive was delivered in prior phases. When a plan feels like it's introducing new runtime code, step back — it's probably belt-and-suspenders over something `next`, `prisma`, or `bcryptjs` already guarantees.

## Runtime State Inventory

N/A — Phase 30 does not rename or refactor existing string identifiers. The only new runtime state is:
- `DIRECT_URL` env var (manually copied from Prisma Console to Vercel Project Settings once).
- Vercel integration-injected `DATABASE_URL` (automatic).
- Zero database migrations (no schema changes).
- One production-only row: the admin User record (created idempotently by `seed.prod.ts`).

**Nothing found in categories:** stored data (no rename), live service config (no rename), OS-registered state (n/a), secrets/env vars (additions only, no renames), build artifacts (none — `prisma generate` runs on every Vercel deploy via postinstall).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | Next.js 16 runtime | ✓ | v24.12.0 locally (Vercel auto-selects 20.9+) | — |
| npm | Package manager | ✓ | bundled with Node | — |
| PostgreSQL 16 (dev) | Local `docker compose up -d` | ✓ | assumed running | — |
| Docker (dev) | Local DB | ✓ | project uses `docker-compose.yml` + `docker-compose.test.yml` | — |
| Prisma CLI 7.6.0 | `prisma migrate deploy`, seed | ✓ | 7.6.0 (installed) | — |
| Vercel CLI | `vercel env pull` for prod seed | — (installs on demand via `npx vercel`) | latest | Operator installs during D-11 runbook execution |
| Vercel account | Deploy target | ⚠ Assumed user provisions | — | Manual UI step; documented in D-27 smoke checklist |
| Prisma Postgres instance | Production DB | ⚠ Assumed user provisions | — | Provisioned via Vercel Marketplace (D-01); one-time UI action |
| Upstash Redis | Rate limiter | ⚠ Assumed user provisions | — | Phase 29 D-24; one-time UI action; bypass in dev/test |

**Missing dependencies with no fallback:** None blocking code changes. Vercel + Prisma Postgres + Upstash are provisioned via dashboard UIs by the operator, documented in `30-VERIFICATION.md`.

**Missing dependencies with fallback:** Vercel CLI — operator installs via `npx vercel` when running the one-shot prod seed.

## Validation Architecture

(Nyquist validation enabled per `.planning/config.json` `workflow.nyquist_validation: true` — config absent for this field is treated as enabled.)

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (already installed; latest) |
| Config files | `vitest.config.mts` (unit) + `vitest.integration.config.mts` (integration, port 5433 test DB) |
| Quick run | `npm run test:run` (unit only, ~5 s) |
| Integration run | `npm run test:integration` |
| Full suite | `npm run quality` (build + lint + format:check + unit) — add `test:integration` to the chain at phase completion |
| Setup | `tests/setup.ts` connects to test DB via `@prisma/adapter-pg` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ISOL-05 | User B sees 0 MonthlySummary of User A | integration | `npx vitest run --config vitest.integration.config.mts tests/integration/isolation.test.ts` | ⚠ EXTEND (add 3 tests) |
| ISOL-05 | User B sees 0 Asset/ValueUnit/UnitRate of User A | integration | same command above | ⚠ EXTEND |
| ISOL-05 | User B sees 0 BackupCode of User A | integration | same command above | ⚠ EXTEND |
| TEST-03 | User A cannot update/delete User B's transaction via createTransactionAction/updateTransactionAction/deleteTransactionAction | integration | `npx vitest run --config vitest.integration.config.mts tests/integration/isolation-actions.test.ts` | ❌ NEW FILE |
| TEST-03 | Same for debt / budget / income-source / category / period | integration | same command | ❌ NEW FILE |
| TEST-03 | disableTotpAction and regenerateBackupCodesAction are session-bound (cannot disable another user's 2FA) | integration | same command | ❌ NEW FILE |
| DEPLOY-01 | `prisma migrate deploy` succeeds against `DIRECT_URL` | manual (Vercel build log) | smoke checklist item | 30-VERIFICATION.md |
| DEPLOY-02 | Every response has CSP + HSTS + XFO + nosniff + Referrer-Policy + Permissions-Policy | manual (`curl -I https://<prod-url>`) | smoke checklist item | 30-VERIFICATION.md |
| DEPLOY-02 | CSP header contains `nonce-` substring (non-empty) | manual | smoke checklist item | 30-VERIFICATION.md |
| DEPLOY-02 | HSTS NOT present on `http://localhost:3000` in `next dev` | manual (`curl -I http://localhost:3000`) | smoke checklist item | 30-VERIFICATION.md |
| DEPLOY-03 | `seed.prod.ts` is idempotent (run twice, admin exists once, password NOT rotated) | manual | smoke checklist item | 30-VERIFICATION.md |
| DEPLOY-04 | App is reachable on the Vercel URL with all env vars configured | manual | smoke checklist item | 30-VERIFICATION.md |
| Boot validator | Missing AUTH_SECRET → immediate throw with clear message | unit | `npx vitest run src/lib/env.test.ts` | ❌ NEW (optional) |
| Boot validator | NODE_ENV=production + RATE_LIMIT_DISABLED=true → throw | unit | same | ❌ NEW (optional) |

### Sampling Rate
- **Per task commit:** `npm run test:run` (unit, fast)
- **Per wave merge:** `npm run test:integration` (DB-backed, slow but thorough)
- **Phase gate:** `npm run quality && npm run test:integration` — all green before marking Phase 30 complete.

### Wave 0 Gaps
- [ ] `tests/integration/isolation-actions.test.ts` — NEW FILE, covers TEST-03 mutation-IDOR surface
- [ ] `src/lib/env.test.ts` — OPTIONAL unit tests for the validator (missing var throws, production guard throws). Recommend adding; boot-time validator without tests is a gap.
- [ ] `src/lib/env.ts` — NEW module (D-18); test can be co-located

## Security Domain

`security_enforcement` is absent from config, so treated as enabled.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes (carried from Phases 26/29) | NextAuth v5 + bcryptjs cost 12 + TOTP |
| V3 Session Management | yes | JWT 30d, `requireAuth()` helper, HSTS (DEPLOY-02), secure cookies (Auth.js v5 default when `useSecureCookies` → true via HTTPS) |
| V4 Access Control | yes (core of TEST-03) | `findFirst({ where: { id, userId } })` IDOR pattern (Phase 27); cross-user mutation tests (D-23) |
| V5 Input Validation | yes | Zod schemas for env.ts (D-19); existing Zod across all actions |
| V6 Cryptography | yes | AES-256-GCM (Phase 29 totp-crypto); bcryptjs cost 12; HMAC-SHA256 challenge (Phase 29); AUTH_SECRET derivation (Auth.js v5) |
| V10 Malicious Code | yes | CSP with nonce + strict-dynamic (DEPLOY-02); no `unsafe-inline` on `script-src` |
| V14 Configuration | yes (focus of DEPLOY-04 + D-18) | Boot-time env validation; HSTS preload-eligible; secrets in env only; no `.env` commits |

### Known Threat Patterns for Next.js 16 + Prisma + Vercel

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| XSS via inline script injection | Tampering / Elevation | CSP `script-src 'self' 'nonce-{x}' 'strict-dynamic'` blocks any script without the fresh nonce |
| Clickjacking (iframe embed) | Tampering | `X-Frame-Options: DENY` + CSP `frame-ancestors 'none'` (defense-in-depth) |
| MIME-sniffing attack on user-uploaded content | Tampering | `X-Content-Type-Options: nosniff` |
| Downgrade attack (HTTPS→HTTP MITM) | Tampering | HSTS `max-age=63072000; includeSubDomains; preload` |
| Session hijack via leaked Referer | Information Disclosure | `Referrer-Policy: strict-origin-when-cross-origin` |
| IDOR on Server Action (row-ID parameter) | Elevation of Privilege | `findFirst({ where: { id, userId: session.userId } })` before update/delete — existing Phase 27 pattern; verified by new `isolation-actions.test.ts` |
| Bypass of CVE-2025-29927 middleware skip | Elevation of Privilege | `requireAuth()` in every Server Action (Phase 27); proxy.ts is defense-in-depth, not the primary control |
| Credential stuffing on /login | Elevation of Privilege | Upstash rate limit 5/60s keyed by `email:ip` (Phase 29) |
| SQL injection | Tampering | Prisma parameterized queries exclusively; grep gate forbids raw SQL in CLAUDE.md |
| Pooled-connection DDL lock | Denial of Service | Prisma CLI uses `DIRECT_URL` (D-03); runtime uses `DATABASE_URL` (pooled) |
| Exposed secrets in client bundle | Information Disclosure | Next.js 16 enforces: only `NEXT_PUBLIC_*` env vars reach client. Our prod secrets (AUTH_SECRET, AUTH_TOTP_ENCRYPTION_KEY, UPSTASH_*) have no `NEXT_PUBLIC_` prefix — safe. |
| Production rate-limit bypass | Elevation of Privilege | D-20: `env.ts` asserts `RATE_LIMIT_DISABLED !== 'true'` when `NODE_ENV === 'production'` |

## Code Excerpts

### `src/lib/env.ts` (NEW — D-18, D-19, D-20)

```typescript
// src/lib/env.ts — boot-time production env validator (D-18, D-19, D-20)
// Validated on first import. All consumers use `env.X` instead of `process.env.X`.
import { z } from 'zod'

const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    AUTH_SECRET: z
      .string()
      .min(32, 'AUTH_SECRET must be at least 32 characters. Generate: openssl rand -hex 32'),
    AUTH_TOTP_ENCRYPTION_KEY: z
      .string()
      .regex(
        /^[0-9a-fA-F]{64}$/,
        'AUTH_TOTP_ENCRYPTION_KEY must be a 64-char hex string (32 bytes). Generate: openssl rand -hex 32',
      ),
    UPSTASH_REDIS_REST_URL: z.string().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
    RATE_LIMIT_DISABLED: z.string().optional(),
    // ADMIN_EMAIL / ADMIN_PASSWORD — NOT validated here; seed.prod.ts validates at its own boundary
  })
  .superRefine((v, ctx) => {
    if (v.NODE_ENV === 'production') {
      if (!v.UPSTASH_REDIS_REST_URL)
        ctx.addIssue({
          code: 'custom',
          path: ['UPSTASH_REDIS_REST_URL'],
          message: 'UPSTASH_REDIS_REST_URL is required in production (Phase 29 D-24).',
        })
      if (!v.UPSTASH_REDIS_REST_TOKEN)
        ctx.addIssue({
          code: 'custom',
          path: ['UPSTASH_REDIS_REST_TOKEN'],
          message: 'UPSTASH_REDIS_REST_TOKEN is required in production (Phase 29 D-24).',
        })
      if (v.RATE_LIMIT_DISABLED === 'true')
        ctx.addIssue({
          code: 'custom',
          path: ['RATE_LIMIT_DISABLED'],
          message: 'RATE_LIMIT_DISABLED must not be "true" in production (D-20).',
        })
    }
  })

const parsed = schema.safeParse(process.env)
if (!parsed.success) {
  // D-31 — throw, never console.log. Zod's message format is already operator-friendly.
  throw new Error(
    `Invalid environment configuration:\n${parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n')}`,
  )
}

export const env = parsed.data
export type Env = typeof env
```

### `prisma.config.ts` (EXTEND — D-03)

```typescript
// prisma.config.ts — CLI uses DIRECT_URL for migrations + seed (bypasses pooler)
// Runtime (src/lib/prisma.ts) keeps DATABASE_URL via @prisma/adapter-pg.
import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'npx tsx prisma/seed.ts', // dev seed; prod seed via npm run db:seed:prod
  },
  datasource: {
    // CHANGED: was env('DATABASE_URL'). Prisma 7 removed datasource.directUrl,
    // so CLI operations route through DIRECT_URL exclusively. Runtime code in
    // src/lib/prisma.ts still reads DATABASE_URL (pooled) via env.ts.
    url: env('DIRECT_URL'),
  },
})
```

### `next.config.ts` (EXTEND — D-05, D-07)

```typescript
// next.config.ts — static security headers (HSTS only in production)
import type { NextConfig } from 'next'

const isProduction = process.env.NODE_ENV === 'production'

const staticSecurityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
  },
  // HSTS only in production — sticky on localhost would brick local dev (see Pitfall #2)
  ...(isProduction
    ? [
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=63072000; includeSubDomains; preload',
        },
      ]
    : []),
]

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: staticSecurityHeaders,
      },
    ]
  },
}

export default nextConfig
```

### `src/proxy.ts` (EXTEND — D-05, D-06)

```typescript
// src/proxy.ts — existing auth() redirect + CSP-with-nonce header
// Source pattern: node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md L44-87
import { auth } from '@/auth'
import { NextResponse } from 'next/server'

const publicPaths = ['/login', '/register']

export const proxy = auth((req) => {
  const { pathname } = req.nextUrl

  // --- Existing auth redirect logic (Phase 26) — DO NOT CHANGE ORDERING ---
  const isPublic = publicPaths.some((path) => pathname.startsWith(path))

  let response: NextResponse
  if (isPublic) {
    if (req.auth) {
      response = NextResponse.redirect(new URL('/', req.nextUrl.origin))
    } else {
      response = NextResponse.next()
    }
  } else if (!req.auth) {
    const loginUrl = new URL('/login', req.nextUrl.origin)
    loginUrl.searchParams.set('callbackUrl', pathname)
    response = NextResponse.redirect(loginUrl)
  } else {
    response = NextResponse.next()
  }

  // --- Phase 30 D-05/D-06 — CSP with per-request nonce ---
  // Don't attach CSP to redirects (browser discards the body anyway).
  if (response.status >= 300 && response.status < 400) {
    return response
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const isDev = process.env.NODE_ENV !== 'production'

  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    `style-src 'self' 'unsafe-inline'`, // Tailwind v4 + React 19 trade-off (D-06)
    `img-src 'self' data: blob:`,       // QR codes (Phase 29) + backup-code download blob
    `font-src 'self' data:`,
    `connect-src 'self' https://*.upstash.io`,
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `object-src 'none'`,
    `upgrade-insecure-requests`,
  ].join('; ')

  // Inject nonce into downstream request headers so Server Components can
  // read it via headers().get('x-nonce') if they render <Script nonce={...}>
  const requestHeaders = new Headers(req.headers)
  requestHeaders.set('x-nonce', nonce)

  // Clone the response with updated request headers (Next.js auto-applies
  // the nonce to framework scripts when the CSP header names it)
  const responseWithNonce = NextResponse.next({ request: { headers: requestHeaders } })

  // Preserve any Set-Cookie from the redirect path (not applicable to auth()
  // middleware in our current shape, but defensive).
  response.headers.forEach((v, k) => responseWithNonce.headers.set(k, v))
  responseWithNonce.headers.set('Content-Security-Policy', csp)
  return responseWithNonce
})

export const config = {
  matcher: [
    // Match all except Next internals, favicons, fonts, and api/auth (NextAuth handles own CSP-free responses)
    '/((?!api/auth|_next/static|_next/image|favicon.ico|fonts).*)',
  ],
}
```

### `prisma/seed.prod.ts` (NEW — D-09, D-10, D-12)

```typescript
// prisma/seed.prod.ts — production seed (admin user only, idempotent, no rotate-on-exists)
// Run manually post-deploy: `vercel env pull .env.production && npm run db:seed:prod`
// NEVER wire into the Vercel build command (D-11).
import 'dotenv/config'
import { PrismaClient } from '../generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

const email = process.env.ADMIN_EMAIL
const password = process.env.ADMIN_PASSWORD
if (!email) throw new Error('ADMIN_EMAIL is required for production seed.')
if (!password || password.length < 12)
  throw new Error('ADMIN_PASSWORD is required and must be at least 12 characters.')

// Uses DATABASE_URL (pooled) — seed.prod is small (one row upsert), pooler is fine.
// Use DIRECT_URL if operator is behind a tight pgbouncer config. Document both.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } })

  if (existing) {
    // D-10 — idempotent, DO NOT rotate password on re-run. Ensure flags are correct.
    await prisma.user.update({
      where: { email },
      data: { isAdmin: true, isApproved: true },
    })
    console.log(`Admin user ${email} already exists — flags verified (password NOT rotated).`)
    return
  }

  const hashedPassword = await bcrypt.hash(password, 12)
  await prisma.user.create({
    data: {
      email,
      hashedPassword,
      isAdmin: true,
      isApproved: true,
      totpEnabled: false,
    },
  })
  console.log(`Admin user ${email} created.`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (err) => {
    console.error(err)
    await prisma.$disconnect()
    process.exit(1)
  })
```

### `tests/integration/isolation-actions.test.ts` (NEW — D-23)

```typescript
// tests/integration/isolation-actions.test.ts — Server Action IDOR coverage (Phase 30 D-23)
// Mocks auth() / requireAuth() to return User A's session. Calls mutation actions with
// User B's row IDs. Expects every action to either return an explicit error or silently
// no-op — NEVER successful mutation. Verifies DB post-action state is unchanged.
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { prisma } from '../setup'

// Same next-auth mock pattern as tests/integration/isolation.test.ts L5-20
vi.mock('next-auth', () => ({
  default: () => ({ handlers: {}, signIn: vi.fn(), signOut: vi.fn(), auth: vi.fn() }),
}))
vi.mock('@auth/prisma-adapter', () => ({ PrismaAdapter: vi.fn() }))
vi.mock('next-auth/providers/credentials', () => ({ default: vi.fn(() => ({})) }))
vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: Object.assign(
    vi.fn().mockImplementation(() => ({
      limit: vi.fn().mockResolvedValue({ success: true, limit: 5, remaining: 4, reset: Date.now() + 60000 }),
    })),
    { slidingWindow: vi.fn(), fixedWindow: vi.fn() },
  ),
}))
vi.mock('@upstash/redis', () => ({ Redis: { fromEnv: vi.fn(() => ({})) } }))

// MOCK auth() and requireAuth() to return User A's session per-test
const mockRequireAuth = vi.fn()
vi.mock('@/lib/auth-utils', () => ({
  requireAuth: () => mockRequireAuth(),
}))

// REAL imports after mocks
import { updateTransactionAction } from '@/app/(app)/movimientos/actions'
// import other action files as needed...

let userAId: string
let userBId: string
let userBTransactionId: string

beforeAll(async () => {
  const a = await prisma.user.create({
    data: { email: `isolation-a-${Date.now()}@test.com`, hashedPassword: 'x', isApproved: true },
  })
  userAId = a.id
  const b = await prisma.user.create({
    data: { email: `isolation-b-${Date.now()}@test.com`, hashedPassword: 'x', isApproved: true },
  })
  userBId = b.id

  // Seed one row per entity owned by User B
  const period = await prisma.period.create({
    data: { month: 1, year: 2099, startDate: new Date('2099-01-01'), endDate: new Date('2099-01-31'), userId: userBId },
  })
  const category = await prisma.category.create({
    data: { name: `iso-cat-${Date.now()}`, icon: 'x', color: '#fff', type: 'EXPENSE', userId: userBId },
  })
  const txn = await prisma.transaction.create({
    data: {
      type: 'EXPENSE',
      amount: BigInt(100000),
      categoryId: category.id,
      date: new Date('2099-01-15'),
      periodId: period.id,
      userId: userBId,
    },
  })
  userBTransactionId = txn.id
  // Seed BackupCode / Debt / Budget / IncomeSource / etc. similarly
}, 30000)

afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: { in: [userAId, userBId] } } })
})

describe('Server Action cross-user IDOR — Transaction', () => {
  it('User A cannot update User B\'s transaction via updateTransactionAction', async () => {
    mockRequireAuth.mockResolvedValue({ userId: userAId })

    const formData = new FormData()
    formData.set('id', userBTransactionId)
    formData.set('amount', '999999')
    // ... other required fields

    const result = await updateTransactionAction(undefined, formData)
    // Accept either error return OR silent no-op; never success mutation
    expect(result).toBeDefined()

    // Verify DB unchanged
    const after = await prisma.transaction.findUnique({ where: { id: userBTransactionId } })
    expect(after?.amount).toBe(BigInt(100000)) // original value
    expect(after?.userId).toBe(userBId) // ownership unchanged
  })

  // Similar tests for createTransactionAction (no-op or error), deleteTransactionAction, etc.
  // ≥10 action-IDOR test cases across all mutation surfaces per D-26
})

// describe('Server Action cross-user IDOR — Debt') { ... }
// describe('Server Action cross-user IDOR — Budget') { ... }
// describe('Server Action cross-user IDOR — IncomeSource') { ... }
// describe('Server Action cross-user IDOR — Category') { ... }
// describe('Server Action cross-user IDOR — TOTP (disableTotpAction session-bound)') { ... }
// describe('Server Action cross-user IDOR — Backup codes (regenerate session-bound)') { ... }
```

### `.env.example` (EXTEND — D-13 canonical_refs)

```bash
# --- Database ---
# Local dev: single URL (Docker Postgres)
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"

# Vercel production (auto-injected by Marketplace integration):
#   DATABASE_URL          → postgres://user:pass@pooled.db.prisma.io:5432/...  (pooled, runtime)
# Manual add via Vercel Project Settings (copy from Prisma Console):
#   DIRECT_URL            → postgres://user:pass@db.prisma.io:5432/...         (direct, migrations + seed)
DIRECT_URL=""

# --- Auth.js v5 ---
# Min 32 chars. Generate: openssl rand -hex 32
AUTH_SECRET=your-auth-secret-here

# AES-256-GCM key for TOTP secrets (Phase 29 D-07).
# MUST be exactly 64 hex chars (32 bytes). Generate: openssl rand -hex 32
AUTH_TOTP_ENCRYPTION_KEY=your-64-hex-character-totp-encryption-key-here

# --- Admin seed (read ONLY by prisma/seed.prod.ts — not at app runtime) ---
# Min password length: 12 chars.
ADMIN_EMAIL=your-admin-email@example.com
ADMIN_PASSWORD=your-admin-password-here

# --- Upstash Redis (rate limiting, Phase 29 D-24) ---
# Required in production. Local dev uses RATE_LIMIT_DISABLED=true to bypass.
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# --- Development-only flags ---
# Bypass rate limiter (D-26). MUST be unset or "false" in production (enforced by env.ts D-20).
RATE_LIMIT_DISABLED=true

# DEBUG must NOT be set in production (D-30 — env.ts warns if set with NODE_ENV=production).
# DEBUG=
```

## State of the Art

| Old Approach (pre-Phase 30) | Current Approach (Phase 30) | Impact |
|-----------------------------|------------------------------|--------|
| `src/proxy.ts` redirects only | Redirects + CSP nonce + nonce-injected request headers | Enforces strict CSP on every response; breaks any accidentally-introduced inline script |
| Scattered `process.env.X` lookups in libs | Single `src/lib/env.ts` validator module | Fail-fast at boot; one place to audit prod-required vars |
| `next.config.ts` empty | `async headers()` with static security headers | Defense-in-depth that costs nothing at runtime |
| `prisma.config.ts` `url = env('DATABASE_URL')` (same URL for CLI + runtime) | `prisma.config.ts` `url = env('DIRECT_URL')` for CLI; runtime keeps DATABASE_URL | Migrations work through direct connection; pooler drops DDL locks fail |
| `prisma/seed.ts` for dev (demo data) | NEW `prisma/seed.prod.ts` (admin only, idempotent no-rotate) | Clean production DB; operator has repeatable runbook |
| Single `isolation.test.ts` covering 6 entities | Extended to 9 + NEW `isolation-actions.test.ts` covering mutation surface | Closes Phase-27-to-29's accumulated Server Action surface area |

**Deprecated / outdated:**
- **Prisma 6.x `datasource { directUrl }`** — removed in Prisma 7. Documented in Prisma 7 upgrade guide. [CITED: https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-versions/upgrading-to-prisma-7]
- **Vercel Postgres (Neon-backed 2023 product)** — sunset Dec 2024, auto-migrated to Neon Marketplace. CONTEXT D-01's env-var trio (DATABASE_URL + POSTGRES_PRISMA_URL + POSTGRES_URL_NON_POOLING) reflects this legacy. Current Prisma Postgres integration is different.
- **Next.js `middleware.ts`** — renamed to `proxy.ts` in v16. Project is already on the new name (Phase 26 decision).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `connect-src 'self' https://*.upstash.io` permits `@upstash/redis` REST calls from Next.js server-rendered / Server Action code | §Code Excerpts (proxy.ts CSP) | LOW — `connect-src` applies to client-originated connections (fetch, WebSocket, EventSource). Server-side `@upstash/redis` runs in Node, not the browser, so it's unaffected by CSP. The directive is defensive for a future client-side rate-limit display. [ASSUMED] |
| A2 | `<a download>` blob URL for backup-code download (Phase 29) is allowed by `img-src 'self' blob:` | §Code Excerpts (proxy.ts CSP) | LOW — `blob:` for `<a download>` is not gated by CSP `img-src` (it's not an image). The download-link create via `URL.createObjectURL` is unrestricted. CSP `blob:` in `img-src` was included because QR data URIs might be delivered as blob in some browsers. [ASSUMED] |
| A3 | Auth.js v5 does NOT enforce a min 32-char AUTH_SECRET internally | §Pitfalls | LOW — verified by reading `node_modules/@auth/core/src/lib/utils/assert.ts` L100: only `!options.secret?.length` check. Our env.ts adds the min-32 guard. [VERIFIED by source inspection] |
| A4 | `prisma migrate deploy` is non-interactive and safe in Vercel's non-TTY build | §Pitfalls | LOW — `migrate deploy` is designed for CI; unlike `migrate dev` it never prompts. Community consensus + official docs. [CITED: https://www.prisma.io/docs/orm/prisma-migrate/getting-started — "prisma migrate deploy" is the production command] |
| A5 | Next.js 16 auto-attaches the CSP nonce to its own inline scripts/styles when a `Content-Security-Policy` header containing `'nonce-{value}'` is present on the response | §Pattern 2 | LOW — explicitly documented. [CITED: `node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md` L179-193 "Next.js extracts the nonce"] |
| A6 | Tailwind v4 + React 19 emit inline styles that require `style-src 'unsafe-inline'` in production | §Pattern 2, §Pitfalls | MEDIUM — Next.js docs example uses `style-src 'self' 'nonce-${nonce}'` (no unsafe-inline), but the example assumes no Tailwind-style-tag-inject. Community reports (tailwindlabs/tailwindcss#13326) show Tailwind v4 inline style attributes on elements are NOT nonceable — only `<style>` tags are. D-06 accepts `'unsafe-inline'` as the trade-off; this is documented but not independently verified against Centik's exact Tailwind-v4 output. Planner should verify by running `next build && curl -I https://<deploy>/` and checking for CSP violations in browser console. [ASSUMED — needs operator verification in smoke checklist] |
| A7 | Vercel build runs `npm install` (triggers `postinstall: prisma generate`) before the build command | §D-16 | LOW — documented Vercel behavior. [CITED: https://vercel.com/docs — default Install Command is `npm install`] |
| A8 | `source: '/(.*)'` in next.config.ts `headers()` matches all paths including `/`, `/login`, nested paths | §Code Excerpts | LOW — path-to-regexp standard. Verified in Next docs. [CITED: `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/headers.md` L77-106] |
| A9 | `prisma/seed.prod.ts` using `DATABASE_URL` (pooled) is safe for a single-row upsert | §Code Excerpts | LOW — upsert is a single statement; the pooler handles it fine. If operator prefers `DIRECT_URL`, one-line change. Document both options. [ASSUMED] |
| A10 | Existing `tests/integration/isolation.test.ts` two-user pattern extends cleanly to MonthlySummary + Asset + ValueUnit + UnitRate + BackupCode | §D-22 | LOW — inspected the test file; models have `userId` + `onDelete: Cascade` (schema.prisma L72-82). Same `createMany` + `findMany where userId` shape works. [VERIFIED by code inspection] |

## Open Questions (RESOLVED)

> All five questions are resolved below. Each `RESOLVED:` line is the locked answer that downstream agents must honor.

1. **`DIRECT_URL` naming consistency across integrations.**
   - **RESOLVED:** Use `DIRECT_URL` as the env-var name. Document in `.env.example` and `30-VERIFICATION.md`.
   - Rationale: Shortest, matches Prisma 6.x convention, avoids confusion with the legacy Vercel Postgres `POSTGRES_URL_NON_POOLING` variable.

2. **Should the production seed use `DATABASE_URL` or `DIRECT_URL`?**
   - **RESOLVED:** Use `DATABASE_URL` (pooled) in `seed.prod.ts`. The pooler handles single-row upserts fine.
   - Rationale: Simpler; no transaction-mode-incompatible SQL in the seed. Document `DIRECT_URL` as a one-line fallback if the operator ever hits pooler quirks.

3. **Does `next.config.ts` `async headers()` run on `api/auth/*` routes?**
   - **RESOLVED:** Yes, and that's fine. `source: '/(.*)'` covers everything; Auth.js response-merges Next's headers without issue.
   - Rationale + verification: covered by smoke-checklist step `curl -I https://<prod>/api/auth/csrf` in 30-VERIFICATION.md. If an issue surfaces, narrow the matcher to exclude `api/auth` as a follow-up.

4. **Does Tailwind v4 need `style-src 'unsafe-inline'` in production builds?**
   - **RESOLVED:** Yes — accept `'unsafe-inline'` for `style-src` per CONTEXT D-06. Add a smoke-check item to verify zero CSP violations in DevTools Console.
   - Rationale: Tailwind v4 emits styles React 19 can nonce only at `<style>` tag level, not at attribute level. Trade-off documented in CONTEXT D-06.

5. **Should `isolation-actions.test.ts` also cover READ actions (not just mutations)?**
   - **RESOLVED:** No — Phase 30 focuses on MUTATIONS (D-23). The read surface is already covered by the extended `isolation.test.ts` query-level tests.
   - Rationale: D-24 explicitly scopes this phase to mutation IDOR defense. Future phase can extend the file if a getter Server Action is added.

## Recommended Plan Decomposition

Six plans, sequenced by dependency. Plans can fork into parallel tasks where file-disjoint.

### Plan 30-01: Prisma Postgres Schema + Config Surgery (DEPLOY-01, D-01..D-04)
**Goal:** Prepare the Prisma layer for Vercel Prisma Postgres; enable dual-URL pattern within Prisma 7 constraints.
**Files touched:**
- `prisma.config.ts` (EXTEND — change `datasource.url` from `env('DATABASE_URL')` to `env('DIRECT_URL')`)
- `prisma/schema.prisma` (VERIFY — datasource block is minimal; no changes needed because Prisma 7 moved url to config file. ⚠ CONTEXT D-03's "add directUrl to schema.prisma" is NOT applicable in Prisma 7.)
- `.env.example` (EXTEND — document `DATABASE_URL` (pooled) vs `DIRECT_URL` (direct) with Vercel Marketplace context)
- `.env` (ADD — local `DIRECT_URL` alias for Docker Postgres: set it equal to `DATABASE_URL` for local dev since localhost has no pooler)
- `.env.test` (ADD — same alias pattern)
- `src/lib/prisma.ts` (MINIMAL — once env.ts exists, swap `process.env.DATABASE_URL` → `env.DATABASE_URL`; otherwise no change)

**Verify:**
- `npx prisma validate` passes.
- `npx prisma migrate deploy` runs against local Docker Postgres using `DIRECT_URL` (= DATABASE_URL alias).
- `npm run test:integration` passes unchanged.
- `npm run db:seed` still works.

### Plan 30-02: Boot-Time Env Validator + Consumer Refactor (D-18..D-21)
**Goal:** Single source of truth for env vars; app fails fast on bad config.
**Files touched:**
- `src/lib/env.ts` (NEW)
- `src/lib/env.test.ts` (NEW, optional but recommended — cover: missing var throws, NODE_ENV=prod + RATE_LIMIT_DISABLED=true throws, happy path parses)
- `src/lib/prisma.ts` (EXTEND — `process.env.DATABASE_URL` → `env.DATABASE_URL`)
- `src/lib/rate-limit.ts` (EXTEND — `process.env.RATE_LIMIT_DISABLED` → `env.RATE_LIMIT_DISABLED`; `process.env.NODE_ENV` → `env.NODE_ENV`; `Redis.fromEnv()` continues to work — it reads from process.env directly and env.ts already validated it)
- `src/lib/totp-crypto.ts` (EXTEND — `process.env.AUTH_TOTP_ENCRYPTION_KEY` → `env.AUTH_TOTP_ENCRYPTION_KEY`; remove local `loadKey()` validator since env.ts handles it)

**Verify:**
- `npm run test:run` passes (all unit tests)
- `npm run test:integration` passes
- Grep for `process.env` in `src/lib/` shows only env.ts itself + `rate-limit.ts` `Redis.fromEnv()` (which is unavoidable Upstash convention)

### Plan 30-03: Security Headers — next.config.ts + proxy.ts (DEPLOY-02, D-05..D-08)
**Goal:** CSP with nonce + full static-header suite on every response.
**Files touched:**
- `next.config.ts` (EXTEND — `async headers()` with `staticSecurityHeaders`; HSTS runtime-gated by NODE_ENV)
- `src/proxy.ts` (EXTEND — preserve existing auth() chain; add nonce generation + CSP header set on non-redirect responses; merge response headers correctly)

**Verify:**
- `npm run build` passes (zero errors, zero warnings)
- `npm run test:integration` passes (auth flow tests don't regress)
- Manual: `curl -I http://localhost:3000/login` shows X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, CSP with fresh nonce; does NOT show HSTS (dev mode).
- Manual: Browse to dashboard → DevTools Console shows zero CSP violations.
- Manual: `grep -c "nonce-" <curl response>` returns 1.

### Plan 30-04: Production Seed (DEPLOY-03, D-09..D-12)
**Goal:** Idempotent admin-only seed + npm script + documentation.
**Files touched:**
- `prisma/seed.prod.ts` (NEW)
- `package.json` (EXTEND — add `"db:seed:prod": "tsx prisma/seed.prod.ts"` under `scripts`)
- `.env.example` (EXTEND — ADMIN_EMAIL + ADMIN_PASSWORD comments referencing seed.prod.ts)

**Verify:**
- Local: `ADMIN_EMAIL=test@example.com ADMIN_PASSWORD=test-password-1234 npm run db:seed:prod` succeeds (creates user).
- Local: Re-run same command succeeds with "already exists" log; password hash unchanged in DB.
- `npm run build` passes.

### Plan 30-05: Cross-User Isolation Test Expansion (ISOL-05, TEST-03, D-22..D-26)
**Goal:** Prove Phase 27's per-user discipline holds across all entities and all Server Action mutation paths.
**Files touched:**
- `tests/integration/isolation.test.ts` (EXTEND — 3 new `it()` blocks for MonthlySummary, Asset/ValueUnit/UnitRate, BackupCode; update `beforeAll` to seed representative data for each; update `afterAll` to clean them)
- `tests/integration/isolation-actions.test.ts` (NEW — ≥10 Server Action IDOR test cases across 6+ mutation surfaces)

**Verify:**
- `npm run test:integration` passes; new tests execute and pass.
- Existing 7 isolation tests still pass; TOTP integration tests still pass.

### Plan 30-06: Deploy Runbook + Smoke Checklist (DEPLOY-04, D-27..D-31)
**Goal:** Operator-ready deploy documentation.
**Files touched:**
- `.planning/phases/30-vercel-deploy-security-hardening/30-VERIFICATION.md` (NEW — 11-item D-27 checklist + the Vercel UI runbook: provision Prisma Postgres, set env vars, configure build command, deploy, run `db:seed:prod` from local one-shot)
- OPTIONAL `30-DEPLOY-RUNBOOK.md` — separate from verification if the provision steps balloon.

**Verify:**
- `npm run quality` passes (build + lint + format + unit)
- `npm run test:integration` passes
- Document is readable stand-alone by a human operator with no Claude assistance.

### Dependency Graph

```
30-01 (Prisma config) ──┐
                         ├──▶ 30-02 (env.ts) ──▶ 30-03 (headers) ──▶ 30-06 (runbook)
                         │                                              ▲
                         └─────────────────────▶ 30-04 (seed.prod) ─────┤
                                                                        │
                                                  30-05 (isolation tests) ─┘
```

- 30-01, 30-02 land first (Prisma config + env foundation).
- 30-03, 30-04, 30-05 can run in parallel (file-disjoint).
- 30-06 gates phase completion (smoke checklist + manual deploy).

## Project Constraints (from CLAUDE.md)

Research confirms all plans must comply with:
- **Quality Loop mandatory** (build + lint + format + test + security review) — every commit in every plan.
- **npm, not pnpm** (MEMORY.md) — no `pnpm` references in docs or scripts.
- **Spanish UI** (es-MX) — N/A for Phase 30 (infrastructure only; no user-facing UI changes).
- **Lucide icons only, no emojis** — N/A for Phase 30.
- **Files <300 lines, functions <50 lines** — `env.ts` estimated ~60 lines; `seed.prod.ts` ~50; `isolation-actions.test.ts` will grow — keep each `describe` block focused; split if >300.
- **No `any` / `@ts-ignore`** — env.ts must have fully-typed `env` export.
- **BigInt serialization** — N/A (no API routes in this phase).
- **Input validation with Zod** — env.ts uses Zod (D-19).
- **No `console.log` in production** — D-31; new env.ts throws on error, doesn't log.
- **No skipping tests** — `isolation-actions.test.ts` must be real passing tests, not `it.skip`.
- **Security rules** — every header, every key, every secret handled per the Security Rules in CLAUDE.md. Verified in §Security Domain.

## Sources

### Primary (HIGH confidence)
- **Next.js 16 docs bundled in node_modules** (authoritative):
  - `node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md` — CSP-with-nonce proxy example, nonce auto-application, dynamic-rendering requirement
  - `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md` — proxy.ts convention, execution order, NextResponse header patterns
  - `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/headers.md` — `async headers()` shape, path matching, built-in security-header recommendations (HSTS, X-Frame-Options, Permissions-Policy, nosniff, Referrer-Policy)
  - `node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md` — confirms middleware→proxy rename; Node 20.9+ minimum
  - `node_modules/next/dist/docs/01-app/02-guides/data-security.md` — DAL pattern + Server-Action authorization reminders
- **Existing Phase 29 integration test pattern** — `tests/integration/totp.test.ts` L1-300 (cross-user mock structure, two-user `beforeAll`, `authorizeUser` direct call)
- **Existing Phase 27 isolation test** — `tests/integration/isolation.test.ts` L1-214 (6-entity coverage baseline to extend)
- **Project Prisma version** — `npx prisma --version` → 7.6.0 (locally verified)
- **Project Prisma config** — `prisma.config.ts` exists and uses the new Prisma 7 shape (locally verified)

### Secondary (MEDIUM confidence)
- **Vercel Marketplace Prisma Postgres** — https://vercel.com/marketplace/prisma — "sets DATABASE_URL environment variable … operation-based pricing, built-in global caching and connection pooling"
- **Prisma 7 upgrade guide** — https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-versions/upgrading-to-prisma-7 — "url, directUrl, and shadowDatabaseUrl in the datasource block are deprecated"
- **Prisma Postgres connecting** — https://www.prisma.io/docs/postgres/database/connecting-to-your-database — `pooled.db.prisma.io` vs `db.prisma.io` hostnames, `@prisma/adapter-pg` usage
- **Prisma config reference** — https://www.prisma.io/docs/orm/reference/prisma-config-reference — `datasource.url` + `shadowDatabaseUrl` only; no `directUrl`
- **HSTS preload prerequisites** — https://hstspreload.org/ — valid cert, HTTP→HTTPS redirect, all subdomains HTTPS, max-age ≥1yr, includeSubDomains, preload directive
- **Auth.js v5 secret validation** — inspected `node_modules/@auth/core/src/lib/utils/assert.ts` L100 (only checks `!secret?.length`, not length ≥ N)

### Tertiary (LOW confidence — flagged as assumed)
- **Vercel Prisma Postgres DIRECT_URL naming** — no authoritative doc specifies the env-var name the operator should use. Convention `DIRECT_URL` inferred from Prisma 6.x docs and general practice; see Open Question #1.
- **Tailwind v4 inline-style emission specifics** — Assumption A6; operator-verifiable in smoke checklist. Ship `'unsafe-inline'` per D-06 and narrow if the smoke check is clean.

## Metadata

**Confidence breakdown:**
- CSP / security headers: HIGH — ships with Next.js 16, documented and verified.
- Prisma 7 dual-URL pattern: HIGH — documented in Prisma 7 upgrade guide and Prisma Postgres connecting docs; Prisma.config.ts already in project.
- Vercel Prisma Postgres env-var contract: MEDIUM — authoritative source says only DATABASE_URL is injected; DIRECT_URL is operator-managed. CONTEXT D-01's trio reflects a different (sunset) Vercel product.
- Boot-time env validator pattern: HIGH — follows the same "throw on first import" pattern already in `src/lib/totp-crypto.ts` L8-19.
- Cross-user test expansion: HIGH — pattern verified in existing `isolation.test.ts` and `totp.test.ts`.
- Production seed idempotency: HIGH — mirrors `prisma/seed.ts` L23-42 pattern.
- Smoke checklist: MEDIUM — relies on operator discipline; automated where possible but mostly manual by D-28 design.

**Research date:** 2026-04-21
**Valid until:** 2026-05-21 (30 days — Vercel Marketplace + Prisma Postgres are stable; Next.js 16 is current)

## RESEARCH COMPLETE
