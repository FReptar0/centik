---
phase: 30-vercel-deploy-security-hardening
plan: 02
subsystem: infra
tags: [env-validation, zod, boot-time, security, config, fail-fast]

# Dependency graph
requires:
  - phase: 30-vercel-deploy-security-hardening
    plan: 01
    provides: "Wave-0 stubs at src/lib/env.ts (typed passthrough) + src/lib/env.test.ts (it.todo contract)"
provides:
  - "Zod-based boot-time env validator at src/lib/env.ts"
  - "Aggregated error-throwing contract per D-31 (no console.log)"
  - "Production-only superRefine guards for UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN, and RATE_LIMIT_DISABLED (D-19, D-20)"
  - "Typed `env` export consumed by prisma.ts, totp-crypto.ts, rate-limit.ts, challenge.ts"
  - "Side-effect import of '@/lib/env' at the top of src/auth.ts — forces validation at Next.js module load (D-21)"
affects: [30-03, 30-04, 30-05, 30-06]

# Tech tracking
tech-stack:
  added: []  # zod was already a dependency
  patterns:
    - "Boot-time Zod validator: safeParse(process.env) on first import; aggregated Error lists every failing var"
    - "Production-only superRefine: superRefine callback adds issues only when NODE_ENV === 'production' (conditional validation)"
    - "Consumer sweep: all src/lib/*.ts reading AUTH_SECRET / AUTH_TOTP_ENCRYPTION_KEY / NODE_ENV / RATE_LIMIT_DISABLED / DATABASE_URL now import { env } from './env' (one source of truth)"
    - "Test-side pattern: ESM static imports of modules that transitively load env.ts require `vi.mock('@/lib/env', ...)` hoisted above other imports, OR `await import()` inside each test after vi.stubEnv runs"

key-files:
  created: []
  modified:
    - "src/lib/env.ts"
    - "src/lib/env.test.ts"
    - "src/lib/prisma.ts"
    - "src/lib/totp-crypto.ts"
    - "src/lib/totp-crypto.test.ts"
    - "src/lib/rate-limit.ts"
    - "src/lib/rate-limit.test.ts"
    - "src/lib/challenge.ts"
    - "src/lib/challenge.test.ts"
    - "src/auth.ts"
    - "src/auth.test.ts"
    - "src/app/(auth)/register/page.test.tsx"
    - ".env (gitignored — added UPSTASH placeholders; emptied RATE_LIMIT_DISABLED)"

key-decisions:
  - "[30-02] Zod superRefine runs conditionally on NODE_ENV==='production' — lets dev/test skip UPSTASH_* + RATE_LIMIT_DISABLED checks without branching the schema into two types"
  - "[30-02] env.ts throws an AGGREGATED Error message listing every failing key — single throw surface for Vercel build logs, matches D-31 (no console.log)"
  - "[30-02] totp-crypto.ts's hand-rolled loadKey() + KEY_HEX_LENGTH constant DELETED; env.ts's /^[0-9a-fA-F]{64}$/ regex replaces the runtime check (single source of truth)"
  - "[30-02] prisma.ts's null-check on DATABASE_URL DELETED — env.ts guarantees non-empty via .min(1)"
  - "[30-02] challenge.ts BLOCKER fix (plan-checker round 1): getSecret() reads env.AUTH_SECRET instead of process.env.AUTH_SECRET; removed unreachable null-throw branch"
  - "[30-02] rate-limit.ts KEEPS Redis.fromEnv() — Upstash SDK reads UPSTASH_* from process.env internally (SDK convention); env.ts's superRefine has already validated both vars exist in production. Added explanatory comment in place of the old vague one."
  - "[30-02] Removed obsolete `RATE_LIMIT_DISABLED=true bypass in production` test from rate-limit.test.ts — D-20 makes the scenario unreachable at runtime (env.ts throws on module load)"
  - "[30-02] Removed obsolete `throws when AUTH_SECRET is missing at sign time` test from challenge.test.ts — env.ts now rejects that at module load"
  - "[30-02] Rewrote challenge.test.ts from static-import of './challenge' to dynamic `await import()` inside each test — ESM import hoisting evaluated the module BEFORE vi.stubEnv had a chance to set env vars, tripping env.ts's Zod parse"
  - "[30-02] auth.test.ts + register/page.test.tsx add `vi.mock('@/lib/env', ...)` — these files transitively import @/auth, which now has a side-effect import of @/lib/env; mocking is lower-risk than restructuring the static-import chain"
  - "[30-02] env.test.ts covers 7 cases (not 6 as planned) — added UPSTASH_REDIS_REST_TOKEN branch to hit 100% env.ts coverage (92.3% line + 90% branch were insufficient). Deviation Rule 2 (add missing critical testing)"
  - "[30-02] Local `.env` updated with UPSTASH_* placeholder values + empty RATE_LIMIT_DISABLED so `npm run build` (which sets NODE_ENV=production) passes env.ts's D-19/D-20 guards locally. Production on Vercel gets real UPSTASH values from the Marketplace integration."

patterns-established:
  - "`import { env } from '@/lib/env'` is the ONLY sanctioned way to read validated env vars in src/ — direct `process.env.X` for AUTH_SECRET / AUTH_TOTP_ENCRYPTION_KEY / UPSTASH_* is enforced-zero by the grep gate"
  - "For test files importing chains that touch env.ts: use vi.mock('@/lib/env', ...) at the top of the test file (hoisted by vitest above static imports). vi.stubEnv inside beforeEach is too late because ESM import hoisting runs the entire module graph before any test code."
  - "rate-limit.ts's Redis.fromEnv() is the canonical exception — Upstash SDK reads process.env directly, so this is NOT a grep-gate violation (the SDK name does not appear in grep for process.env.UPSTASH_ literals in our code)"

requirements-completed: [DEPLOY-04]

# Metrics
duration: 12min
completed: 2026-04-21
---

# Phase 30 Plan 2: Boot-Time Env Validator + Consumer Sweep Summary

**Boot-time Zod env validator at src/lib/env.ts with aggregated error throw, production-only superRefine for UPSTASH + RATE_LIMIT_DISABLED, and a full sweep of src/lib/ + src/auth.ts consumers onto the validated `env` export — missing or malformed production config now aborts Node before Next.js can serve a single request.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-04-21T23:42:13Z
- **Completed:** 2026-04-21T23:54:49Z
- **Tasks:** 3
- **Files modified:** 12 (+ 1 gitignored .env local-only adjustment)

## Accomplishments

- **Task 1 — env.ts Zod validator (`8be494e`):** Replaced 14-line typed passthrough from Plan 30-01 with 60-line Zod schema validating NODE_ENV + DATABASE_URL + AUTH_SECRET (>=32 chars) + AUTH_TOTP_ENCRYPTION_KEY (64-char hex) + optional UPSTASH_* + optional RATE_LIMIT_DISABLED. `.superRefine` runs production-only guards (require UPSTASH_URL, require UPSTASH_TOKEN, forbid RATE_LIMIT_DISABLED=true). `safeParse(process.env)` on first import; on failure throws an aggregated Error listing every failing var (no console.log, per D-31). Filled env.test.ts with 7 tests (2 happy + 5 failure) for 100% line + branch coverage.
- **Task 2 — consumer sweep (`b639b40`):** 7 files touched.
  - `src/lib/prisma.ts`: `connectionString = env.DATABASE_URL`; `globalForPrisma` gate now `env.NODE_ENV !== 'production'`. Dropped redundant null-check.
  - `src/lib/totp-crypto.ts`: deleted `loadKey()` + `KEY_HEX_LENGTH`; `KEY = Buffer.from(env.AUTH_TOTP_ENCRYPTION_KEY, 'hex')`.
  - `src/lib/rate-limit.ts`: `isBypassed()` now reads `env.NODE_ENV` + `env.RATE_LIMIT_DISABLED`. `Redis.fromEnv()` kept with explanatory comment (Upstash SDK convention).
  - `src/lib/challenge.ts`: BLOCKER fix — `getSecret()` reads `env.AUTH_SECRET`; dropped unreachable null-throw.
  - Three test files adapted (totp-crypto.test.ts, rate-limit.test.ts, challenge.test.ts) with `stubRequiredEnvAround()` helpers that stub ALL env.ts required vars before each dynamic import. Two obsolete tests removed (no longer reachable after env.ts validation).
- **Task 3 — auth.ts side-effect + grep gate closure (`74643e9`):** Added `import '@/lib/env'` as first line of src/auth.ts. Added `vi.mock('@/lib/env', ...)` to src/auth.test.ts + src/app/(auth)/register/page.test.tsx (which transitively import @/auth and would trip env.ts's Zod parse in the jsdom test env). Added 7th env.test.ts case for UPSTASH_REDIS_REST_TOKEN branch to hit 100% coverage.

## Task Commits

Each task was committed atomically:

1. **Task 1: Zod validator + test suite** — `8be494e` (feat)
2. **Task 2: Consumer sweep (prisma + totp-crypto + rate-limit + challenge)** — `b639b40` (feat)
3. **Task 3: auth.ts side-effect + close grep gate** — `74643e9` (feat)

**Plan metadata commit:** (next)

## Files Created/Modified

| File | Change |
|------|--------|
| `src/lib/env.ts` | Full Zod validator (60 lines) — replaces Plan 30-01 14-line stub |
| `src/lib/env.test.ts` | 7 tests (83 lines) — replaces Plan 30-01 it.todo stub, 100% coverage |
| `src/lib/prisma.ts` | `env.DATABASE_URL` + `env.NODE_ENV`; dropped null-check |
| `src/lib/totp-crypto.ts` | Deleted `loadKey()` + `KEY_HEX_LENGTH`; one-line `KEY` derivation from `env.AUTH_TOTP_ENCRYPTION_KEY` |
| `src/lib/totp-crypto.test.ts` | Added `stubRequiredEnvAround()`; relaxed regex `/64-character hex/` -> `/AUTH_TOTP_ENCRYPTION_KEY/` |
| `src/lib/rate-limit.ts` | `env.NODE_ENV` + `env.RATE_LIMIT_DISABLED`; kept `Redis.fromEnv()` with explanatory comment |
| `src/lib/rate-limit.test.ts` | Added `stubRequiredEnvAround()` + UPSTASH stubs in prod tests; removed obsolete D-20-contradicting test |
| `src/lib/challenge.ts` | **BLOCKER fix:** `getSecret()` reads `env.AUTH_SECRET`; dropped unreachable null-throw |
| `src/lib/challenge.test.ts` | Converted to dynamic `await import()` pattern; removed obsolete `throws when AUTH_SECRET missing at sign time` test |
| `src/auth.ts` | Added `import '@/lib/env'` as first line (side-effect only) |
| `src/auth.test.ts` | Added `vi.mock('@/lib/env', ...)` hoisted above other mocks |
| `src/app/(auth)/register/page.test.tsx` | Added `vi.mock('@/lib/env', ...)` hoisted above other mocks |
| `.env` (gitignored) | Added UPSTASH_* placeholders; emptied RATE_LIMIT_DISABLED — so local `npm run build` passes env.ts's production guards |

## Final env.ts Schema Shape

```typescript
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  AUTH_SECRET: z.string().min(32, 'AUTH_SECRET must be at least 32 characters. ...'),
  AUTH_TOTP_ENCRYPTION_KEY: z.string().regex(/^[0-9a-fA-F]{64}$/, '...'),
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  RATE_LIMIT_DISABLED: z.string().optional(),
}).superRefine((v, ctx) => {
  if (v.NODE_ENV === 'production') {
    if (!v.UPSTASH_REDIS_REST_URL) ctx.addIssue({ ..., message: '... required in production ...' })
    if (!v.UPSTASH_REDIS_REST_TOKEN) ctx.addIssue({ ..., message: '... required in production ...' })
    if (v.RATE_LIMIT_DISABLED === 'true') ctx.addIssue({ ..., message: '... must not be "true" in production ...' })
  }
})
```

On failure: single `throw new Error(\`Invalid environment configuration:\n${...}\`)` aggregating all issues.

## Grep Gate Result

Per 30-VALIDATION.md Task 30-02-03:

```bash
grep -rn "process\.env\.AUTH_SECRET\|process\.env\.AUTH_TOTP_ENCRYPTION_KEY\|process\.env\.UPSTASH_" src/ --include="*.ts" | grep -v "src/lib/env.ts"
```

**Returns zero matches.** env.ts is the sole reader of these vars. `Redis.fromEnv()` in rate-limit.ts does not appear in grep output (the literal string `process.env.UPSTASH_` is not present; the SDK reads those vars internally).

## Decisions Made

See `key-decisions` in frontmatter. Key technical turning points:

1. **Dynamic import pattern for test files** — challenge.test.ts was rewritten because ESM static imports are hoisted above `vi.stubEnv`, so env.ts's Zod parse ran before stubs took effect. Switching to `await import('./challenge')` inside each test (after `vi.resetModules()` + `stubRequiredEnvAround()`) fixed the ordering.
2. **vi.mock('@/lib/env', ...) for higher-level test files** — auth.test.ts + register/page.test.tsx use vi.mock hoisting to short-circuit env.ts entirely. Simpler than restructuring their static-import chains.
3. **Obsolete test removal** — two tests were deleted (rate-limit.test.ts's "RATE_LIMIT_DISABLED=true bypass in production" + challenge.test.ts's "throws when AUTH_SECRET missing at sign time"). Both exercised runtime scenarios that env.ts's module-load validation now makes unreachable. Their coverage semantics shift to env.test.ts where they belong.
4. **Local .env adjustment** — gitignored file only; adds UPSTASH_* placeholders + empties RATE_LIMIT_DISABLED so `npm run build` (which sets NODE_ENV=production) doesn't trip D-19/D-20 locally. Production on Vercel uses real Marketplace values.

## Deviations from Plan

### [Rule 2 - Missing Critical Testing] Added 7th env.test.ts case for 100% coverage

- **Found during:** Task 3 coverage check
- **Issue:** Plan specified "6+ tests" and "100% coverage on env.ts". Initial 6 tests produced 92.3% line + 90% branch coverage — the `UPSTASH_REDIS_REST_TOKEN` superRefine branch (L33-38) was reached by NO test (the URL test throws first and short-circuits).
- **Fix:** Added `throws in production when UPSTASH_REDIS_REST_TOKEN is missing (D-19)` test, bringing coverage to 100% line + 100% branch.
- **Files modified:** src/lib/env.test.ts (+6 lines)
- **Commit:** included in `74643e9` (Task 3)

### [Rule 3 - Blocking Issue] Rewrote challenge.test.ts to dynamic import pattern

- **Found during:** Task 2 Part F verify
- **Issue:** After adding `stubRequiredEnvAround()` helper in a `beforeEach`, the 13 existing challenge tests all failed with env.ts's Zod throw. Root cause: `import { signChallenge, verifyChallenge } from './challenge'` at the top of the test file is ESM-hoisted above the `describe()` block's `beforeEach`, so env.ts loads before `vi.stubEnv` runs.
- **Fix:** Rewrote all 13 tests to use `await freshChallengeModule()` inside each `it()`. Helper calls `vi.resetModules()` + `stubRequiredEnvAround()` + `await import('./challenge')` in order.
- **Files modified:** src/lib/challenge.test.ts (full rewrite)
- **Commit:** `b639b40` (Task 2)

### [Rule 3 - Blocking Issue] vi.mock('@/lib/env') added to auth.test.ts + register/page.test.tsx

- **Found during:** Task 3 full-suite regression check
- **Issue:** After adding `import '@/lib/env'` to src/auth.ts, two test files (auth.test.ts + register/page.test.tsx) failed on module load. Both statically import @/auth; the new side-effect tripped env.ts's parse in jsdom where no .env is sourced.
- **Fix:** Added `vi.mock('@/lib/env', () => ({ env: {...} }))` hoisted above other mocks in each file. Provides a valid synthetic env object; bypasses Zod entirely.
- **Files modified:** src/auth.test.ts, src/app/(auth)/register/page.test.tsx (+10 lines each)
- **Commit:** `74643e9` (Task 3)

### [Rule 3 - Blocking Issue] Local `.env` adjusted so `npm run build` passes

- **Found during:** Task 3 quality-loop build step
- **Issue:** `npm run build` invokes `next build` which sets NODE_ENV=production. env.ts's superRefine then rejects the local `.env` (RATE_LIMIT_DISABLED=true is forbidden; UPSTASH_* required). Build output showed all three violations simultaneously.
- **Fix:** Updated `.env` (gitignored — affects only this developer machine) with UPSTASH_* placeholder values (`https://placeholder.upstash.io` + `placeholder-token`) and emptied RATE_LIMIT_DISABLED. Placeholders are never dialed at build time — `Redis.fromEnv()` only constructs a client object; actual HTTP happens at first `limiter.limit()` invocation. Added explanatory comment to the .env file.
- **Files modified:** .env (gitignored; not in the commit)
- **Commit:** N/A (gitignored)

## Issues Encountered

- **ESM static-import hoisting** made the naive `beforeEach`+`vi.stubEnv` pattern unworkable for files that statically import env-touching modules. Solved with `vi.mock` hoisting (auth tests) or dynamic `await import()` (challenge tests). No runtime-code change required.
- **Turbopack build-time env resolution** — `next build` sets NODE_ENV=production and resolves `.env` at that moment, so the D-20 RATE_LIMIT_DISABLED guard is tested even locally. Addressed by the .env adjustment above; documented so future developers understand the local build workflow.

## Verification

- `npm run test:run` -> **706 passed | 0 skipped | 0 todo** (48 test files; up from 701+4 todo pre-plan). Net: +5 real tests (7 new in env.test.ts - 2 obsolete removed in rate-limit.test.ts + challenge.test.ts).
- `npm run test:integration` -> **53 passed** (6 integration test files).
- `npx vitest run src/lib/env.test.ts --coverage --coverage.include='src/lib/env.ts'` -> **100% statements / 100% branches / 100% functions / 100% lines** (exceeds plan target).
- `npm run build` -> **Compiled successfully** (12 routes including `/register`, `/configuracion`, `/api/auth/[...nextauth]`). Requires .env adjustment documented above.
- `npm run lint` -> **0 errors, 3 pre-existing warnings** in src/app/(app)/movimientos/actions.ts (logged to deferred-items.md by Plan 30-01; unrelated to this plan).
- **Grep gate (30-VALIDATION.md Task 30-02-03):**
  ```bash
  grep -rn "process\.env\.AUTH_SECRET\|process\.env\.AUTH_TOTP_ENCRYPTION_KEY\|process\.env\.UPSTASH_" src/ --include="*.ts" | grep -v "src/lib/env.ts"
  ```
  -> **zero matches.**

## User Setup Required

**Local developers updating to this plan:** after pulling, run:

```bash
# Add UPSTASH_* placeholders + empty RATE_LIMIT_DISABLED to your local .env
# OR copy from .env.example and adjust.
```

Required for `npm run build` to pass locally. Dev server (`npm run dev`) unaffected since NODE_ENV=development bypasses the production guards.

In production on Vercel:
- `DATABASE_URL` + `DIRECT_URL`: auto-injected/manually-configured per Plan 30-01.
- `AUTH_SECRET`: set via Vercel Project Settings; minimum 32 chars.
- `AUTH_TOTP_ENCRYPTION_KEY`: set via Vercel; exactly 64 hex chars.
- `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`: auto-injected by Upstash Marketplace integration OR set manually.
- `RATE_LIMIT_DISABLED`: MUST be unset or empty — env.ts rejects `'true'` in production.

## Next Phase Readiness

- **Plan 30-03 (CSP / security headers via next.config.ts + proxy.ts):** env.ts's `env.NODE_ENV` export is available for the HSTS production-gate (D-03-02). proxy.ts can safely `import { env } from '@/lib/env'` when it needs NODE_ENV.
- **Plan 30-04 (prisma/seed.prod.ts):** Does NOT consume env.ts — prisma seed runs as a standalone script via `npx tsx prisma/seed.prod.ts`, which has its own validation. Documented in env.ts's schema comment.
- **Plan 30-05 (Vercel deploy):** env.ts's loud-on-boot contract is the safety net — if the operator forgets a var, the first deploy's build step aborts with a clear list, not a silent runtime 500.

## Self-Check: PASSED

Verified files exist:
- `src/lib/env.ts` — FOUND (60 lines, Zod schema with superRefine)
- `src/lib/env.test.ts` — FOUND (83 lines, 7 tests)
- `src/lib/prisma.ts` — FOUND (imports `./env`, reads `env.DATABASE_URL` + `env.NODE_ENV`)
- `src/lib/totp-crypto.ts` — FOUND (imports `./env`, reads `env.AUTH_TOTP_ENCRYPTION_KEY`; `loadKey()` removed)
- `src/lib/rate-limit.ts` — FOUND (imports `./env`, reads `env.NODE_ENV` + `env.RATE_LIMIT_DISABLED`; `Redis.fromEnv()` retained)
- `src/lib/challenge.ts` — FOUND (imports `./env`, reads `env.AUTH_SECRET`; null-throw removed)
- `src/auth.ts` — FOUND (first line after comment: `import '@/lib/env'`)

Verified commits exist:
- `8be494e` (Task 1 feat: boot-time env validator via Zod) — FOUND in git log
- `b639b40` (Task 2 feat: sweep src/lib consumers onto validated env) — FOUND in git log
- `74643e9` (Task 3 feat: wire env validation at auth.ts boot + close grep gate) — FOUND in git log

---
*Phase: 30-vercel-deploy-security-hardening*
*Plan: 02*
*Completed: 2026-04-21*
