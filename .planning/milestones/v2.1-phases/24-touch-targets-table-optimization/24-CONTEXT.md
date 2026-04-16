# Phase 24: Touch Targets + Table Optimization - Context

**Gathered:** 2026-04-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Enforce 44px minimum touch targets on all action buttons (DebtCard, TransactionRow, PeriodSelector) and optimize tables (AnnualPivotTable, BudgetTable) for mobile usability. CSS/Tailwind-only changes.

</domain>

<decisions>
## Implementation Decisions

### TOUCH-01: DebtCard Edit/Delete Buttons
- Current: p-2 padding = ~24x24px total
- Fix: Add min-w-[44px] min-h-[44px] or increase padding to p-3
- Keep icon size the same, increase tap area

### TOUCH-02: TransactionRow Edit/Delete Buttons
- Same issue as TOUCH-01 — p-2 padding = ~24x24px
- Fix: Same approach — min-w-[44px] min-h-[44px]

### TOUCH-03: PeriodSelector Navigation Buttons
- Current: p-1.5 padding — too small
- Fix: Increase to p-2.5 or add min-w-[44px] min-h-[44px]

### TABLE-01: AnnualPivotTable Mobile Strategy
- Current: min-w-[900px] forces scroll on any screen < 900px
- Strategy options: show fewer months, use a condensed format, or keep scroll but make it more usable (scroll indicators, sticky first column)
- Claude's Discretion: pick the best mobile strategy

### TABLE-02: BudgetTable Touch Input
- Input cells need min-height for comfortable touch
- Add min-h-[44px] to input cells in the budget configuration table

### Claude's Discretion
- Exact touch target implementation (min-w/min-h vs padding increase)
- AnnualPivotTable mobile strategy (condensed, fewer columns, or better scroll UX)
- Whether to add visual scroll indicators to tables

</decisions>

<code_context>
## Key Files
- src/components/debts/DebtCard.tsx — edit/delete buttons (lines ~220-228)
- src/components/transactions/TransactionRow.tsx — edit/delete buttons (lines ~132-145)
- src/components/layout/PeriodSelector.tsx — prev/next navigation buttons
- src/components/history/AnnualPivotTable.tsx — min-w-[900px] table
- src/components/budgets/BudgetTable.tsx — input cells

</code_context>

<deferred>
## Deferred Ideas

None.

</deferred>

---

*Phase: 24-touch-targets-table-optimization*
*Context gathered: 2026-04-15*
