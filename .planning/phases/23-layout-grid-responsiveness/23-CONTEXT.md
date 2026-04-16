# Phase 23: Layout + Grid Responsiveness - Context

**Gathered:** 2026-04-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix DebtCard expansion bug, add max-width containers to pages, and add missing responsive breakpoints across all grid layouts. All changes are CSS/Tailwind class updates — no new components, no new features.

</domain>

<decisions>
## Implementation Decisions

All decisions derived from the codebase audit. No user discussion needed.

### BUG-01: DebtCard Expansion Bug
- When one card expands on desktop, both cards in the 2-column grid resize
- Root cause: likely the grid auto-rows or flex behavior — expanded card content pushes grid row height
- Fix: ensure expanded card grows only within its own grid cell, or use align-self/align-items to prevent row stretching

### BUG-02: Missing Max-Width Containers
- Dashboard (page.tsx), Budget (PresupuestoClientWrapper), History pages have no max-width
- Add max-w-6xl or max-w-7xl wrapper to constrain content on wide screens
- Deudas page already has max-w-4xl — use as reference pattern

### RESP-01: DebtList Grid Missing md: Breakpoint
- Current: grid-cols-1 lg:grid-cols-2
- Fix: grid-cols-1 md:grid-cols-2 (show 2 columns at 768px)

### RESP-02: DebtCard Inner Metric Grid
- Current: fixed grid-cols-2 on mobile
- Fix: grid-cols-1 sm:grid-cols-2

### RESP-03: DebtSummaryCards Incomplete Breakpoints
- Current: grid-cols-2 sm:grid-cols-3
- Fix: grid-cols-1 sm:grid-cols-3 (stack on very small, 3-column at 640px+)

### RESP-04: Dashboard/KPI/Income Grid Breakpoints
- KPIGrid: grid-cols-2 gap-3 md:grid-cols-3 — could add sm: for better tablet
- IncomeSummaryCards: grid-cols-2 md:grid-cols-4 — missing sm: bridge
- Dashboard chart grids: grid-cols-1 lg:grid-cols-2 — could add md:grid-cols-2
- Budget layout: grid gap-8 lg:grid-cols-2 — could add md:grid-cols-2

### RESP-05: Form Grids Not Responsive
- DebtForm: grid-cols-2 gap-2 (no responsive)
- IncomeSourceForm: grid-cols-2, grid-cols-3 (no responsive)
- CategoryForm: grid-cols-4 (no responsive)
- TransactionForm: grid-cols-4, grid-cols-2 (no responsive)
- Fix all: add grid-cols-2 sm:grid-cols-{N} or grid-cols-1 sm:grid-cols-{N}

### Claude's Discretion
- Exact max-width value for each page (max-w-6xl vs max-w-7xl)
- Whether DebtCard expansion fix uses CSS grid alignment or conditional rendering
- Exact breakpoint values for each grid (where to add sm: vs md:)
- Whether to add gap adjustments alongside breakpoint changes

</decisions>

<code_context>
## Key Files to Modify

### Layout Bug Fixes
- src/components/debts/DebtCard.tsx — expansion behavior
- src/components/debts/DebtList.tsx — grid layout
- src/app/page.tsx — Dashboard max-width
- src/app/presupuesto/PresupuestoClientWrapper.tsx — Budget max-width
- src/app/historial/HistorialClientWrapper.tsx — History max-width (if exists)

### Grid Responsiveness
- src/components/debts/DebtSummaryCards.tsx — summary grid
- src/components/dashboard/KPIGrid.tsx — KPI grid
- src/components/income/IncomeSummaryCards.tsx — income summary grid
- src/components/debts/DebtForm.tsx — form grids
- src/components/income/IncomeSourceForm.tsx — form grids
- src/components/categories/CategoryForm.tsx — icon picker grid
- src/components/transactions/TransactionForm.tsx — category grid, optional fields

</code_context>

<deferred>
## Deferred Ideas

None.

</deferred>

---

*Phase: 23-layout-grid-responsiveness*
*Context gathered: 2026-04-16*
