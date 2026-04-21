---
gsd_state_version: 1.0
milestone: v3.0
milestone_name: Auth + Cloud Deploy
current_phase: 29
current_plan: 4
status: executing
stopped_at: Plan 29-03 complete (Wave 2 two-step login wiring)
last_updated: "2026-04-21T17:58:50Z"
last_activity: 2026-04-21
progress:
  total_phases: 6
  completed_phases: 4
  total_plans: 22
  completed_plans: 15
  percent: 68
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-16)

**Core value:** A single user can register a financial transaction in under 30 seconds and immediately see how it impacts their budget, debt ratio, and savings rate across all views.
**Current focus:** Phase 29 — TOTP Two-Factor Authentication

## Current Position

Phase: 29 (TOTP Two-Factor Authentication) — EXECUTING
Plan: 4 of 5
**Current Phase:** 29
**Current Plan:** 4
**Total Plans in Phase:** 5
**Status:** Executing Phase 29 (Plans 29-01 + 29-02 + 29-03 complete, Wave 2 two-step login wiring in place)
**Last Activity:** 2026-04-21

Progress: [██████▊▒▒▒] 68%

## Performance Metrics

**Velocity (cumulative):**

- Total plans completed: 61 (27 v1.0 + 9 v1.1 + 17 v2.0 + 4 v2.1 + 1 v3.0)
- v2.0 average duration: ~6 min per plan
- v2.1 average duration: ~3 min per plan
- v3.0 average duration: ~10 min per plan

**By Phase (v2.1 + v3.0):**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 23 | 2 | 7min | 3.5min |
| 24 | 2 | 5min | 2.5min |
| 25 | 1/2 | 10min | 10min |
| Phase 25 P02 | 22min | 3 tasks | 39 files |
| Phase 26 P00 | 1min | 1 tasks | 3 files |
| Phase 26 P01 | 4min | 1 tasks | 8 files |
| Phase 26 P02 | 6min | 1 tasks | 48 files |
| Phase 26 P03 | 11min | 3 tasks | 13 files |
| Phase 27 P01 | 2min | 1 tasks | 2 files |
| Phase 27 P03 | 4min | 2 tasks | 8 files |
| Phase 27 P02 | 8min | 2 tasks | 12 files |
| Phase 28 P01 | 5min | 2 tasks | 8 files |
| Phase 28 P03 | 15min | 2 tasks | 7 files |
| Phase 28 P02 | 10min | 2 tasks | 11 files |
| 28 | 3 | - | - |
| Phase 29 P01 | 22min | 3 tasks | 14 files |
| Phase 29 P02 | 18min | 3 tasks | 12 files |
| Phase 29 P03 | 13min | 3 tasks | 9 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap v3.0]: 6 phases (25-30) for 27 requirements; strict ordering schema -> auth -> isolation -> invite -> TOTP -> deploy
- [Roadmap v3.0]: Expand-contract pattern for userId FK migration -- userId optional during migration, then made required
- [Roadmap v3.0]: CVE-2025-29927 mitigation -- proxy.ts alone is NOT sufficient, requireAuth() mandatory in every Server Action
- [Roadmap v3.0]: TOTP secrets encrypted at rest with AES-256-GCM, never stored in plaintext
- [Roadmap v3.0]: JWT session strategy (not database sessions) for proxy.ts compatibility with Next.js 16
- [Roadmap v3.0]: Phase 28 and 29 both depend on Phase 26, sequenced for clarity but could parallelize
- [25-01]: userId optional (String?) for expand step -- will be made required in Plan 02
- [25-01]: bcrypt cost factor 12 for admin password hashing
- [25-01]: No Authenticator model -- WebAuthn not in scope for v3.0
- [Phase 25]: getDefaultUserId() temporary helper for pre-auth user resolution in pages/actions
- [Phase 25]: findFirst with userId replaces findUnique on Period and Budget composite keys
- [Phase 25]: userId required (NOT NULL) on all 10 data models -- expand-contract migration complete
- [Phase 26]: No production imports in stubs -- pure vitest describe/it.todo blocks for Wave 0
- [Phase 26]: authorizeUser type uses Partial<Record> to match Auth.js v5 Credentials contract
- [Phase 26]: (auth) layout created in Plan 02 since Plan 01 did not create it
- [Phase 26]: All @/app/X/actions imports updated to @/app/(app)/X/actions for route group compatibility
- [Phase 26]: Mock next-auth module init in tests to avoid next/server ESM import chain
- [Phase 26]: Integration test mocks only NextAuth init, uses real authorizeUser + real DB + real bcrypt
- [Phase 27]: requireAuth() returns { userId } object (not bare string) for extensibility
- [Phase 27]: connection() as first line of every page to prevent cross-user cache leakage
- [Phase 27]: Non-null assertion on session (session!.user!.id) -- proxy.ts guarantees auth for (app) routes
- [Phase 27]: requireAuth() placed BEFORE try/catch -- redirect() throws and would be swallowed inside try/catch
- [Phase 27]: IDOR fix: findFirst pre-check with userId before update/delete operations
- [Phase 28 P01]: Added dedicated `revokedAt` field on InviteToken instead of reusing `usedAt` -- unambiguous status derivation (resolves D-05 per RESEARCH Pitfall #7)
- [Phase 28 P01]: `sessionCallback` always writes `session.user.isAdmin` (true from token, or false fallback) so legacy pre-Phase-28 JWTs never render as undefined
- [Phase 28 P01]: `User.isAdmin?: boolean` in next-auth.d.ts is optional so authorizeUser's return stays compatible with NextAuth's User contract; Session.user.isAdmin is required (always set by sessionCallback)
- [Phase 28 P01]: Seed upsert `update: { isAdmin: true }` flips the admin flag on existing dev DBs, not just fresh ones
- [Phase 28 P03]: registerAction hashes password BEFORE opening $transaction -- 12-cost bcrypt is slow (~300ms) and must not pin a DB connection
- [Phase 28 P03]: All INVITE_* errors collapse to one ambiguous "ya no es valido" form-level message on submit -- differentiated feedback only on page load, to avoid a token-state oracle
- [Phase 28 P03]: Hidden `name="email"` input + disabled `name="email-display"` FloatingInput -- disabled form fields do not submit, but the Server Action needs email for defense-in-depth mismatch check
- [Phase 28 P03]: `Date.now()` wrapped in `currentTimeMs()` helper in Server Component page.tsx -- React 19 `react-hooks/purity` rule rejects raw `Date.now()` at the render call site
- [Phase 28 P02]: requireAdmin() always does a fresh DB lookup -- defense-in-depth against stale JWTs where isAdmin was revoked after issuance
- [Phase 28 P02]: z.string().cuid() validation on revokeInviteToken runs BEFORE requireAdmin() -- invalid IDs never touch session or DB
- [Phase 28 P02]: IDOR scope via findFirst({ createdBy }) not findUnique+post-check -- forward-compatible with multi-admin
- [Phase 28 P02]: Origin derived server-side via next/headers in page.tsx and passed as prop -- avoids window.location.origin SSR mismatch
- [Phase 28 P02]: InvitacionForm does NOT clear the email input on success -- React 19 react-hooks/set-state-in-effect rule forbids setState inside useEffect; toast + URL panel provide ample confirmation
- [Phase 29 P01]: BackupCode Prisma model with @@index([userId]) + onDelete: Cascade — enables single-$transaction disable/delete flows (D-09, D-28)
- [Phase 29 P01]: Used prisma migrate diff + migrate deploy instead of migrate dev to bypass pre-existing benign checksum drift on 20260418030000_make_userid_required (from 5108bcc forward-fix) — zero data loss, canonical non-destructive path
- [Phase 29 P01]: Excluded tests/integration/** from default vitest unit runner (vitest.config.mts) — those files have their own DB-coupled singleFork runner and were producing intermittent parallel-write races under the default pool
- [Phase 29 P01]: Installed otplib@13.4.0, qrcode@1.5.4, @upstash/ratelimit@2.0.8, @upstash/redis@1.37.0, @types/qrcode@1.5.6 at RESEARCH-verified versions (2026-04-20); no --legacy-peer-deps required
- [Phase 29 P02]: verifyTotp wraps otplib verify in try/catch and returns false on SecretTooShort / base32-decode exceptions — matches contract "returns false for wrong code without throwing", simplifies Wave-2 consumers
- [Phase 29 P02]: backup-code normalization (strip dashes + lowercase) happens BEFORE bcrypt.hash AND before bcrypt.compare, so display form AB12-CD34 and raw ab12cd34 verify against the same hash
- [Phase 29 P02]: Rate-limit test mock uses class-shim (class FakeRatelimit with static slidingWindow) rather than Object.assign(vi.fn(), ...) — the class preserves `new Ratelimit(...)` semantics through vi.resetModules() re-imports
- [Phase 29 P02]: loginSchema retained alongside new loginPasswordSchema in validators.ts — Plan 29-03 will migrate loginAction's import; coexistence prevents breakage during transition
- [Phase 29 P03]: authorizeUser branches on (challenge && totpCode) presence BEFORE bcrypt.compare — verifyTotpAction sends password: '' so we must skip bcrypt on step-2; the 5-min HMAC-signed challenge (userId+email binding) IS the proof of step-1 password verification
- [Phase 29 P03]: authorizeUser's 1FA path explicitly rejects 2FA-enabled users (return null) even with correct password — defense-in-depth against a faulty loginAction, T-29-AUTH-001
- [Phase 29 P03]: verifyTotpAction runs verifyChallenge BEFORE checkRateLimit so the rate-limit key can be composed from a verified userId (IDOR-safe, Pitfall 7); Zod runs BEFORE rate-limit so malformed payloads don't burn legitimate users' quota
- [Phase 29 P03]: FloatingInput extended additively with inputMode + placeholder optional props (placeholder only renders while the label floats) — 20+ existing consumers unaffected
- [Phase 29 P03]: register/page.test.tsx mocked the 5 Phase-29 lib modules as Rule-3 deviation — Task 1's src/auth.ts changes transitively pull @/lib/totp-crypto, which validates AUTH_TOTP_ENCRYPTION_KEY at module load; targeted mocks are lower-risk than a global setupFiles hook

### Pending Todos

None yet.

### Blockers/Concerns

- Schema migration (Phase 25) is highest risk -- userId FK on 10 tables requires careful expand-contract to avoid breaking 479 existing tests
- CVE-2025-29927: proxy.ts middleware bypass -- requireAuth() in every Server Action is non-negotiable defense-in-depth

## Session Continuity

Last session: 2026-04-21T17:58:50Z
Stopped at: Plan 29-03 complete — Wave 2 two-step login wiring shipped (authorizeUser 2FA branch + split loginAction + verifyTotpAction + TotpStep component + LoginForm branch + FloatingInput additive props, 672 unit tests passing)
Resume file: .planning/phases/29-totp-two-factor-authentication/29-04-PLAN.md
