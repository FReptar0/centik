---
gsd_state_version: 1.0
milestone: v3.0
milestone_name: Auth + Cloud Deploy
current_phase: 30
current_plan: 6
status: executing
stopped_at: Plan 30-05 complete — cross-user isolation tests expanded (12 read tests in isolation.test.ts + 13 mutation IDOR tests split across isolation-actions.test.ts and isolation-actions-totp.test.ts); 71/71 integration + 710/710 unit green
last_updated: "2026-04-22T00:30:00.000Z"
last_activity: 2026-04-22
progress:
  total_phases: 6
  completed_phases: 5
  total_plans: 23
  completed_plans: 22
  percent: 95
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-16)

**Core value:** A single user can register a financial transaction in under 30 seconds and immediately see how it impacts their budget, debt ratio, and savings rate across all views.
**Current focus:** Phase 30 — Vercel Deploy + Security Hardening

## Current Position

Phase: 30 (Vercel Deploy + Security Hardening) — EXECUTING
Plan: 6 of 6
**Current Phase:** 30
**Current Plan:** 6
**Total Plans in Phase:** 6
**Status:** Ready to execute
**Last Activity:** 2026-04-22

Progress: [█████████▌] 95%

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
| Phase 29 P04 | 52min | 3 tasks | 9 files |
| Phase 30 P01 | 6min | 3 tasks | 6 files |
| Phase 30 P02 | 12min | 3 tasks | 12 files |
| Phase 30 P03 | 5min | 3 tasks | 3 files |
| Phase 30 P04 | 10min | 2 tasks | 2 files |
| Phase 30 P05 | 11min | 2 tasks | 3 files |

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
- [Phase 29 P04]: prepareTotpSecretAction does zero DB writes — secret + QR return via Server Action response, client holds in wizard state until step 2 submits it back (Open Q5 RESOLVED; avoids orphan provisional-secret rows)
- [Phase 29 P04]: enableTotpAction + regenerateBackupCodesAction hash all 10 backup codes via Promise.all(bcrypt.hash) BEFORE opening prisma.$transaction — Phase 28 P03 rule reapplied to prevent connection pinning during cost-12 bcrypt runs (~3s)
- [Phase 29 P04]: verifyCurrentCode private helper detects TOTP (^\d{6}$) vs backup (^[0-9a-f]{8}$ after dash strip) and collapses both failure paths into a single boolean; callers map to generic "_form: ['Codigo invalido']" (oracle-resistance per D-21)
- [Phase 29 P04]: Seguridad section is NOT admin-gated (D-19) — every authenticated user manages their own 2FA; Invitaciones stays admin-gated; both coexist in ConfiguracionClientWrapper
- [Phase 29 P04]: Activar2faModal + RegenerarCodigosModal derive step/codes from useActionState result (const successCodes = state.success ? state.backupCodes : null) rather than syncing via useEffect+setState — React 19 react-hooks/set-state-in-effect compliance; toast stays in useEffect as a pure external-system side-effect
- [Phase 29 P04]: BackupCodesScreen download uses client-side Blob URL (<a download> + URL.createObjectURL) rather than a Server Action file response — codes are already in client memory, server round-trip would waste bandwidth + marginally risk a log capture; D-12 Claude's Discretion
- [Phase 30]: [30-01]: Prisma 7.6 dual-URL via prisma.config.ts -- datasource.url = env('DIRECT_URL') for CLI; runtime keeps DATABASE_URL via @prisma/adapter-pg (D-03 mechanism correction per RESEARCH)
- [Phase 30]: [30-01]: Local DIRECT_URL aliased to DATABASE_URL in .env and .env.test because Docker Postgres has no pooler; production diverges (pooled.db.prisma.io vs db.prisma.io)
- [Phase 30]: [30-01]: Wave-0 src/lib/env.ts is a typed passthrough (not validator); Plan 30-02 replaces internals with Zod but freezes exported env shape + Env type now so downstream consumers never refactor
- [Phase 30]: [30-01]: .env.example documents Vercel Marketplace contract explicitly: DATABASE_URL auto-injected by Vercel; DIRECT_URL MUST be copied manually from Prisma Console into Vercel Project Settings
- [Phase 30]: [30-02]: Zod superRefine runs conditionally on NODE_ENV==='production' (one schema, not two types); env.ts throws an aggregated Error listing every failing key (D-31: no console.log)
- [Phase 30]: [30-02]: totp-crypto.ts's hand-rolled loadKey()+KEY_HEX_LENGTH deleted -- env.ts's /^[0-9a-fA-F]{64}$/ regex is single source of truth
- [Phase 30]: [30-02]: challenge.ts BLOCKER fix (plan-checker round 1) -- getSecret() reads env.AUTH_SECRET + dropped unreachable null-throw; env.ts's min(32) gates at boot
- [Phase 30]: [30-02]: rate-limit.ts KEEPS Redis.fromEnv() -- Upstash SDK reads UPSTASH_* from process.env internally (SDK convention); env.ts superRefine has already validated both vars exist in production
- [Phase 30]: [30-02]: challenge.test.ts rewritten from static `import { signChallenge } from './challenge'` to dynamic `await import('./challenge')` inside each test -- ESM import hoisting evaluated the module BEFORE vi.stubEnv could set required env vars
- [Phase 30]: [30-02]: auth.test.ts + register/page.test.tsx use `vi.mock('@/lib/env', ...)` hoisted above other mocks -- simplest way to bypass env.ts's Zod parse in test files that transitively import @/auth
- [Phase 30]: [30-02]: Removed 2 obsolete tests (RATE_LIMIT_DISABLED=true bypass in prod, throws when AUTH_SECRET missing at sign time) -- env.ts's module-load validation makes both scenarios unreachable; coverage semantics shifted to env.test.ts
- [Phase 30]: [30-03]: next.config.ts async headers() applies 4 always-on security headers + HSTS on source '/(.*)'; HSTS is wrapped in `isProduction` ternary inside the array so localhost never receives Strict-Transport-Security (D-07)
- [Phase 30]: [30-03]: proxy.ts preserves Phase-26 auth redirect chain by hoisting the three original return branches into a single `response` variable -- CSP attach happens after all routing decisions, only on non-redirect responses
- [Phase 30]: [30-03]: 3xx responses short-circuit BEFORE CSP attach in proxy.ts (`if response.status >= 300 && < 400 return response`) -- browsers discard redirect bodies, so CSP is wasted bytes AND caches a stale nonce against the redirect target
- [Phase 30]: [30-03]: Nonce generated via `crypto.randomUUID()` (global in Node 20.9+, Edge-compatible) per Next.js 16 authoritative docs -- Base64-wrapped UUID gives ~48 char base64 string with 128-bit entropy
- [Phase 30]: [30-03]: `'unsafe-inline'` retained in style-src ONLY (NOT script-src) -- documented Tailwind v4 + React 19 inline-style trade-off per D-06; script-src hardened with `'nonce-${nonce}' 'strict-dynamic'` + dev-only `'unsafe-eval'` (React Fast Refresh)
- [Phase 30]: [30-03]: Original response headers copied onto responseWithNonce via `response.headers.forEach((v, k) => responseWithNonce.headers.set(k, v))` -- preserves Auth.js Set-Cookie on session-mutating requests that would otherwise be dropped when creating the fresh NextResponse.next({request})
- [Phase 30]: [30-03]: createMockRequest test helper extended additively with `headers: new Headers()` -- existing 6 auth-redirect tests don't read req.headers so the addition is backwards-compatible; spies on NextResponse.next still fire because proxy.ts calls it once-or-twice and the spy asserts "was called" (not call count)
- [Phase 30]: [30-04]: prisma/seed.prod.ts uses findUnique-then-branch instead of upsert — the update path is `data: { isAdmin: true, isApproved: true }` with NO hashedPassword field, so D-10 no-rotation is structurally guaranteed (the field cannot be accidentally added back by a bugfix)
- [Phase 30]: [30-04]: bcrypt.hash(password, 12) runs inside the create branch only, AFTER findUnique has ruled out the update path — saves ~300ms on idempotent re-runs and matches Phase 28 P03 hash-before-$transaction discipline
- [Phase 30]: [30-04]: ADMIN_PASSWORD length gate (< 12 chars throws) lives inline in prisma/seed.prod.ts rather than in src/lib/env.ts — the seed is a standalone CLI that bypasses Next.js boot, so env.ts's Zod schema cannot gate it
- [Phase 30]: [30-04]: db:seed:prod placed between test:e2e and quality in package.json — NOT in build/quality/postinstall chains (D-11 compliance: seed is a manual one-shot)
- [Phase 30]: [30-04]: Smoke-proven idempotency — first-run creates admin; second-run with DIFFERENT password kept the DB hash byte-identical (`$2b$12$FAw0dQAmw01...`), confirming no accidental rotation path
- [Phase 30]: [30-05]: Split isolation-actions into main file (entity CRUD mutations, 283 lines, 11 tests) + companion (session-bound TOTP, 119 lines, 2 tests) — 402-line first draft exceeded CLAUDE.md <300 rule; plan 30-05 Task 2 File Size Management clause authorised the split
- [Phase 30]: [30-05]: requireAuth mock uses vi.fn() + vi.mocked() (invite-tokens.test.ts pattern) instead of plan-suggested closure-captured mockRequireAuth — equivalent, simpler, vi.clearAllMocks() resets cleanly
- [Phase 30]: [30-05]: upsertBudgets test asserts "User B row byte-identical" only (dropped the 'if success throw' guard) — action currently DOES succeed on cross-user period, creating a User-A-owned Budget row; load-bearing check still catches any mutation of User B data. Partial-IDOR finding documented in 30-05-SUMMARY as a follow-up for next plan (scope boundary blocks src/ edit here)
- [Phase 30]: [30-05]: afterAll cleanup filters by userId IN [userAId, userBId] — not just userBId — because the upsertBudgets partial-IDOR creates a stale User-A row; sweeping both userIds keeps the test DB pristine across back-to-back runs
- [Phase 30]: [30-05]: TOTP tests wrap disableTotpAction + regenerateBackupCodesAction calls in try/catch; the actions actually return gracefully (User A's totpEnabled: false → verifyCurrentCode returns false → graceful error) so the try/catch is defensive, not load-bearing — the post-call User B row check is the truth source

### Pending Todos

None yet.

### Blockers/Concerns

- Schema migration (Phase 25) is highest risk -- userId FK on 10 tables requires careful expand-contract to avoid breaking 479 existing tests
- CVE-2025-29927: proxy.ts middleware bypass -- requireAuth() in every Server Action is non-negotiable defense-in-depth

## Session Continuity

Last session: 2026-04-22T00:30:00.000Z
Stopped at: Completed Plan 30-05 — cross-user isolation tests expanded. +5 entity read tests in isolation.test.ts (MonthlySummary/Asset/ValueUnit/UnitRate/BackupCode) = 12/12 passing. NEW isolation-actions.test.ts (11 mutation IDOR tests) + isolation-actions-totp.test.ts (2 session-scope TOTP tests) both green. 71/71 integration + 710/710 unit + build + lint all green. ISOL-05 + TEST-03 complete. Partial-IDOR finding in upsertBudgets documented in 30-05-SUMMARY for follow-up
Resume file: None
