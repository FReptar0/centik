# Phase 10: History + Period Close - Context

**Gathered:** 2026-04-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the History page (/historial): annual pivot table with 12 months of financial metrics from MonthlySummary, year selector. Implement period close as an atomic Prisma $transaction (calculate totals → create MonthlySummary → mark closed → create next period → copy budgets). Period reopen capability. Read-only enforcement across all views for closed periods.

</domain>

<decisions>
## Implementation Decisions

### Close confirmation modal
- Danger-style modal per UX_RULES.md 8.2
- Title as question: "¿Cerrar el periodo de [Mes Año]?"
- Body: full preview of calculated totals (income, expenses, savings, savings rate, debt at close, debt payments) — user sees exactly what will be snapshotted
- Consequence text: "Las transacciones de este mes quedarán bloqueadas"
- Buttons: "Cancelar" (secondary) + "Cerrar Periodo" (danger red)
- No notes field in MVP — keep it simple

### Reopen UX
- Ghost button "Reabrir periodo" in the read-only banner on closed period pages
- Small, discrete but findable — not prominent
- Reopen deletes MonthlySummary + unlocks editing (per DATA_FLOW.md 4.6)

### Annual pivot table (from DFR.md 3.6)
- Rows: Ingresos, Gastos, Ahorro, % Ahorro, Deuda (cierre), Pagos a deudas
- Columns: Ene-Dic + Total Anual
- Data from MonthlySummary records
- Year selector to navigate between years

### Period close atomic transaction (from DATA_FLOW.md 4.5)
- Prisma $transaction wrapping all 5 operations:
  1. Calculate totals (SUM transactions, SUM debts)
  2. Create MonthlySummary
  3. Mark period isClosed=true, closedAt=now()
  4. Create next period if not exists
  5. Copy budget entries to next period
- Must be idempotent-safe (check period not already closed before proceeding)

### Closed period enforcement
- Read-only banner: "Periodo cerrado — solo lectura" with lock icon
- All edit/delete buttons disabled across Movimientos, Presupuesto when viewing closed period
- Server-side enforcement already exists in transaction Server Actions (Phase 6)
- Period selector shows lock icon for closed periods (already built in Phase 4)

### Data patterns
- Server Actions for close and reopen
- Server Component page for history table
- revalidatePath for /, /historial, /presupuesto after close/reopen
- Year-based data fetching (getMonthlySummaries(year))

### Claude's Discretion
- Pivot table styling (responsive adaptation for mobile)
- Close button placement on the history page (inline per month? separate section?)
- Whether to show a "Cerrar mes" button on the current month row or as a separate action
- Empty state for years with no data
- Loading state during the close transaction (can take a moment)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/period.ts`: getCurrentPeriod, getPeriodForDate — period management
- `src/lib/budget.ts`: copyBudgetsFromPreviousPeriod — reuse for close transaction
- `src/lib/income.ts`: calculateIncomeSummary — for debt-to-income context
- `src/components/layout/PageHeader.tsx`: page header (NOT period-aware for historial)
- `src/components/ui/Modal.tsx`: for confirmation dialog
- Prisma schema: Period, MonthlySummary, Budget models all ready
- Seed data: March 2026 closed with MonthlySummary, April 2026 open — test data available
- All Server Action patterns established (Phases 5-9)

### Established Patterns
- Server Component → Prisma fetch → serializeBigInts → Client Components
- Server Actions with Zod validation
- Prisma $transaction for multi-table operations (referenced in DATA_FLOW.md 4.5)
- Inline confirmation pattern (3s timer) — not needed here, using modal instead

### Integration Points
- `src/app/historial/page.tsx`: Replace placeholder with history page
- `src/app/historial/actions.ts`: New Server Actions (closePeriod, reopenPeriod)
- `src/components/history/`: New directory for history components
- Closed period read-only: may need to update existing pages to check period.isClosed

</code_context>

<specifics>
## Specific Ideas

- The close confirmation preview should compute the same totals that will be stored in MonthlySummary — no surprises between preview and actual snapshot
- Reopen should be rare and intentional — the ghost button placement is correct
- The pivot table is the user's "year in review" — it should feel comprehensive but calm

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 10-history-period-close*
*Context gathered: 2026-04-05*
