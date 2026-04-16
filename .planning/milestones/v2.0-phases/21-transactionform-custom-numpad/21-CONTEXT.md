# Phase 21: TransactionForm + Custom Numpad - Context

**Gathered:** 2026-04-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the Numpad component, restructure TransactionForm as a bottom sheet with dot-matrix hero amount/toggle pills/category grid/custom numpad/checkmark save, adopt FloatingInput across ALL forms in the app, and implement pixel-dissolve scanline animation on new transaction rows. Highest complexity phase in v2.0.

</domain>

<decisions>
## Implementation Decisions

All decisions locked from STYLE_GUIDE.md, UX_RULES.md, and prior phase contexts.

### COMP-05: Numpad Component
- Custom dark 4x4 grid in src/components/transactions/Numpad.tsx (not ui/ — transaction-specific)
- Layout: rows [1,2,3,backspace], [4,5,6,decimal], [7,8,9,00], [0] or similar 4x4
- IBM Plex Mono (font-mono) for all digit keys
- Backspace icon (Lucide Delete/Backspace)
- 48px minimum touch targets
- Dark surface background (--color-surface-elevated)
- Keys are `<button>` elements, not input
- No focus trap — keyboard-accessible but doesn't trap tab
- Manages amount string state: digit append, decimal handling, backspace, "00" key
- Max 2 decimal places, prevent multiple decimals
- See UX_RULES.md > Section 4.1

### UPDATE-07: TransactionForm Restructure
- Bottom sheet (uses Modal with headerContent prop from Phase 19)
- Header: X close (left), "Nueva Transaccion" (center), "GUARDAR" in chartreuse (right) — via headerContent prop
- Hero amount area: dot-matrix-hero class, large monospaced "$0.00" display
- Toggle pills (TogglePills component from Phase 18): Gasto/Ingreso
- Category selector: 4x2 circular icon grid with 2px chartreuse accent ring on selected
- Custom Numpad (COMP-05) for amount input — replaces native keyboard
- Save behavior: brief checkmark animation (200ms), then sheet closes, then toast
- Optional fields (description, date, payment method) use FloatingInput
- See UX_RULES.md > Section 4.1

### UPDATE-08: FloatingInput Adoption Across All Forms
- Replace standard inputs in: IncomeSourceForm, DebtForm, CategoryForm, BudgetTable, TransactionFilters
- Import FloatingInput from src/components/ui/FloatingInput.tsx (Phase 18)
- All forms get underline-only inputs with floating labels
- Amount inputs use FloatingInput with prefix="$"
- Update existing tests that assert old input patterns

### UPDATE-11: Pixel-Dissolve Animation
- New transaction rows in the list get scanline-reveal animation
- @keyframes scanline-reveal already defined in globals.css (Phase 17)
- Apply via className on newly-added TransactionRow elements
- Disabled when prefers-reduced-motion is active
- See STYLE_GUIDE.md > Identidad Visual > Pixel-Dissolve

### TEST-03: Numpad Tests
- Digit input (tap 1,2,3 → "123")
- Decimal handling (tap 1, decimal, 5 → "1.5")
- Backspace (tap 1,2, backspace → "1")
- Double-zero key ("00" appends two zeros)
- Max decimal places (prevent "1.234")
- Multiple decimal prevention
- Amount string state management

### Claude's Discretion
- Exact Numpad 4x4 key layout arrangement
- Whether Numpad manages its own state or receives value/onChange props
- How to trigger pixel-dissolve on newly-added rows (key prop, state flag, CSS animation)
- Checkmark animation implementation (CSS vs React state)
- Whether to split TransactionForm into sub-components or keep monolithic
- How to handle the category grid circular icons (reuse DynamicIcon or custom circles)

</decisions>

<code_context>
## Existing Code Insights

### Key Files to Modify
- src/components/transactions/TransactionForm.tsx — major restructure (largest change in milestone)
- src/components/transactions/TransactionRow.tsx — pixel-dissolve animation
- src/components/income/IncomeSourceForm.tsx — FloatingInput adoption
- src/components/debts/DebtForm.tsx — FloatingInput adoption
- src/components/categories/CategoryForm.tsx — FloatingInput adoption
- src/components/budgets/BudgetTable.tsx — FloatingInput adoption
- src/components/transactions/TransactionFilters.tsx — FloatingInput adoption

### Primitives Available (Phase 18)
- FloatingInput — underline-only, floating label, error state
- TogglePills — active/inactive pill selector
- StatusDot — (not needed in this phase)
- BatteryBar — (not needed in this phase)

### From Phase 19
- Modal with headerContent prop — ready for custom TransactionForm header
- dot-matrix-hero CSS class — ready for hero amount area

### Established Patterns
- TransactionForm currently uses standard inputs with FAB opening a modal
- Forms use controlled components with local state
- Server Actions for mutations (createTransaction)
- Toast notifications via sonner

</code_context>

<deferred>
## Deferred Ideas

None.

</deferred>

---

*Phase: 21-transactionform-custom-numpad*
*Context gathered: 2026-04-14*
