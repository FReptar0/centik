---
phase: 30-vercel-deploy-security-hardening
plan: 01
subsystem: infra
tags: [prisma, prisma-7, vercel, postgres, dual-url, pgbouncer, env-config, wave-0]

# Dependency graph
requires:
  - phase: 29-totp-2fa
    provides: "Stable auth surface; .env.test contract; existing src/lib/prisma.ts via @prisma/adapter-pg"
provides:
  - "Prisma 7 dual-URL config (prisma.config.ts datasource.url -> DIRECT_URL)"
  - "Vercel Marketplace Prisma Postgres env-var contract documented in .env.example"
  - "Local DIRECT_URL alias (Docker Postgres has no pooler)"
  - "Wave-0 stubs src/lib/env.ts + src/lib/env.test.ts targeted by Plan 30-02"
affects: [30-02, 30-03, 30-04, 30-05, 30-06]

# Tech tracking
tech-stack:
  added: []  # no new dependencies
  patterns:
    - "Prisma 7 dual-URL: CLI via prisma.config.ts datasource.url = env('DIRECT_URL'); runtime via process.env.DATABASE_URL in src/lib/prisma.ts"
    - "Local DIRECT_URL alias = DATABASE_URL (Docker has no pooler; dev-only equivalence)"
    - "Wave-0 stub pattern: typed passthrough + it.todo placeholders with final API shape"

key-files:
  created:
    - "src/lib/env.ts"
    - "src/lib/env.test.ts"
  modified:
    - "prisma.config.ts"
    - ".env.example"
    - ".env  (gitignored)"
    - ".env.test  (gitignored)"

key-decisions:
  - "[30-01] Prisma 7.6 removed datasource.directUrl from schema.prisma, so the dual-URL split lives entirely in prisma.config.ts — CLI reads DIRECT_URL, runtime reads DATABASE_URL via @prisma/adapter-pg"
  - "[30-01] Local DIRECT_URL = DATABASE_URL alias because Docker Postgres has no pooler; production diverges (DATABASE_URL=pooled.db.prisma.io, DIRECT_URL=db.prisma.io)"
  - "[30-01] Wave-0 env.ts is a typed passthrough (not a validator) — Plan 30-02 replaces with Zod, but the export shape matches the final API so downstream consumers never refactor"
  - "[30-01] env.test.ts stub captures Plan 30-02's test contract as four it.todo entries (missing AUTH_SECRET, production RATE_LIMIT_DISABLED guard, happy-path prod parse, dev minimal parse)"
  - "[30-01] deferred-items.md tracks 3 pre-existing lint warnings in src/app/(app)/movimientos/actions.ts — out of scope for 30-01 (unrelated file)"

patterns-established:
  - "Dual-URL pattern: prisma.config.ts datasource.url reads DIRECT_URL; runtime continues to read DATABASE_URL"
  - "Vercel Marketplace contract doc: .env.example labels which vars Vercel auto-injects vs which operator copies manually from Prisma Console"
  - "Wave-0 stub shape: Plan 30-02 replaces env.ts implementation but public interface (exported `env` object + `Env` type) is frozen now"

requirements-completed: [DEPLOY-01]

# Metrics
duration: 6min
completed: 2026-04-21
---

# Phase 30 Plan 1: Prisma Dual-URL Config + Vercel Contract Docs Summary

**Prisma 7 dual-URL config: prisma.config.ts now routes CLI ops through DIRECT_URL while runtime keeps using DATABASE_URL, Vercel Marketplace Prisma Postgres env-var contract documented, and Wave-0 env stubs created for Plan 30-02.**

## Performance

- **Duration:** 6 min (5m 40s)
- **Started:** 2026-04-21T23:29:52Z
- **Completed:** 2026-04-21T23:35:32Z
- **Tasks:** 3
- **Files modified:** 4 (+ 2 created)

## Accomplishments

- `prisma.config.ts` datasource.url flipped from `env('DATABASE_URL')` to `env('DIRECT_URL')` — required for Vercel build-step migrations which must bypass the pgbouncer transaction pool (DDL-incompatible).
- `.env.example` rewritten with the Vercel Marketplace Prisma Postgres env-var contract clearly labeled: `DATABASE_URL` auto-injected (pooled.db.prisma.io), `DIRECT_URL` manually copied (db.prisma.io). Added ADMIN_EMAIL + ADMIN_PASSWORD section for Plan 30-04 seed and commented `# DEBUG=` guardrail for D-30.
- Local dev preserved: `DIRECT_URL="postgresql://misfinanzas:misfinanzas_dev@localhost:5432/misfinanzas"` appended to `.env` and the equivalent appended to `.env.test`. Docker Postgres has no pooler, so the alias keeps `npx prisma migrate status`, `npx prisma db seed`, and 53 integration tests green.
- Wave-0 stubs created at `src/lib/env.ts` (typed passthrough of `process.env`) and `src/lib/env.test.ts` (4 `it.todo` entries). Public API shape matches the eventual Zod validator so Plan 30-02 can swap internals without breaking downstream imports.

## Task Commits

Each task was committed atomically:

1. **Task 1: Flip prisma.config.ts datasource to DIRECT_URL** — `9fee4d2` (chore)
2. **Task 2: Document DATABASE_URL/DIRECT_URL contract in .env.example** — `4dd81b8` (chore)
3. **Task 3: Alias DIRECT_URL locally + create Wave-0 stubs** — `3c51abd` (test)

**Plan metadata commit:** (next)

## Files Created/Modified

- `prisma.config.ts` — datasource.url now `env('DIRECT_URL')`; added doc comment above block explaining Prisma 7 pattern + D-03 correction.
- `.env.example` — 9 keys under 5 section headers: Database (DATABASE_URL + DIRECT_URL + Vercel contract comment), Auth.js v5 (AUTH_SECRET + AUTH_TOTP_ENCRYPTION_KEY), Admin seed (ADMIN_EMAIL + ADMIN_PASSWORD for 30-04), Upstash Redis (URL + token for rate limiting), Dev flags (RATE_LIMIT_DISABLED=true + commented `# DEBUG=`).
- `.env` (gitignored) — appended `DIRECT_URL="postgresql://misfinanzas:misfinanzas_dev@localhost:5432/misfinanzas"` (aliased to existing DATABASE_URL value).
- `.env.test` (gitignored) — appended `DIRECT_URL="postgresql://misfinanzas:misfinanzas_test@localhost:5433/misfinanzas_test"` (aliased to existing DATABASE_URL value).
- `src/lib/env.ts` — 14 lines. Typed passthrough: `export const env = process.env as unknown as { NODE_ENV, DATABASE_URL, AUTH_SECRET, AUTH_TOTP_ENCRYPTION_KEY, UPSTASH_REDIS_REST_URL?, UPSTASH_REDIS_REST_TOKEN?, RATE_LIMIT_DISABLED? }` + `export type Env`.
- `src/lib/env.test.ts` — 10 lines. 4 `it.todo` entries framing Plan 30-02's test contract.
- `.planning/phases/30-vercel-deploy-security-hardening/deferred-items.md` — new file logging 3 pre-existing lint warnings (unrelated to 30-01).

## Final prisma.config.ts datasource block

```typescript
// CLI operations (migrate deploy, seed, introspect) use DIRECT_URL. Runtime uses DATABASE_URL via @prisma/adapter-pg in src/lib/prisma.ts. Pgbouncer transaction mode (on DATABASE_URL in prod) is DDL-incompatible — prepared statements and DDL locks break. Per D-03, corrected for Prisma 7 removal of datasource.directUrl (RESEARCH §Pitfalls).
datasource: {
  url: env('DIRECT_URL'),
},
```

## .env.example key diff vs pre-Plan-30-01

| Key | Before | After |
|-----|--------|-------|
| `DATABASE_URL` | Present (no section header) | Present (under `# --- Database ---` header, local dev comment) |
| `DIRECT_URL` | *(missing)* | Added, empty by default, with 5-line Vercel contract comment block above it |
| `ADMIN_EMAIL` | Present (no section header) | Present (under `# --- Admin seed ---` header with 30-04 reference) |
| `ADMIN_PASSWORD` | Present (no section header) | Present (under `# --- Admin seed ---` header) |
| `UPSTASH_REDIS_REST_URL` | Present | Present (under `# --- Upstash Redis ---` header with local-bypass note) |
| `RATE_LIMIT_DISABLED` | Present | Present (under `# --- Development-only flags ---` header, references src/lib/env.ts D-20 guardrail) |
| `# DEBUG=` *(commented)* | *(missing)* | Added as commented line with D-30 reference |

## Decisions Made

See `key-decisions` in frontmatter. Key points:

1. Prisma 7 dual-URL lives entirely in `prisma.config.ts` (D-03 mechanism correction per RESEARCH).
2. Local `DIRECT_URL = DATABASE_URL` preserves Docker-Postgres-only dev setup.
3. Wave-0 env.ts is a typed passthrough, not a validator (Plan 30-02 replaces internals; public shape is frozen now).

## Deviations from Plan

None - plan executed exactly as written.

Pre-existing lint warnings in `src/app/(app)/movimientos/actions.ts` (3 `@typescript-eslint/no-unused-vars` on `_error` identifiers, L86/141/173) are out of scope — not caused by Plan 30-01 changes. Logged to `deferred-items.md` per executor scope-boundary rule.

## Issues Encountered

None.

## Verification

- `npx prisma validate` → "The schema at prisma/schema.prisma is valid"
- `npx prisma migrate status` → "Database schema is up to date!" (routes via DIRECT_URL against local Docker Postgres @ localhost:5432)
- `npx prisma db seed` → "Seed completed successfully" (13 April + 9 March transactions + 3 value units + MonthlySummary for March)
- `npm run build` → "Compiled successfully in 9.8s" (11 routes built)
- `npm run lint` → 0 errors, 3 pre-existing warnings (deferred, unrelated to 30-01 files)
- `npm run test:run` → **701 passed | 4 todo | 1 skipped** (+4 new it.todo from env.test.ts stub, 0 regressions)
- `npm run test:integration` → **53 passed** (all 6 integration test files against test DB @ localhost:5433 via aliased DIRECT_URL)

## User Setup Required

None. Plan 30-01 is pure config groundwork. External services (Vercel + Prisma Console) are touched in Plan 30-04/30-05.

## Next Phase Readiness

- **Plan 30-02 (env.ts Zod validator):** Target files exist (`src/lib/env.ts` + `src/lib/env.test.ts`); 4 `it.todo` entries define the test contract. Plan 30-02 only swaps internals; the exported `env` object shape is frozen.
- **Plan 30-04 (seed.prod.ts + Vercel build command):** `.env.example` ADMIN_EMAIL + ADMIN_PASSWORD already documented; `prisma.config.ts` already routes `npx prisma db seed` through DIRECT_URL as required for the production build step.
- **Plan 30-05 (Vercel deploy + secrets):** `.env.example` already labels DATABASE_URL vs DIRECT_URL as auto-injected vs manual — operator will follow the comment block when configuring Vercel Project Settings.

## Self-Check: PASSED

Verified files exist:
- `prisma.config.ts` — FOUND
- `.env.example` — FOUND (9 required keys present)
- `.env` — FOUND (gitignored, DIRECT_URL line confirmed)
- `.env.test` — FOUND (gitignored, DIRECT_URL line confirmed)
- `src/lib/env.ts` — FOUND (exports env + Env type)
- `src/lib/env.test.ts` — FOUND (4 it.todo entries)
- `.planning/phases/30-vercel-deploy-security-hardening/deferred-items.md` — FOUND

Verified commits exist:
- `9fee4d2` (Task 1 chore: prisma.config.ts DIRECT_URL flip) — FOUND in git log
- `4dd81b8` (Task 2 chore: .env.example contract docs) — FOUND in git log
- `3c51abd` (Task 3 test: env.ts + env.test.ts stubs) — FOUND in git log

---
*Phase: 30-vercel-deploy-security-hardening*
*Plan: 01*
*Completed: 2026-04-21*
