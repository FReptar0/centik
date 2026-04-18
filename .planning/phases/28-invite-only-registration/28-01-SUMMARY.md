---
phase: 28-invite-only-registration
plan: 01
subsystem: auth
tags: [prisma, migration, next-auth, jwt, session, zod, validators, invite]

# Dependency graph
requires:
  - phase: 27-per-user-data-isolation
    provides: "Per-user data isolation via requireAuth() in all Server Actions and pages"
provides:
  - "User.isAdmin column + InviteToken.revokedAt column in schema and DB"
  - "session.user.isAdmin reachable from any Server Component/Action via auth()"
  - "createInviteSchema and registerSchema Zod schemas importable from @/lib/validators"
affects: [28-02, 28-03, admin-gating, registration-flow]

# Tech tracking
tech-stack:
  added: []
  patterns: [module-augmentation-isAdmin, defensive-jwt-fallback, revokedAt-explicit-field]

key-files:
  created:
    - prisma/migrations/20260418040000_add_user_isadmin_and_invite_revokedat/migration.sql
  modified:
    - prisma/schema.prisma
    - prisma/seed.ts
    - src/auth.ts
    - src/auth.test.ts
    - src/types/next-auth.d.ts
    - src/lib/validators.ts
    - tests/integration/seed.test.ts

key-decisions:
  - "Added dedicated revokedAt field on InviteToken instead of reusing usedAt -- makes status derivation unambiguous per RESEARCH Pitfall #7 (resolves D-05)"
  - "sessionCallback sets session.user.isAdmin = false when token.isAdmin is undefined -- defensive fallback for pre-Phase-28 JWTs still in circulation"
  - "Seed update path sets isAdmin: true so existing dev DBs flip the flag on subsequent seed runs, not just fresh DBs"
  - "interface User in next-auth.d.ts uses isAdmin?: boolean (optional) so authorizeUser return type remains compatible with NextAuth's User contract"

patterns-established:
  - "Module augmentation pattern for adding custom session fields: extend Session.user (required), User (optional), and JWT (optional) in parallel"
  - "Confirm-password Zod refine pattern: always set path: ['confirmPassword'] so flatten().fieldErrors.confirmPassword carries the message (RESEARCH Pitfall #6)"

requirements-completed: [INVITE-02, INVITE-03]

# Metrics
duration: 5min
completed: 2026-04-18
---

# Phase 28 Plan 01: Schema + Auth Pipeline + Validators Summary

**Foundation for invite-only registration: User.isAdmin + InviteToken.revokedAt schema migration, isAdmin propagated through authorize -> JWT -> session, and two Zod schemas (createInviteSchema, registerSchema) that Plans 02 and 03 both consume.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-18T16:55:49Z
- **Completed:** 2026-04-18T17:00:30Z
- **Tasks:** 2
- **Files modified/created:** 8

## Accomplishments
- Added `isAdmin Boolean @default(false)` to `User` model and `revokedAt DateTime?` to `InviteToken` model (schema.prisma)
- Created migration `20260418040000_add_user_isadmin_and_invite_revokedat` with two `ALTER TABLE` statements; applied to dev DB via `prisma migrate deploy`
- Updated `seedAdminUser` upsert to set `isAdmin: true` on both create and update paths -- existing dev DBs flip the flag, fresh DBs create with it
- Extended `src/types/next-auth.d.ts` with module augmentation for Session.user.isAdmin (required), User.isAdmin (optional), JWT.isAdmin (optional)
- Wired `isAdmin` end-to-end: `authorizeUser` SELECT includes it, returns it; `jwtCallback` copies to token; `sessionCallback` writes to session with defensive fallback to false for legacy JWTs
- Added `createInviteSchema` (email only) and `registerSchema` (token + email + name + password + confirmPassword with .refine mismatch error path) to `src/lib/validators.ts`
- Updated `src/auth.test.ts` for new SELECT/return shape; added isAdmin coverage for jwtCallback and sessionCallback legacy-JWT fallback (3 new tests)
- Added integration test in `tests/integration/seed.test.ts` asserting seeded admin has `isAdmin === true`

## Task Commits

Each task was committed atomically:

1. **Task 1: Schema migration + seed update for isAdmin and revokedAt** - `0ff1736` (feat)
2. **Task 2: Augment session/JWT pipeline with isAdmin and add register/invite Zod schemas** - `918599f` (feat)

## Files Created/Modified
- `prisma/schema.prisma` - Added User.isAdmin and InviteToken.revokedAt fields (modified)
- `prisma/migrations/20260418040000_add_user_isadmin_and_invite_revokedat/migration.sql` - Migration SQL with two ALTER TABLE statements (created)
- `prisma/seed.ts` - seedAdminUser upsert sets isAdmin: true on create and update paths (modified)
- `src/auth.ts` - authorizeUser SELECT + return include isAdmin; jwtCallback and sessionCallback propagate isAdmin with defensive fallback (modified)
- `src/auth.test.ts` - Updated fixture + assertions for new SELECT/return shape; 3 new tests for isAdmin paths (modified)
- `src/types/next-auth.d.ts` - Module augmentation extended for Session.user.isAdmin, User.isAdmin, JWT.isAdmin (modified)
- `src/lib/validators.ts` - Appended createInviteSchema and registerSchema (modified)
- `tests/integration/seed.test.ts` - Added test asserting seeded admin has isAdmin === true (modified)

## Decisions Made
- `revokedAt` is a dedicated field rather than overloading `usedAt` -- per RESEARCH Pitfall #7, unambiguous status derivation (D-05 resolved in favor of explicit field)
- `sessionCallback` always writes `session.user.isAdmin` (either true from token or false as fallback) so consumers never see `undefined` on legacy JWTs that predate this plan
- `interface User { isAdmin?: boolean }` augmentation is optional to avoid breaking NextAuth's internal User type contract while still letting our `authorizeUser` return value flow typed into jwtCallback
- Seed upsert `update: { isAdmin: true }` ensures idempotency while flipping the admin flag on existing rows

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated auth.test.ts for new SELECT and return shape**
- **Found during:** Task 2 verification (npm run test:run -- src/auth.test.ts)
- **Issue:** Existing auth unit test `'returns user object for valid credentials'` asserted the literal SELECT and return object shape. The plan-mandated additions of `isAdmin: true` to SELECT and `isAdmin: user.isAdmin` to the return broke that assertion.
- **Fix:** Updated the testUser fixture to include `isAdmin: false`; updated the SELECT assertion to include `isAdmin: true`; updated the return assertion to include `isAdmin: false`. Also added three new tests covering isAdmin propagation: jwtCallback with user.isAdmin=true, jwtCallback defaults to false when user.isAdmin undefined, sessionCallback defaults to false when token.isAdmin missing (legacy-JWT path).
- **Files modified:** src/auth.test.ts
- **Verification:** `npm run test:run -- src/auth.test.ts` now passes 12/12 (was 9, added 3)
- **Committed in:** 918599f (part of Task 2 commit -- test + impl are the same contract)

---

**Total deviations:** 1 auto-fixed (test alignment with new contract)
**Impact on plan:** Zero scope creep. Test update is a direct consequence of the plan-mandated API change; additional coverage strengthens the contract without changing behavior.

## Issues Encountered
- Prisma 7 CLI does not accept `--name` or `--skip-seed` flags on `migrate dev` the way earlier major versions did. Resolved by authoring the migration file manually (which was already required by the plan's explicit timestamp) and applying via `npx prisma migrate deploy`, which is the idiomatic path when the migration directory already exists.
- Pre-existing lint warnings in `src/app/(app)/movimientos/actions.ts` (3x `'_error' is defined but never used`) -- OUT OF SCOPE per SCOPE BOUNDARY rule. Not introduced by this plan; files were not modified. Logged here for the next out-of-scope cleanup pass.

## User Setup Required
None -- migration applied to dev DB, seed re-run, no external services involved.

## Next Phase Readiness
- **Plan 02 (admin invite generation):** can now read `session.user.isAdmin` to gate the Invitaciones section/API; can call `createInviteSchema.parse(body)` on the POST /api/invitations endpoint; can write `revokedAt: new Date()` to explicitly revoke a token
- **Plan 03 (registration flow):** can call `registerSchema.parse(formData)` on the POST /api/register handler; the `.refine` mismatch error is already bound to `path: ['confirmPassword']` so `flatten().fieldErrors.confirmPassword` will render inline under the confirm input
- Schema migration applied to dev DB; `npx prisma migrate status` reports "Database schema is up to date!"

## Overall Verification Results
- `npx prisma validate` -- schema is valid (exit 0)
- `npx prisma migrate status` -- `20260418040000_add_user_isadmin_and_invite_revokedat` applied
- `npm run build` -- zero errors, zero warnings (Turbopack compile + TypeScript + 11 static pages OK)
- `npm run lint` -- zero errors (3 warnings in unrelated file, pre-existing, out of scope)
- `npm run test:run -- src/auth.test.ts` -- 12/12 pass (9 existing + 3 new)
- `npm run test:integration -- tests/integration/seed.test.ts tests/integration/auth.test.ts` -- 22/22 pass

## Self-Check: PASSED

- [x] prisma/schema.prisma contains `isAdmin Boolean @default(false)` in User model (line 63)
- [x] prisma/schema.prisma contains `revokedAt DateTime?` in InviteToken model (line 130)
- [x] prisma/migrations/20260418040000_add_user_isadmin_and_invite_revokedat/migration.sql exists
- [x] prisma/seed.ts contains `isAdmin: true` on both create and update paths (2 occurrences)
- [x] src/auth.ts contains `isAdmin: true` in SELECT, `isAdmin: user.isAdmin` in return, `token.isAdmin = (user as User).isAdmin ?? false`, and both `session.user.isAdmin = token.isAdmin` and `session.user.isAdmin = false`
- [x] src/types/next-auth.d.ts contains `isAdmin: boolean` (Session.user, required) and `isAdmin?: boolean` (User + JWT, optional, 2 occurrences)
- [x] src/lib/validators.ts contains `export const createInviteSchema`, `export const registerSchema`, and `path: ['confirmPassword']`
- [x] Commit 0ff1736 exists in git log (Task 1)
- [x] Commit 918599f exists in git log (Task 2)

---
*Phase: 28-invite-only-registration*
*Completed: 2026-04-18*
