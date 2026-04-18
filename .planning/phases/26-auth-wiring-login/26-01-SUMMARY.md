---
phase: 26-auth-wiring-login
plan: 01
subsystem: auth
tags: [next-auth, auth.js, jwt, prisma-adapter, credentials, bcrypt, proxy]

requires:
  - phase: 25-schema-migration
    provides: User model with hashedPassword, isApproved fields; bcryptjs dependency
provides:
  - Auth.js v5 configured with Credentials provider, JWT strategy (30-day), and PrismaAdapter
  - proxy.ts route protection redirecting unauthenticated users to /login
  - authorizeUser, jwtCallback, sessionCallback exported as named functions for testability
  - Auth.js catch-all route handler at /api/auth/*
  - loginSchema Zod validation for login form
  - FloatingInput extended to accept password and email types
  - TypeScript module augmentation for Session.user.id and JWT.userId
affects: [26-02 login-ui, 26-03 auth-tests, 27-data-isolation, 28-registration, 29-totp]

tech-stack:
  added: [next-auth@5.0.0-beta.31, @auth/prisma-adapter@2.11.2]
  patterns: [auth-config-with-testable-exports, proxy-route-protection, jwt-session-strategy]

key-files:
  created: [src/auth.ts, src/proxy.ts, src/types/next-auth.d.ts, src/app/api/auth/[...nextauth]/route.ts]
  modified: [src/lib/validators.ts, src/components/ui/FloatingInput.tsx, package.json]

key-decisions:
  - "authorizeUser type signature uses Partial<Record<'email'|'password', unknown>> to match Auth.js Credentials provider contract"
  - "AUTH_SECRET stored in .env (gitignored), not committed; .env.example already has placeholder"

patterns-established:
  - "Auth callback exports: Export authorize and callback functions as named exports from auth.ts for unit testability"
  - "proxy.ts route protection: Auth.js auth() wrapper with public path allowlist and callbackUrl preservation"

requirements-completed: [AUTH-02, AUTH-05]

duration: 4min
completed: 2026-04-18
---

# Phase 26 Plan 01: Auth Wiring Summary

**Auth.js v5 with Credentials provider, JWT (30-day), PrismaAdapter, and proxy.ts route protection**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-18T04:34:19Z
- **Completed:** 2026-04-18T04:38:44Z
- **Tasks:** 1
- **Files modified:** 8

## Accomplishments
- Auth.js v5 installed and configured with Credentials provider, JWT session strategy (30 days), and PrismaAdapter
- Route protection via proxy.ts -- unauthenticated users redirected to /login with callbackUrl preservation; authenticated users on /login redirected to /
- authorizeUser validates credentials against DB (email lookup, bcrypt.compare, isApproved check)
- loginSchema added to validators.ts for login form validation
- FloatingInput component extended to accept 'password' and 'email' type values
- TypeScript module augmentation for Session.user.id and JWT.userId

## Task Commits

Each task was committed atomically:

1. **Task 1: Install Auth.js, configure auth.ts, proxy.ts, types, route handler, loginSchema, and env vars** - `dee9be7` (feat)

## Files Created/Modified
- `src/auth.ts` - Auth.js v5 central config with Credentials provider, JWT, PrismaAdapter; testable exports
- `src/proxy.ts` - Route protection redirecting unauthenticated to /login with callbackUrl
- `src/types/next-auth.d.ts` - TypeScript module augmentation for Session.user.id and JWT.userId
- `src/app/api/auth/[...nextauth]/route.ts` - Auth.js route handler (GET, POST)
- `src/lib/validators.ts` - Added loginSchema (email + password validation)
- `src/components/ui/FloatingInput.tsx` - Extended type prop to include 'password' and 'email'
- `package.json` - Added next-auth@beta and @auth/prisma-adapter dependencies

## Decisions Made
- authorizeUser type signature uses `Partial<Record<'email'|'password', unknown>>` to match the Auth.js Credentials provider contract (originally planned as `{email?: string; password?: string}` but that does not match the v5 API)
- AUTH_SECRET generated and added to .env (gitignored); .env.example already had placeholder from Phase 25

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed authorizeUser type signature**
- **Found during:** Task 1 (auth.ts creation)
- **Issue:** Plan specified `credentials: { email?: string; password?: string } | undefined` but Auth.js v5 Credentials provider passes `Partial<Record<"email" | "password", unknown>>` which has `unknown` values, not `string`
- **Fix:** Changed type signature to `Partial<Record<'email' | 'password', unknown>>` with runtime type narrowing via `typeof` checks
- **Files modified:** src/auth.ts
- **Verification:** `npx tsc --noEmit` passes with zero errors
- **Committed in:** dee9be7 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Type signature fix necessary for TypeScript compilation. No scope creep.

## Issues Encountered
None

## User Setup Required
None - AUTH_SECRET auto-generated and added to .env. No external service configuration required.

## Next Phase Readiness
- Auth infrastructure complete, ready for login UI (Plan 02), auth tests (Plan 03), and route group migration
- proxy.ts active and protecting all routes except /login, /register, /api/auth/*, and static assets
- All 497 existing tests still pass; 20 auth test stubs remain as .todo

---
*Phase: 26-auth-wiring-login*
*Completed: 2026-04-18*
