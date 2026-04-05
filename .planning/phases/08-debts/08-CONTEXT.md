# Phase 8: Debts - Context

**Gathered:** 2026-04-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the Debts management page (/deudas): list active debts as expandable cards with type-specific metrics (credit card: utilization, dates, interest; loan: progress, remaining months), create/edit/delete debts, manual balance updates, and summary section (total debt, monthly payments, debt-to-income ratio).

</domain>

<decisions>
## Implementation Decisions

### User chose: Skip discussion
All decisions derive from DFR.md section 3.3, UX_RULES.md, and STYLE_GUIDE.md. No custom preferences — Claude has full discretion within documented patterns.

### Debt card display (from DFR.md 3.3)
- Card-based expandable view per debt
- Each card: name, type icon (differentiated), current balance
- Credit cards (expanded): utilization bar (green <30%, orange 30-70%, red >70%), minimum payment, cut-off/payment dates, estimated monthly interest
- Loans (expanded): progress bar (% paid of original amount), monthly payment, remaining months, total remaining
- Calculated fields derived in component (not stored): utilizationRate, estimatedMonthlyInterest, percentPaid, totalRemainingPayment

### CRUD operations (following established patterns)
- Create: Modal with type-specific fields (credit card vs personal loan)
- Edit: Same modal, pre-filled
- Delete: Inline confirmation (3s auto-revert) — same pattern as Phase 5/6
- Balance update: inline edit on the balance field (click → input → Enter/blur to save)
- All mutations via Server Actions with Zod validation (createDebtSchema, updateDebtBalanceSchema)
- revalidatePath('/deudas') and revalidatePath('/') after mutations

### Summary section (from DFR.md 3.3)
- Total debt (SUM active debt balances)
- Total monthly debt payments
- Debt-to-income ratio (uses income data from IncomeSource)

### Health indicators (from UX_RULES.md 10.3-10.4)
- Credit card utilization: green <30%, orange 30-70%, red >70%
- Debt-to-income ratio: green <35%, orange 35-50%, red >50%
- Progress bars use same traffic light pattern as budget (Phase 9)

### Claude's Discretion
- Expand/collapse animation and trigger (click card header? chevron icon?)
- Which fields show collapsed vs expanded
- Credit card vs loan form field organization
- Empty state design
- Whether to show inactive/paid-off debts or filter them out
- Balance update inline edit implementation details

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/validators.ts`: `createDebtSchema`, `updateDebtBalanceSchema`
- `src/lib/utils.ts`: `formatMoney()`, `formatRate()`, `toCents()`, `cn()`
- `src/lib/serialize.ts`: `serializeBigInts()`
- `src/lib/income.ts`: `calculateIncomeSummary()` for debt-to-income ratio
- `src/components/ui/Modal.tsx`: Responsive modal/sheet
- `src/components/ui/DynamicIcon.tsx`: Icon by name (CreditCard, Landmark icons)
- `src/components/layout/PageHeader.tsx`: Page header
- `src/app/ingresos/actions.ts`: Server Action pattern reference
- `src/components/income/IncomeSourceCard.tsx`: Inline delete pattern reference
- Prisma schema: Debt model with all fields (type, currentBalance, creditLimit, annualRate, etc.)
- Seed data: 1 credit card (~$15K) + 1 personal loan (~$80K)

### Established Patterns
- Server Component page → Prisma fetch → serializeBigInts → Client Components
- Server Actions: Zod validate → Prisma mutate → revalidatePath
- Inline delete: useState + useEffect + setTimeout (3s)
- Modal for create/edit entities
- TDD for Server Actions and calculated field utilities

### Integration Points
- `src/app/deudas/page.tsx`: Replace placeholder with real Debts page
- `src/components/debts/`: New directory for debt components
- `src/app/deudas/actions.ts`: New Server Actions for debt CRUD
- Dashboard revalidation: debt changes affect KPI cards (total debt, debt-to-income)

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

*Phase: 08-debts*
*Context gathered: 2026-04-05*
