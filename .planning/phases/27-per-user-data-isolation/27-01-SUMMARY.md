---
phase: 27-per-user-data-isolation
plan: 01
subsystem: auth
tags: [next-auth, session, server-actions, security, cve-2025-29927]

# Dependency graph
requires:
  - phase: 26-authentication-login
    provides: "auth() session function, NextAuth configuration with JWT strategy"
provides:
  - "requireAuth() helper for Server Actions -- session-based auth guard returning { userId }"
affects: [27-02, 27-03, per-user-data-isolation, server-actions]

# Tech tracking
tech-stack:
  added: []
  patterns: [requireAuth-guard-pattern, redirect-on-unauthenticated]

key-files:
  created:
    - src/lib/auth-utils.test.ts
  modified:
    - src/lib/auth-utils.ts

key-decisions:
  - "redirect() from next/navigation used for unauthenticated users (throws NEXT_REDIRECT internally)"
  - "requireAuth returns { userId: string } object (not bare string) for extensibility"

patterns-established:
  - "requireAuth pattern: every Server Action must call requireAuth() before any data access"
  - "TDD mock pattern for @/auth: use vi.hoisted() to create mock fn, then vi.mock factory references it"

requirements-completed: [ISOL-01]

# Metrics
duration: 2min
completed: 2026-04-18
---

# Phase 27 Plan 01: requireAuth Helper Summary

**Session-based requireAuth() guard replacing getDefaultUserId() -- CVE-2025-29927 defense-in-depth for Server Actions**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-18T05:49:30Z
- **Completed:** 2026-04-18T05:51:24Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments
- Replaced temporary getDefaultUserId() (DB query for first approved user) with session-based requireAuth()
- requireAuth() validates session via auth(), redirects to /login when unauthenticated, returns { userId } on success
- 3 unit tests covering session-present, no-session, and missing-user-id paths -- all passing

## Task Commits

Each task was committed atomically:

1. **Task 1: Replace getDefaultUserId with requireAuth** - `d835478` (feat)

**Plan metadata:** (pending)

_Note: TDD task -- RED and GREEN committed together since implementation was minimal_

## Files Created/Modified
- `src/lib/auth-utils.ts` - Replaced getDefaultUserId() with requireAuth() session guard
- `src/lib/auth-utils.test.ts` - 3 unit tests for requireAuth (session present, null session, missing user.id)

## Decisions Made
- Used vi.hoisted() for mock function creation to avoid vitest factory hoisting errors with top-level variable references
- Mock redirect throws Error('NEXT_REDIRECT') to match real Next.js behavior where redirect() throws internally
- requireAuth returns object `{ userId }` rather than bare string for future extensibility (e.g., adding role, permissions)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed vitest mock hoisting error**
- **Found during:** Task 1 (GREEN phase)
- **Issue:** `vi.mock('@/auth', () => ({ auth: mockAuth }))` failed because `mockAuth` was a top-level `const` and vi.mock factories are hoisted above variable declarations
- **Fix:** Used `vi.hoisted()` to create mockAuth before mock factory execution
- **Files modified:** src/lib/auth-utils.test.ts
- **Verification:** All 3 tests pass
- **Committed in:** d835478 (part of task commit)

**2. [Rule 1 - Bug] Fixed mock redirect not throwing**
- **Found during:** Task 1 (GREEN phase)
- **Issue:** Mock redirect was `vi.fn()` (no-op), but real redirect() throws NEXT_REDIRECT. Code after `if (!session?.user?.id) { redirect('/login') }` continued executing and crashed on `session.user.id` for null session
- **Fix:** Made mock redirect throw Error('NEXT_REDIRECT') and adjusted tests to use `rejects.toThrow`
- **Files modified:** src/lib/auth-utils.test.ts
- **Verification:** All 3 tests pass
- **Committed in:** d835478 (part of task commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Both fixes necessary for test correctness. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviations above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- requireAuth() is ready for Plan 02 to replace all getDefaultUserId() calls in Server Actions
- Pattern established: mock @/auth with vi.hoisted + vi.mock for any future auth-dependent tests

## Self-Check: PASSED

- [x] src/lib/auth-utils.ts exists
- [x] src/lib/auth-utils.test.ts exists
- [x] Commit d835478 exists in git log

---
*Phase: 27-per-user-data-isolation*
*Completed: 2026-04-18*
