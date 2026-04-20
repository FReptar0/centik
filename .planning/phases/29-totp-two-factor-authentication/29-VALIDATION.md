---
phase: 29
slug: totp-two-factor-authentication
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-20
---

# Phase 29 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Source-of-truth signals enumerated in `29-RESEARCH.md` § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (unit + integration) + Playwright (E2E) |
| **Config file** | `vitest.config.ts` (unit) + `vitest.integration.config.mts` (integration) + `playwright.config.ts` (E2E) |
| **Quick run command** | `npm run test -- --run src/lib/totp-crypto.test.ts src/lib/totp.test.ts src/lib/backup-codes.test.ts src/lib/challenge.test.ts src/lib/rate-limit.test.ts src/actions/auth.test.ts src/app/\\(app\\)/configuracion/totp-actions.test.ts` |
| **Full suite command** | `npm run quality` (build + lint + format:check + test:run) + `npm run test:integration` |
| **Estimated runtime** | ~25 s quick, ~110 s full |

---

## Sampling Rate

- **After every task commit:** Run the quick command above scoped to the file(s) just modified.
- **After every plan wave:** Run `npm run test:run` (all unit) + `npm run test:integration` (real Postgres on port 5433).
- **Before `/gsd-verify-work`:** Full suite must be green; `npm run quality` exits 0; Playwright happy-path passes.
- **Max feedback latency:** 30 seconds for unit (per task); 120 seconds for integration (per wave).

---

## Per-Task Verification Map

> Filled by the planner. The table below pre-allocates rows for the 5-plan decomposition recommended in `29-RESEARCH.md`. Planner overwrites Task IDs to match what it actually emits and adds rows as needed.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 29-01-01 | 01 | 0 | TOTP-01..05 | — | Wave-0 stub files exist for every new test target | scaffold | `ls src/lib/totp-crypto.test.ts src/lib/totp.test.ts src/lib/backup-codes.test.ts src/lib/challenge.test.ts src/lib/rate-limit.test.ts src/app/\(app\)/configuracion/totp-actions.test.ts tests/integration/totp.test.ts e2e/totp.spec.ts` | ❌ W0 | ⬜ pending |
| 29-01-02 | 01 | 0 | TOTP-04 | T-29-DB-001 | Schema add — BackupCode model + index, no User changes | scaffold | `npx prisma format && npx prisma validate && grep -q 'model BackupCode' prisma/schema.prisma && grep -q '@@index(\[userId\])' prisma/schema.prisma` | ❌ W0 | ⬜ pending |
| 29-01-03 | 01 | 0 | TOTP-04 | T-29-DB-001 | Migration applied to dev DB | **[BLOCKING]** | `npx prisma migrate dev --name add_backup_code_model && npx prisma db push --accept-data-loss` | ❌ W0 | ⬜ pending |
| 29-01-04 | 01 | 0 | TOTP-01,02,05 | — | New deps installed at correct major versions | unit | `node -e "const p=require('./package.json').dependencies; if(!p.otplib||!p.qrcode||!p['@upstash/ratelimit']||!p['@upstash/redis'])process.exit(1)"` | ❌ W0 | ⬜ pending |
| 29-02-01 | 02 | 1 | TOTP-02 | T-29-CRYPTO-001 | AES-256-GCM round-trip + tamper detection + key validation | unit | `npx vitest run src/lib/totp-crypto.test.ts` | ❌ W0 | ⬜ pending |
| 29-02-02 | 02 | 1 | TOTP-01,03 | T-29-AUTH-002 | TOTP generate/verify with mocked clock + window=1 tolerance | unit | `npx vitest run src/lib/totp.test.ts` | ❌ W0 | ⬜ pending |
| 29-02-03 | 02 | 1 | TOTP-04 | T-29-AUTH-003 | Backup-code generate (10 unique 32-bit hex) + bcrypt hash + atomic single-use consume | unit | `npx vitest run src/lib/backup-codes.test.ts` | ❌ W0 | ⬜ pending |
| 29-02-04 | 02 | 1 | TOTP-03 | T-29-AUTH-004 | HMAC challenge sign/verify + 5-min expiry + tamper rejection (constant-time compare) | unit | `npx vitest run src/lib/challenge.test.ts` | ❌ W0 | ⬜ pending |
| 29-02-05 | 02 | 1 | TOTP-05 | T-29-RATELIMIT-001 | sliding-window 5/min, IP+identity composite key, dev bypass when RATE_LIMIT_DISABLED=true | unit | `npx vitest run src/lib/rate-limit.test.ts` | ❌ W0 | ⬜ pending |
| 29-02-06 | 02 | 1 | TOTP-01,03,04 | — | Zod schemas reject malformed code/challenge | unit | `npx vitest run src/lib/validators.test.ts -t 'totp\|backup\|challenge'` | ❌ W0 | ⬜ pending |
| 29-03-01 | 03 | 2 | TOTP-03 | T-29-AUTH-001 | `authorizeUser` accepts `totpCode + challenge`; rejects 2FA-enabled login when missing | unit | `npx vitest run src/auth.test.ts -t 'totp'` | ❌ W0 | ⬜ pending |
| 29-03-02 | 03 | 2 | TOTP-03,05 | T-29-AUTH-005 | `loginAction` returns `{ requiresTotp, challenge }` for 2FA users; rate-limit applied | unit | `npx vitest run src/actions/auth.test.ts -t 'requiresTotp\|rate'` | ❌ W0 | ⬜ pending |
| 29-03-03 | 03 | 2 | TOTP-03,05 | T-29-AUTH-006 | `verifyTotpAction` consumes challenge + code, NEXT_REDIRECT propagates, rate-limit applied | unit | `npx vitest run src/actions/auth.test.ts -t 'verifyTotpAction'` | ❌ W0 | ⬜ pending |
| 29-03-04 | 03 | 2 | TOTP-03 | — | TotpStep component swaps in for 2FA users on /login | unit | `npx vitest run src/components/auth/TotpStep.test.tsx 2>/dev/null || npx vitest run src/components/auth` | ❌ W0 | ⬜ pending |
| 29-04-01 | 04 | 2 | TOTP-01,02,04 | T-29-AUTH-007 | `enableTotpAction` atomic ($transaction): encrypt secret, set totpEnabled, insert 10 backup codes | unit | `npx vitest run src/app/\(app\)/configuracion/totp-actions.test.ts -t 'enable'` | ❌ W0 | ⬜ pending |
| 29-04-02 | 04 | 2 | TOTP-04 | T-29-AUTH-008 | `disableTotpAction` requires current code; clears totpSecret; deletes BackupCode rows ($transaction) | unit | `npx vitest run src/app/\(app\)/configuracion/totp-actions.test.ts -t 'disable'` | ❌ W0 | ⬜ pending |
| 29-04-03 | 04 | 2 | TOTP-04 | — | `regenerateBackupCodesAction` requires current code; replaces all rows ($transaction) | unit | `npx vitest run src/app/\(app\)/configuracion/totp-actions.test.ts -t 'regen'` | ❌ W0 | ⬜ pending |
| 29-04-04 | 04 | 2 | — | — | Seguridad section + Activar2faModal + Desactivar2faModal + BackupCodesScreen render correctly | unit | `npx vitest run src/components/configuracion` | ❌ W0 | ⬜ pending |
| 29-04-05 | 04 | 2 | TOTP-02 | T-29-DATA-001 | totpSecret never returned from any data-fetching layer (grep + return-shape test) | unit | `! grep -rn 'totpSecret' src/app src/components src/actions \| grep -v 'src/lib/totp\|src/auth.ts'` | ❌ W0 | ⬜ pending |
| 29-05-01 | 05 | 3 | TOTP-01..04 | T-29-AUTH-009 | Full enable→login-with-code→login-with-backup→disable flow against real DB | integration | `npm run test:integration -- --run tests/integration/totp.test.ts` | ❌ W0 | ⬜ pending |
| 29-05-02 | 05 | 3 | TOTP-04 | T-29-DATA-002 | Cross-user backup-code isolation — User B cannot consume User A's code | integration | `npm run test:integration -- --run tests/integration/totp.test.ts -t 'cross-user\|isolation'` | ❌ W0 | ⬜ pending |
| 29-05-03 | 05 | 3 | TOTP-01,03,04 | — | E2E happy path: enable 2FA → logout → login with code → logout → login with backup code | E2E | `npx playwright test e2e/totp.spec.ts` | ❌ W0 | ⬜ pending |
| 29-05-04 | 05 | 3 | TOTP-01..05 | — | Quality loop green: build + lint + format + test + integration | quality | `npm run quality && npm run test:integration` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/totp-crypto.test.ts` — stub for TOTP-02 (encryption round-trip + tamper)
- [ ] `src/lib/totp.test.ts` — stub for TOTP-01 / TOTP-03 (generate, verify, window tolerance)
- [ ] `src/lib/backup-codes.test.ts` — stub for TOTP-04 (generate, hash, single-use)
- [ ] `src/lib/challenge.test.ts` — stub for TOTP-03 (HMAC sign/verify, expiry, tamper)
- [ ] `src/lib/rate-limit.test.ts` — stub for TOTP-05 (5/min window, dev bypass)
- [ ] `src/app/(app)/configuracion/totp-actions.test.ts` — stub for TOTP-01 / TOTP-04 (enable/disable/regen)
- [ ] `tests/integration/totp.test.ts` — stub for full flow + cross-user isolation
- [ ] `e2e/totp.spec.ts` — stub for happy path
- [ ] `npx prisma migrate dev --name add_backup_code_model` — applies BackupCode schema to dev DB ([BLOCKING] per Schema Push Detection Gate)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| QR code scans correctly with a real authenticator app (Google Authenticator / 1Password / Authy) | TOTP-01 | Cannot reasonably automate — requires a phone with a camera | (1) Run `npm run dev`, log in. (2) /configuracion → Seguridad → Activar 2FA. (3) Scan QR with Google Authenticator. (4) Type displayed code. (5) Confirm "2FA activado" appears. (6) Save backup codes. (7) Log out. (8) Log in with email + password → enter 6-digit code from app → confirm dashboard renders. |
| Manual base32 secret can be entered in apps that don't scan | TOTP-01 | Same — requires a real authenticator app | During step (3) above, instead of scanning, copy the displayed base32 secret into the authenticator app's manual entry. Confirm subsequent codes verify on /login. |
| Real Upstash rate limit triggers at the 6th attempt under prod env | TOTP-05 | Requires real Upstash credentials — only validated at production deploy (Phase 30) | Document the test plan in 29-VERIFICATION.md; defer execution to Phase 30 smoke test. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags (`--watch`, `--ui` excluded from automation)
- [ ] Feedback latency < 30 s (quick) / 120 s (full)
- [ ] `nyquist_compliant: true` set in frontmatter (planner promotes after task IDs are finalized)

**Approval:** pending — awaits gsd-planner and gsd-plan-checker
