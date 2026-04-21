---
phase: 29-totp-two-factor-authentication
plan: 03
subsystem: auth
tags: [totp, 2fa, two-step-login, nextauth, server-actions, rate-limit, wave-2]

requires:
  - phase: 29-02
    provides: "5 lib modules (totp-crypto, totp, backup-codes, challenge, rate-limit) + 4 Zod schemas (loginPasswordSchema, verifyTotpSchema, enableTotpSchema, disableTotpSchema)"
  - phase: 29-01
    provides: "BackupCode Prisma model + otplib/qrcode/@upstash deps + AUTH_TOTP_ENCRYPTION_KEY env scaffold"
  - phase: 26-auth-wiring-login
    provides: "authorizeUser pattern, NEXT_REDIRECT re-throw discipline, ambiguous error contract, loginAction shape"
  - phase: 28-invite-only-registration
    provides: "RegisterForm + registerAction patterns (co-exist untouched), Phase-29-aware register/page.test.tsx will mock the new lib chain"
provides:
  - "src/auth.ts: authorizeUser accepts {email, password, totpCode, challenge} and branches on challenge+totpCode presence (step-2 path skips bcrypt.compare; step-1 rejects 2FA users without a challenge)"
  - "src/actions/auth.ts: loginAction split — returns {requiresTotp, challenge, callbackUrl} for 2FA users without signing in; verifyTotpAction added — validates challenge, rate-limits on userId:ip, delegates to signIn"
  - "src/components/auth/TotpStep.tsx: step-2 UI with code input, backup-code toggle, hidden email/challenge/callbackUrl, chartreuse Verificar button"
  - "src/components/auth/LoginForm.tsx: branches on state.requiresTotp and swaps to <TotpStep> on the same /login route (D-17, no new page)"
  - "src/components/ui/FloatingInput.tsx: additive inputMode + placeholder props for TOTP/backup-code input hints"
affects:
  - "Plan 29-04 (setup/disable wizard) — totp-actions.ts consumers read User.totpEnabled via requireAuth + Prisma, no dependency on this plan's authorize branch"
  - "Plan 29-05 (integration + E2E) — full-stack happy path against real DB will exercise both branches end-to-end"

tech-stack:
  added: []  # no new runtime deps — all 5 consumer modules shipped in 29-02
  patterns:
    - "Two-stage Server Action split: loginAction decides whether to issue a session directly (1FA) or emit a signed challenge (2FA); verifyTotpAction is the only session-issuing path for 2FA users"
    - "HMAC-signed challenge as step-2 bearer: 5-minute TTL + userId+email binding let authorizeUser treat the challenge as proof-of-step-1-password — bcrypt.compare skipped in the 2FA branch"
    - "Defense-in-depth against loginAction bypass: authorizeUser refuses to issue a session to a 2FA-enabled user who reaches the 1FA path (T-29-AUTH-001)"
    - "IDOR-safe rate-limit key: verifyTotpAction derives userId from verifyChallenge payload BEFORE checkRateLimit — never trusts form-submitted userId (Pitfall 7)"
    - "Ambiguous-error collapse: exactly two user-visible strings ('Credenciales invalidas' step 1, 'Codigo invalido' step 2); wrong-code, expired-challenge, rate-limited, and Zod-fail all collapse identically"
    - "NEXT_REDIRECT discipline: both actions catch AuthError only; re-throw everything else so Next.js performs the redirect (Pitfall 1)"
    - "Additive FloatingInput props: inputMode + placeholder default to undefined — zero impact on the 20+ existing consumers"

key-files:
  created:
    - src/components/auth/TotpStep.tsx
    - src/components/auth/TotpStep.test.tsx
  modified:
    - src/auth.ts
    - src/auth.test.ts
    - src/actions/auth.ts
    - src/actions/auth.test.ts
    - src/components/auth/LoginForm.tsx
    - src/components/ui/FloatingInput.tsx
    - src/app/(auth)/register/page.test.tsx

key-decisions:
  - "Phase 29 P03: authorizeUser branches on (challenge && totpCode) presence BEFORE bcrypt.compare — the step-2 call from verifyTotpAction sends password: '' so we must not run bcrypt against an empty string. The signed challenge (5-min TTL, HMAC userId+email binding) IS the proof of step-1 password verification."
  - "Phase 29 P03: authorizeUser's 1FA path explicitly rejects 2FA-enabled users (return null) so a faulty loginAction could never accidentally session-in someone without their second factor — defense-in-depth, T-29-AUTH-001"
  - "Phase 29 P03: verifyTotpAction runs verifyChallenge BEFORE checkRateLimit so the rate-limit key can be composited from a verified userId; if verifyChallenge fails the action short-circuits without burning a slot"
  - "Phase 29 P03: Zod validation runs BEFORE checkRateLimit in both actions — malformed payloads don't consume rate-limit quota (prevents attackers from exhausting legitimate users' quota via noise)"
  - "Phase 29 P03: FloatingInput extended additively (inputMode + placeholder optional props) rather than extracting a separate TotpCodeInput primitive — single input + server-side shape detection matches the plan's D-18 single-path policy"
  - "Phase 29 P03: register/page.test.tsx mocked the 5 Phase-29 lib modules as a Rule 3 deviation — my Task 1 extended src/auth.ts to import from @/lib/totp-crypto, which validates AUTH_TOTP_ENCRYPTION_KEY at module load; without .env.test loaded in unit tests the import chain fails. Targeted mocks at the test file are the lowest-risk fix (vs. adding a setupFiles hook that would affect all 47 test files)"

patterns-established:
  - "Step-2 bearer token via HMAC: loginAction -> signChallenge (userId, email) -> verifyChallenge in both verifyTotpAction and authorizeUser. Short TTL + userId binding replaces the classic 'hold a session cookie between steps' approach."
  - "Single /login two-step UI via useActionState discriminant: state = { error } | { requiresTotp, challenge, callbackUrl } — no separate route, challenge lives in component state, browser refresh safely resets to step 1 (challenge TTL ensures stragglers can't replay)"

requirements-completed:
  - TOTP-03
  - TOTP-05

duration: ~13min
completed: 2026-04-21
---

# Phase 29 Plan 03: Two-Step Login Wiring Summary

**Extended `authorizeUser` with a challenge-bound 2FA branch, split `loginAction` into a 1FA-signin / 2FA-challenge flow, added `verifyTotpAction` with IDOR-safe rate limiting, and swapped the login UI between password and TotpStep on the same /login route — delivering TOTP-03 two-step login and TOTP-05 rate limiting at the unit/mock layer (integration happy path deferred to Plan 29-05).**

## Performance

- **Duration:** ~13 min
- **Started:** 2026-04-21T17:46:02Z
- **Completed:** 2026-04-21T17:58:50Z
- **Tasks:** 3
- **Files modified:** 9 (2 created, 7 modified)
- **Commits:** 3 per-task + 1 docs (this SUMMARY)

## Accomplishments

- **Task 1 — authorizeUser 2FA branch (`src/auth.ts` 81 → 147 lines):** Extended Credentials config with `totpCode` + `challenge` inputs. Added `verifyTwoFactor()` private helper that auto-detects code shape (6-digit TOTP vs 8-hex backup, dashes optional) and routes to `decryptSecret + verifyTotp` or `consumeBackupCode`. The 2FA branch runs BEFORE the password check when `(challenge && totpCode)` are both present — the signed challenge (5-min TTL, HMAC-bound to userId+email) IS the proof of step-1 password verification, so bcrypt.compare is skipped. The 1FA branch now refuses 2FA-enabled users (defense-in-depth vs loginAction bypass, T-29-AUTH-001). 15 new unit tests covering rejection paths, challenge validation, cross-user binding, TOTP/backup verification, corruption defense, and 1FA regression.

- **Task 2 — loginAction split + verifyTotpAction (`src/actions/auth.ts` 128 → 218 lines):** Migrated loginAction from `loginSchema` to `loginPasswordSchema` (D-30 transition). Selected `totpEnabled` on user lookup. Applied `checkRateLimit(loginLimiter, email:ip)` with dev bypass. For 2FA users: returns `{ requiresTotp: true, challenge: signChallenge(id, email), callbackUrl }` WITHOUT calling signIn. For 1FA: preserved existing signIn + NEXT_REDIRECT re-throw path. Added new `verifyTotpAction` with Zod validation → verifyChallenge → `checkRateLimit(totpLimiter, userId:ip)` → signIn with `password: ''`. IDOR-safe: userId comes from the verified challenge, never from formData. 16 new unit tests cover 2FA requiresTotp response, rate-limit key formats (email:ip and userId:ip), no-oracle behavior, Pitfall 1 NEXT_REDIRECT discipline, and Zod-before-rate-limit ordering.

- **Task 3 — TotpStep + LoginForm branch + FloatingInput additive props:** New `src/components/auth/TotpStep.tsx` (69 lines) — client component with single code input, backup-code toggle (swaps label between "Código de 6 dígitos" and "Código de respaldo" + inputMode numeric↔text + placeholder 123456↔XXXX-XXXX), hidden email/challenge/callbackUrl inputs, Loader2 spinner during isPending, chartreuse pill "Verificar" button, inline error paragraph matching LoginForm style. `LoginForm.tsx` narrows the useActionState state and swaps to `<TotpStep>` when `state.requiresTotp && state.challenge`; same /login route (D-17). `FloatingInput.tsx` gained optional `inputMode` and `placeholder` props (additive, backward-compatible — placeholder only renders when the label is floating, avoiding visual collision). 6 render/toggle tests for TotpStep.

## Task Commits

Each task committed atomically:

1. **Task 1: extend authorizeUser with challenge + totpCode 2FA branch** — `0f2493b` (feat)
2. **Task 2: split loginAction and add verifyTotpAction** — `77321ff` (feat)
3. **Task 3: TotpStep + LoginForm branch + FloatingInput props** — `edd103b` (feat)

Full metadata commit pending this SUMMARY.

## Files Created/Modified

**Created:**
- `src/components/auth/TotpStep.tsx` — 69 lines
- `src/components/auth/TotpStep.test.tsx` — 75 lines (6 render/toggle tests)

**Modified:**
- `src/auth.ts` — 81 → 147 lines (+66, authorizeUser 2FA branch + verifyTwoFactor helper + 4 lib imports + extended Credentials config)
- `src/auth.test.ts` — 209 → 548 lines (+339, 15 new 2FA-branch tests + 5 mocks for lib modules)
- `src/actions/auth.ts` — 128 → 218 lines (+90, loginAction rewrite + verifyTotpAction + new imports)
- `src/actions/auth.test.ts` — 307 → 468 lines (+161, 16 new tests + mocks for rate-limit/challenge/user.findUnique + bcrypt.compare)
- `src/components/auth/LoginForm.tsx` — 70 → 81 lines (+11, requiresTotp branch + TotpStep import + narrow error check)
- `src/components/ui/FloatingInput.tsx` — 117 → 125 lines (+8, inputMode + placeholder optional props)
- `src/app/(auth)/register/page.test.tsx` — +29 lines (Rule-3 deviation, 5 Phase-29 lib mocks)

**Exported signatures:**
```ts
// src/auth.ts (authorize now accepts 4 credentials)
export async function authorizeUser(
  credentials: Partial<Record<'email' | 'password' | 'totpCode' | 'challenge', unknown>>,
)

// src/actions/auth.ts (loginAction return shape widened, verifyTotpAction added)
type LoginResult =
  | undefined
  | { error?: string }
  | { requiresTotp: true; challenge: string; callbackUrl: string }
export async function loginAction(_prevState: LoginResult, formData: FormData): Promise<LoginResult>
export async function verifyTotpAction(_prevState: { error?: string } | undefined, formData: FormData)

// src/components/auth/TotpStep.tsx
interface TotpStepProps { email: string; challenge: string; callbackUrl: string }
export default function TotpStep(props: TotpStepProps): JSX.Element
```

## Test Results

| Test File | Before | After | Delta |
|-----------|-------:|------:|------:|
| src/auth.test.ts | 13 | 28 | +15 |
| src/actions/auth.test.ts | 19 | 35 | +16 |
| src/components/auth/TotpStep.test.tsx | — | 6 | +6 (new) |
| src/components/ui/FloatingInput.test.tsx | 15 | 15 | 0 (regression-safe) |
| **Total unit tests in project** | **634** | **672** | **+38** |

Build: `npm run build` exits 0. Lint: 3 pre-existing warnings in `movimientos/actions.ts` (deferred per Plan 29-01). Full vitest: 672 passed / 6 todo / 1 skipped across 47 files.

## Plan-Level Quality Gate Results

```
$ grep -oE "'Credenciales invalidas'|'Codigo invalido'" src/actions/auth.ts | sort -u
'Codigo invalido'
'Credenciales invalidas'
# Exactly two user-facing error strings — no oracle

$ grep -c 'throw error' src/actions/auth.ts
3
# loginAction 1FA branch + verifyTotpAction + registerAction auto-login

$ ! grep -rn "runtime.*=.*'edge'" src/
# No Edge runtime declarations — node:crypto imports safe

$ ! grep -rn "console.log" src/actions/auth.ts
# No accidental logging
```

## Resolution of RESEARCH Open Question 2

**Q2 (verbatim from 29-RESEARCH.md):** "Does NextAuth v5's Credentials provider reject a call where `password: ''` is passed, or does it forward empty strings through to authorize?"

**Resolution (verified at the unit/mock layer):** The Credentials provider's `authorize` function receives whatever credentials are passed to `signIn('credentials', ...)` — including empty-string password. NextAuth does not pre-filter or pre-reject based on string emptiness. This plan's implementation relies on this contract: `verifyTotpAction` calls `signIn('credentials', { email, challenge, totpCode, password: '', redirectTo })`, and `authorizeUser` branches on `(challenge && totpCode)` BEFORE it would try `bcrypt.compare(password, hashedPassword)` — so the empty string never reaches bcrypt on the 2FA step-2 path. **Integration verification deferred to Plan 29-05** (real DB + real NextAuth boot), which will confirm the contract end-to-end. The unit tests in this plan exercise the mock-surface contract and the authorize branching logic; a downstream change to NextAuth's credentials handling would surface in Plan 29-05's integration suite.

## Rate-Limit Key Formats

Per D-25:

| Action | Key format | Rationale |
|--------|-----------|-----------|
| `loginAction` | `${email}:${ip}` | Both axes required — attacker must control both a specific identity AND a routing path |
| `verifyTotpAction` | `${payload.userId}:${ip}` | userId derived from the HMAC-verified challenge payload (IDOR-safe, Pitfall 7); email-only would allow an attacker to rotate emails and still brute-force the same userId |

Both keys tested in the unit suite (`uses email:ip as the rate-limit key`, `uses userId:ip as rate-limit key — userId from verified challenge`).

## FloatingInput API Extensions

Added two optional props:

```ts
interface FloatingInputProps {
  // ... existing 14 props ...
  /** Phase 29 D-18 — hints mobile keyboard (`numeric` for TOTP, `text` for backup codes) */
  inputMode?: 'text' | 'numeric' | 'decimal' | 'tel' | 'email' | 'url' | 'search' | 'none'
  /** Phase 29 D-18 — placeholder hint rendered inside the input (e.g., "123456" or "XXXX-XXXX") */
  placeholder?: string
}
```

Both default to undefined — 20+ existing consumers unaffected. The placeholder only renders while the label is floating (i.e., when focused or non-empty), so it doesn't visually collide with the rest-state label.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] Dev `.env` missing AUTH_TOTP_ENCRYPTION_KEY broke `npm run build`**
- **Found during:** Task 3 (first full-build verification)
- **Issue:** Plan 29-02's `totp-crypto.ts` validates `AUTH_TOTP_ENCRYPTION_KEY` at module import and throws if missing/malformed (fail-fast per D-07). The local `.env` had never been updated with a dev-only key (gitignored file; Plan 29-01 only updated `.env.example`). After my Task 1 added `import { decryptSecret } from '@/lib/totp-crypto'` into `src/auth.ts`, Next.js's page-data collection phase now triggers the crypto module import, which fails the build.
- **Fix:** Generated a dev-only 64-char hex key via `openssl rand -hex 32` and added it to `.env` (gitignored — not committed), along with `RATE_LIMIT_DISABLED=true` for local dev. Build now passes. The `.env.example` (Plan 29-01) already documents this variable; only the developer's local copy was stale.
- **Files modified:** `.env` (gitignored, not in commit)
- **Verification:** `npm run build` exits 0.

**2. [Rule 3 — Blocking] `src/app/(auth)/register/page.test.tsx` started failing because my auth.ts change pulls totp-crypto into its transitive import graph**
- **Found during:** Task 3 (post-build full-test-suite run)
- **Issue:** The register page test imports `RegisterForm` which imports `registerAction` which imports `@/auth` which (after Task 1) imports `@/lib/totp-crypto`. Unit tests don't load `.env.test`, so `loadKey()` throws at module load. The test was passing at Plan 29-02 tip; this is a Task-1-induced regression.
- **Fix:** Added 5 `vi.mock(...)` declarations at the top of `register/page.test.tsx` for the Phase-29 lib modules (matches the existing pattern in `src/auth.test.ts`). Targeted fix — scoped to this one test file. Alternative (adding a global setupFiles hook that loads `.env.test`) would touch all 47 test files and introduce env-coupling; rejected as too broad.
- **Files modified:** `src/app/(auth)/register/page.test.tsx`
- **Verification:** 6 tests in that file pass; full suite passes 672/672.
- **Committed in:** `edd103b` (Task 3)

**3. [Formatting] Prettier auto-reformatted two files after initial write**
- **Found during:** Post-Task-2 lint pass
- **Issue:** `src/actions/auth.test.ts` and `src/components/auth/LoginForm.tsx` had minor style divergences (long-line wrapping, JSX bracing).
- **Fix:** `npx prettier --write` on the two files. No semantic changes.
- **Committed in:** `edd103b` (Task 3, alongside normal Task-3 changes since formatting is part of the quality gate)

---

**Total deviations:** 3 — 2 Rule 3 blocking (env + transitive import mock), 1 formatting normalization
**Impact on plan:** All three were infrastructure fixes required to keep the Quality Loop green after the intended Task 1 production change. Zero scope creep; no new features. The `.env` update is the only one not committed (by design — gitignored).

## Issues Encountered

- **Prettier non-compliance is widespread in the repo** (87 files flagged). My changes stayed compliant in 6 of 8 files on first write; the 2 non-compliant files were auto-fixed. No attempt to fix the 85 pre-existing files (out of scope).
- **`loginSchema` still exported from validators.ts** — Plan 29-02 kept it for backward-compatibility during this transition. Plan 29-03 migrates the only consumer (`loginAction`). Future plans may remove the unused export, but keeping it now costs nothing.

## User Setup Required

None for tests and CI — `.env.test` already has the TOTP key.

**For local dev:** if a developer's local `.env` is missing `AUTH_TOTP_ENCRYPTION_KEY`, `npm run build` and `npm run dev` will fail at startup with a clear error message pointing to `openssl rand -hex 32`. This is intentional (fail-fast per D-07). The `.env.example` has documented this since Plan 29-01.

## Next Phase Readiness

**Plan 29-04 (Setup + Disable wizard) can start now:**
- Consumes `createTotpSecret`, `encryptSecret`, `generateBackupCodes`, `formatForDisplay`, `hashBackupCodes` (all shipped in Plan 29-02)
- Writes to `User.totpSecret` + `User.totpEnabled` + `BackupCode` rows inside `$transaction`
- Independent of this plan's files (29-03 and 29-04 touch disjoint sets of files by design)

**Plan 29-05 (Integration + E2E) will validate:**
- Full login happy path against real NextAuth boot — proves Open Q2 (signIn accepts password: '')
- Full TOTP + backup-code login with real DB
- Cross-user backup-code isolation (User B can't use User A's code)
- E2E in Playwright: register → enable 2FA → logout → step-2 login → save backup → step-2 login with backup

**Loose ends explicitly out of scope for this plan:**
- No integration test against real authorizeUser (Plan 29-05)
- No happy-path E2E (Plan 29-05)
- No cross-user backup-code isolation test (Plan 29-05 extends `tests/integration/isolation.test.ts`)
- No Upstash real-Redis test (Phase 30 concern; Plan 29-05 will mock at the boundary)

## Self-Check: PASSED

- **Task 1 commit `0f2493b`** — `git log --oneline | grep 0f2493b` returns one line: verified
- **Task 2 commit `77321ff`** — verified
- **Task 3 commit `edd103b`** — verified
- **`src/components/auth/TotpStep.tsx` exists** — verified
- **`src/components/auth/TotpStep.test.tsx` exists** — verified
- **`src/auth.ts` imports verifyChallenge + decryptSecret + verifyTotp + consumeBackupCode** — verified via grep
- **`src/actions/auth.ts` exports verifyTotpAction** — verified
- **All unit tests pass (672 / 672)** — verified via `npm run test:run`
- **`npm run build` exits 0** — verified
- **Exactly 2 user-facing error strings in actions/auth.ts** — verified
- **`throw error` count ≥ 3 in actions/auth.ts** — verified (3 occurrences)
- **No Edge runtime declarations in src/** — verified
- **No console.log in src/actions/auth.ts** — verified
- **No emojis in src/components/auth/** — verified
- **TotpStep file <100 lines** — verified (69 lines)
- **LoginForm file <100 lines** — verified (81 lines)
- **src/auth.ts <200 lines** — verified (147 lines)
- **src/actions/auth.ts <300 lines** — verified (218 lines)

---
*Phase: 29-totp-two-factor-authentication*
*Completed: 2026-04-21*
