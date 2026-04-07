# Roadmap: Centik

## Milestones

- v1.0 MVP - Phases 1-11 (shipped 2026-04-06)
- v1.1 Glyph Finance Design System - Phases 12-16 (shipped 2026-04-06)
- v2.0 Glyph Finance Implementation - Phases 17-22 (in progress)

## Phases

<details>
<summary>v1.0 MVP (Phases 1-11) - SHIPPED 2026-04-06</summary>

See `.planning/milestones/v1.0-ROADMAP.md` for full phase details.

- [x] **Phase 1: Infrastructure + Scaffolding** - Reconcile actual installed versions, configure toolchain, Docker, passing build
- [x] **Phase 2: Database Schema + Seed** - Prisma schema for all entities, migrations, idempotent seed
- [x] **Phase 3: Foundation Libraries** - Utilities, serializer, Zod validators, constants, types at 100% coverage
- [x] **Phase 4: Layout Shell** - Root layout with dark theme, sidebar, bottom tabs, FAB, period selector
- [x] **Phase 5: Income Sources** - Full CRUD, validates Server Component + Server Action pattern
- [x] **Phase 6: Categories + Transactions** - Category management, transaction quick-add, list with filters
- [x] **Phase 7: Dashboard** - 6 KPI cards, 3 Recharts charts, recent transactions
- [x] **Phase 8: Debts** - Credit card and loan tracking with metrics, inline balance editing
- [x] **Phase 9: Budget Configuration + Progress** - Quincenal budgets, progress bars, traffic light
- [x] **Phase 10: History + Period Close** - Annual pivot table, atomic period close, reopen
- [x] **Phase 11: Polish + Accessibility** - Toast notifications, loading states, empty states, focus rings, a11y

</details>

<details>
<summary>v1.1 Glyph Finance Design System (Phases 12-16) - SHIPPED 2026-04-06</summary>

See `.planning/milestones/v1.1-ROADMAP.md` for full phase details.

- [x] **Phase 12: Design Tokens** - STYLE_GUIDE.md rewritten with Glyph Finance color palette, typography, spacing, elevation, Tailwind config
- [x] **Phase 13: Component Specifications** - All component specs updated (pill buttons, battery-bar, minimal charts, underline inputs)
- [x] **Phase 14: Signature Visual Identity** - 6 visual signatures documented with CSS implementations (dot-matrix, status dot, scanline dissolve)
- [x] **Phase 15: UX Interaction Patterns** - UX_RULES.md updated (icon-only nav, custom numpad, floating labels, full old-token sweep)
- [x] **Phase 16: Reference Synchronization** - CLAUDE.md styling section synchronized, zero contradictions

</details>

### v2.0 Glyph Finance Implementation (Phases 17-22)

**Milestone Goal:** Implement the Glyph Finance design system in working code. Every token, component, animation, and interaction from STYLE_GUIDE.md and UX_RULES.md faithfully translated. 10/10 quality bar.

- [x] **Phase 17: Token Foundation + Class Migration** - Replace @theme tokens, swap fonts, rename all utility classes across 36+ files, update constants and tests atomically (completed 2026-04-07)
- [ ] **Phase 18: New Primitive Components** - Build and test BatteryBar, FloatingInput, StatusDot, TogglePills in isolation
- [ ] **Phase 19: Layout, Navigation + Global Component Updates** - Pill buttons, borderless cards, icon-only nav, bottom sheet modals, dot-matrix, StatusDot placement, icon tuning
- [ ] **Phase 20: Feature Component Updates** - BatteryBar replacing progress bars, chart visual overhaul, monetary amount display styling
- [ ] **Phase 21: TransactionForm + Custom Numpad** - Bottom sheet transaction flow with custom numpad, FloatingInput adoption across all forms, pixel-dissolve animation
- [ ] **Phase 22: Visual QA + Accessibility** - Page-by-page spec verification, WCAG 2.1 AA audit, focus rings, contrast ratios

## Phase Details

### Phase 17: Token Foundation + Class Migration
**Goal**: The entire app renders with the Glyph Finance visual identity -- OLED black background, chartreuse accent, Satoshi + IBM Plex Mono typography, correct radius scale, no shadows -- with zero broken styles and all 394 tests passing
**Depends on**: Phase 16 (design system docs complete)
**Requirements**: TOKEN-01, TOKEN-02, TOKEN-03, TOKEN-04, TOKEN-05, MIGRATE-01, MIGRATE-02, MIGRATE-03, TEST-01
**Success Criteria** (what must be TRUE):
  1. App background is pure OLED black (#000000), cards use #111111 surface, and chartreuse (#CCFF00) appears as the accent color on interactive elements
  2. All text renders in Satoshi (headings/body) and IBM Plex Mono (financial numbers), with no fallback flash or DM Sans/JetBrains Mono visible anywhere
  3. No shadow appears anywhere in the app -- FAB, modals, cards, and filters all use background-shift elevation only
  4. All 394+ existing tests pass with updated token names, class names, and hex values (zero failures, zero skipped)
  5. `npm run build` completes with zero errors and zero warnings
**Plans**: 3 plans

Plans:
- [ ] 17-01-PLAN.md -- Token foundation: replace @theme block, swap fonts, add animations
- [ ] 17-02-PLAN.md -- Constants + chart colors + test hex value updates
- [ ] 17-03-PLAN.md -- Class name migration across 36+ component files

### Phase 18: New Primitive Components
**Goal**: Four reusable UI primitives (BatteryBar, FloatingInput, StatusDot, TogglePills) exist in `src/components/ui/`, fully tested in isolation, ready for adoption by feature components
**Depends on**: Phase 17 (tokens must be stable for correct colors and font references)
**Requirements**: COMP-01, COMP-02, COMP-03, COMP-04, TEST-02, TEST-04
**Success Criteria** (what must be TRUE):
  1. BatteryBar renders 10 rectangular segments with 2px gaps, fills proportionally, and switches to orange at 80% and red at 100%+ -- with `role="progressbar"` and correct `aria-valuenow`/`aria-valuemax`
  2. FloatingInput renders as underline-only with transparent background; label floats from placeholder position to uppercase label on focus/fill; chartreuse underline on focus; real `<label htmlFor>` for accessibility
  3. StatusDot renders as a 4px chartreuse circle with a continuous 2.5s pulse animation, and the animation is disabled when `prefers-reduced-motion` is active
  4. TogglePills renders a row of pill-shaped options where active state shows chartreuse fill with black text, and inactive shows ghost styling -- clicking triggers the `onChange` callback
  5. All new component tests pass (segments, colors, overflow, ARIA for BatteryBar; states, validation, floating behavior for FloatingInput; render, animation, reduced-motion for StatusDot; active/inactive, callback for TogglePills)
**Plans**: 3 plans

Plans:
- [ ] 18-01-PLAN.md -- BatteryBar segmented progress bar component + tests
- [ ] 18-02-PLAN.md -- FloatingInput underline input with floating labels + tests
- [ ] 18-03-PLAN.md -- StatusDot pulsing indicator + TogglePills selector + tests

### Phase 19: Layout, Navigation + Global Component Updates
**Goal**: The app frame (navigation, modals, cards, buttons, badges, icons) matches Glyph Finance specs on every screen -- pill buttons, borderless cards, icon-only bottom nav with status dot, bottom sheet modals, dot-matrix texture on hero cards
**Depends on**: Phase 18 (StatusDot, TogglePills must exist)
**Requirements**: UPDATE-01, UPDATE-02, UPDATE-05, UPDATE-06, UPDATE-09, UPDATE-10, UPDATE-12, UPDATE-13
**Success Criteria** (what must be TRUE):
  1. Every button in the app is pill-shaped (border-radius: 9999px) with 98% scale press interaction; danger buttons use #FF3333; secondary buttons have subtle border
  2. Bottom navigation shows icons only (no text labels) with a 4px chartreuse dot indicator 8px below the active icon; inactive icons use --color-text-secondary
  3. Mobile modals appear as bottom sheets (85vh, drag handle visual, top-corner radius); desktop modals are centered with --radius-xl; no visible borders or shadows on either
  4. Cards are borderless with background-shift elevation; stacked cards use 1px #222222 separator; hero cards (dashboard balance, analytics) show dot-matrix SVG texture at 40% opacity
  5. DynamicIcon renders at strokeWidth 1.5px with crispEdges shape-rendering; StatusDot is placed on current period indicator and nav active state
**Plans**: TBD

Plans:
- [ ] 19-01: TBD
- [ ] 19-02: TBD
- [ ] 19-03: TBD

### Phase 20: Feature Component Updates
**Goal**: All data-displaying feature components (progress bars, charts, monetary amounts) use Glyph Finance visual treatments -- segmented battery-bar progress, minimal charts, and styled monetary display
**Depends on**: Phase 18 (BatteryBar must exist), Phase 19 (card structure must be stable)
**Requirements**: UPDATE-03, UPDATE-04, UPDATE-14
**Success Criteria** (what must be TRUE):
  1. All smooth progress bars are replaced with BatteryBar in budget progress (threshold 80/100), debt utilization (threshold 31/71), and debt payoff views -- no smooth bars remain anywhere in the app
  2. All three charts (TrendAreaChart, ExpenseDonutChart, BudgetBarChart) render with no grid lines, 1.5px stroke, 4px dot endpoints, and Glyph Finance hex colors hardcoded in CHART_COLORS constants
  3. All monetary amounts display with a muted smaller "$" prefix in --color-text-tertiary, IBM Plex Mono font, and are color-coded by direction (green for income, red for expense)
**Plans**: TBD

Plans:
- [ ] 20-01: TBD
- [ ] 20-02: TBD

### Phase 21: TransactionForm + Custom Numpad
**Goal**: The transaction creation flow uses a bottom sheet with custom numpad, dot-matrix hero amount display, toggle pills for type selection, circular category grid, and FloatingInput for optional fields -- delivering the signature Glyph Finance interaction in under 30 seconds
**Depends on**: Phase 18 (FloatingInput, TogglePills), Phase 19 (Modal bottom sheet pattern)
**Requirements**: COMP-05, UPDATE-07, UPDATE-08, UPDATE-11, TEST-03
**Success Criteria** (what must be TRUE):
  1. Transaction bottom sheet shows dot-matrix hero zone with large monospaced amount, toggle pills for Gasto/Ingreso, circular 4x2 category grid with accent ring selection, and custom numpad -- all without using the OS keyboard for amount entry
  2. Custom numpad renders as a 4x4 grid with IBM Plex Mono digits, decimal key, 00 key, and backspace icon; all keys are `<button type="button">` elements with 48px minimum touch targets; Tab navigation works through the entire bottom sheet without trapping focus
  3. All input fields across the entire app (not just TransactionForm) use FloatingInput with underline-only styling and floating labels -- no box-style inputs remain
  4. Pixel-dissolve scanline animation plays on newly added transaction rows using `steps(12, end)` timing, and is disabled when `prefers-reduced-motion` is active
  5. Numpad unit tests pass covering digit input, decimal handling, backspace, 00 key, and max amount boundary
**Plans**: TBD

Plans:
- [ ] 21-01: TBD
- [ ] 21-02: TBD
- [ ] 21-03: TBD

### Phase 22: Visual QA + Accessibility
**Goal**: Every page in the app matches STYLE_GUIDE.md specifications exactly, passes WCAG 2.1 AA accessibility standards, and the Quality Loop succeeds with zero failures
**Depends on**: Phase 21 (all visual changes complete)
**Requirements**: QA-01, QA-02, QA-03, QA-04, QA-05, QA-06, QA-07, QA-08
**Success Criteria** (what must be TRUE):
  1. Dashboard page renders with Glyph Finance tokens -- hero balance card with dot-matrix texture, KPI cards with monospaced values, minimal charts, recent transactions with styled amounts
  2. Transactions page renders with new token palette, filter pills, and FAB triggers the bottom sheet with custom numpad (not OS keyboard for amount)
  3. Debts page shows battery-bar utilization on credit cards, battery-bar payoff progress on loans, correct threshold colors, and inline editing works with FloatingInput
  4. Budget page shows battery-bar progress per category with traffic-light colors (chartreuse/orange/red), configuration table with FloatingInput, and no smooth progress bars
  5. All pages pass WCAG 2.1 AA -- contrast ratios meet 4.5:1 for normal text and 3:1 for large text, focus rings are visible chartreuse outlines on every interactive element, `prefers-reduced-motion` disables all animations, and all new components have correct ARIA attributes
**Plans**: TBD

Plans:
- [ ] 22-01: TBD
- [ ] 22-02: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 17 -> 18 -> 19 -> 20 -> 21 -> 22

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1-11 | v1.0 | 27/27 | Complete | 2026-04-06 |
| 12-16 | v1.1 | 9/9 | Complete | 2026-04-06 |
| 17. Token Foundation + Class Migration | 3/3 | Complete    | 2026-04-07 | - |
| 18. New Primitive Components | v2.0 | 0/3 | Planning | - |
| 19. Layout, Navigation + Global Updates | v2.0 | 0/TBD | Not started | - |
| 20. Feature Component Updates | v2.0 | 0/TBD | Not started | - |
| 21. TransactionForm + Custom Numpad | v2.0 | 0/TBD | Not started | - |
| 22. Visual QA + Accessibility | v2.0 | 0/TBD | Not started | - |
