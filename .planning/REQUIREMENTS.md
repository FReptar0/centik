# Requirements: Centik

**Defined:** 2026-04-17
**Core Value:** A single user can register a financial transaction in under 30 seconds and immediately see how it impacts their budget, debt ratio, and savings rate across all views.

## v3.0 Requirements

Requirements for auth + cloud deploy. Security-first — this is real financial data in production.

### Auth Foundation

- [x] **AUTH-01**: Prisma schema updated with User model, Auth.js adapter tables (Account, Session, VerificationToken), and userId FK on all 10 existing data models
- [ ] **AUTH-02**: Auth.js v5 configured with Prisma adapter, Credentials provider (email+password), JWT session strategy, and session callbacks exposing userId
- [ ] **AUTH-03**: proxy.ts protects all routes except /login and /register — unauthenticated users redirected to /login
- [ ] **AUTH-04**: Login page with email+password form, error handling, and Glyph Finance design
- [ ] **AUTH-05**: Password hashing with bcryptjs (cost factor 12), passwords never stored in plaintext

### Per-User Data Isolation

- [ ] **ISOL-01**: requireAuth() helper function that calls auth(), redirects if no session, returns { userId } — used as first line in every Server Action
- [ ] **ISOL-02**: All Prisma queries across all 7 lib files scoped with userId filter (where: { userId })
- [ ] **ISOL-03**: All Server Actions (6 action files) call requireAuth() before any database operation
- [ ] **ISOL-04**: All page Server Components call auth() and pass userId to data-fetching functions
- [ ] **ISOL-05**: Cross-user integration tests — authenticate as User B, assert zero access to User A's data

### TOTP 2FA

- [ ] **TOTP-01**: TOTP setup flow — generate secret, display QR code (otpauth URI), verify first code before persisting
- [ ] **TOTP-02**: TOTP secrets encrypted at rest with AES-256-GCM using AUTH_TOTP_ENCRYPTION_KEY env var
- [ ] **TOTP-03**: Two-step login flow — password verification first, then TOTP code verification before session issuance
- [ ] **TOTP-04**: 10 backup codes generated during 2FA setup, hashed with bcryptjs, single-use
- [ ] **TOTP-05**: Rate limiting on login and TOTP endpoints via @upstash/ratelimit (max 5 attempts per minute)

### Invite-Only Registration

- [x] **INVITE-01**: InviteToken model in Prisma schema (token, email, expiresAt, usedAt)
- [ ] **INVITE-02**: Admin Server Action to generate invite tokens (crypto.randomBytes(32))
- [ ] **INVITE-03**: Registration page — only accessible with valid invite token URL, creates user with isApproved=true
- [ ] **INVITE-04**: No self-registration — /register without valid token shows error

### Vercel Deploy + Security

- [ ] **DEPLOY-01**: Prisma Postgres provisioned via Vercel Marketplace with pooled (runtime) and direct (migrations) connection strings
- [ ] **DEPLOY-02**: Security headers in next.config.ts — CSP with per-request nonce, HSTS, X-Frame-Options DENY, X-Content-Type-Options nosniff
- [ ] **DEPLOY-03**: Production seed script that creates admin user (your email) with hashed password
- [ ] **DEPLOY-04**: Vercel deployment configuration (vercel.json or project settings) with environment variables
- [ ] **DEPLOY-05**: noStore() on all Server Components fetching user-specific data to prevent cross-user cache leakage

### Test Updates

- [ ] **TEST-01**: All existing 479 unit tests pass with auth changes (userId params added to all function signatures)
- [ ] **TEST-02**: New auth tests — login flow, session validation, requireAuth() behavior, TOTP verification
- [ ] **TEST-03**: Cross-user isolation integration tests — User B cannot see User A's transactions, debts, budgets, income, categories, or history

## v4.0 Requirements

Deferred to future milestones.

### Features

- **FEAT-01**: System of value units (UDI, UMA, USD) with configurable rate providers
- **FEAT-02**: Asset/investment tracking (PPR, CETES, funds) with MXN conversion
- **FEAT-03**: PWA with offline support

## Out of Scope

| Feature | Reason |
|---------|--------|
| OAuth (Google, GitHub) | Email+password sufficient for invite-only single-user. Adds complexity without value. |
| Email verification | Invite-only means admin knows the user. No self-registration = no email verification needed. |
| Password reset via email | Single admin user can reset via DB/seed. Email infra not justified for 1-2 users. |
| Row Level Security (RLS) | Application-level userId filtering is sufficient and simpler than Postgres RLS for this scale. |
| Multi-tenant admin panel | Not needed — admin actions via Server Actions or seed script. |
| Session database strategy | JWT required for proxy.ts compatibility with Next.js 16 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 25 | Complete |
| AUTH-02 | Phase 26 | Pending |
| AUTH-03 | Phase 26 | Pending |
| AUTH-04 | Phase 26 | Pending |
| AUTH-05 | Phase 26 | Pending |
| ISOL-01 | Phase 27 | Pending |
| ISOL-02 | Phase 27 | Pending |
| ISOL-03 | Phase 27 | Pending |
| ISOL-04 | Phase 27 | Pending |
| ISOL-05 | Phase 30 | Pending |
| TOTP-01 | Phase 29 | Pending |
| TOTP-02 | Phase 29 | Pending |
| TOTP-03 | Phase 29 | Pending |
| TOTP-04 | Phase 29 | Pending |
| TOTP-05 | Phase 29 | Pending |
| INVITE-01 | Phase 25 | Complete |
| INVITE-02 | Phase 28 | Pending |
| INVITE-03 | Phase 28 | Pending |
| INVITE-04 | Phase 28 | Pending |
| DEPLOY-01 | Phase 30 | Pending |
| DEPLOY-02 | Phase 30 | Pending |
| DEPLOY-03 | Phase 30 | Pending |
| DEPLOY-04 | Phase 30 | Pending |
| DEPLOY-05 | Phase 27 | Pending |
| TEST-01 | Phase 25 | Pending |
| TEST-02 | Phase 26 | Pending |
| TEST-03 | Phase 30 | Pending |

**Coverage:**
- v3.0 requirements: 27 total
- Mapped to phases: 27
- Unmapped: 0

---
*Requirements defined: 2026-04-17*
*Traceability updated: 2026-04-17*
