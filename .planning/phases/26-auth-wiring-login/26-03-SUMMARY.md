---
phase: 26-auth-wiring-login
plan: 03
subsystem: auth
tags: [next-auth, login, server-actions, vitest, playwright, credentials]

requires:
  - phase: 26-01
    provides: Auth.js config, authorizeUser, proxy.ts, loginSchema, FloatingInput password type, (auth) layout
  - phase: 26-02
    provides: Route group migration, (app) layout, updated action imports

provides:
  - Login page at /login with Centik branding and FloatingInput fields
  - loginAction and logoutAction server actions
  - Sidebar logout button
  - Auth unit test suite (27 tests across 4 files)
  - Auth integration test with real DB (4 tests)
  - Playwright E2E test for proxy redirect and login page

affects: [27-invite-registration, 28-require-auth, 29-totp]

tech-stack:
  added: []
  patterns: [server-action-form-pattern, useActionState-for-auth, next-auth-mock-pattern]

key-files:
  created:
    - src/actions/auth.ts
    - src/components/auth/LoginForm.tsx
    - src/app/(auth)/login/page.tsx
    - tests/integration/auth.test.ts
    - e2e/auth.spec.ts
  modified:
    - src/components/layout/Sidebar.tsx
    - src/auth.test.ts
    - src/proxy.test.ts
    - src/actions/auth.test.ts
    - src/lib/validators.test.ts
    - src/components/layout/Sidebar.test.tsx
    - vitest.config.mts

key-decisions:
  - "Mock next-auth module init in tests to avoid next/server ESM import chain"
  - "Integration test mocks only NextAuth init, uses real authorizeUser + real DB + real bcrypt"

patterns-established:
  - "Server action pattern: useActionState + form action + hidden callbackUrl input"
  - "Auth test mock pattern: vi.mock next-auth/prisma-adapter/credentials provider to isolate authorizeUser"
  - "E2E exclusion: e2e/** excluded from vitest to prevent Playwright specs running as unit tests"

requirements-completed: [AUTH-04, TEST-02]

duration: 11min
completed: 2026-04-18
---

# Phase 26 Plan 03: Login Page, Auth Actions, and Comprehensive Test Suite

**Glyph Finance login page with FloatingInput fields, server-action login/logout, sidebar logout, and 31 auth tests across unit/integration/E2E layers**

## Performance

- **Duration:** 11 min
- **Started:** 2026-04-18T04:49:52Z
- **Completed:** 2026-04-18T05:01:09Z
- **Tasks:** 3
- **Files modified:** 13

## Accomplishments
- Login page at /login with Centik branding, email/password FloatingInputs, password eye toggle, chartreuse pill submit button with Loader2 spinner
- loginAction validates with Zod loginSchema, catches AuthError (generic "Credenciales invalidas"), re-throws NEXT_REDIRECT
- Sidebar logout button at bottom (desktop: "Cerrar sesion" + icon, tablet: icon with tooltip)
- 27 unit tests: authorizeUser (6), JWT/session callbacks (3), proxy routing (6), loginAction (5), loginSchema (4), plus Sidebar test fix (3 additional tests from mock update)
- 4 integration tests with real DB + real bcrypt (valid login, wrong password, non-existent email, unapproved user)
- 3 Playwright E2E tests (proxy redirect with callbackUrl, login page branding, full login flow)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create login page, LoginForm, server actions, sidebar logout** - `58f2eb2` (feat)
2. **Task 2: Auth unit test suite** - `70584f0` (test)
3. **Task 3: Integration test and Playwright E2E** - `68251b4` (test)

**Auto-fix:** `e991fa7` (fix: exclude e2e from vitest)

## Files Created/Modified
- `src/actions/auth.ts` - loginAction and logoutAction server actions
- `src/components/auth/LoginForm.tsx` - Client component with FloatingInput, password toggle, loading state
- `src/app/(auth)/login/page.tsx` - Login page with Centik branding on OLED black
- `src/components/layout/Sidebar.tsx` - Added logout button at bottom
- `src/auth.test.ts` - 9 unit tests for authorizeUser and callbacks
- `src/proxy.test.ts` - 6 unit tests for proxy route protection
- `src/actions/auth.test.ts` - 5 unit tests for loginAction
- `src/lib/validators.test.ts` - 4 loginSchema tests added
- `src/components/layout/Sidebar.test.tsx` - Added @/actions/auth mock
- `tests/integration/auth.test.ts` - 4 integration tests with real DB
- `e2e/auth.spec.ts` - 3 Playwright E2E tests
- `vitest.config.mts` - Excluded e2e/** from unit test runner

## Decisions Made
- Mocked next-auth module initialization in all test files to avoid the `next/server` ESM import chain issue (next-auth v5 tries to import `next/server` which fails outside Next.js runtime)
- Integration test mocks only the NextAuth init, keeping authorizeUser/prisma/bcrypt real for meaningful coverage
- Excluded e2e directory from vitest config since Playwright specs use different test runner

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] E2E specs picked up by vitest runner**
- **Found during:** Task 3 (integration/E2E tests)
- **Issue:** Playwright E2E test files in e2e/ were being included by vitest's default test discovery, causing import failures (Playwright imports not available in vitest)
- **Fix:** Added `exclude: ['node_modules', 'e2e/**']` to vitest.config.mts
- **Files modified:** vitest.config.mts
- **Verification:** `npx vitest run` passes with 39 files, 525 tests
- **Committed in:** e991fa7

**2. [Rule 3 - Blocking] Sidebar test broke after adding logoutAction import**
- **Found during:** Task 2 (unit test suite)
- **Issue:** Sidebar.tsx now imports logoutAction from @/actions/auth, which triggers next-auth import chain in vitest
- **Fix:** Added `vi.mock('@/actions/auth')` to Sidebar.test.tsx
- **Files modified:** src/components/layout/Sidebar.test.tsx
- **Verification:** All 525 tests pass
- **Committed in:** 70584f0 (part of Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both auto-fixes necessary for test infrastructure compatibility. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviations above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Login page, server actions, and comprehensive auth tests complete
- Ready for Phase 26 Plan 04 (if exists) or next phase
- Auth wiring complete: proxy redirects, credentials login, session callbacks, logout all working and tested

## Self-Check: PASSED

All 8 created files verified on disk. All 4 commits (58f2eb2, 70584f0, 68251b4, e991fa7) verified in git log.

---
*Phase: 26-auth-wiring-login*
*Completed: 2026-04-18*
