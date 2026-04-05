# Phase 5: Income Sources - Context

**Gathered:** 2026-04-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Full CRUD for Income Sources — the simplest entity, designed to validate the entire full-stack pattern: Server Component data fetching → Server Action mutations → Prisma queries → revalidatePath → UI update. List view with summary cards, create/edit via modal, delete with inline confirmation.

</domain>

<decisions>
## Implementation Decisions

### User chose: Skip discussion
All decisions derive from DFR.md section 3.5, UX_RULES.md, and STYLE_GUIDE.md. No custom preferences were expressed — Claude has full discretion within documented patterns.

### Display (from DFR.md 3.5)
- Card-based list of income sources
- Each card: name, default amount (formatted), frequency, type badge
- For quincenal frequency: show monthly equivalent (x2)
- Summary section: quincenal, monthly, semester, annual income estimates

### CRUD operations (from UX_RULES.md)
- Create: Modal with form (name, defaultAmount, frequency selector, type selector)
- Edit: Same modal, pre-filled with existing data
- Delete: Inline confirmation (not modal) — button changes to "Eliminar? Si / No", auto-reverts after 3s
- All mutations via Server Actions, not API routes
- Zod validation with createIncomeSourceSchema (already built in Phase 3)
- Toast notifications for success/error (if toast system exists; otherwise skip for now — Phase 11)

### Data patterns (first full-stack feature)
- Server Component page fetches income sources via Prisma
- serializeBigInts() before passing to Client Components
- formatMoney() for display, toCents() for input conversion
- revalidatePath('/ingresos') after mutations
- Also revalidatePath('/') since Dashboard shows income KPI

### Claude's Discretion
- Card layout details (spacing, icon usage, badge styling)
- Frequency selector style (radio group vs dropdown — UX_RULES.md suggests radio for <6 options)
- Empty state design (icon + text + CTA per UX_RULES.md)
- Whether to split into sub-components or keep page-level
- Form field ordering and optional field handling
- Loading state while mutations are in progress
- Variable frequency display: Phase 5 shows defaultAmount with "(estimado)" label since no transactions exist yet. The DFR.md 3-month average calculation is deferred to Phase 6 (Dashboard/transactions) when transaction history is available to compute it.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/validators.ts`: `createIncomeSourceSchema` — Zod v4 with Spanish messages
- `src/lib/utils.ts`: `formatMoney()`, `toCents()`, `parseCents()`, `cn()`
- `src/lib/serialize.ts`: `serializeBigInts()`
- `src/lib/constants.ts`: NavItem definitions, MONTH_NAMES_ES
- `src/components/ui/Modal.tsx`: Responsive modal/sheet primitive
- `src/components/ui/DynamicIcon.tsx`: Icon by name
- `src/components/layout/PageHeader.tsx`: Page header with title + action button
- `src/app/ingresos/page.tsx`: Placeholder page — replace with real implementation
- `src/app/ingresos/loading.tsx`: Loading skeleton — update with income-specific skeleton

### Established Patterns
- Server Components by default, Client Components only for interactivity
- Prisma queries in Server Components, mutations in Server Actions
- serializeBigInts() before any data passes to Client Components
- cn() for conditional class merging
- Tailwind v4 @theme design tokens for all colors/spacing
- TDD with Vitest for unit tests

### Integration Points
- `src/app/ingresos/page.tsx`: Replace placeholder with Server Component page
- `src/components/income/`: New directory for income-specific components
- Server Actions: new file for income source mutations (create, update, delete)
- Prisma singleton at `@/lib/prisma` (via generated/prisma/client)

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

*Phase: 05-income-sources*
*Context gathered: 2026-04-05*
