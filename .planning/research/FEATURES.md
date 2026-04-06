# Feature Research

**Domain:** Glyph Finance design system implementation in existing Next.js 16 finance app
**Researched:** 2026-04-06
**Confidence:** HIGH (authoritative source: STYLE_GUIDE.md + UX_RULES.md already written by project owner)

---

## Context: What This Milestone Is

This is NOT a new product. All business logic, data, and pages exist and work. This milestone replaces the v1.0 visual skin (cyan/dark CLAUDE.md theme) with the Glyph Finance design system specified in STYLE_GUIDE.md and UX_RULES.md. Every feature below is a design implementation task, not a business logic task.

The quality bar is explicitly "10/10 — anything slightly off is fully wrong."

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features that must land correctly for the milestone to be considered done. Missing or broken = milestone fails.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| @theme token swap in globals.css | Every visual is downstream of tokens — wrong tokens = wrong everything | LOW | Replace all v1.0 tokens (#0a0f1a, #22d3ee, etc.) with Glyph Finance tokens (#000000, #CCFF00, etc.). Radius scale changes (sm:8, md:12, lg:16, xl:24, full). Shadows deleted entirely. |
| Satoshi + IBM Plex Mono via next/font | Typography is 50% of the design identity — wrong fonts = wrong feel | LOW | Satoshi is not a Google Font (must use Fontsource or local). IBM Plex Mono is on Google Fonts. Both loaded via next/font. CSS vars exposed as `--font-sans` and `--font-mono`. |
| Pill-shaped buttons everywhere | Primary visual differentiator — rounded rects feel like v1.0 | LOW | `border-radius: 9999px` on all Button component variants. Scale: sm(32px h, 6/12px padding), md(40px h, 10/18px), lg(48px h, 12/24px). Press state: `scale(0.98)` transform. |
| Underline-only inputs + floating labels | All forms use this pattern — box inputs are immediately wrong | MEDIUM | Remove box/background. Keep only 1px bottom border (`--color-border-divider`). Label positioned absolute, starts at body position (14px, `--color-text-tertiary`), on focus/filled: translates up + scales to 12px uppercase tracking-wider `--color-text-secondary`. 200ms ease transition. No horizontal padding. |
| Segmented battery-bar progress | Replaces ALL smooth progress bars (budgets page, debt cards) | MEDIUM | Exactly 10 rectangular segments, 2px gaps, no border-radius on segments. Traffic-light coloring: <80% chartreuse, 80-99% warning, 100%+ negative (all 10 red + "+N%" overflow text). Needs `role="progressbar"` aria attrs. |
| Icon-only bottom nav with dot indicator | Tab bar without text labels is spec'd explicitly | LOW | Remove text labels from MobileNav. Active state: 4px chartreuse dot centered 8px below icon, animated with `status-pulse`. Icon does NOT change color. Dot communicates active, not icon color. |
| Minimal charts (no grid, thin stroke, dot endpoints) | Charts are visible on dashboard — grid lines and thick strokes are immediately wrong | MEDIUM | Remove `CartesianGrid` from all Recharts components. Stroke 1.5px. 4px solid dot at each data point (`activeDot` and regular `dot` props). Area fill: 10-15% opacity gradient to 0. Bar charts: no border-radius on tops, ~60% width. Donut: innerRadius ~70% of outerRadius. |
| OLED black body background | Background is the first thing visible — v1.0 #0a0f1a is obviously wrong on OLED | LOW | `background-color: #000000` on body. All `--color-bg-primary` references updated to the new `--color-bg` token (#000000). |
| Chartreuse FAB button | FAB is the most-tapped element — must match spec (chartreuse bg, black icon) | LOW | FAB: 48px circle, `background: #CCFF00`, icon/text `#000000`. Already exists, needs token swap and size confirmation. |

### Differentiators (Competitive Advantage)

Features that create the "10/10" feeling and distinguish Glyph Finance from any generic dark theme.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Dot-matrix texture on hero cards | Signature identity marker — makes dashboard balance card feel premium | MEDIUM | SVG background-image pattern (8x8px grid, 0.75px circles at 40% opacity). Applied via `::before` pseudo-element on hero cards ONLY: dashboard balance card and analytics comparison card. Not on every card. |
| Status dot animation (`status-pulse`) | Communicates "live period" without text — precision interaction detail | LOW | 4px chartreuse circle, `animation: status-pulse 2.5s ease-in-out infinite`, opacity 1 to 0.5 + scale 1 to 0.85. Used in: period indicator header, active tab in bottom nav. Max 2-3 dots visible on any screen. |
| Pixel-dissolve scanline animation | New transaction appears with CRT-scan reveal — strongest identity moment | MEDIUM | `clip-path: inset(0 0 100% 0)` to `inset(0 0 0% 0)`, 500ms, `steps(12, end)` (NOT ease — stepped for mechanical feel). Applied to new transaction row on TransactionList, KPI cards on data refresh. `prefers-reduced-motion` skip required. |
| Custom dark numpad | Transaction bottom sheet uses custom numpad instead of OS keyboard | HIGH | 4x4 grid layout. Row 1: 1,2,3,backspace (Lucide `Delete`). Row 2: 4,5,6,decimal. Row 3: 7,8,9,00. Row 4: empty,0,empty,empty. Keys: 48px min touch target, `--color-surface-elevated`, IBM Plex Mono 20px. Press: `--color-surface-hover` 100ms transition. Complex state: handles decimal input, double-zero, backspace correctly without native `<input>`. |
| Silenced "$" prefix in financial display | "$" smaller + tertiary color makes the number the visual focus | LOW | Wrap "$" in `<span>` with smaller font-size and `--color-text-tertiary`. Digits in primary or semantic color. Applies to KPI cards, transaction list amounts, debt balances. |
| Toggle pills for binary selects | Expense/Income selector uses pill buttons not a dropdown | LOW | Two pill buttons in a row, 4px gap. Active: chartreuse bg + black text. Inactive: transparent + secondary text. Already partially exists in transaction form, needs verification. |
| Bottom sheet drag handle | iOS-native feel for mobile transaction form affordance | LOW | 40px wide, 4px tall, `--color-border-divider`, border-radius 2px, centered at top of sheet with 12px margin. Visual only — no drag gesture implementation required. |
| Desaturated category colors | Category icons use muted palette not vibrant v1.0 colors | LOW | Replace v1.0 category colors with Glyph Finance desaturated palette: Comida #C88A5A, Servicios #7A9EC4, Entretenimiento #9B89C4, Suscripciones #C48AA3, Transporte #C4A84E, Otros #8A9099. Update constants file and seed data. |
| Elevation via background shift only | No shadows = cleaner OLED aesthetic | LOW | Remove all `shadow-*` utilities and `--shadow-*` token references from every component. Cards: surface-elevated (#141414) on bg (#000000) provides visual separation without shadows. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Drag-to-dismiss bottom sheet (gesture) | Native iOS feel | Requires pointer event tracking, velocity calculation, complex state. 5x complexity for marginal gain. Risk of conflicting with scroll. | Static drag handle visual communicates affordance. Tap X or tap overlay to close. Implement gesture as v2.x polish. |
| Smooth easing on pixel-dissolve | "Looks better" | Destroys the mechanical CRT feel that is the point of the animation. Smooth easing makes it generic. | Keep `steps(12, end)` exactly as specified. |
| Border-radius on battery-bar segments | "Looks more modern" | Segments must be rectangular flat. Rounded corners make it look like a regular progress bar. | No border-radius on segments. Use exact spec. |
| CSS blur glow on status dot | "More visible" | Contradicts the philosophy: no shadows, no glow. A glow on the status dot immediately looks wrong in the OLED context. | Solid dot only. Pulse animation provides life without glow. |
| System keyboard for numpad | Simpler implementation | OS numpad keyboard shows on transaction form, shifts layout, shows unwanted keys, breaks the immersive bottom-sheet UX. | Custom numpad as specified. It is complex but load-bearing for the <30s transaction flow. |
| Grid lines "just for reference" | "Users might need scale" | Explicitly removed from spec. Any grid line breaks the minimal aesthetic. | Axis labels with start/end dates only. Values in tooltip on hover/tap. |
| Light mode support | "Accessibility" | Explicitly out of scope. OLED black is a design decision. Light mode requires duplicating the entire token set. | Ensure WCAG AA contrast ratios (already verified in STYLE_GUIDE.md). |
| Staggered list animations (cascade) | "Polished entry" | Delays data visibility, increases perceived load time, creates jitter on fast connections. | Pixel-dissolve on individual new items only (single items entering, not list-load cascades). |

---

## Feature Dependencies

```
@theme token swap (globals.css)
    └──enables──> All component visual fixes
                      └──enables──> Visual QA pass

Satoshi + IBM Plex Mono (next/font)
    └──enables──> Typography scale implementation
                      └──enables──> Floating labels (label transforms depend on correct font size)
                      └──enables──> Numpad display (IBM Plex Mono 20px keys)

Underline inputs + floating labels
    └──required for──> Custom numpad (optional fields section uses underline inputs)
    └──required for──> Transaction form bottom sheet (all optional fields)
    └──required for──> All other form modals (income, debt, category)

Battery-bar component
    └──replaces──> Existing smooth bars in BudgetProgressList.tsx
    └──replaces──> Existing progress bars in DebtCard components
    └──requires──> Correct @theme tokens (chartreuse, warning, negative colors)

Status dot animation (status-pulse CSS keyframe)
    └──required by──> Icon-only bottom nav (dot indicator)
    └──required by──> Period selector header (live period indicator)

Pixel-dissolve animation (scanline-reveal CSS keyframe)
    └──applied to──> TransactionRow (new item entry)
    └──applied to──> KPI card values (on data refresh)

Custom numpad
    └──requires──> IBM Plex Mono (typography)
    └──requires──> Underline inputs (optional fields below numpad)
    └──lives in──> Transaction bottom sheet (FAB → sheet → numpad)
    └──complex dependency──> Amount state management (controls input value externally, no native keyboard)

Dot-matrix texture
    └──applied to──> Dashboard hero balance card
    └──requires──> Correct surface-elevated token (#141414) as base
```

### Dependency Notes

- **Token swap must happen first:** Everything else depends on correct CSS custom properties. Doing component work before tokens are correct means every component needs touching twice.
- **Fonts must be loaded before floating label work:** The label transform calculations (scale + translate) depend on actual rendered font metrics. Wrong font = incorrect positioning at pixel level.
- **Battery-bar is used in two distinct places:** BudgetProgressList (budgets page) and debt cards (credit utilization + DTI). Both need updating together or the QA pass will find one half done.
- **Numpad conflicts with amount input state:** The existing TransactionForm likely uses a controlled `<input>` for amount. The numpad replaces the native keyboard, so amount state must be managed via custom handlers (append digit, handle backspace, handle decimal), not standard `onChange`. This is the deepest refactor in the milestone.

---

## MVP Definition

This is a milestone, not a greenfield product. The "MVP" for this milestone = minimum needed to ship v2.0.

### Launch With (v2.0 required)

- [ ] @theme token swap — foundation for everything else
- [ ] Satoshi + IBM Plex Mono fonts — 50% of the identity is typography
- [ ] Pill buttons everywhere — most visible component change
- [ ] Underline inputs + floating labels — all forms use inputs
- [ ] Battery-bar progress — replaces visible progress bars on budgets + debts
- [ ] Icon-only bottom nav + status dot — mobile nav is broken without it
- [ ] Minimal charts (remove grid, thin stroke, dot endpoints) — dashboard charts are immediately visible
- [ ] OLED black + desaturated category colors — token-level, automatic once tokens are right
- [ ] No shadows anywhere — remove shadow-* utilities from all components

### Add After Core Is Working (v2.x polish)

- [ ] Dot-matrix texture on hero cards — premium detail, not load-bearing
- [ ] Pixel-dissolve animation on new transactions — enhancement to existing flow
- [ ] Custom numpad in transaction bottom sheet — HIGH complexity, can ship with OS keyboard temporarily
- [ ] Status dot on period header — detail, not core function

### Future Consideration (post v2.0)

- [ ] Drag-to-dismiss bottom sheet gesture — gesture physics, complex state
- [ ] Pixel-dissolve on KPI refresh — needs data refresh hook pattern first
- [ ] Staggered scanline on chart re-render — Recharts animation interop complexity

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| @theme token swap | HIGH (foundation) | LOW | P1 |
| Font swap (Satoshi + IBM Plex Mono) | HIGH (identity) | LOW | P1 |
| Pill buttons | HIGH (visible) | LOW | P1 |
| Underline inputs + floating labels | HIGH (all forms) | MEDIUM | P1 |
| Battery-bar progress | HIGH (budgets + debts pages) | MEDIUM | P1 |
| Icon-only bottom nav + status dot | HIGH (mobile nav) | LOW | P1 |
| Minimal charts (no grid, thin stroke) | HIGH (dashboard) | MEDIUM | P1 |
| No shadows | MEDIUM (philosophy) | LOW | P1 |
| Desaturated category colors | MEDIUM (consistency) | LOW | P1 |
| Silenced "$" prefix display | MEDIUM (financial polish) | LOW | P2 |
| Toggle pills for binary selects | MEDIUM (forms) | LOW | P2 |
| Dot-matrix texture hero cards | MEDIUM (identity) | MEDIUM | P2 |
| Status dot on period header | LOW (detail) | LOW | P2 |
| Pixel-dissolve on new transactions | MEDIUM (signature moment) | MEDIUM | P2 |
| Custom numpad | HIGH (30s transaction flow) | HIGH | P2 |
| Bottom sheet drag handle (visual only) | LOW (affordance) | LOW | P2 |
| Pixel-dissolve on KPI refresh | LOW (polish) | MEDIUM | P3 |
| Drag-to-dismiss gesture | LOW (native feel) | HIGH | P3 |

**Priority key:**
- P1: Must have for v2.0 launch
- P2: Should have — add within v2.x sprint after P1 is verified
- P3: Nice to have, future milestone

---

## Implementation Notes by Feature

### Floating Labels — Expected Behavior

The label functions as both label AND placeholder simultaneously.

**Default state (empty, not focused):**
- Label sits at input text baseline position (same y as where text will appear)
- Font: 14px Body, `--color-text-tertiary`, no transform
- Visually indistinguishable from a placeholder

**Focused OR filled state:**
- Label translates upward (typically -20 to -24px from baseline depending on font metrics)
- Label scales to 12px (or use `transform: scale(0.857)` from a 14px origin)
- Color: `--color-text-secondary`
- Uppercase + letter-spacing: 2px (tracking-widest)
- Transition: 200ms ease for all properties

**Critical implementation detail:** The input needs `padding-top` to leave room for the floated label. Typically 18-20px top padding on the input itself. Otherwise the label overlaps input text when floated.

**With content but not focused:** Label stays floated (never returns to placeholder position while there is value content). This requires checking `value.length > 0` in addition to `:focus`.

### Segmented Battery-Bar — Expected Behavior

**Segment calculation:**
- 10 segments total, each segment represents 10% of total
- `filledSegments = Math.floor(percentage * 10)` where percentage = value/max
- Last segment may be partially filled to show fractional progress within the segment
- Overflow (value > max): all 10 segments fill with `--color-negative`, append "+X%" text

**Traffic-light per-segment:** Color is determined by the segment's INDEX position, not the overall percentage. Segment at position 8 (representing 80-90% of total) is orange. This means a bar at 85% shows segments 1-8 in chartreuse and segment 9 in orange.

**Accessibility:** Must include `role="progressbar"`, `aria-valuenow`, `aria-valuemin={0}`, `aria-valuemax`, and a descriptive `aria-label`.

### Custom Numpad — Expected Behavior

**Amount state management (no native input):**
- Store amount as string (e.g., "1500" not 1500)
- Display string with formatting in the hero display area
- `appendDigit(d)`: add digit unless would exceed reasonable length or exceed 2 decimal places
- `appendDecimal()`: add "." only if not already present
- `appendDoubleZero()`: add "00" unless result would be invalid
- `backspace()`: remove last character, empty string stays "0" for display
- Parse to centavos only on form submission via `toCents()` from utils

**Decimal handling edge cases:**
- "0." is valid (user started with decimal)
- Maximum 2 decimal places — `appendDigit` after 2 decimal places is a no-op
- "00" after empty or "0" should stay "0" (no leading zeros)

### CSS Animations — Expected Behavior

**`status-pulse` (status dot):**
- 2.5s cycle, `ease-in-out`, infinite
- Only opacity and scale change — no position movement
- Scale 1 to 0.85 (not 0 — dot never disappears)
- Opacity 1 to 0.5 (not 0 — always readable)

**`scanline-reveal` (pixel-dissolve):**
- 500ms, `steps(12, end)` — MUST use steps, not ease
- `clip-path: inset(0 0 100% 0)` to `inset(0 0 0% 0)` — reveals from top down
- Apply with `animation-fill-mode: forwards` so element stays visible after animation completes
- Re-trigger in React: key prop change or remove+add class with `requestAnimationFrame`
- Must skip entirely when `prefers-reduced-motion: reduce` is set

---

## Existing Components — What Changes

| Component | Change Needed | Complexity |
|-----------|---------------|------------|
| `globals.css` | Full token replacement, font vars, delete shadows, add keyframes | LOW |
| `Sidebar.tsx` | Token swap, active item uses accent at 15% bg | LOW |
| `MobileNav.tsx` | Remove text labels, add status dot, icon-only | LOW |
| `FAB.tsx` | Confirm chartreuse bg + black icon, size 48px | LOW |
| All button elements | Add radius-full, update variant colors, scale(0.98) press | LOW |
| All form inputs | Replace with underline + floating label pattern | MEDIUM |
| `BudgetProgressList.tsx` | Replace smooth bars with BatteryBar component | MEDIUM |
| `BudgetSummaryRow.tsx` | Replace progress bar with BatteryBar | MEDIUM |
| Debt card components | Replace progress bars (utilization, DTI) with BatteryBar | MEDIUM |
| `TrendAreaChart.tsx` | Remove CartesianGrid, 1.5px stroke, dot endpoints, area fill | MEDIUM |
| `BudgetBarChart.tsx` | Remove grid, flat bar tops, ~60% bar width | MEDIUM |
| `ExpenseDonutChart.tsx` | innerRadius to ~70%, remove labels from ring | LOW |
| `TransactionRow.tsx` | Add pixel-dissolve class on mount for new items | LOW |
| `TransactionForm.tsx` | Underline inputs, toggle pills, custom numpad | HIGH |
| Dashboard hero balance card | Add dot-matrix texture via `::before` pseudo-element | LOW |
| All amount displays | Silenced "$" prefix span pattern | MEDIUM (many files) |

---

## Sources

- `STYLE_GUIDE.md` — Glyph Finance v1.1, authoritative spec (HIGH confidence)
- `UX_RULES.md` — Glyph Finance v1.1, interaction patterns (HIGH confidence)
- `.planning/PROJECT.md` — Milestone requirements, active task list (HIGH confidence)
- `src/app/globals.css` — Current v1.0 token state, confirmed in codebase (HIGH confidence)
- `src/components/` — Existing component inventory, confirmed in codebase (HIGH confidence)

---

*Feature research for: Glyph Finance design system implementation*
*Researched: 2026-04-06*
