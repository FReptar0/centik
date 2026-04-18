---
phase: 26-auth-wiring-login
plan: 02
subsystem: ui
tags: [route-groups, layout, next.js, app-router]

requires:
  - phase: 26-auth-wiring-login
    provides: Auth.js v5 config, proxy.ts route protection, (auth) layout spec
provides:
  - (app) route group with Sidebar/MobileNav/FAB layout wrapping all existing pages
  - (auth) route group with minimal centered OLED black layout for login/register
  - Root layout slimmed to HTML shell + fonts + Toaster only
  - All existing URLs preserved (route groups are URL-invisible)
affects: [26-03 auth-tests, 26-04 login-ui, 27-data-isolation, 28-registration]

tech-stack:
  added: []
  patterns: [route-group-layout-separation, app-shell-vs-auth-shell]

key-files:
  created: [src/app/(app)/layout.tsx, src/app/(auth)/layout.tsx]
  modified: [src/app/layout.tsx, src/components/categories/CategoryForm.tsx, src/components/categories/CategoryList.tsx, src/components/debts/DebtCard.tsx, src/components/debts/DebtForm.tsx, src/components/layout/FAB.tsx, src/components/income/IncomeSourceCard.tsx, src/components/income/IncomeSourceForm.tsx, src/components/transactions/TransactionRow.tsx, src/components/transactions/TransactionForm.tsx, src/components/history/HistorialClientWrapper.tsx, src/app/(app)/movimientos/MovimientosClientWrapper.tsx, src/app/(app)/presupuesto/PresupuestoClientWrapper.tsx, src/app/(app)/movimientos/page.tsx]

key-decisions:
  - "(auth) layout created in Plan 02 (not Plan 01 as originally planned) since it was missing"
  - "All @/app/X/actions imports updated to @/app/(app)/X/actions across 12 source files and 4 test files"

patterns-established:
  - "Route group separation: (app) for authenticated pages with sidebar, (auth) for unauthenticated pages without app shell"
  - "Server action imports use @/app/(app)/section/actions path pattern"

requirements-completed: [AUTH-03]

duration: 6min
completed: 2026-04-18
---

# Phase 26 Plan 02: Route Group Migration Summary

**Migrated all pages into (app) route group with sidebar layout, created (auth) route group for login, slimmed root layout to HTML shell**

## Performance

- **Duration:** 6 min
- **Started:** 2026-04-18T04:41:23Z
- **Completed:** 2026-04-18T04:47:25Z
- **Tasks:** 1
- **Files modified:** 48

## Accomplishments
- Created (app)/layout.tsx extracting Sidebar, MobileNav, and FAB from root layout
- Moved all 6 page directories plus root page.tsx and loading.tsx into (app)/ route group
- Created (auth)/layout.tsx with minimal centered OLED black layout for login/register pages
- Slimmed root layout to HTML shell (html/body/fonts/Toaster only)
- Updated 16 files (12 source + 4 test) with corrected @/app/(app)/ import paths
- Fixed relative generated/prisma/client import depth in movimientos/page.tsx
- All 497 existing tests pass, build succeeds with zero errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Create (app) layout, move all existing pages into (app) route group, and slim root layout** - `da8b426` (feat)

## Files Created/Modified
- `src/app/(app)/layout.tsx` - App shell with Sidebar, MobileNav, FAB wrapping all authenticated pages
- `src/app/(auth)/layout.tsx` - Minimal centered OLED black layout for auth pages
- `src/app/layout.tsx` - Slimmed to HTML shell + fonts + Toaster only
- `src/app/(app)/page.tsx` - Dashboard page (moved from src/app/)
- `src/app/(app)/loading.tsx` - Dashboard loading skeleton (moved)
- `src/app/(app)/configuracion/*` - Configuration pages (moved)
- `src/app/(app)/deudas/*` - Debts pages (moved)
- `src/app/(app)/historial/*` - History pages (moved)
- `src/app/(app)/ingresos/*` - Income pages (moved)
- `src/app/(app)/movimientos/*` - Transactions pages (moved, import fix applied)
- `src/app/(app)/presupuesto/*` - Budget pages (moved)
- `src/components/categories/CategoryForm.tsx` - Updated action import path
- `src/components/categories/CategoryList.tsx` - Updated action import path
- `src/components/debts/DebtCard.tsx` - Updated action import path
- `src/components/debts/DebtForm.tsx` - Updated action import path
- `src/components/layout/FAB.tsx` - Updated action import path
- `src/components/income/IncomeSourceCard.tsx` - Updated action import path
- `src/components/income/IncomeSourceForm.tsx` - Updated action import path
- `src/components/transactions/TransactionRow.tsx` - Updated action import path
- `src/components/transactions/TransactionForm.tsx` - Updated action import path
- `src/components/history/HistorialClientWrapper.tsx` - Updated action import path
- `src/components/layout/FAB.test.tsx` - Updated mock path
- `src/components/income/IncomeSourceCard.test.tsx` - Updated mock and import paths
- `src/components/transactions/TransactionRow.test.tsx` - Updated mock path
- `src/components/transactions/TransactionForm.test.tsx` - Updated mock path

## Decisions Made
- Created (auth)/layout.tsx in this plan since Plan 01 did not create it despite the plan claiming it was "already created by Plan 01"
- Updated all `@/app/X/actions` imports to `@/app/(app)/X/actions` across the codebase -- route groups change the filesystem path even though they are URL-invisible

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created missing (auth) layout**
- **Found during:** Task 1 (route group creation)
- **Issue:** Plan stated (auth)/layout.tsx was "created in Plan 01" but it did not exist on disk
- **Fix:** Created src/app/(auth)/layout.tsx with minimal centered OLED black layout
- **Files modified:** src/app/(auth)/layout.tsx
- **Verification:** Build passes, directory structure correct
- **Committed in:** da8b426 (Task 1 commit)

**2. [Rule 1 - Bug] Fixed broken @/app/ import paths after route group migration**
- **Found during:** Task 1 (post-move verification)
- **Issue:** 16 files used `@/app/X/actions` imports which broke because the actions files moved to `@/app/(app)/X/actions`
- **Fix:** Updated all 12 source files and 4 test files to use `@/app/(app)/X/actions` paths
- **Files modified:** 16 files across src/components/ and src/app/(app)/
- **Verification:** `npm run build` passes with zero errors
- **Committed in:** da8b426 (Task 1 commit)

**3. [Rule 1 - Bug] Fixed relative generated/prisma/client import depth**
- **Found during:** Task 1 (post-move verification)
- **Issue:** movimientos/page.tsx used `../../../generated/prisma/client` relative path which was one level short after adding (app) route group directory
- **Fix:** Updated to `../../../../generated/prisma/client` to account for extra directory level
- **Files modified:** src/app/(app)/movimientos/page.tsx
- **Verification:** `npm run build` passes TypeScript check
- **Committed in:** da8b426 (Task 1 commit)

---

**Total deviations:** 3 auto-fixed (2 bugs, 1 blocking)
**Impact on plan:** All auto-fixes necessary for correctness after route group migration. No scope creep.

## Issues Encountered
None beyond the import path updates which were anticipated as a possibility in the plan's step 5.

## User Setup Required
None - purely structural migration with no external service configuration.

## Next Phase Readiness
- Route groups properly separated: (app) for authenticated pages with sidebar, (auth) for login/register without app shell
- Login page can now be built in (auth) route group without sidebar interference
- All existing pages continue to function at their original URLs
- All 497 tests pass, build clean

## Self-Check: PASSED

All created files verified on disk. Task commit da8b426 verified in git log.

---
*Phase: 26-auth-wiring-login*
*Completed: 2026-04-18*
