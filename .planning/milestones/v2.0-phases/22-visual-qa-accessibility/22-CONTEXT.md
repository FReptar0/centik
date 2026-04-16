# Phase 22: Visual QA + Accessibility - Context

**Gathered:** 2026-04-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Final visual QA pass: verify every page matches STYLE_GUIDE.md specs exactly, fix any visual discrepancies found, audit WCAG 2.1 AA compliance (contrast ratios, focus rings, ARIA attributes, screen reader support). This is the "10/10 quality bar" gate — anything slightly off gets fixed.

</domain>

<decisions>
## Implementation Decisions

### QA-01: Dashboard
- Hero KPICard with dot-matrix texture
- Minimal charts (no grid, dots, thin strokes)
- MoneyAmount on all values
- BatteryBar for budget progress
- Recent transactions with proper styling

### QA-02: Transactions Page
- Transaction list with Glyph Finance tokens
- Filters with FloatingInput
- FAB triggers bottom sheet with Numpad
- Pixel-dissolve on new rows

### QA-03: Debts Page
- DebtCards with BatteryBar utilization
- Inline balance editing
- MoneyAmount on all metrics

### QA-04: Budget Page
- BatteryBar progress per category with traffic-light
- FloatingInput in configuration table
- MoneyAmount on budget/spent values

### QA-05: Income Page
- IncomeSourceCards with MoneyAmount
- FloatingInput in forms

### QA-06: History Page
- Pivot table with new tokens
- Period close flow styling

### QA-07: Navigation
- Icon-only bottom tabs with dot indicator
- Sidebar with StatusDot
- FAB pill-shaped with chartreuse

### QA-08: WCAG 2.1 AA
- Contrast ratios verified (E8E8E8 on 000000 = 17.4:1, CCFF00 on 000000 = 14.4:1, 999999 on 000000 = 5.8:1)
- Focus rings visible (2px solid accent outline)
- ARIA attributes on BatteryBar (progressbar), TogglePills (radiogroup), Numpad (buttons)
- Screen reader attributes on new components
- prefers-reduced-motion disables scanline animation

### Approach
- Start dev server, navigate each page, compare against STYLE_GUIDE.md
- Fix any visual discrepancies found (wrong colors, spacing, missing patterns)
- Run automated contrast checks where possible
- Verify all new components have proper ARIA attributes
- Final `npm run build` + `npm test` must pass

### Claude's Discretion
- Order of page verification
- Whether to create a QA checklist file or just fix and verify inline
- Level of detail in contrast ratio documentation
- Whether to use browser DevTools screenshots or code-level verification

</decisions>

<code_context>
## Key Reference Documents
- STYLE_GUIDE.md — complete design token and component spec reference
- UX_RULES.md — interaction patterns and navigation spec
- CLAUDE.md — styling section with Glyph Finance tokens

## Pages to Verify
- / (Dashboard)
- /movimientos (Transactions)
- /deudas (Debts)
- /presupuesto (Budget)
- /ingresos (Income)
- /historial (History)
- /configuracion (Settings/Categories)

</code_context>

<deferred>
## Deferred Ideas

None.

</deferred>

---

*Phase: 22-visual-qa-accessibility*
*Context gathered: 2026-04-16*
