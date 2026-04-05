# Phase 9: Budget Configuration + Progress - Context

**Gathered:** 2026-04-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the Budget page (/presupuesto): editable budget table with quincenal amounts per category, auto-calculated monthly/semester/annual columns, total row with income comparison (surplus/deficit), progress bars showing % spent per category with traffic-light coloring, and auto-copy of budgets from previous period when none exist for current.

</domain>

<decisions>
## Implementation Decisions

### User chose: Skip discussion
All decisions derive from DFR.md section 3.4, DATA_FLOW.md section 3.4, UX_RULES.md section 10.3, and STYLE_GUIDE.md. No custom preferences — Claude has full discretion within documented patterns.

### Budget table (from DFR.md 3.4)
- Editable table with each category as a row
- Input: quincenal amount per category
- Calculated columns: monthly (x2), semester (x6), annual (x12)
- Total row at bottom
- Comparison: quincenal income vs total quincenal budget → show surplus/deficit

### Progress view (from DFR.md 3.4 + UX_RULES.md 10.3)
- Bar per category: % spent of monthly budget (quincenalAmount * 2)
- Traffic light: green <80%, orange 80-100%, red >100%
- Show spent vs budgeted amounts side by side
- The % text adopts the same color as the bar

### Auto-copy (from DFR.md 5.4)
- If no budget entries exist for current period, copy from previous period automatically
- This happens server-side when loading the page

### Period-aware
- Budget page uses period selector (URL params ?month=X&year=Y)
- Shows budget for selected period
- Progress bars need actual spending from Transaction data for the same period

### Data patterns (following established patterns)
- Server Actions for budget upsert (createBudgetSchema from Phase 3)
- Server Component page fetches budgets + spending per category via Prisma
- serializeBigInts() before Client Components
- revalidatePath('/presupuesto') and revalidatePath('/') after mutations
- Budget vs spent query from DATA_FLOW.md section 3.4

### Claude's Discretion
- Table editing UX (inline per-cell vs row edit vs batch save)
- Whether to split configuration view and progress view into tabs/sections
- Empty state when no categories have budgets configured
- Mobile table adaptation (cards vs horizontal scroll)
- How the auto-copy feedback works (silent vs notification)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/validators.ts`: `createBudgetSchema` — array of { categoryId, quincenalAmount }
- `src/lib/utils.ts`: formatMoney, toCents, cn
- `src/lib/serialize.ts`: serializeBigInts
- `src/lib/period.ts`: getCurrentPeriod, getPeriodForDate
- `src/lib/income.ts`: calculateIncomeSummary (for surplus/deficit comparison)
- `src/components/layout/PageHeader.tsx`: with period selector
- `src/components/layout/PeriodSelector.tsx`: arrow navigation
- Prisma schema: Budget model with (periodId, categoryId) unique composite
- Seed data: budget entries with non-zero quincenal amounts for current period
- Transaction data exists from Phase 6 for spending calculations

### Established Patterns
- Server Component → Prisma fetch → serializeBigInts → Client Components
- Server Actions for mutations
- Period-aware pages with URL params
- Progress bars: same styling approach as debt utilization bars (Phase 8)
- Budget vs spent query already defined in DATA_FLOW.md section 3.4

### Integration Points
- `src/app/presupuesto/page.tsx`: Replace placeholder
- `src/components/budgets/`: New directory
- `src/app/presupuesto/actions.ts`: New Server Actions
- Dashboard revalidation: budget changes affect budget vs spent chart

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

*Phase: 09-budget-configuration-progress*
*Context gathered: 2026-04-05*
