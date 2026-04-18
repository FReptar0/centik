---
phase: 25-schema-migration
plan: 01
subsystem: database
tags: [prisma, postgresql, auth, bcryptjs, migration, user-model]

requires:
  - phase: none
    provides: existing 10-model schema
provides:
  - User model with email, hashedPassword, isApproved, totpSecret, totpEnabled
  - Auth.js adapter tables (Account, Session, VerificationToken)
  - InviteToken model for invite-only registration
  - Optional userId FK on all 10 existing data models (expand step)
  - Admin user seed with bcrypt-hashed password
  - userId backfill on all seed data
affects: [26-auth-implementation, 27-data-isolation, 28-invite-system, 29-totp-2fa, 30-cloud-deploy]

tech-stack:
  added: [bcryptjs, "@types/bcryptjs"]
  patterns: [expand-contract userId migration, admin user seeding with bcrypt]

key-files:
  created:
    - prisma/migrations/20260418020019_add_auth_models_and_userid/migration.sql
  modified:
    - prisma/schema.prisma
    - prisma/seed.ts
    - prisma/seed-transactions.ts
    - .env.example
    - src/lib/history.ts
    - tests/integration/seed.test.ts

key-decisions:
  - "userId optional (String?) for expand step -- will be made required in Plan 02"
  - "bcrypt cost factor 12 for admin password hashing"
  - "No Authenticator model -- WebAuthn not in scope for v3.0"

patterns-established:
  - "Expand-contract: add userId as optional first, backfill, then make required"
  - "seedAdminUser() runs before all other seed functions to provide userId"

requirements-completed: [AUTH-01, INVITE-01]

duration: 10min
completed: 2026-04-18
---

# Phase 25 Plan 01: Schema Migration Summary

**Prisma schema expanded with User, Account, Session, VerificationToken, InviteToken models and optional userId FK on all 10 existing data models using expand-contract pattern**

## Performance

- **Duration:** 10 min
- **Started:** 2026-04-18T01:57:38Z
- **Completed:** 2026-04-18T02:07:46Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Added 5 new auth-related models to Prisma schema (User, Account, Session, VerificationToken, InviteToken) bringing total to 15 models
- Added optional userId FK with cascade delete and @@index([userId]) to all 10 existing data models
- Updated seed to create admin user with bcrypt-hashed password (cost 12) and backfill userId on all seed data
- Migration applied cleanly, all 494 tests pass, build succeeds

## Task Commits

Each task was committed atomically:

1. **Task 1: Add auth models and userId FK to Prisma schema** - `0128361` (feat)
2. **Task 2: Run migration and update seed with admin user + userId backfill** - `b5792f2` (feat)

## Files Created/Modified
- `prisma/schema.prisma` - Added User, Account, Session, VerificationToken, InviteToken models + userId on 10 existing models
- `prisma/migrations/20260418020019_add_auth_models_and_userid/migration.sql` - Migration SQL for new tables and columns
- `prisma/seed.ts` - Added seedAdminUser(), pass adminUserId to all seed functions
- `prisma/seed-transactions.ts` - Updated builders to accept and include userId parameter
- `.env.example` - Added AUTH_SECRET, AUTH_TOTP_ENCRYPTION_KEY, ADMIN_EMAIL, ADMIN_PASSWORD placeholders
- `src/lib/history.ts` - Added userId to SerializedMonthlySummary construction
- `tests/integration/seed.test.ts` - Increased timeouts for bcrypt-slowed seed execution
- `package.json` - Added bcryptjs dependency

## Decisions Made
- userId is String? (optional) in this expand step -- Plan 02 will make it required after test updates
- bcrypt cost factor 12 for admin password hashing per CLAUDE.md specification
- No Authenticator model added -- WebAuthn/passkeys are not in scope for any v3.0 phase per CONTEXT.md
- Default admin email fmemije00@gmail.com and password centik-dev-2026 used when env vars not set (dev only)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed SerializedMonthlySummary missing userId in history.ts**
- **Found during:** Task 2 (build verification)
- **Issue:** history.ts manually constructs SerializedMonthlySummary objects but didn't include the new userId field, causing TypeScript type error
- **Fix:** Added `userId: summary.userId` to the serialized object construction
- **Files modified:** src/lib/history.ts
- **Verification:** `npm run build` passes with zero errors
- **Committed in:** b5792f2 (Task 2 commit)

**2. [Rule 3 - Blocking] Fixed seed integration test timeouts**
- **Found during:** Task 2 (test verification)
- **Issue:** bcrypt.hash with cost 12 slowed seed execution enough to exceed default 10s beforeAll timeout and 5s test timeout
- **Fix:** Increased beforeAll timeout to 60s and idempotency test timeout to 30s
- **Files modified:** tests/integration/seed.test.ts
- **Verification:** All 494 tests pass
- **Committed in:** b5792f2 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking)
**Impact on plan:** Both auto-fixes necessary for correctness. No scope creep.

## Issues Encountered
- Prisma client needed explicit regeneration (`npx prisma generate`) after migration before seed would recognize the User model -- `prisma migrate dev` did not auto-regenerate the client output
- Test database container (port 5433) needed to be started and have migration applied separately from dev database

## User Setup Required
None - no external service configuration required. Admin credentials default to env vars or hardcoded dev values.

## Next Phase Readiness
- Schema foundation complete with 15 models and optional userId on all data models
- Plan 02 can now update lib functions, types, and tests to include userId, then make userId required
- Auth implementation (Phase 26) has the User model it needs

## Self-Check: PASSED

All files verified present. Both commits (0128361, b5792f2) confirmed in git log.

---
*Phase: 25-schema-migration*
*Completed: 2026-04-18*
