# Milestones

## v2.1 Responsive Audit + Bug Fixes (Shipped: 2026-04-16)

**Phases completed:** 2 phases (23-24), 4 plans, 12 requirements

**Key accomplishments:**
- Fixed DebtCard expansion bug — `items-start` on grid prevents adjacent card from resizing when one expands
- Added `max-w-7xl` containers to Dashboard, Budget, and History pages for wide-screen content constraint
- Added missing responsive breakpoints across all grids (KPIGrid 3-tier, IncomeSummaryCards sm bridge, debt/chart grids at md)
- Made all form grids responsive (DebtForm, IncomeSourceForm, CategoryForm, TransactionForm stack on mobile)
- Enforced 44px minimum touch targets on DebtCard, TransactionRow, and PeriodSelector action buttons
- Optimized AnnualPivotTable (min-width 900→700px, styled scrollbar hints) and BudgetTable (44px input cells)

---

## v2.0 Glyph Finance Implementation (Shipped: 2026-04-16)

**Phases completed:** 6 phases (17-22), 17 plans, 39 requirements

**Key accomplishments:**
- Complete design token migration — OLED black (#000000) bg, chartreuse (#CCFF00) accent, Satoshi + IBM Plex Mono fonts, 37 component files class-renamed atomically, all shadows removed
- 5 new UI primitives built with TDD — BatteryBar (14 tests), FloatingInput (15 tests), StatusDot (7 tests), TogglePills (12 tests), Numpad (14 tests)
- Icon-only bottom nav with 4px chartreuse dot indicator, StatusDot on period selector and sidebar active items, pill-shaped buttons everywhere with 98% scale press
- Signature TransactionForm bottom sheet — custom dark 4x4 numpad, dot-matrix hero amount, toggle pills, 4x2 circular category grid with accent ring, checkmark save animation
- All charts minimal (no grid, 1.5px strokes, 4px dot endpoints), MoneyAmount shared component with muted "$" prefix adopted across 8 feature components, BatteryBar replacing all smooth progress bars
- Full visual QA pass — every page audited against STYLE_GUIDE.md, WCAG 2.1 AA accessibility audit (ARIA on all new components, focus rings, contrast ratios, reduced-motion), 479 tests passing

---

## v1.1 Glyph Finance Design System (Shipped: 2026-04-06)

**Phases completed:** 5 phases (12-16), 9 plans, 18 tasks

**Key accomplishments:**
- STYLE_GUIDE.md fully rewritten (848 lines) with Glyph Finance tokens — OLED black (#000000), chartreuse (#CCFF00) accent, IBM Plex Mono + Satoshi typography, 5-level type hierarchy
- All 7 component specs updated — pill buttons (radius-full), segmented battery-bar progress (10 segments), minimal charts (no grid, dot endpoints), underline-only inputs with floating labels
- 6 signature visual elements documented with implementation-ready CSS — dot-matrix texture (8x8 SVG), battery-bar, monospaced financial display, pixel-art icon guidance, status dot @keyframes, scanline pixel-dissolve @keyframes
- UX_RULES.md fully updated (410 lines) — icon-only bottom nav with dot indicator, custom dark numpad transaction flow, circular category selector, bottom sheet with drag handle
- CLAUDE.md styling section synchronized — zero contradictions across all three reference documents, zero old-palette hex codes remaining
- Stitch project (Google) used as visual reference for component decisions

---

## v1.0 MVP (Shipped: 2026-04-06)

**Phases completed:** 11 phases, 27 plans, 0 tasks

**Key accomplishments:**
- (none recorded)

---

