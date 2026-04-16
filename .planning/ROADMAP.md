# Roadmap: Centik

## Milestones

- v1.0 MVP - Phases 1-11 (shipped 2026-04-06)
- v1.1 Glyph Finance Design System - Phases 12-16 (shipped 2026-04-06)
- v2.0 Glyph Finance Implementation - Phases 17-22 (shipped 2026-04-16)
- v2.1 Responsive Audit + Bug Fixes - Phases 23-24 (in progress)

## Phases

<details>
<summary>v1.0 MVP (Phases 1-11) - SHIPPED 2026-04-06</summary>

See `.planning/milestones/v1.0-ROADMAP.md` for full phase details.

- [x] **Phase 1-11** — Full MVP: scaffolding, DB, libraries, layout, income, categories+transactions, dashboard, debts, budget, history, polish

</details>

<details>
<summary>v1.1 Glyph Finance Design System (Phases 12-16) - SHIPPED 2026-04-06</summary>

See `.planning/milestones/v1.1-ROADMAP.md` for full phase details.

- [x] **Phase 12-16** — Design system docs: tokens, component specs, signatures, UX patterns, reference sync

</details>

<details>
<summary>v2.0 Glyph Finance Implementation (Phases 17-22) - SHIPPED 2026-04-16</summary>

See `.planning/milestones/v2.0-ROADMAP.md` for full phase details.

- [x] **Phase 17: Token Foundation + Class Migration** — @theme swap, fonts, 37 file class rename
- [x] **Phase 18: New Primitive Components** — BatteryBar, FloatingInput, StatusDot, TogglePills (48 tests)
- [x] **Phase 19: Layout, Nav + Global Updates** — Pill buttons, borderless cards, icon-only nav, bottom sheet modals
- [x] **Phase 20: Feature Component Updates** — MoneyAmount, minimal charts, BatteryBar adoption
- [x] **Phase 21: TransactionForm + Custom Numpad** — Bottom sheet, numpad, pixel-dissolve
- [x] **Phase 22: Visual QA + Accessibility** — Page-by-page audit, WCAG 2.1 AA

</details>

### v2.1 Responsive Audit + Bug Fixes (In Progress)

- [ ] **Phase 23: Layout + Grid Responsiveness** - Fix expansion bug, add max-width containers, add missing responsive breakpoints across all grids
- [ ] **Phase 24: Touch Targets + Table Optimization** - Enforce 44px minimum touch targets on all action buttons, optimize tables for mobile usability

## Phase Details

### Phase 23: Layout + Grid Responsiveness
**Goal**: Every page renders with correct layout at mobile (320px), tablet (768px), and desktop (1024px+) breakpoints with no visual glitches
**Depends on**: Phase 22 (v2.0 complete)
**Requirements**: BUG-01, BUG-02, RESP-01, RESP-02, RESP-03, RESP-04, RESP-05
**Success Criteria** (what must be TRUE):
  1. Expanding one DebtCard on desktop does not resize or shift the adjacent card in the grid
  2. Dashboard, Budget, and History pages constrain content width on screens wider than 1280px instead of stretching edge-to-edge
  3. Debt cards display in a 2-column grid starting at md (768px) breakpoint, not only at lg (1024px)
  4. All form grids (DebtForm, IncomeSourceForm, CategoryForm, TransactionForm) stack fields to single column on mobile and expand to multi-column on tablet+
  5. KPI cards, income summary cards, debt summary cards, and chart grids display with balanced column distribution at every standard breakpoint (sm, md, lg)
**Plans:** 1/2 plans executed

Plans:
- [x] 23-01-PLAN.md — Bug fixes (expansion, max-width) + debt grid responsiveness
- [ ] 23-02-PLAN.md — Dashboard/KPI/income grid breakpoints + form grid responsiveness

### Phase 24: Touch Targets + Table Optimization
**Goal**: Every interactive element meets 44px minimum touch target and tables are usable on mobile without losing critical data visibility
**Depends on**: Phase 23
**Requirements**: TOUCH-01, TOUCH-02, TOUCH-03, TABLE-01, TABLE-02
**Success Criteria** (what must be TRUE):
  1. DebtCard edit/delete action buttons have at least 44x44px tap area on mobile
  2. TransactionRow edit/delete buttons have at least 44x44px tap area on mobile
  3. PeriodSelector previous/next navigation arrows have at least 44x44px tap area on mobile
  4. AnnualPivotTable is readable on a 375px screen without requiring excessive horizontal scrolling (mobile strategy applied)
  5. BudgetTable input cells have sufficient height for comfortable touch input on mobile
**Plans**: TBD

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1-11 | v1.0 | 27/27 | Complete | 2026-04-06 |
| 12-16 | v1.1 | 9/9 | Complete | 2026-04-06 |
| 17-22 | v2.0 | 17/17 | Complete | 2026-04-16 |
| 23. Layout + Grid Responsiveness | 1/2 | In Progress|  | - |
| 24. Touch Targets + Table Optimization | v2.1 | 0/? | Not started | - |
