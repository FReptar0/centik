---
phase: 04-layout-shell
plan: 03
subsystem: ui
tags: [next.js, layout, page-header, period-selector, routing, loading-skeletons]

requires:
  - phase: 04-layout-shell (04-01)
    provides: "DynamicIcon, Modal, cn(), constants (NavItem, SIDEBAR_NAV_ITEMS, MONTH_NAMES_ES)"
  - phase: 04-layout-shell (04-02)
    provides: "Sidebar, MobileNav, FAB layout components"
provides:
  - "PageHeader component with title, period selector slot, action slot, closed banner"
  - "PeriodSelector component with URL-based month/year navigation"
  - "Root layout composing Sidebar + MobileNav + FAB with responsive margins"
  - "7 placeholder route pages (/, /movimientos, /deudas, /presupuesto, /ingresos, /historial, /configuracion)"
  - "7 loading.tsx skeleton files for Suspense boundaries"
affects: [phase-05-income, phase-06-categories, phase-07-transactions, phase-08-dashboard, phase-09-debts, phase-10-budget, phase-11-history]

tech-stack:
  added: []
  patterns:
    - "Period-aware pages use async searchParams (Next.js 16 Promise pattern)"
    - "PageHeader accepts React.ReactNode slots for period selector and action button"
    - "PeriodSelector reads/writes URL search params (?month=X&year=Y) for period state"
    - "Loading skeletons use animate-pulse bg-bg-card rounded patterns"

key-files:
  created:
    - src/components/layout/PageHeader.tsx
    - src/components/layout/PageHeader.test.tsx
    - src/components/layout/PeriodSelector.tsx
    - src/components/layout/PeriodSelector.test.tsx
    - src/app/loading.tsx
    - src/app/movimientos/page.tsx
    - src/app/movimientos/loading.tsx
    - src/app/deudas/page.tsx
    - src/app/deudas/loading.tsx
    - src/app/presupuesto/page.tsx
    - src/app/presupuesto/loading.tsx
    - src/app/ingresos/page.tsx
    - src/app/ingresos/loading.tsx
    - src/app/historial/page.tsx
    - src/app/historial/loading.tsx
    - src/app/configuracion/page.tsx
    - src/app/configuracion/loading.tsx
  modified:
    - src/app/layout.tsx
    - src/app/page.tsx

key-decisions:
  - "PeriodSelector defaults isClosed to false for placeholder pages; actual DB fetch comes in later phases"
  - "Root layout stays Server Component; Sidebar/MobileNav/FAB are Client Component imports"
  - "Period-aware pages use Next.js 16 async searchParams Promise pattern"

patterns-established:
  - "Page structure: PageHeader (with optional periodSelector/action) + content area"
  - "Period-aware pages: async function with searchParams Promise, render PeriodSelector in PageHeader"
  - "Non-period pages: sync function, PageHeader with title only"
  - "Loading skeletons: space-y-6 container with h-8 w-48 header bar + repeated h-16 rounded-xl rows"

requirements-completed: [LAYOUT-01, LAYOUT-05, LAYOUT-06]

duration: 5min
completed: 2026-04-05
---

# Phase 4 Plan 3: Layout Assembly Summary

**Root layout wiring with Sidebar/MobileNav/FAB, PageHeader with period selector, 7 route pages with loading skeletons**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-05T03:11:09Z
- **Completed:** 2026-04-05T03:16:21Z
- **Tasks:** 3
- **Files modified:** 20

## Accomplishments
- Root layout composes Sidebar + MobileNav + FAB with responsive margins (0/64px/240px left margin, 64px bottom padding on mobile)
- PageHeader component with title (h1 text-2xl bold), optional period selector slot, optional action slot, and closed period banner
- PeriodSelector navigates months via URL search params with right arrow disabled on current month, lock icon when isClosed=true
- All 7 routes render placeholder pages inside the layout shell with appropriate icons and Spanish text
- 7 loading.tsx skeleton files provide Suspense boundaries for each route
- Removed test-chart directory from Phase 1 Recharts validation
- 12 new tests for PageHeader (6) and PeriodSelector (6), all passing

## Task Commits

Each task was committed atomically:

1. **Task 1: PageHeader, PeriodSelector, and root layout wiring with tests** - `0310253` (feat, TDD)
2. **Task 2: Placeholder route pages with loading skeletons** - `99a566e` (feat)
3. **Task 3: Visual verification of complete layout shell** - auto-approved (auto mode active)

## Files Created/Modified
- `src/components/layout/PageHeader.tsx` - Reusable page header with title, period selector slot, action slot, closed banner
- `src/components/layout/PageHeader.test.tsx` - 6 tests for PageHeader rendering variants
- `src/components/layout/PeriodSelector.tsx` - Client component for month/year navigation via URL params
- `src/components/layout/PeriodSelector.test.tsx` - 6 tests for PeriodSelector behavior
- `src/app/layout.tsx` - Modified to compose Sidebar + MobileNav + FAB with responsive margins
- `src/app/page.tsx` - Replaced with Inicio placeholder (period-aware)
- `src/app/loading.tsx` - Dashboard-style skeleton with KPI grid and chart placeholders
- `src/app/movimientos/page.tsx` - Movimientos placeholder (period-aware)
- `src/app/movimientos/loading.tsx` - List skeleton
- `src/app/deudas/page.tsx` - Deudas placeholder (non-period)
- `src/app/deudas/loading.tsx` - List skeleton
- `src/app/presupuesto/page.tsx` - Presupuesto placeholder (period-aware)
- `src/app/presupuesto/loading.tsx` - List skeleton
- `src/app/ingresos/page.tsx` - Ingresos placeholder (non-period)
- `src/app/ingresos/loading.tsx` - List skeleton
- `src/app/historial/page.tsx` - Historial placeholder (period-aware)
- `src/app/historial/loading.tsx` - List skeleton
- `src/app/configuracion/page.tsx` - Configuracion placeholder with "Proximamente" text
- `src/app/configuracion/loading.tsx` - List skeleton
- `src/app/test-chart/page.tsx` - Deleted (Phase 1 Recharts validation no longer needed)

## Decisions Made
- PeriodSelector defaults isClosed to false for placeholder pages; actual DB fetch comes in later phases when period-aware pages query the Period model
- Root layout stays Server Component; Sidebar, MobileNav, and FAB are Client Component imports (no "use client" on layout)
- Period-aware pages use Next.js 16 async searchParams Promise pattern (await searchParams before use)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All 7 routes navigable with full responsive layout shell
- PageHeader and PeriodSelector ready for use in feature pages
- Feature phases can replace placeholder content while keeping layout structure
- Period selector URL params pattern established for period-aware data queries

## Self-Check: PASSED

- All 20 files verified present on disk
- Both task commits (0310253, 99a566e) verified in git log
- Build passes with all 7 routes in output
- All 186 unit tests pass (11 files)
- Lint passes clean

---
*Phase: 04-layout-shell*
*Completed: 2026-04-05*
