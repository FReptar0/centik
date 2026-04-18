# Phase 25: Schema Migration - Context

**Gathered:** 2026-04-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Add User model, Auth.js adapter tables (Account, Session, VerificationToken), InviteToken model, and userId FK on all 10 existing data models. Expand-contract pattern: userId starts optional, seed backfills against admin user, then made required. All 479 existing tests must pass after migration.

</domain>

<decisions>
## Implementation Decisions

All decisions locked from research (STACK.md, ARCHITECTURE.md, PITFALLS.md).

### User Model
- Fields: id (cuid), email (unique), hashedPassword, isApproved (default false), totpSecret (optional, encrypted), totpEnabled (default false), createdAt, updatedAt
- Email is unique constraint — used for login
- isApproved controls invite-only access (Phase 28 uses this)
- totpSecret will be encrypted at rest (Phase 29 uses this)

### Auth.js Adapter Tables
- Use official @auth/prisma-adapter schema: Account, Session, VerificationToken
- JWT session strategy means Session table is optional but included for adapter compatibility
- Account table supports future OAuth if ever needed

### InviteToken Model
- Fields: id (cuid), token (unique, 32-byte hex), email (string), expiresAt (DateTime), usedAt (DateTime, optional), createdBy (userId FK), createdAt
- Token is crypto.randomBytes(32).toString('hex')
- Used in Phase 28 for registration

### userId FK Migration (Expand-Contract)
- Step 1: Add userId as OPTIONAL (String?) to all 10 models
- Step 2: Seed script creates admin user, backfills userId on all existing records
- Step 3: Make userId REQUIRED (String) with @relation to User
- All 10 models: IncomeSource, Transaction, Category, Debt, Budget, Period, MonthlySummary, ValueUnit, UnitRate, Asset
- Add @@index on userId for query performance on each model

### Seed Script Updates
- Create admin user first (email from env var ADMIN_EMAIL or hardcoded fmemije00@gmail.com)
- Hash a default password with bcryptjs (cost 12) — password from env var ADMIN_PASSWORD
- Backfill userId on all existing seed data
- Seed must remain idempotent

### Test Updates
- All lib function signatures gain userId parameter
- Test mocks/factories need userId in test data
- No functional test changes — just add userId to fixtures

### Claude's Discretion
- Exact migration file structure (1 migration vs multiple)
- Whether to add BackupCode model now or defer to Phase 29
- Whether ValueUnit and UnitRate need userId (they're global reference data) — research says yes for consistency, but could argue they're shared
- prisma.config.ts changes for Prisma Postgres adapter (or defer to Phase 30)

</decisions>

<code_context>
## Existing Code Insights

### Current Schema
- 10 models, no User model, no auth tables
- Generator: prisma-client-js with output ../generated/prisma
- Datasource: PostgreSQL (Docker dev)
- Seed: 3 files (seed.ts, seed-data.ts, seed-transactions.ts)

### Key Files Affected
- prisma/schema.prisma — schema changes
- prisma/seed.ts, seed-data.ts, seed-transactions.ts — admin user + backfill
- src/lib/*.ts — all function signatures gain userId param
- src/lib/*.test.ts — test fixtures gain userId
- src/types/index.ts — Serialized* types gain userId

### Integration Points
- All lib functions called from Server Actions and page Server Components
- Types flow: Prisma model → serializeBigInts → Serialized* type → Client Component props

</code_context>

<deferred>
## Deferred Ideas

- BackupCode model — could add now or defer to Phase 29 when TOTP is implemented
- Prisma Postgres adapter config — defer to Phase 30 (Vercel deploy)

</deferred>

---

*Phase: 25-schema-migration*
*Context gathered: 2026-04-17*
