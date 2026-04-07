# Requirements: Centik

**Defined:** 2026-04-06
**Core Value:** A single user can register a financial transaction in under 30 seconds and immediately see how it impacts their budget, debt ratio, and savings rate across all views.

## v2.0 Requirements

Requirements for Glyph Finance code implementation. 10/10 quality bar — anything slightly off is fully wrong.

### Token Foundation

- [ ] **TOKEN-01**: globals.css @theme block replaced with all Glyph Finance color tokens (#000000 bg, #CCFF00 accent, desaturated categories, semantic colors)
- [ ] **TOKEN-02**: Satoshi font loaded via next/font/local (Satoshi-Variable.woff2 from Fontshare), IBM Plex Mono via next/font/google, both injected into @theme
- [ ] **TOKEN-03**: @keyframes animations added to @theme (status-pulse 2.5s, scanline-reveal 500ms steps(12,end)) with prefers-reduced-motion override
- [ ] **TOKEN-04**: All shadow tokens removed (--shadow-sm/md/lg/glow), focus rings use solid outline only
- [ ] **TOKEN-05**: Radius scale updated (--radius-sm 8px, --radius-md 12px, --radius-lg 16px, --radius-xl 24px, --radius-full 9999px)

### Class Migration

- [ ] **MIGRATE-01**: All 36+ component files updated with new Tailwind utility class names matching renamed tokens (bg-primary → bg, bg-card → surface-elevated, text-muted → text-tertiary, etc.)
- [ ] **MIGRATE-02**: constants.ts updated with new hex values for all color constants
- [ ] **MIGRATE-03**: All existing tests updated to assert new token names, class names, and hex values (zero test failures after migration)

### New Components

- [ ] **COMP-01**: BatteryBar component — 10 rectangular segments, 2px gaps, traffic-light colors (chartreuse <80%, orange 80-99%, red 100%+), ARIA progressbar attributes
- [ ] **COMP-02**: FloatingInput component — underline-only, transparent background, floating label (placeholder → uppercase Label style on focus), chartreuse focus underline, error state
- [ ] **COMP-03**: StatusDot component — 4px solid chartreuse circle, CSS animation (status-pulse), configurable placement
- [ ] **COMP-04**: TogglePills component — active (chartreuse fill, black text), inactive (ghost), used for Expense/Income and period selectors
- [ ] **COMP-05**: Numpad component — custom dark 4x4 grid, monospaced IBM Plex Mono numbers, backspace icon, decimal/00 keys, 48px min touch targets

### Component Updates

- [ ] **UPDATE-01**: All buttons converted to pill shape (border-radius: 9999px), danger uses #FF3333, secondary keeps subtle border, 98% scale press interaction
- [ ] **UPDATE-02**: All cards use borderless elevation (no visible borders), stacked cards use 1px #222222 separator, hero cards get dot-matrix texture background
- [ ] **UPDATE-03**: All progress bars replaced with BatteryBar component across budget, debt utilization, and debt payoff views
- [ ] **UPDATE-04**: All charts updated — no grid lines, 1.5px stroke, 4px dot endpoints, hardcoded CHART_COLORS updated to Glyph Finance hex values
- [ ] **UPDATE-05**: Bottom navigation converted to icon-only (no text labels), 4px chartreuse dot indicator 8px below active icon, inactive icons in --color-text-secondary
- [ ] **UPDATE-06**: Mobile modals use bottom sheet pattern (85vh, drag handle, top-corner radius), desktop modals centered with --radius-xl
- [ ] **UPDATE-07**: Transaction form restructured — bottom sheet with dot-matrix hero amount, toggle pills, circular 4x2 category grid with accent ring, custom numpad, checkmark save animation
- [ ] **UPDATE-08**: All inputs across app replaced with FloatingInput (underline-only, floating labels)
- [ ] **UPDATE-09**: All badges converted to pill shape (radius-full), semantic color variants
- [ ] **UPDATE-10**: Dot-matrix texture implemented as CSS pseudo-element on hero cards (8x8 SVG data URI, 40% opacity)
- [ ] **UPDATE-11**: Pixel-dissolve scanline animation implemented for data refresh moments (@keyframes scanline-reveal, clip-path inset, steps(12,end))
- [ ] **UPDATE-12**: StatusDot placed on current period indicator and nav active state
- [ ] **UPDATE-13**: DynamicIcon default strokeWidth set to 1.5px, shape-rendering: crispEdges for pixel-aligned rendering
- [ ] **UPDATE-14**: All monetary amounts display with muted smaller "$" in --color-text-tertiary, IBM Plex Mono, color-coded by direction

### Visual QA

- [ ] **QA-01**: Dashboard page matches STYLE_GUIDE.md — KPIs, charts, recent transactions, hero balance card with dot-matrix
- [ ] **QA-02**: Transactions page matches — list with new tokens, filters, FAB triggers bottom sheet with numpad
- [ ] **QA-03**: Debts page matches — cards with battery-bar utilization, inline editing, metrics
- [ ] **QA-04**: Budget page matches — battery-bar progress per category, traffic-light colors, configuration table
- [ ] **QA-05**: Income page matches — source cards, frequency display, monospaced amounts
- [ ] **QA-06**: History page matches — pivot table with new tokens, period close flow
- [ ] **QA-07**: Navigation matches — icon-only bottom tabs with dot, sidebar with new tokens, FAB styling
- [ ] **QA-08**: All pages WCAG 2.1 AA accessible — contrast ratios verified, focus rings visible, screen reader attributes on new components

### Test Updates

- [ ] **TEST-01**: All existing unit tests pass with new design tokens (394 tests, zero failures)
- [ ] **TEST-02**: New unit tests for BatteryBar (segments, colors, overflow, ARIA), FloatingInput (states, validation, floating behavior), TogglePills (active/inactive, callback)
- [ ] **TEST-03**: New unit tests for Numpad (digit input, decimal, backspace, 00, max amount)
- [ ] **TEST-04**: New unit tests for StatusDot (renders, animation class, reduced-motion)

## v3.0 Requirements

Deferred to future milestones.

### Features

- **FEAT-01**: System of value units (UDI, UMA, USD) with configurable rate providers
- **FEAT-02**: Asset/investment tracking (PPR, CETES, funds) with MXN conversion
- **FEAT-03**: Authentication (NextAuth/Clerk) for multi-user support
- **FEAT-04**: PWA with offline support

## Out of Scope

| Feature | Reason |
|---------|--------|
| Light mode | Dark-only is the design decision — OLED black reinforces this |
| Custom icon font | Using Lucide React with pixel-art styling guidance |
| Storybook / component playground | Not needed for MVP — visual QA against STYLE_GUIDE.md is sufficient |
| Gradient backgrounds | Glyph Finance prohibits gradients on surfaces |
| Smooth progress bars | Replaced by segmented battery-bar everywhere |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| TOKEN-01 | — | Pending |
| TOKEN-02 | — | Pending |
| TOKEN-03 | — | Pending |
| TOKEN-04 | — | Pending |
| TOKEN-05 | — | Pending |
| MIGRATE-01 | — | Pending |
| MIGRATE-02 | — | Pending |
| MIGRATE-03 | — | Pending |
| COMP-01 | — | Pending |
| COMP-02 | — | Pending |
| COMP-03 | — | Pending |
| COMP-04 | — | Pending |
| COMP-05 | — | Pending |
| UPDATE-01 | — | Pending |
| UPDATE-02 | — | Pending |
| UPDATE-03 | — | Pending |
| UPDATE-04 | — | Pending |
| UPDATE-05 | — | Pending |
| UPDATE-06 | — | Pending |
| UPDATE-07 | — | Pending |
| UPDATE-08 | — | Pending |
| UPDATE-09 | — | Pending |
| UPDATE-10 | — | Pending |
| UPDATE-11 | — | Pending |
| UPDATE-12 | — | Pending |
| UPDATE-13 | — | Pending |
| UPDATE-14 | — | Pending |
| QA-01 | — | Pending |
| QA-02 | — | Pending |
| QA-03 | — | Pending |
| QA-04 | — | Pending |
| QA-05 | — | Pending |
| QA-06 | — | Pending |
| QA-07 | — | Pending |
| QA-08 | — | Pending |
| TEST-01 | — | Pending |
| TEST-02 | — | Pending |
| TEST-03 | — | Pending |
| TEST-04 | — | Pending |

**Coverage:**
- v2.0 requirements: 39 total
- Mapped to phases: 0
- Unmapped: 39 (awaiting roadmap)

---
*Requirements defined: 2026-04-06*
*Last updated: 2026-04-06 after initial definition*
