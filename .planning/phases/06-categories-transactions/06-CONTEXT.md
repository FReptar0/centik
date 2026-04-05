# Phase 6: Categories + Transactions - Context

**Gathered:** 2026-04-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Category list view + custom category creation (on Configuración page). Transaction quick-add (<30 seconds via FAB modal), transaction list with filters, edit/delete, closed-period enforcement. This is the core recording loop — the most-used feature of the entire app.

</domain>

<decisions>
## Implementation Decisions

### Quick-add transaction flow
- FAB opens the existing Modal component (bottom sheet mobile, modal desktop)
- Toggle expense/income (default: expense)
- Amount input: standard text, `inputMode="decimal"`, "$" prefix, right-aligned, comma format on blur
- Amount auto-focuses when modal opens
- Category selector: 3-column icon grid with label below — tap to select, highlight selected
- Optional fields collapsed by default under "Más detalles": description, payment method (radio group), notes, date (default today)
- After save: close modal, stay on page, list updates via revalidatePath — no toast (Phase 11)
- Income type: category grid shows income categories, optional incomeSourceId dropdown appears

### Transaction list
- Current period transactions, sorted by date descending
- Each row: category icon (DynamicIcon) + description/category name + date + amount (green +$X income, red -$X expense)
- Pagination: show first 25, "Cargar más" button at bottom (max 50 per load per UX_RULES.md)

### Transaction filters
- Horizontal filter chips above the list
- Filter types: category (multi-select), type (income/expense), date range (Desde/Hasta date inputs), payment method
- Active chips show X to remove individual filter
- "Limpiar filtros" link visible when any filter active
- Filters persist in URL search params (?type=EXPENSE&category=food) — bookmarkable, back button works

### Transaction CRUD
- Edit: same modal as create, pre-filled with existing data
- Delete: inline confirmation (3s auto-revert) — same pattern as Income Sources (Phase 5)
- Closed period: server-side enforcement — Server Actions reject mutations on closed periods with Spanish error message
- Income transactions: optionally link to an income source (dropdown selector, not required)

### Category management
- Categories listed on /configuración page (not inline in transaction form)
- View: list with icon (DynamicIcon), color swatch, name, type badge
- Create custom: form with name, preset icon grid (~20 relevant icons from DynamicIcon map), preset color palette (8-12 colors matching design system)
- Default categories (isDefault=true) are not deletable — hide delete button
- No icon search, no free-form hex color — preset selections only

### Data patterns (following Phase 5 established pattern)
- Server Actions for all mutations (create, update, delete transaction; create category)
- Zod validation with createTransactionSchema, createCategorySchema (from Phase 3)
- serializeBigInts() before passing to Client Components
- revalidatePath('/movimientos') and revalidatePath('/') after transaction mutations
- revalidatePath('/configuracion') after category mutations
- getCurrentPeriod() auto-creates current period if missing

### Claude's Discretion
- Transaction list row layout details (spacing, responsive adaptation)
- Filter chip styling and animation
- Category form field ordering
- "Más detalles" accordion/collapsible implementation approach
- Empty state design for both transactions and categories
- Whether categories page needs its own loading skeleton or reuses existing
- How to handle the income source dropdown (only shown when type=INCOME)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/ui/Modal.tsx`: Responsive modal/sheet — for quick-add form
- `src/components/ui/DynamicIcon.tsx`: Icon by name — for category grid and transaction list
- `src/components/layout/PageHeader.tsx`: Page header with period selector
- `src/components/layout/PeriodSelector.tsx`: Arrow navigation with URL params
- `src/components/layout/FAB.tsx`: Already wired, opens modal — connect to transaction form
- `src/lib/validators.ts`: `createTransactionSchema`, `createCategorySchema`
- `src/lib/utils.ts`: `formatMoney()`, `toCents()`, `cn()`
- `src/lib/serialize.ts`: `serializeBigInts()`
- `src/lib/constants.ts`: DEFAULT_CATEGORIES, CATEGORY_COLORS, ICON_MAP
- `src/app/ingresos/actions.ts`: Server Action pattern to follow (validate → mutate → revalidate)
- `src/components/income/IncomeSourceCard.tsx`: Inline delete pattern (3s timer) to replicate

### Established Patterns
- Server Component page → Prisma fetch → serializeBigInts → Client Component wrapper
- Server Actions: Zod validate → Prisma mutate → revalidatePath
- TDD: write tests first for utilities and Server Actions
- Inline delete with 3s auto-revert timer (useState + useEffect + setTimeout)
- Period-aware pages use URL search params (?month=X&year=Y)

### Integration Points
- `src/app/movimientos/page.tsx`: Replace placeholder with real transaction list
- `src/app/configuracion/page.tsx`: Replace placeholder with category management
- `src/components/transactions/`: New directory for transaction components
- `src/components/categories/`: New directory for category components
- `src/app/movimientos/actions.ts`: New Server Actions for transactions
- `src/app/configuracion/actions.ts`: New Server Actions for categories
- `src/components/layout/FAB.tsx`: Connect to transaction form modal

</code_context>

<specifics>
## Specific Ideas

- The FAB already exists and opens a modal — it just needs to be connected to the TransactionForm component
- The category grid in the transaction form should show expense categories by default (matching the default expense toggle), and swap to income categories when the user toggles to income
- The "Cargar más" button follows a simple offset-based pattern: ?offset=25 loads the next 25
- URL filter params should be compatible with the existing PeriodSelector's ?month=X&year=Y params

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-categories-transactions*
*Context gathered: 2026-04-05*
