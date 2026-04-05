---
phase: 08-debts
plan: 01
subsystem: api
tags: [prisma, zod, bigint, server-actions, tdd, vitest]

# Dependency graph
requires:
  - phase: 04-layout
    provides: "App shell, navigation, period selector"
provides:
  - "Debt metric calculation utilities (utilization, interest, percent paid, total remaining)"
  - "Health indicator color helpers (utilization, debt-to-income)"
  - "Debt summary aggregation (totals, debt-to-income ratio)"
  - "Server Actions for debt CRUD (create, update, updateBalance, delete)"
affects: [08-debts-ui, dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns: [BigInt integer division for basis-point precision, traffic-light health indicators]

key-files:
  created:
    - src/lib/debt.ts
    - src/lib/debt.test.ts
    - src/app/deudas/actions.ts
    - src/app/deudas/actions.test.ts
  modified: []

key-decisions:
  - "DebtMetrics uses combined interface with null fields per type rather than discriminated union for simpler consumption"
  - "Debt-to-income ratio computed with BigInt basis-point precision ((payments * 10000) / income) / 100"
  - "Summary sums minimumPayment for credit cards and monthlyPayment for loan types"

patterns-established:
  - "Debt calculation pattern: BigInt arithmetic for monetary, Number only for final display percentages"
  - "Health color helper pattern: returns 'positive' | 'warning' | 'negative' for traffic-light UI"

requirements-completed: [DEBT-04, DEBT-05, DEBT-06, DEBT-07]

# Metrics
duration: 4min
completed: 2026-04-05
---

# Phase 8 Plan 1: Debt Data Layer Summary

**Debt calculation utilities with BigInt arithmetic and Server Actions for full CRUD with Zod validation**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-05T22:44:31Z
- **Completed:** 2026-04-05T22:48:16Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Debt metric calculations (utilization rate, monthly interest, percent paid, total remaining) with full BigInt arithmetic and division-by-zero protection
- Health indicator color helpers for utilization and debt-to-income thresholds following traffic-light UX pattern
- Debt summary aggregation with debt-to-income ratio using basis-point precision
- Server Actions (createDebt, updateDebt, updateDebtBalance, deleteDebt) matching established ingresos pattern with Zod validation and Spanish error messages

## Task Commits

Each task was committed atomically:

1. **Task 1: Debt calculation utilities with TDD** - `92d625e` (feat)
2. **Task 2: Debt Server Actions with TDD** - `eabae8a` (feat)

## Files Created/Modified
- `src/lib/debt.ts` - Debt metric calculation utilities (calculateDebtMetrics, calculateDebtSummary, getUtilizationColor, getDebtToIncomeColor)
- `src/lib/debt.test.ts` - 30 unit tests covering all debt types, edge cases, and color helpers
- `src/app/deudas/actions.ts` - Server Actions for debt CRUD with Zod validation and BigInt conversion
- `src/app/deudas/actions.test.ts` - 21 unit tests covering CRUD, validation errors, and Prisma error handling

## Decisions Made
- DebtMetrics uses a single interface with nullable fields per type (utilizationRate null for loans, percentPaid/totalRemainingPayment null for credit cards) rather than a discriminated union -- simpler for UI consumption since both types share estimatedMonthlyInterest
- Debt-to-income ratio computed with BigInt basis-point precision to avoid floating-point drift: (payments * 10000) / income gives basis points, then divide by 100 for percentage
- calculateDebtSummary sums minimumPayment for CREDIT_CARD type and monthlyPayment for all other types (PERSONAL_LOAN, AUTO_LOAN, OTHER)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Debt data layer complete; UI plan (08-02) can consume calculateDebtMetrics, calculateDebtSummary, and all Server Actions
- All exports match the interfaces specified in the plan frontmatter

## Self-Check: PASSED

All 4 created files verified on disk. Both task commits (92d625e, eabae8a) verified in git log.

---
*Phase: 08-debts*
*Completed: 2026-04-05*
