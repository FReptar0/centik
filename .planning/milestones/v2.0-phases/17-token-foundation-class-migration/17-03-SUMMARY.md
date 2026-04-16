---
phase: 17-token-foundation-class-migration
plan: 03
subsystem: ui
tags: [tailwind, css-tokens, class-migration, glyph-finance]

# Dependency graph
requires:
  - phase: 17-01
    provides: New @theme token definitions in globals.css
  - phase: 17-02
    provides: Hardcoded hex values replaced with token references
provides:
  - All 37 component files use new Glyph Finance token class names
  - Zero old utility class names remain in any .tsx file
  - Focus styling consolidated to global :focus-visible rule
  - Shadow classes removed app-wide
affects: [18-responsive-layout, 19-typography-hierarchy, 20-component-refinement, 22-visual-qa]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "bg-surface-elevated for card backgrounds (replaces bg-bg-card)"
    - "bg-bg for page/primary backgrounds (replaces bg-bg-primary)"
    - "bg-surface for elevated containers (replaces bg-bg-elevated)"
    - "text-text-tertiary for muted text (replaces text-text-muted)"
    - "border-border-divider for all borders (replaces border-border)"
    - "Global :focus-visible handles all focus styling (no inline focus patterns)"
    - "No shadow utility classes used anywhere in the app"

key-files:
  created: []
  modified:
    - src/components/layout/FAB.tsx
    - src/components/ui/Modal.tsx
    - src/components/layout/Sidebar.tsx
    - src/components/transactions/TransactionForm.tsx
    - src/components/transactions/TransactionFilters.tsx
    - src/components/budgets/BudgetTable.tsx
    - src/components/debts/DebtForm.tsx
    - src/components/debts/DebtCard.tsx
    - src/components/categories/CategoryForm.tsx
    - src/components/income/IncomeSourceForm.tsx

key-decisions:
  - "Included BudgetBarChart.tsx and ExpenseDonutChart.tsx in migration (not in original plan file list but contained old tokens)"
  - "Replaced border-border-focus with border-border-divider in DebtCard inline edit (was using focus token as regular border)"
  - "Used bg-transparent for bg-bg-input replacement (inputs inherit background from container)"

patterns-established:
  - "Token class migration order: longest patterns first to avoid substring conflicts"
  - "Focus styling is global-only via :focus-visible (no component-level focus classes)"

requirements-completed: [MIGRATE-01, MIGRATE-03]

# Metrics
duration: 3min
completed: 2026-04-07
---

# Phase 17 Plan 03: Class Name Migration Summary

**Migrated 37 component files from old Tailwind utility classes to Glyph Finance token names, removing shadows and inline focus patterns**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-07T19:00:54Z
- **Completed:** 2026-04-07T19:04:27Z
- **Tasks:** 1
- **Files modified:** 37

## Accomplishments
- Renamed all background classes (bg-bg-primary, bg-bg-card, bg-bg-elevated, bg-bg-input) to new token names across 37 files
- Renamed text-text-muted to text-text-tertiary and border-border to border-border-divider throughout the codebase
- Removed all shadow classes (shadow-sm, shadow-md, shadow-lg, shadow-glow) from every component
- Removed inline focus patterns from 8 form/filter components in favor of global :focus-visible rule
- Removed border-border-light (deleted token) from all components
- Build passes with zero errors, all 394 tests pass

## Task Commits

Each task was committed atomically:

1. **Task 1: Rename background, text, border, shadow, and focus classes across all component files** - `0b36c63` (feat)

**Plan metadata:** [pending] (docs: complete plan)

## Files Created/Modified
- `src/app/loading.tsx` - Dashboard loading skeleton
- `src/app/*/loading.tsx` (6 files) - Page loading skeletons
- `src/components/layout/FAB.tsx` - FAB without shadow-lg/shadow-glow
- `src/components/ui/Modal.tsx` - Modal with surface-elevated bg, border-divider, no shadow-md
- `src/components/layout/Sidebar.tsx` - Sidebar with new surface-elevated + border-divider
- `src/components/layout/MobileNav.tsx` - Mobile nav bar with new token classes
- `src/components/layout/MobileMoreSheet.tsx` - Mobile sheet with new token classes
- `src/components/layout/PeriodSelector.tsx` - Period selector hover states updated
- `src/components/transactions/TransactionForm.tsx` - Form inputs with bg-transparent, no inline focus
- `src/components/transactions/TransactionFilters.tsx` - Filter dropdowns without shadow-lg, no inline focus
- `src/components/transactions/TransactionList.tsx` - List with surface-elevated bg
- `src/components/transactions/TransactionRow.tsx` - Row cards with new token classes
- `src/components/debts/DebtForm.tsx` - Debt form inputs with bg-transparent, no inline focus
- `src/components/debts/DebtCard.tsx` - Debt card with surface-elevated, border-divider for inline edit
- `src/components/debts/DebtList.tsx` - Empty state text with text-tertiary
- `src/components/debts/DebtSummaryCards.tsx` - Summary cards with new token classes
- `src/components/income/IncomeSourceForm.tsx` - Income form with bg-transparent, no inline focus
- `src/components/income/IncomeSourceCard.tsx` - Income card with surface-elevated
- `src/components/income/IncomeSourceList.tsx` - Empty state text with text-tertiary
- `src/components/income/IncomeSummaryCards.tsx` - Summary cards with new token classes
- `src/components/budgets/BudgetTable.tsx` - Budget table headers with bg-bg, inputs without inline focus
- `src/components/budgets/BudgetSummaryRow.tsx` - Summary row with new token classes
- `src/components/budgets/BudgetProgressList.tsx` - Progress list with text-tertiary
- `src/components/dashboard/KPICard.tsx` - KPI card with surface-elevated, no shadow
- `src/components/dashboard/RecentTransactions.tsx` - Recent transactions with new token classes
- `src/components/history/AnnualPivotTable.tsx` - Pivot table with bg-bg headers, surface-elevated cells
- `src/components/history/CloseConfirmationModal.tsx` - Close modal with bg-surface, removed border-light
- `src/components/categories/CategoryForm.tsx` - Category form with bg-transparent, no inline focus
- `src/components/categories/CategoryList.tsx` - Category list items with new token classes
- `src/components/charts/TrendAreaChart.tsx` - Chart container with surface-elevated
- `src/components/charts/BudgetBarChart.tsx` - Budget chart with new token classes
- `src/components/charts/ExpenseDonutChart.tsx` - Expense chart with new token classes

## Decisions Made
- Included BudgetBarChart.tsx and ExpenseDonutChart.tsx in migration scope (not in original plan file list but contained old token class names that would silently produce no styles)
- Replaced border-border-focus with border-border-divider in DebtCard inline edit input (was using the focus token as a regular border color, not a focus ring)
- Used bg-transparent as replacement for bg-bg-input (inputs should inherit background from their container)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added BudgetBarChart.tsx and ExpenseDonutChart.tsx to migration scope**
- **Found during:** Task 1 (initial file scan)
- **Issue:** These two chart component files contained old token class names (bg-bg-card, border-border, text-text-muted) but were not listed in the plan's files_modified
- **Fix:** Included them in the migration alongside the 35 planned files
- **Files modified:** src/components/charts/BudgetBarChart.tsx, src/components/charts/ExpenseDonutChart.tsx
- **Verification:** grep confirms zero old class names in these files
- **Committed in:** 0b36c63 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Essential for correctness -- leaving these files unmigrated would cause silent style loss. No scope creep.

## Issues Encountered
- Pre-existing seed test timeout (tests/integration/seed.test.ts beforeAll hook exceeds 10s limit) -- confirmed same failure exists before and after changes, not caused by this migration

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 17 is now fully complete (all 3 plans executed)
- All token renames, hex value updates, and class name migrations are done
- The app renders with correct Glyph Finance visual identity
- Ready for Phase 18 (responsive layout refinement)

---
*Phase: 17-token-foundation-class-migration*
*Completed: 2026-04-07*
