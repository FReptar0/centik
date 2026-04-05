# Phase 7: Dashboard - Context

**Gathered:** 2026-04-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the Dashboard page (/) with 6 KPI cards, 3 charts (budget vs spent bar, 6-month trend area, expense donut), and a recent transactions section (last 8). All data computed server-side via SQL aggregation queries. Charts rendered as Client Components using Recharts (validated in Phase 1).

</domain>

<decisions>
## Implementation Decisions

### User chose: Skip discussion
All decisions derive from DFR.md section 3.1, DATA_FLOW.md section 3.1, and STYLE_GUIDE.md section 8.8. No custom preferences expressed — Claude has full discretion within documented patterns.

### KPI Cards (from DFR.md 3.1)
- 6 cards: monthly estimated income, expenses this month, available (income - expenses), total debt, savings rate (%), debt-to-income ratio (%)
- All computed via SQL aggregation (SUM, not client-side) per DATA_FLOW.md
- Semantic colors: green for positive (income, savings), red for negative (expenses, debt), cyan for neutral (projections)
- Mobile: 2-column grid. Desktop: 3-4 column grid

### Charts (from DFR.md 3.1 + STYLE_GUIDE.md 8.8)
- Budget vs Spent: horizontal bar chart, one bar pair per category, category colors
- 6-month Trend: area/line chart, income vs expenses over time, uses MonthlySummary data
- Expense Distribution: donut/pie chart, expense by category, category colors
- Recharts (validated in Phase 1) for all three
- Chart styling per STYLE_GUIDE.md 8.8: dark bg, dashed grid lines, @theme colors, tooltips with bg-primary

### Recent Transactions (from DFR.md 3.1)
- Last 8 transactions from current period
- Each shows: category icon (DynamicIcon), description, date, colored signed amount
- Reuses TransactionRow component from Phase 6 or a simplified version

### Data Fetching (from DATA_FLOW.md 3.1)
- Server Component page with parallel queries (Promise.all)
- getDashboardKPIs() — 4 aggregation queries in parallel
- getCategoryExpenses() — pie chart data
- getBudgetVsSpent() — bar chart data
- getMonthlyTrend() — area chart from MonthlySummary
- getRecentTransactions() — LIMIT 8
- serializeBigInts() before passing to Client Components

### Empty States
- When no data: show informative empty states per UX_RULES.md
- Charts show "Sin datos" placeholder, not broken/empty charts
- KPI cards show $0.00 with muted text, not blank

### Claude's Discretion
- KPI card visual design (spacing, icon usage, value prominence)
- Chart dimensions and responsive breakpoints
- Whether to use recharts ResponsiveContainer or fixed dimensions
- Dashboard grid layout details (gap sizes, section ordering)
- Whether recent transactions section needs its own "Ver todos" link to /movimientos
- Empty state illustrations vs simple text+icon

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/transactions/TransactionRow.tsx`: Renders transaction with icon + amount + color
- `src/components/ui/DynamicIcon.tsx`: Icon by name
- `src/components/layout/PageHeader.tsx`: Page header with period selector
- `src/lib/utils.ts`: formatMoney, formatRate, cn
- `src/lib/serialize.ts`: serializeBigInts
- `src/lib/prisma.ts`: Prisma singleton
- `src/lib/period.ts`: getCurrentPeriod, getPeriodForDate
- `src/lib/constants.ts`: CATEGORY_COLORS, DEFAULT_CATEGORIES
- `recharts`: Already installed and validated with React 19 (Phase 1)
- Seed data: 2 periods (1 closed March + open April), sample transactions, MonthlySummary for trend

### Established Patterns
- Server Component page → parallel Prisma queries → serializeBigInts → Client Component props
- Period-aware pages use URL params (?month=X&year=Y)
- Tailwind v4 @theme dark palette with all color tokens
- Charts are Client Components ("use client")

### Integration Points
- `src/app/page.tsx`: Replace placeholder with Dashboard Server Component
- `src/components/dashboard/`: New directory for KPI cards + chart wrappers
- `src/components/charts/`: New directory for Recharts wrapper components
- Queries: Prisma aggregation queries for KPIs, chart data, recent transactions

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches following documented patterns.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 07-dashboard*
*Context gathered: 2026-04-05*
