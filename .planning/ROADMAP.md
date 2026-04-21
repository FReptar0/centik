# Roadmap: Centik

## Milestones

- v1.0 MVP - Phases 1-11 (shipped 2026-04-06)
- v1.1 Glyph Finance Design System - Phases 12-16 (shipped 2026-04-06)
- v2.0 Glyph Finance Implementation - Phases 17-22 (shipped 2026-04-16)
- v2.1 Responsive Audit + Bug Fixes - Phases 23-24 (shipped 2026-04-16)
- v3.0 Auth + Cloud Deploy - Phases 25-30 (in progress)

## Phases

<details>
<summary>v1.0 MVP (Phases 1-11) - SHIPPED 2026-04-06</summary>

See `.planning/milestones/v1.0-ROADMAP.md` for full phase details.

- [x] **Phase 1-11** — Full MVP: scaffolding, DB, libraries, layout, income, categories+transactions, dashboard, debts, budget, history, polish

</details>

<details>
<summary>v1.1 Glyph Finance Design System (Phases 12-16) - SHIPPED 2026-04-06</summary>

See `.planning/milestones/v1.1-ROADMAP.md` for full phase details.

- [x] **Phase 12-16** — Design system docs: tokens, component specs, signatures, UX patterns, reference sync

</details>

<details>
<summary>v2.0 Glyph Finance Implementation (Phases 17-22) - SHIPPED 2026-04-16</summary>

See `.planning/milestones/v2.0-ROADMAP.md` for full phase details.

- [x] **Phase 17-22** — Token migration, 5 primitives, layout overhaul, feature updates, TransactionForm+Numpad, visual QA

</details>

<details>
<summary>v2.1 Responsive Audit + Bug Fixes (Phases 23-24) - SHIPPED 2026-04-16</summary>

See `.planning/milestones/v2.1-ROADMAP.md` for full phase details.

- [x] **Phase 23: Layout + Grid Responsiveness** — Expansion fix, max-width, grid breakpoints
- [x] **Phase 24: Touch Targets + Table Optimization** — 44px buttons, table scroll + input touch

</details>

### v3.0 Auth + Cloud Deploy (In Progress)

**Milestone Goal:** Llevar Centik a produccion en Vercel con autenticacion NextAuth (email+password+TOTP 2FA), invite-only access, Prisma Postgres, per-user data isolation, y security headers. Seguridad extrema — es informacion financiera real.

- [x] **Phase 25: Schema Migration** - User model, Auth.js adapter tables, InviteToken model, userId FK on 10 data tables, existing tests updated (completed 2026-04-18)
- [x] **Phase 26: Auth Wiring + Login** - Auth.js v5 with Credentials provider, JWT sessions, proxy.ts route protection, login page, password hashing (completed 2026-04-18)
- [x] **Phase 27: Per-User Data Isolation** - requireAuth() helper, all queries scoped by userId, all Server Actions protected, noStore() on user-specific pages (completed 2026-04-18)
- [x] **Phase 28: Invite-Only Registration** - Admin invite generation, registration page with token validation, self-registration blocked (completed 2026-04-20)
- [x] **Phase 29: TOTP Two-Factor Authentication** - TOTP setup with QR code, AES-256-GCM encrypted secrets, two-step login, backup codes, rate limiting (completed 2026-04-21)
- [ ] **Phase 30: Vercel Deploy + Security Hardening** - Prisma Postgres, security headers, production seed, Vercel config, cross-user isolation test suite

## Phase Details

### Phase 25: Schema Migration
**Goal**: Database schema supports multi-user architecture with Auth.js session management and invite-only registration
**Depends on**: Phase 24 (v2.1 complete)
**Requirements**: AUTH-01, INVITE-01, TEST-01
**Success Criteria** (what must be TRUE):
  1. User model exists with email, hashedPassword, isApproved, totpSecret, totpEnabled fields
  2. Auth.js adapter tables (Account, Session, VerificationToken) exist in Prisma schema
  3. InviteToken model exists with token, email, expiresAt, usedAt fields
  4. All 10 existing data models (Transaction, Category, IncomeSource, Debt, Budget, Period, MonthlySummary, Asset, ValueUnit, UnitRate) have a userId field with foreign key to User
  5. All 479 existing unit tests pass with userId parameter additions (expand-contract: userId is optional during migration)
**Plans**: 2 plans

Plans:
- [ ] 25-01-PLAN.md — Schema migration + seed update (User, auth tables, InviteToken, userId optional on 10 models, admin user seed)
- [ ] 25-02-PLAN.md — Lib function userId params + test updates + make userId required (expand-contract complete)

### Phase 26: Auth Wiring + Login
**Goal**: Users can authenticate with email and password, and unauthenticated visitors are redirected to the login page
**Depends on**: Phase 25
**Requirements**: AUTH-02, AUTH-03, AUTH-04, AUTH-05, TEST-02
**Success Criteria** (what must be TRUE):
  1. User can log in with email and password on a Glyph Finance-styled login page and receive a JWT session
  2. Unauthenticated visitors to any page except /login and /register are redirected to /login
  3. Passwords are hashed with bcryptjs (cost factor 12) and never stored or logged in plaintext
  4. Auth tests validate login flow, session creation, session callback with userId, and requireAuth() redirect behavior
**Plans**: 4 plans

Plans:
- [ ] 26-00-PLAN.md — Wave 0: test stub files for auth, proxy, and auth actions
- [ ] 26-01-PLAN.md — Auth.js config + proxy.ts + loginSchema + FloatingInput extension
- [ ] 26-02-PLAN.md — Route group migration ((app)/(auth) groups, root layout split)
- [ ] 26-03-PLAN.md — Login page + logout button + auth test suite (unit + integration + E2E)

### Phase 27: Per-User Data Isolation
**Goal**: Every database query and mutation is scoped to the authenticated user -- no user can see or modify another user's financial data
**Depends on**: Phase 26
**Requirements**: ISOL-01, ISOL-02, ISOL-03, ISOL-04, DEPLOY-05
**Success Criteria** (what must be TRUE):
  1. requireAuth() helper exists, calls auth(), redirects unauthenticated users, and returns { userId } -- used as first line in every Server Action
  2. All Prisma queries across all 7 lib/data files include userId in their where clause
  3. All 6 Server Action files call requireAuth() before any database operation
  4. All page Server Components call auth() and pass userId to data-fetching functions
  5. connection() is called on all Server Components that fetch user-specific data to prevent cross-user cache leakage
**Plans**: 3 plans

Plans:
- [ ] 27-01-PLAN.md — requireAuth() helper + unit tests (replaces getDefaultUserId)
- [ ] 27-02-PLAN.md — Server Action migration (requireAuth + IDOR fixes) + test mock updates
- [ ] 27-03-PLAN.md — Page migration (auth + connection) + cross-user isolation integration test

### Phase 28: Invite-Only Registration
**Goal**: New users can only register via an admin-generated invite link -- no self-registration
**Depends on**: Phase 26
**Requirements**: INVITE-02, INVITE-03, INVITE-04
**Success Criteria** (what must be TRUE):
  1. Admin can generate an invite token via Server Action that produces a unique URL with a 32-byte random token
  2. A user visiting /register with a valid, unused, non-expired invite token can create an account with email and password
  3. A user visiting /register without a token, with an expired token, or with an already-used token sees an error and cannot register
**Plans**: 3 plans

Plans:
- [x] 28-01-PLAN.md — Schema migration (User.isAdmin + InviteToken.revokedAt) + seed update + JWT/session augmentation + Zod schemas (completed 2026-04-18)
- [x] 28-02-PLAN.md — Admin invite Server Actions + Invitaciones UI in /configuracion + integration tests (completed 2026-04-18)
- [x] 28-03-PLAN.md — registerAction with $transaction + /register page + RegisterForm + TokenErrorScreen + tests (completed 2026-04-18)

### Phase 29: TOTP Two-Factor Authentication
**Goal**: Users can enable TOTP-based 2FA for an additional layer of security on login, with backup codes for recovery
**Depends on**: Phase 26
**Requirements**: TOTP-01, TOTP-02, TOTP-03, TOTP-04, TOTP-05
**Success Criteria** (what must be TRUE):
  1. User can enable 2FA by scanning a QR code with an authenticator app and verifying a code before the secret is persisted
  2. TOTP secrets are encrypted at rest using AES-256-GCM with AUTH_TOTP_ENCRYPTION_KEY environment variable -- plaintext secrets never written to database
  3. Login for 2FA-enabled users requires password verification first, then TOTP code verification before session is issued
  4. User receives 10 single-use backup codes during 2FA setup, each hashed with bcryptjs, usable as TOTP code alternative
  5. Login and TOTP verification endpoints are rate-limited to 5 attempts per minute via @upstash/ratelimit
**Plans**: 5 plans

Plans:
- [x] 29-01-PLAN.md — Wave 0: BackupCode schema + [BLOCKING] migration + install otplib/qrcode/@upstash deps + .env.example/.env.test updates + 8 test stubs (completed 2026-04-21)
- [x] 29-02-PLAN.md — Wave 1: 5 pure lib modules (totp-crypto AES-256-GCM, totp otplib wrapper, backup-codes atomic consume, challenge HMAC, rate-limit sliding-window) + 4 Zod schemas + paired tests (completed 2026-04-21)
- [x] 29-03-PLAN.md — Wave 2: two-step login wiring (extend authorizeUser + split loginAction + verifyTotpAction + TotpStep component + LoginForm requiresTotp branch) + unit tests (completed 2026-04-21)
- [x] 29-04-PLAN.md — Wave 2: Setup/Disable/Regen flows (4 Server Actions in totp-actions.ts + SeguridadSection + 3 bottom-sheet modals + BackupCodesScreen) + page wiring (completed 2026-04-21)
- [x] 29-05-PLAN.md — Wave 3: integration suite (enable/login-code/login-backup/concurrent-consume/cross-user-isolation/disable/regen) + E2E happy path + final quality gate

### Phase 30: Vercel Deploy + Security Hardening
**Goal**: Centik runs in production on Vercel with Prisma Postgres, security headers, and verified cross-user data isolation
**Depends on**: Phase 25, 26, 27, 28, 29 (all previous phases)
**Requirements**: ISOL-05, DEPLOY-01, DEPLOY-02, DEPLOY-03, DEPLOY-04, TEST-03
**Success Criteria** (what must be TRUE):
  1. Prisma Postgres is provisioned via Vercel Marketplace with pooled (runtime) and direct (migrations) connection strings configured
  2. Security headers are set in next.config.ts: CSP with per-request nonce, HSTS, X-Frame-Options DENY, X-Content-Type-Options nosniff
  3. Production seed script creates admin user (fmemije00@gmail.com) with hashed password
  4. Centik is deployed and accessible on Vercel with all environment variables configured
  5. Cross-user isolation integration tests pass -- User B authenticates and gets zero results when querying User A's transactions, debts, budgets, income sources, categories, and history
**Plans**: 6 plans

Plans:
- [ ] 30-01-PLAN.md -- Prisma 7 dual-URL config (prisma.config.ts -> DIRECT_URL) + .env.example/.env/.env.test updates + Wave-0 env.ts/env.test.ts stubs
- [ ] 30-02-PLAN.md -- Boot-time Zod env validator (src/lib/env.ts) + test suite + consumer sweep (prisma.ts, totp-crypto.ts, rate-limit.ts, auth.ts)
- [ ] 30-03-PLAN.md -- Security headers: next.config.ts async headers() + src/proxy.ts CSP-with-nonce (preserves Phase-26 auth redirects) + 4 new proxy tests
- [ ] 30-04-PLAN.md -- Production admin seed (prisma/seed.prod.ts, idempotent, no rotate, admin-only) + npm run db:seed:prod script
- [ ] 30-05-PLAN.md -- Cross-user isolation test expansion (+5 read tests in isolation.test.ts; NEW isolation-actions.test.ts with ≥10 Server-Action IDOR tests)
- [ ] 30-06-PLAN.md -- 30-VERIFICATION.md runbook + 11-item smoke checklist + HSTS preload submission + final quality gate (checkpoint)

## Progress

**Execution Order:**
Phases execute in numeric order: 25 -> 26 -> 27 -> 28 -> 29 -> 30
Note: Phases 28 and 29 both depend on 26, not on each other. They could theoretically run in parallel but are sequenced for clarity.

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1-11 | v1.0 | 27/27 | Complete | 2026-04-06 |
| 12-16 | v1.1 | 9/9 | Complete | 2026-04-06 |
| 17-22 | v2.0 | 17/17 | Complete | 2026-04-16 |
| 23-24 | v2.1 | 4/4 | Complete | 2026-04-16 |
| 25. Schema Migration | 2/2 | Complete    | 2026-04-18 | - |
| 26. Auth Wiring + Login | 4/4 | Complete    | 2026-04-18 | - |
| 27. Per-User Data Isolation | 3/3 | Complete    | 2026-04-18 | - |
| 28. Invite-Only Registration | v3.0 | 3/3 | Complete    | 2026-04-20 |
| 29. TOTP Two-Factor Auth | v3.0 | 5/5 | Complete   | 2026-04-21 |
| 30. Vercel Deploy + Security | v3.0 | 0/? | Not started | - |
