---
phase: 11-polish-accessibility
plan: 03
subsystem: ui
tags: [accessibility, a11y, focus-visible, aria, semantic-html, tabular-nums, empty-states]

requires:
  - phase: 11-polish-accessibility
    provides: Toast notification wiring (Plan 11-01)
provides:
  - Global focus-visible ring styles for all interactive elements
  - Semantic HTML fixes (scope on table headers, aria-labelledby on dashboard sections)
  - Complete empty states with icon + text + CTA/guiding subtext on all list components
  - tabular-nums on all monetary display elements
  - aria-hidden on all decorative icons, aria-label on functional icon-only buttons
affects: []

tech-stack:
  added: []
  patterns:
    - "Global :focus-visible CSS rule for keyboard accessibility"
    - "aria-labelledby with sr-only headings for semantic sections"
    - "scope=col/row on table headers for screen readers"
    - "32px icon + text + CTA pattern for empty states per UX_RULES.md 5.1"

key-files:
  created: []
  modified:
    - src/app/globals.css
    - src/app/page.tsx
    - src/components/history/AnnualPivotTable.tsx
    - src/components/budgets/BudgetTable.tsx
    - src/components/transactions/TransactionList.tsx
    - src/components/categories/CategoryList.tsx
    - src/components/income/IncomeSourceList.tsx
    - src/components/debts/DebtList.tsx
    - src/components/charts/ExpenseDonutChart.tsx
    - src/components/income/IncomeSourceCard.tsx
    - src/components/budgets/BudgetSummaryRow.tsx
    - src/components/transactions/TransactionRow.tsx
    - src/components/ui/DynamicIcon.tsx

key-decisions:
  - "Used CSS :focus-visible with var(--color-accent) for global focus rings instead of per-component Tailwind classes"
  - "Dashboard sections use sr-only headings with aria-labelledby since visible headings would be redundant with KPI labels"
  - "TransactionList uses guiding subtext instead of CTA button since FAB handles transaction creation"
  - "CategoryList empty state icon changed from settings to tag for better semantic match"

patterns-established:
  - "Global focus-visible: all interactive elements get cyan 2px outline via CSS, no per-component focus classes needed"
  - "Empty state pattern: 32px icon in text-muted + descriptive text + CTA button or guiding subtext"
  - "Table accessibility: scope=col on thead th, scope=row on row label th"

requirements-completed: [UX-02, UX-03, UX-06, UX-07, UX-08, UX-09]

duration: 6min
completed: 2026-04-06
---

# Phase 11 Plan 03: Accessibility & UX Polish Summary

**Global focus-visible rings, semantic HTML table scoping, dashboard aria sections, complete empty states with CTAs, and tabular-nums audit across all monetary displays**

## Performance

- **Duration:** 6 min
- **Started:** 2026-04-06T00:56:34Z
- **Completed:** 2026-04-06T01:02:34Z
- **Tasks:** 2
- **Files modified:** 13

## Accomplishments
- Global CSS focus-visible rule ensures all interactive elements show cyan outline on keyboard navigation
- Table headers in AnnualPivotTable and BudgetTable have proper scope attributes for screen readers
- Dashboard page sections wrapped in semantic HTML with aria-labelledby
- All list component empty states now follow UX_RULES.md 5.1 pattern (32px icon + text + CTA/subtext)
- tabular-nums applied to all remaining monetary displays (chart legends, income monthly equivalents, budget summary)
- All decorative icons verified to have aria-hidden="true", all icon-only buttons have aria-label

## Task Commits

Each task was committed atomically:

1. **Task 1: Global focus-visible rings and semantic HTML fixes** - `c4f5d11` (feat)
2. **Task 2: Empty state completeness and tabular-nums audit** - `a1778c7` (feat)

## Files Created/Modified
- `src/app/globals.css` - Added global :focus-visible and :focus:not(:focus-visible) CSS rules
- `src/app/page.tsx` - Wrapped KPI, charts, and recent sections with aria-labelledby
- `src/components/history/AnnualPivotTable.tsx` - scope="col" on thead th, scope="row" on row label th
- `src/components/budgets/BudgetTable.tsx` - scope="col" on all thead th elements
- `src/components/transactions/TransactionRow.tsx` - Added aria-hidden="true" to category DynamicIcon
- `src/components/categories/CategoryList.tsx` - aria-hidden on row icon, tag icon at 32px for empty state
- `src/components/transactions/TransactionList.tsx` - Icon 48->32px, added guiding subtext
- `src/components/income/IncomeSourceList.tsx` - Icon 48->32px for empty state
- `src/components/debts/DebtList.tsx` - Icon 48->32px for empty state
- `src/components/charts/ExpenseDonutChart.tsx` - tabular-nums on legend amounts
- `src/components/income/IncomeSourceCard.tsx` - tabular-nums on monthly equivalent text
- `src/components/budgets/BudgetSummaryRow.tsx` - tabular-nums on monthly diff text
- `src/components/ui/DynamicIcon.tsx` - Added Tag icon to icon map

## Decisions Made
- Used CSS :focus-visible with var(--color-accent) for global focus rings instead of per-component Tailwind focus: classes -- ensures 100% coverage without touching each component
- Dashboard sections use sr-only headings (not visible h2) since KPIGrid and chart cards already have their own labels
- TransactionList empty state uses descriptive subtext pointing to FAB rather than a CTA button, since adding an onAdd prop would require wiring through multiple wrapper components
- Changed CategoryList empty state icon from "settings" to "tag" for better semantic meaning

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added Tag icon to DynamicIcon map**
- **Found during:** Task 2 (CategoryList empty state)
- **Issue:** Plan specified using "tag" icon for CategoryList empty state but Tag was not in DynamicIcon's ICON_MAP
- **Fix:** Imported Tag from lucide-react and added to ICON_MAP
- **Files modified:** src/components/ui/DynamicIcon.tsx
- **Verification:** Build passes, icon renders correctly
- **Committed in:** a1778c7 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Minor -- single icon import needed to support plan-specified icon name. No scope creep.

## Issues Encountered
- Pre-existing lint warnings in src/app/movimientos/actions.ts (3 unused _error variables) and src/components/debts/DebtCard.tsx (unused formatAmountDisplay function from uncommitted previous session work) -- out of scope, not introduced by this plan

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All accessibility requirements met for the Polish phase
- All three plans in Phase 11 are now complete
- App is ready for final QA verification

---
*Phase: 11-polish-accessibility*
*Completed: 2026-04-06*
