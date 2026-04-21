---
phase: 29
plan: 05
status: complete
date: 2026-04-21
---

# Plan 29-05 — Integration + E2E + Final Quality Gate

## Outcome

Phase 29 (TOTP Two-Factor Authentication) is complete. All 5 TOTP requirements (TOTP-01..05) are now marked Complete in `REQUIREMENTS.md`. The full integration suite (53 tests across 6 files) and the project-wide unit suite (701 tests across 47 files) are green. Project-wide prettier normalization landed alongside.

The Playwright E2E spec (`e2e/totp.spec.ts`) is written and committed but is documented as "manual-run" — it requires a foreground dev server + browser session that the agent runtime cannot reliably orchestrate.

## Commits

- `0f17ae6` — `test(29-05): add integration suite for TOTP flows`
- `afae474` — `test(29-05): add Playwright E2E happy path for 2FA lifecycle`
- `cef3b1c` — `chore(29-05): project-wide prettier normalization`
- `<this commit>` — `docs(29-05): close phase 29 — TOTP 2FA shipped`

## Test Results

### Integration suite (real Postgres on `:5433`, real bcrypt, real otplib, real `totp-crypto`)

```
$ npm run test:integration -- --run tests/integration/totp.test.ts
Test Files  1 passed (1)
     Tests  16 passed (16)
  Duration  ~106 s   (bcrypt cost-12 dominates)
```

```
$ npm run test:integration  (full suite)
Test Files  6 passed (6)
     Tests  53 passed (53)
  Duration  ~125 s
```

### Unit suite

```
$ npm run test:run
Test Files  47 passed (47)
     Tests  701 passed (701)
  Duration  ~28 s
```

### Quality gate

```
$ npm run build         # exit 0 — Next 16 production build
$ npm run lint          # exit 0 — 3 pre-existing warnings in movimientos/actions.ts (out of scope, see deferred-items.md)
$ npm run format:check  # exit 0 — after the prettier normalization commit
$ npm run test:run      # exit 0
$ npm run test:integration  # exit 0
```

### Playwright E2E — manual-run

Run with the dev server in another terminal:

```bash
# terminal 1
npm run dev

# terminal 2 (after dev server reports ready)
npx playwright test e2e/totp.spec.ts
```

The spec covers the happy-path lifecycle: login (1FA) → /configuracion → Activar 2FA wizard (steps 1→2→3) → save backup codes → logout → login (2FA TOTP) → logout → login (backup code).

## Integration Test Coverage Map

| # | Scenario | Requirement | Status |
|---|----------|-------------|--------|
| 1 | Full enable flow (real DB, real crypto) | TOTP-01, TOTP-02 | ✓ |
| 2 | Login with TOTP code (real `authorizeUser` + real `verifyChallenge`) | TOTP-03 | ✓ |
| 3 | Login with backup code; second use rejected (single-use) | TOTP-04 | ✓ |
| 4 | Concurrent backup-code consume (`Promise.all` x2) — exactly-once | TOTP-04 | ✓ |
| 5 | Cross-user backup-code isolation (User B cannot consume User A's code) | TOTP-04 + T-29-DATA-002 | ✓ |
| 6 | Disable flow (clears `totpSecret`, deletes `BackupCode` rows) | TOTP-01..04 | ✓ |
| 7 | Regenerate backup codes (replaces all rows) | TOTP-04 | ✓ |
| 8 | Invalid attempts (wrong password, wrong code, expired challenge, tampered challenge) — generic ambiguous errors | TOTP-03, TOTP-05 | ✓ |

All 8 scenarios pass. Plus rate-limit observable signals are exercised by the Wave-1 unit tests in `src/lib/rate-limit.test.ts` (mocked Upstash; real Upstash deferred to Phase 30 deploy verification).

## Grep Gates (all pass)

| Gate | Command | Result |
|------|---------|--------|
| No `it.todo` left | `! grep -q 'it.todo' tests/integration/totp.test.ts` | ✓ |
| Real `authorizeUser` exercised | `grep -q 'authorizeUser' tests/integration/totp.test.ts` | ✓ |
| Cross-user / isolation case present | `grep -q 'cross-user\|isolation' tests/integration/totp.test.ts` | ✓ |
| Concurrent consume case present | `grep -q 'Promise.all' tests/integration/totp.test.ts` | ✓ |
| Challenge sign exercised | `grep -q 'signChallenge' tests/integration/totp.test.ts` | ✓ |
| No skipped E2E | `! grep -q 'test.skip' e2e/totp.spec.ts` | ✓ |
| No Edge runtime in src/ | `! grep -rn "runtime\s*=\s*'edge'" src/` | ✓ |
| No otplib v12 API leak | `! grep -rn 'authenticator\.' src/lib/totp.ts` | ✓ |
| No plaintext logging in crypto/auth | `! grep -rn 'console.log' src/lib/totp-crypto.ts src/lib/backup-codes.ts src/lib/challenge.ts src/app/(app)/configuracion/totp-actions.ts src/actions/auth.ts` | ✓ |

## Deviations from Plan

1. **Playwright E2E executed as manual-run, not inside the verify chain.** The plan's Task 3 verify chain backgrounds `npm run dev`, sleeps, then runs Playwright. In the agent runtime this is not reliably orchestrable (long-running foreground dev server + browser + clean teardown). The spec is written and committed; manual invocation instructions are above. Plan-checker explicitly accepted this option in revision round 1: "either (a) add `npx playwright test e2e/totp.spec.ts` to the verify chain, or (b) mark the E2E verify explicitly as a manual step."

2. **Project-wide prettier normalization (88 files) committed alongside.** Drift was pre-existing across the codebase, not introduced by Phase 29. Surfaced because the Plan 29-05 quality gate ran `npm run format:check`. Folded into the phase as a single chore commit (`cef3b1c`) rather than deferred — keeps `format:check` clean for downstream phases. Two pre-existing untracked docs (`DATA_FLOW.md`, `DFR.md`) referenced in `CLAUDE.md` were also committed in that same chore pass.

## Files Created / Modified by Plan 29-05

| Path | Status |
|------|--------|
| `tests/integration/totp.test.ts` | Filled in from Wave-0 stub — 360 lines, 16 tests |
| `e2e/totp.spec.ts` | Filled in from Wave-0 stub — 135 lines, happy-path lifecycle |
| `.planning/REQUIREMENTS.md` | TOTP-03, TOTP-05 → Complete; traceability table updated |
| `.planning/STATE.md` | Phase 29 complete; current_plan + progress recalculated |
| `.planning/ROADMAP.md` | Phase 29 → 5/5 plans, status Complete |
| `.planning/phases/29-totp-two-factor-authentication/29-05-SUMMARY.md` | This file |

(The 88 files in the `cef3b1c` chore commit are pure prettier formatting; no behavior changes.)

## Phase 29 Final Tally

| Plan | Wave | Outcome |
|------|------|---------|
| 29-01 | 0 | BackupCode model + migration + 4 deps + .env updates + 8 stubs |
| 29-02 | 1 | 5 lib modules (totp-crypto, totp, backup-codes, challenge, rate-limit) at 100% coverage + 4 Zod schemas |
| 29-03 | 2 | Two-step login (extended `authorizeUser` + split `loginAction` + `verifyTotpAction` + `TotpStep` UI) |
| 29-04 | 2 | Setup/disable/regen UX (4 Server Actions + Seguridad section + 3 bottom-sheet modals + BackupCodesScreen) |
| 29-05 | 3 | 16 integration tests + Playwright E2E spec + project-wide quality gate green |

**Requirements:** TOTP-01..05 — all 5 ✓
**Tests added across the phase:** ~62 unit + 16 integration + 1 E2E spec
**Commits:** 17 atomic commits across 5 plans

## Manual Verifications Deferred (per VALIDATION.md)

| Verification | Why manual | Owner |
|--------------|------------|-------|
| Real authenticator app scans the QR | Requires a phone with camera | User, on first 2FA enrollment |
| Real Upstash rate limit triggers at the 6th attempt under prod env | Requires real Upstash credentials + production deploy | Phase 30 smoke test |
| Playwright E2E happy path | Foreground dev server + browser orchestration not reliable in agent runtime | Run locally before Phase 30 deploy |

## Open Issues / Notes for Phase 30

- `@upstash/ratelimit` + `@upstash/redis` are installed and wired but currently bypassed in dev/test (`RATE_LIMIT_DISABLED=true` in `.env.test`, `NODE_ENV !== 'production'` short-circuit). Phase 30 must:
  - Provision Upstash via Vercel Marketplace
  - Set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` as Vercel env vars
  - Add a boot-time validation that fails fast if these are missing in production
- `AUTH_TOTP_ENCRYPTION_KEY` must be a fresh production secret (NOT the dev value). Phase 30 deploy must generate it (`openssl rand -hex 32`) and set it in Vercel env vars.
- Playwright E2E should land in CI as part of Phase 30 (or as a follow-up CI hardening phase).

---

*Phase 29 closed 2026-04-21. Phase 30 (Vercel Deploy + Security Hardening) is next.*
