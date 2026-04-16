# Phase 20: Feature Component Updates - Context

**Gathered:** 2026-04-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace all smooth progress bars with BatteryBar, update all three charts to minimal Glyph Finance treatment, and style all monetary amount displays with muted "$" in IBM Plex Mono. Three focused requirements, all specs locked.

</domain>

<decisions>
## Implementation Decisions

All decisions locked from STYLE_GUIDE.md, REQUIREMENTS.md, and prior phases.

### UPDATE-03: BatteryBar Replacing Progress Bars
- Replace smooth progress bars in: budget progress (BudgetProgressList), debt utilization (DebtCard), debt payoff views
- Import BatteryBar from src/components/ui/BatteryBar.tsx (built in Phase 18)
- Budget thresholds: 80/100 (green < 80%, orange 80-99%, red 100%+)
- Debt utilization thresholds: 31/71 (green < 31%, orange 31-70%, red 71%+)
- No smooth bars should remain anywhere in the app after this phase

### UPDATE-04: Minimal Charts
- TrendAreaChart: no grid lines, 1.5px stroke, 4px dot endpoints, subtle 10-15% fill, Glyph Finance hex colors
- ExpenseDonutChart: thinner ring, no grid, Glyph Finance colors
- BudgetBarChart: rectangular bars (no border-radius), no grid, Glyph Finance colors
- CHART_COLORS already updated in Phase 17 — this phase updates the visual treatment (stroke width, grid removal, dot endpoints)
- Recharts config changes, not token changes

### UPDATE-14: Monetary Amount Display
- All "$" prefixes rendered in --color-text-tertiary at smaller font size
- All amounts use IBM Plex Mono (font-mono class)
- Color-coded by direction: --color-positive (income), --color-negative (expense), --color-text-primary (neutral)
- Affects: KPICard, TransactionRow, DebtCard, BudgetProgressList, IncomeSummaryCards, dashboard values

### Claude's Discretion
- Whether to create a shared MoneyAmount component or apply styles inline
- Exact Recharts props for dot endpoints (activeDot, dot)
- How to handle the donut chart "thinner ring" (innerRadius/outerRadius ratio)
- Whether BatteryBar compact (6px) or detailed (8px) variant for each use case

</decisions>

<code_context>
## Existing Code Insights

### Key Files to Modify
- src/components/budgets/BudgetProgressList.tsx — smooth progress bar → BatteryBar
- src/components/debts/DebtCard.tsx — utilization bar → BatteryBar
- src/components/charts/TrendAreaChart.tsx — grid, stroke, dots
- src/components/charts/ExpenseDonutChart.tsx — ring width, grid
- src/components/charts/BudgetBarChart.tsx — bar shape, grid
- src/components/dashboard/KPICard.tsx — monetary display
- src/components/transactions/TransactionRow.tsx — amount styling
- src/components/debts/DebtCard.tsx — amount styling
- src/components/budgets/BudgetSummaryRow.tsx — amount styling
- src/components/income/IncomeSummaryCards.tsx — amount styling

### Primitives Available
- BatteryBar (Phase 18) — ready to import
- formatMoney() in src/lib/utils.ts — existing formatting utility

</code_context>

<deferred>
## Deferred Ideas

None.

</deferred>

---

*Phase: 20-feature-component-updates*
*Context gathered: 2026-04-13*
