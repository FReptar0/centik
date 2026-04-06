# Phase 11: Polish + Accessibility - Context

**Gathered:** 2026-04-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Final quality pass across the entire app: add toast notifications for all mutations, ensure every route has skeleton loading states, add empty states with CTAs for all sections, refine form UX (validation on blur, amount input formatting), add visible focus rings and semantic HTML for accessibility, apply tabular-nums to monetary amounts, and add loading.tsx Suspense boundaries where missing.

</domain>

<decisions>
## Implementation Decisions

### User chose: Skip discussion
All decisions derive from UX_RULES.md, STYLE_GUIDE.md, and CLAUDE.md. No custom preferences — Claude has full discretion within documented patterns.

### Toast notifications (from UX_RULES.md 8.1 + CLAUDE.md)
- Library: sonner (lightweight, already referenced in CLAUDE.md)
- Position: top-right desktop, top-center mobile
- Duration: 3 seconds (success), 5 seconds (error)
- Max 3 toasts visible simultaneously
- Include close button (X)
- Animation: slide in from top + fade
- Format: icon + short text confirming action (e.g., "Gasto registrado: Comida -$150.00")
- Add toasts to ALL existing Server Actions (income, transaction, category, debt, budget, close/reopen)

### Skeleton loading states (from UX_RULES.md 5.2)
- Every route must have loading.tsx with skeleton matching page structure
- Most already exist from prior phases — audit and fill gaps
- Pulsing gray placeholders, not spinners
- Component-level skeletons where applicable

### Empty states (from UX_RULES.md 5.1)
- Pattern: large icon (32px) in text-muted + descriptive text + CTA button
- Already implemented in several components — audit for completeness
- Every section that can be empty must have an empty state

### Form UX (from UX_RULES.md 7.1-7.3)
- Validate on blur, then on change after first error
- Error messages below input in text-negative, 12px
- Amount inputs: inputMode="decimal", "$" prefix, right-aligned, comma format on blur
- Don't disable submit button — allow attempt, show all errors
- Labels above inputs, not placeholders

### Accessibility (from UX_RULES.md 9.1-9.3)
- Focus rings: visible on all interactive elements (--shadow-glow outline 2px accent)
- Semantic HTML: nav for sidebar/bottom bar, main for content, section with aria-labelledby
- Tables: proper thead/tbody/th with scope="col"
- Forms: label with htmlFor associated to inputs
- Decorative icons: aria-hidden="true"
- Functional icons: aria-label descriptive
- Progress bars: role="progressbar" with aria-valuenow/min/max
- Toasts: role="status" with aria-live="polite"
- Tab navigation: all controls reachable by keyboard
- Escape closes modals and dropdowns

### Monetary display (from STYLE_GUIDE.md 3.4)
- All monetary amounts use tabular-nums for column alignment
- Amounts always semibold (600) or bold (700)

### Claude's Discretion
- Which empty states are already complete vs need creation
- Toast message wording (Spanish, natural)
- Skeleton design details per page
- Whether to create a shared EmptyState component or keep inline
- Focus ring exact styling (outline vs ring utility)
- Which form fields still need blur validation wiring

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- All Server Actions across 6 pages (ingresos, movimientos, configuracion, deudas, presupuesto, historial) — need toast calls added
- Loading.tsx files already exist for most routes (created in Phase 4+)
- Empty states partially implemented in IncomeSourceList, TransactionList, DebtList
- Modal component handles Escape key
- DynamicIcon for empty state icons
- cn() for conditional class merging

### Established Patterns
- Inline delete with 3s timer (already has implicit feedback — add toast)
- Server Action return type: { success: true } | { error: string } — toast on both
- Loading skeletons: pulsing bg-bg-card-hover rounded placeholders

### Integration Points
- `src/app/layout.tsx`: Add Toaster component from sonner
- Every Server Action caller: add toast.success() / toast.error() after action response
- Every form component: audit blur validation
- Every page: audit semantic HTML
- Every loading.tsx: audit skeleton completeness

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

*Phase: 11-polish-accessibility*
*Context gathered: 2026-04-06*
