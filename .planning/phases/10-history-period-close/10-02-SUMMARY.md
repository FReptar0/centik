---
phase: 10-history-period-close
plan: 02
subsystem: ui
tags: [react, next.js, server-components, pivot-table, modal, period-management]

requires:
  - phase: 10-history-period-close plan 01
    provides: Server Actions (closePeriod, reopenPeriod, getClosePeriodPreviewAction), data queries (getMonthlySummariesForYear, getAvailableYears), types (MonthSummarySlot, ClosePeriodPreview)

provides:
  - Annual pivot table component showing 12 months of financial data
  - Close confirmation modal with danger-style preview of totals
  - Year selector navigation for history page
  - Reopen ghost button on closed-period pages (/movimientos, /presupuesto)
  - PageHeader reopenAction prop for discrete reopen capability

affects: [polish-qa]

tech-stack:
  added: []
  patterns:
    - "Pivot table with sticky first column and horizontal scroll for mobile"
    - "PageHeader reopenAction slot for ghost button in closed-period banner"
    - "Year-based URL param navigation (router.replace with ?year=XXXX)"

key-files:
  created:
    - src/components/history/YearSelector.tsx
    - src/components/history/AnnualPivotTable.tsx
    - src/components/history/CloseConfirmationModal.tsx
    - src/components/history/HistorialClientWrapper.tsx
  modified:
    - src/components/layout/PageHeader.tsx
    - src/app/historial/page.tsx
    - src/app/historial/loading.tsx
    - src/app/movimientos/page.tsx
    - src/app/movimientos/MovimientosClientWrapper.tsx
    - src/app/presupuesto/PresupuestoClientWrapper.tsx

key-decisions:
  - "Annual total for debtAtClose uses latest closed month's value (not sum) since debt is a point-in-time snapshot"
  - "Year selector centered below header for visual prominence"
  - "Reopen from pivot table is direct action (no confirmation modal) since it is reversible"

patterns-established:
  - "PageHeader reopenAction prop: slot for reopen ghost button in closed-period banner"
  - "Pivot table: sticky first column, horizontal scroll, tabular-nums for number alignment"

requirements-completed: [HIST-01, HIST-02, HIST-04, HIST-05, HIST-06]

duration: 5min
completed: 2026-04-06
---

# Phase 10 Plan 02: History Page UI Summary

**Annual pivot table with 12-month financial data, close confirmation modal with danger-style preview, year navigation, and reopen ghost buttons wired across closed-period pages**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-06T00:15:12Z
- **Completed:** 2026-04-06T00:20:53Z
- **Tasks:** 3 (2 auto + 1 auto-approved checkpoint)
- **Files modified:** 10

## Accomplishments
- Annual pivot table rendering 12 months with Ingresos/Gastos/Ahorro/%Ahorro/Deuda/Pagos rows plus annual totals
- Close confirmation modal with danger styling, 6-metric preview grid, skeleton loading state, and spinner during close
- Year selector with arrow navigation between available years
- Reopen ghost button in PageHeader closed-period banner on /movimientos and /presupuesto
- Reopen link in pivot table header for closed months

## Task Commits

Each task was committed atomically:

1. **Task 1: History UI components** - `e7f0d4e` (feat)
2. **Task 2: History page wiring + reopen on closed-period pages** - `cb959ca` (feat)
3. **Task 3: Verify complete History + Period Close flow** - auto-approved (checkpoint)

## Files Created/Modified
- `src/components/history/YearSelector.tsx` - Year navigation with arrow buttons
- `src/components/history/AnnualPivotTable.tsx` - 12-month pivot table with metrics, totals, lock icons, close/reopen buttons
- `src/components/history/CloseConfirmationModal.tsx` - Danger modal with 6-metric preview grid for period close
- `src/components/history/HistorialClientWrapper.tsx` - Client wrapper managing year nav, close modal, reopen state
- `src/components/layout/PageHeader.tsx` - Added reopenAction prop for ghost button in closed banner
- `src/app/historial/page.tsx` - Server component fetching summaries, periods, available years
- `src/app/historial/loading.tsx` - Skeleton mimicking pivot table layout
- `src/app/movimientos/page.tsx` - Pass periodId to client wrapper
- `src/app/movimientos/MovimientosClientWrapper.tsx` - Reopen ghost button when period is closed
- `src/app/presupuesto/PresupuestoClientWrapper.tsx` - Reopen ghost button when period is closed

## Decisions Made
- Annual total for debtAtClose uses latest closed month's value (not cumulative sum) since debt is a point-in-time balance snapshot
- Year selector centered below header for visual prominence on the history page
- Reopen from pivot table is a direct action without confirmation modal since reopening is reversible (user can close again)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- History + Period Close feature is complete (Plan 01 backend + Plan 02 UI)
- Phase 10 is fully done, ready for Phase 11 (polish, a11y, final QA)

## Self-Check: PASSED

All 10 created/modified files verified on disk. Both task commits (e7f0d4e, cb959ca) confirmed in git log.

---
*Phase: 10-history-period-close*
*Completed: 2026-04-06*
