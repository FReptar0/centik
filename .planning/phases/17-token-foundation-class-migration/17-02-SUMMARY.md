---
phase: 17-token-foundation-class-migration
plan: 02
subsystem: ui
tags: [design-tokens, colors, charts, recharts, tailwind, glyph-finance]

# Dependency graph
requires:
  - phase: 17-01
    provides: CSS variable token swap to Glyph Finance palette
provides:
  - "8 category colors updated to Glyph Finance desaturated palette across constants, seed, and form"
  - "3 chart components updated to Glyph Finance hex values for Recharts SVG rendering"
  - "8 test files updated with new hex assertions, all 394 tests passing"
affects: [18-class-migration, 19-component-refinement, 22-visual-qa]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Recharts chart colors remain hardcoded hex (CSS variables ignored by SVG)"
    - "Category colors synchronized across constants.ts, seed-data.ts, and CategoryForm.tsx"

key-files:
  created: []
  modified:
    - src/lib/constants.ts
    - prisma/seed-data.ts
    - src/components/categories/CategoryForm.tsx
    - src/lib/dashboard.ts
    - src/components/charts/TrendAreaChart.tsx
    - src/components/charts/BudgetBarChart.tsx
    - src/components/charts/ExpenseDonutChart.tsx
    - src/lib/constants.test.ts
    - src/lib/dashboard.test.ts
    - src/lib/budget.test.ts
    - src/app/configuracion/actions.test.ts
    - src/components/layout/FAB.test.tsx
    - src/components/transactions/TransactionForm.test.tsx
    - src/components/transactions/TransactionRow.test.tsx
    - src/components/transactions/TransactionList.test.tsx

key-decisions:
  - "Income category colors: Empleo #6BAF8E (muted sage green), Freelance #7AACB8 (muted teal) -- harmonizes with desaturated expense palette"
  - "ExpenseDonutChart CenterLabel fill updated from #64748b to #666666 (text-tertiary token equivalent)"
  - "PRESET_COLORS last 2 entries (#8b5cf6, #ef4444) kept unchanged -- they are extra palette options not tied to default categories"

patterns-established:
  - "Hex color migration: update source files, seed data, form presets, and test assertions atomically"

requirements-completed: [MIGRATE-02, TEST-01]

# Metrics
duration: 5min
completed: 2026-04-07
---

# Phase 17 Plan 02: Hex Color Migration Summary

**Migrated all JavaScript-level hex colors (constants, seed data, chart components, test fixtures) to Glyph Finance desaturated palette with 394 tests passing**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-07T18:53:43Z
- **Completed:** 2026-04-07T18:59:08Z
- **Tasks:** 3
- **Files modified:** 15

## Accomplishments
- Updated 8 category colors in constants.ts, seed-data.ts, and CategoryForm.tsx to Glyph Finance desaturated palette
- Updated CHART_COLORS in 3 Recharts components (TrendAreaChart, BudgetBarChart, ExpenseDonutChart) to Glyph Finance values
- Updated 8 test files with new hex value assertions; all 394 unit tests pass

## Task Commits

Each task was committed atomically:

1. **Task 1: Update constants.ts, seed-data.ts, and CategoryForm.tsx with new hex values** - `87f7230` (feat)
2. **Task 2: Update CHART_COLORS in all three chart components** - `7de2465` (feat)
3. **Task 3: Update all test files asserting old hex values** - `c6b7df3` (test)

## Files Created/Modified
- `src/lib/constants.ts` - 8 DEFAULT_CATEGORIES colors updated to desaturated palette
- `prisma/seed-data.ts` - 8 CATEGORIES colors synchronized with constants.ts
- `src/components/categories/CategoryForm.tsx` - PRESET_COLORS array updated (8 of 10 entries)
- `src/lib/dashboard.ts` - Fallback color in getCategoryExpenses updated from #94a3b8 to #8A9099
- `src/components/charts/TrendAreaChart.tsx` - CHART_COLORS: tooltipBg, axis, positive, negative updated
- `src/components/charts/BudgetBarChart.tsx` - CHART_COLORS: tooltipBg, axis, budgetMuted updated
- `src/components/charts/ExpenseDonutChart.tsx` - CHART_COLORS: tooltipBg, tooltipBorder updated; CenterLabel fill updated
- `src/lib/constants.test.ts` - Hex regex and color assertions updated
- `src/lib/dashboard.test.ts` - Category color mock data and assertions updated
- `src/lib/budget.test.ts` - Category color mock data and assertions updated
- `src/app/configuracion/actions.test.ts` - validData color updated
- `src/components/layout/FAB.test.tsx` - Mock category color updated
- `src/components/transactions/TransactionForm.test.tsx` - Mock category colors updated
- `src/components/transactions/TransactionRow.test.tsx` - Mock category colors updated
- `src/components/transactions/TransactionList.test.tsx` - Mock category color updated

## Decisions Made
- Income category colors chosen as muted earth tones: Empleo #6BAF8E (sage green), Freelance #7AACB8 (teal) -- harmonizes with desaturated expense palette without clashing with semantic positive (#00E676) or accent (#CCFF00)
- Updated ExpenseDonutChart CenterLabel `fill="#64748b"` to `fill="#666666"` since it was in the chart migration scope (axis/text-tertiary equivalent)
- Kept PRESET_COLORS last 2 entries (#8b5cf6, #ef4444) as-is since they are extra palette options, not default category colors

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed constants.test.ts hex color regex**
- **Found during:** Task 3 (test file updates)
- **Issue:** Regex `#[0-9a-f]{6}` only matched lowercase hex; new colors use uppercase (e.g., #C88A5A)
- **Fix:** Updated regex to `#[0-9a-fA-F]{6}` to accept both cases
- **Files modified:** src/lib/constants.test.ts
- **Verification:** Test passes with new uppercase hex values
- **Committed in:** c6b7df3 (Task 3 commit)

**2. [Rule 1 - Bug] Fixed dashboard.test.ts missing debt.findMany mock**
- **Found during:** Task 3 (running test suite)
- **Issue:** Pre-existing: getDashboardKPIs calls prisma.debt.findMany for DTI calculation, but mock only had prisma.debt.aggregate. All 5 KPI tests were failing with "not a function"
- **Fix:** Added mockDebtFindMany to mock setup and all 5 test cases; updated first test's DTI assertion to match payment-based calculation (was asserting balance-based ratio)
- **Files modified:** src/lib/dashboard.test.ts
- **Verification:** All 13 dashboard tests pass; 394 total tests pass
- **Committed in:** c6b7df3 (Task 3 commit)

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Both auto-fixes necessary for test correctness. No scope creep.

## Issues Encountered
None beyond the pre-existing test mock issue documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All JavaScript-level hex colors migrated to Glyph Finance palette
- Plan 03 (remaining class migration work) can proceed
- Zero old palette hex values remain in src/ or prisma/

## Self-Check: PASSED

All 15 modified files exist. All 3 task commits verified (87f7230, 7de2465, c6b7df3).

---
*Phase: 17-token-foundation-class-migration*
*Completed: 2026-04-07*
