# Requirements: Centik

**Defined:** 2026-04-16
**Core Value:** A single user can register a financial transaction in under 30 seconds and immediately see how it impacts their budget, debt ratio, and savings rate across all views.

## v2.1 Requirements

Requirements for responsive audit and bug fixes. Every page must work correctly at mobile (320px), tablet (768px), and desktop (1024px+) breakpoints.

### Layout Bugs

- [x] **BUG-01**: DebtCard expansion bug — when one card is clicked to expand, both cards in the grid resize but only the clicked one shows details. Only the expanded card should grow; the other card should remain compact.
- [x] **BUG-02**: Pages missing max-width container — Dashboard, Budget, History pages have no max-width constraint, content stretches to full viewport on wide screens.

### Grid Responsiveness

- [x] **RESP-01**: DebtList grid missing md: breakpoint — jumps from grid-cols-1 to lg:grid-cols-2, skipping tablet. Add md:grid-cols-2.
- [x] **RESP-02**: DebtCard inner metric grid fixed grid-cols-2 on mobile — should be grid-cols-1 sm:grid-cols-2 to stack on narrow screens.
- [x] **RESP-03**: DebtSummaryCards incomplete breakpoints — 3 cards in 2-column layout causes uneven distribution.
- [x] **RESP-04**: KPIGrid, IncomeSummaryCards, Dashboard chart grids missing intermediate breakpoints for tablet optimization.
- [x] **RESP-05**: Form grids not responsive — DebtForm, IncomeSourceForm, CategoryForm, TransactionForm use fixed grid-cols-2/3/4 without responsive prefixes.

### Touch Targets

- [ ] **TOUCH-01**: DebtCard edit/delete action buttons are 24x24px (p-2), below 44px minimum. Fix to min-w-[44px] min-h-[44px].
- [ ] **TOUCH-02**: TransactionRow edit/delete buttons same issue — 24x24px touch targets.
- [ ] **TOUCH-03**: PeriodSelector prev/next navigation buttons use p-1.5 padding — too small for mobile.

### Table Optimization

- [ ] **TABLE-01**: AnnualPivotTable min-w-[900px] forces horizontal scroll on any screen < 900px. No mobile strategy — consider hiding some months or showing fewer columns.
- [ ] **TABLE-02**: BudgetTable input fields in cells need min-height for touch accessibility.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Complete mobile redesign | This is a fix pass, not a redesign. Layout structure stays the same. |
| New breakpoints beyond standard | Use Tailwind defaults: sm(640), md(768), lg(1024), xl(1280) |
| Horizontal scroll elimination | Some tables genuinely need scroll on mobile — just make it usable |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| BUG-01 | Phase 23 | Complete |
| BUG-02 | Phase 23 | Complete |
| RESP-01 | Phase 23 | Complete |
| RESP-02 | Phase 23 | Complete |
| RESP-03 | Phase 23 | Complete |
| RESP-04 | Phase 23 | Complete |
| RESP-05 | Phase 23 | Complete |
| TOUCH-01 | Phase 24 | Pending |
| TOUCH-02 | Phase 24 | Pending |
| TOUCH-03 | Phase 24 | Pending |
| TABLE-01 | Phase 24 | Pending |
| TABLE-02 | Phase 24 | Pending |

**Coverage:**
- v2.1 requirements: 12 total
- Mapped to phases: 12
- Unmapped: 0

---
*Requirements defined: 2026-04-16*
