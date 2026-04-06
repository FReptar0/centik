# Architecture Research

**Domain:** Design system migration — Glyph Finance into existing Next.js 16 App Router app
**Researched:** 2026-04-06
**Confidence:** HIGH (codebase is fully readable, design specs are finalized docs)

---

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                       TOKEN LAYER (globals.css)                   │
│  @theme { --color-*, --font-*, --radius-* }                       │
│  @theme inline { --font-sans: var(--font-satoshi) }               │
├──────────────────────────────────────────────────────────────────┤
│                       ROOT LAYOUT (layout.tsx)                    │
│  next/font loads → CSS variables → @theme inline picks them up    │
│  Body classname uses: bg-bg font-sans text-text-primary           │
├──────────────────────────────────────────────────────────────────┤
│  LAYOUT COMPONENTS               │  PRIMITIVE UI COMPONENTS       │
│  Sidebar (modified)              │  Modal (modified)              │
│  MobileNav (modified)            │  DynamicIcon (unchanged)       │
│  FAB (modified)                  │  BatteryBar (NEW)              │
│  MobileMoreSheet (unchanged)     │  FloatingInput (NEW)           │
│  PageHeader (modified)           │  StatusDot (NEW)               │
│                                  │  Numpad (NEW)                  │
│                                  │  TogglePills (NEW)             │
├──────────────────────────────────────────────────────────────────┤
│  FEATURE COMPONENTS (modified — token swap unless noted)          │
│  KPICard · BudgetProgressList (→ BatteryBar) · DebtCard           │
│  TransactionForm (→ bottom sheet + numpad + floating inputs)       │
│  TrendAreaChart · ExpenseDonutChart · BudgetBarChart (all charts) │
│  TransactionRow · TransactionList · TransactionFilters            │
│  IncomeSourceCard · IncomeSummaryCards                            │
│  AnnualPivotTable                                                 │
├──────────────────────────────────────────────────────────────────┤
│  DATA LAYER (unchanged — zero impact from design migration)       │
│  Server Actions · API Routes · Prisma · PostgreSQL                │
└──────────────────────────────────────────────────────────────────┘
```

The migration is purely additive at the data layer and purely substitutive at the token layer. No new API routes, no schema changes, no server actions. All impact is in `globals.css`, `layout.tsx`, and the component tree.

---

## Integration Points: New vs Modified vs Unchanged

### Category 1: Token Swap Only (modify CSS classes, no structural change)

These files change only which token names appear in `className` strings. The component logic, props API, and structure stay identical. Search-replace of old token names to new ones, then verify visually.

| File | Old tokens to New tokens (examples) |
|------|--------------------------------------|
| `src/app/globals.css` | Entire `@theme` block replaced. `--color-bg-primary` → `--color-bg`, `--color-bg-card` → `--color-surface`, `--color-bg-elevated` → `--color-surface-elevated`, `--color-border` → `--color-border-divider`, `--font-mono: 'JetBrains Mono'` → `'IBM Plex Mono'`, all radius values updated, all shadow tokens removed |
| `src/app/layout.tsx` | `DM_Sans` import → Satoshi font (local or Google); `IBM_Plex_Mono` added; CSS variable names updated accordingly |
| `src/components/layout/Sidebar.tsx` | `bg-bg-card border-r border-border` → `bg-surface` (no border); active item `bg-accent/15 text-accent` stays valid; icon `size={18}` already matches spec |
| `src/components/layout/FAB.tsx` | `shadow-lg shadow-glow` removed; `text-bg-primary` → `text-black`; button already `rounded-full` — correct |
| `src/components/layout/MobileMoreSheet.tsx` | Token names only |
| `src/components/layout/PageHeader.tsx` | Token names only |
| `src/components/debts/DebtSummaryCards.tsx` | Token names only |
| `src/components/income/IncomeSourceCard.tsx` | Token names only |
| `src/components/income/IncomeSummaryCards.tsx` | Token names only |
| `src/components/history/AnnualPivotTable.tsx` | Token names only; table header uppercase + tracking styles already partially present |
| `src/components/categories/*` | Token names only |

### Category 2: Structural Modifications (component logic or structure changes, same file)

These need more than a token swap — the rendered HTML structure or component behavior changes.

**`src/components/ui/Modal.tsx`** — MODIFY (significant)
- Mobile bottom sheet: `rounded-t-xl` → `rounded-t-[24px]` (radius-xl: 24px); `border-t border-border` removed; drag handle `h-1` stays but `rounded-full` removed (flat rect per spec); color `bg-border-light` → `bg-border-divider`
- Mobile sheet header restructure: current layout has `<h2>` title + right-side `<X>` button. New spec: left-side `<X>` button + right-side `GUARDAR` button in Label style (12px, uppercase, letter-spacing, chartreuse). This is a breaking change to Modal's header interface — TransactionForm must provide its own header or Modal needs a `headerSlot` prop
- Desktop modal: `rounded-xl` → `rounded-[24px]`; `border border-border` removed; `shadow-md` removed; `bg-bg-card` → `bg-surface-elevated`
- Desktop animation: add `animate-in fade-in` + scale-from-95 classes if using tailwindcss-animate, or inline CSS animation

**`src/components/layout/MobileNav.tsx`** — MODIFY (significant)
- Remove `<span>` text labels entirely from all nav items and "Mas" button
- Icon stays in `text-text-secondary` even when active — the dot communicates state, not icon color
- Add `<StatusDot>` component positioned 8px below the icon of the active tab item (absolute positioning within each button's relative container)
- "Mas" tab: same dot treatment when any overflow route is active

**`src/components/budgets/BudgetProgressList.tsx`** — MODIFY (significant)
- Replace the smooth progress bar `<div>` (currently: `h-1.5 overflow-hidden rounded-full` with inner `div` at `width: X%`) with `<BatteryBar value={percentUsed} />`
- Remove `COLOR_TRACK` and `COLOR_BG` maps — BatteryBar handles colors internally
- Percentage text: BatteryBar renders its own overflow text; remove duplicate percentage `<p>` below the bar or move it inside BatteryBar
- Icon container: `h-7 w-7 rounded-lg` → `h-9 w-9 rounded-[12px]` (spec: 36px, 12px radius)
- Amount display: wrap values in `font-mono tabular-nums`

**`src/components/debts/DebtCard.tsx`** — MODIFY
- Replace smooth progress bar with `<BatteryBar value={utilizationPercent} thresholds={{ warning: 31, danger: 71 }} />` (credit utilization thresholds differ from budget thresholds)
- Debt ratio bar also uses BatteryBar with `thresholds={{ warning: 36, danger: 51 }}`
- Remove any `shadow-*` classes
- Token name updates

**`src/components/dashboard/KPICard.tsx`** — MODIFY
- Icon container: `rounded-lg` → `rounded-[12px]`
- Value: add `font-mono tabular-nums`; consider splitting "$" prefix from digits into separate `<span>` elements so "$" can render at smaller size in `text-text-tertiary`
- Container: remove `border border-border`; `bg-bg-card` → `bg-surface-elevated`
- Hero balance card variant: add dot-matrix CSS class as background layer (opt-in prop or applied at page level)

**`src/components/charts/TrendAreaChart.tsx`** — MODIFY
- Replace `CHART_COLORS` object with Glyph Finance values (see token migration map below)
- Remove `<CartesianGrid>` entirely
- Change `strokeWidth={2}` → `strokeWidth={1.5}` on both `<Area>` elements
- Add `dot={{ r: 2, fill: color }}` to each Area for 4px solid dot endpoints
- Remove `<YAxis>` or set it to `hide={true}` (spec: no Y-axis labels)
- X-axis: show only start and end labels, not all month labels
- Legend: keep existing, but update to match token colors

**`src/components/charts/ExpenseDonutChart.tsx`** — MODIFY
- Update `CHART_COLORS` with desaturated category colors from Glyph Finance palette
- Increase `innerRadius` proportion to ~70% of `outerRadius` for thinner ring
- Remove any grid references

**`src/components/charts/BudgetBarChart.tsx`** — MODIFY
- Update `CHART_COLORS`
- Set `radius={0}` on bars (flat tops, no border-radius)
- Reduce `barSize` to ~60% of available space (wider gaps between bars)
- Remove `<CartesianGrid>`

**`src/components/transactions/TransactionForm.tsx`** — MODIFY (major restructure)
- Replace all `<input>` elements with `<FloatingInput>` component
- Amount input: replace `<input>` with `<Numpad>` component; display amount in large `font-mono` hero zone above numpad
- Add dot-matrix texture CSS class to amount hero zone
- Category selector: replace current dropdown/list with 4-column grid of 40px circular icon buttons; selection state = 2px chartreuse ring around circle
- Expense/Income toggle: replace current toggle with `<TogglePills>` component
- Optional fields: wrap in collapsible "Mas detalles" section
- Bottom sheet header: left `<X>` close + right `GUARDAR` (Label style) — coordinate with Modal restructure

**`src/components/transactions/TransactionRow.tsx`** — MODIFY
- Amount: wrap in `font-mono tabular-nums`; render "+" prefix in `text-positive` for income, "-" prefix in `text-negative` for expense (separately from the digit span)
- Category icon container: update to spec dimensions (36px, 12px radius) with desaturated color palette

**`src/components/transactions/TransactionFilters.tsx`** — MODIFY
- Filter chips: ensure `rounded-full` pill shape; active chip: `bg-accent-subtle text-accent`; inactive: neutral badge style

### Category 3: New Components (create from scratch)

These do not exist in the current codebase at all.

**`src/components/ui/BatteryBar.tsx`** — NEW

```typescript
interface BatteryBarProps {
  value: number   // 0-100+ (percentage, already calculated)
  variant?: 'compact' | 'detailed'   // 6px vs 8px height
  thresholds?: { warning: number; danger: number }  // default: { warning: 80, danger: 100 }
}
```

Renders 10 equal-width rectangular segments with 2px gaps. Segment color determined by cumulative fill position vs thresholds. Overflow text "+N%" in `text-negative` Meta size rendered right of bar when value > 100. Segments are flat rectangles (no border-radius). Role `progressbar` with aria attributes.

**`src/components/ui/FloatingInput.tsx`** — NEW

```typescript
interface FloatingInputProps {
  label: string
  value: string
  onChange: (value: string) => void
  type?: 'text' | 'number' | 'decimal' | 'date'
  prefix?: string      // "$" for money inputs, static, does not float
  suffix?: string      // "%" for rate inputs, static
  error?: string       // shows below input in Meta/negative style
  optional?: boolean   // shows "(opcional)" in label
  className?: string
}
```

No box — border-bottom only. Label starts as placeholder text at body size; on focus or when value is non-empty, label transforms: translates up, scales to Label size (12px), uppercase, tracking-widest, `text-text-secondary`. Transition 200ms ease. Focus state: border-bottom transitions to `border-accent`. Error state: border-bottom `border-negative`, error message below.

**`src/components/ui/StatusDot.tsx`** — NEW

```typescript
interface StatusDotProps {
  className?: string
}
```

Renders a 4px circle with `bg-accent` and `status-dot` CSS class (animation defined in globals.css). Always `aria-hidden="true"` — decorative indicator only.

**`src/components/ui/TogglePills.tsx`** — NEW

```typescript
interface TogglePillsProps {
  options: { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
}
```

Row of pill buttons with `gap-1`. Active: `bg-accent text-black font-semibold rounded-full`. Inactive: `bg-transparent text-text-secondary rounded-full`. Min height 40px. Press state: `scale(0.98)`.

**`src/components/transactions/Numpad.tsx`** — NEW

```typescript
interface NumpadProps {
  value: string
  onChange: (value: string) => void
}
```

4-column CSS grid. Row 1: `1`, `2`, `3`, Delete icon (Lucide). Row 2: `4`, `5`, `6`, `.`. Row 3: `7`, `8`, `9`, `00`. Row 4: empty, `0`, empty, empty. Each key: `bg-surface-elevated`, min 48px touch target, `font-mono` at 20px heading size. Press: `bg-surface-hover`, transition 100ms. Logic: appends digit, handles single decimal point, backspace deletes last character.

---

## Recommended Project Structure (Post-Migration)

```
src/
├── app/
│   ├── globals.css              # MODIFIED — full @theme replacement + animations
│   └── layout.tsx               # MODIFIED — Satoshi + IBM Plex Mono font swap
├── components/
│   ├── ui/
│   │   ├── Modal.tsx            # MODIFIED — new sheet header structure
│   │   ├── DynamicIcon.tsx      # UNCHANGED
│   │   ├── BatteryBar.tsx       # NEW
│   │   ├── FloatingInput.tsx    # NEW
│   │   ├── StatusDot.tsx        # NEW
│   │   └── TogglePills.tsx      # NEW
│   ├── layout/
│   │   ├── MobileNav.tsx        # MODIFIED — icon-only + status dot
│   │   ├── FAB.tsx              # MODIFIED — token swap, remove shadow
│   │   ├── Sidebar.tsx          # MODIFIED — token swap
│   │   ├── PageHeader.tsx       # MODIFIED — token swap
│   │   └── MobileMoreSheet.tsx  # UNCHANGED (token swap only)
│   ├── transactions/
│   │   ├── TransactionForm.tsx  # MODIFIED — major restructure
│   │   ├── Numpad.tsx           # NEW
│   │   ├── TransactionRow.tsx   # MODIFIED
│   │   └── TransactionFilters.tsx # MODIFIED
│   ├── budgets/
│   │   └── BudgetProgressList.tsx # MODIFIED — BatteryBar integration
│   ├── dashboard/
│   │   └── KPICard.tsx          # MODIFIED
│   ├── charts/
│   │   ├── TrendAreaChart.tsx   # MODIFIED — no grid, dots, 1.5px stroke
│   │   ├── ExpenseDonutChart.tsx # MODIFIED
│   │   └── BudgetBarChart.tsx   # MODIFIED — flat tops, no grid
│   └── debts/
│       └── DebtCard.tsx         # MODIFIED — BatteryBar integration
```

---

## Architectural Patterns

### Pattern 1: Token-First Migration

**What:** Replace the entire `@theme` block in `globals.css` as step 1, before touching any component. After the token swap, pages will look broken (wrong colors) but all Tailwind utility classes that reference token names continue to work because the token names map correctly. Components can then be updated incrementally against stable tokens.

**When to use:** Always first. Attempting to update components before tokens causes double-work.

**Trade-offs:** Brief period where the app looks garbled (acceptable during development). No risk to data layer.

**Example:**
```css
/* BEFORE */
@theme {
  --color-bg-primary: #0a0f1a;
  --color-bg-card: #111827;
  --font-mono: 'JetBrains Mono', monospace;
  --radius-xl: 16px;
  --shadow-glow: 0 0 20px rgba(34, 211, 238, 0.15);
}

/* AFTER */
@theme {
  --color-bg: #000000;
  --color-surface: #0A0A0A;
  --color-surface-elevated: #141414;
  --font-mono: 'IBM Plex Mono', 'Fira Code', monospace;
  --radius-xl: 24px;
  /* shadow tokens deleted entirely */
}
```

### Pattern 2: CSS Animations Centralized in globals.css

**What:** All keyframe animations (`status-pulse`, `scanline-reveal`) are defined once in `globals.css`. Components reference them via CSS class names. No inline `style` tags for animations.

**When to use:** All Glyph Finance signature animations. Centralizing respects `prefers-reduced-motion` from one location.

**Trade-offs:** Classes must be non-purged by Tailwind (add to safelist or use in JSX to keep them in bundle).

**Example:**
```css
/* globals.css */
@keyframes status-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.85); }
}

@keyframes scanline-reveal {
  0% { clip-path: inset(0 0 100% 0); }
  100% { clip-path: inset(0 0 0% 0); }
}

.status-dot { animation: status-pulse 2.5s ease-in-out infinite; }
.dot-matrix-bg {
  background-image: url("data:image/svg+xml,%3Csvg width='8' height='8' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='4' cy='4' r='0.75' fill='%231E1E1E' fill-opacity='0.4'/%3E%3C/svg%3E");
  background-repeat: repeat;
  background-size: 8px 8px;
}
.pixel-dissolve { animation: scanline-reveal 500ms steps(12, end) forwards; }

@media (prefers-reduced-motion: reduce) {
  .pixel-dissolve, .status-dot { animation: none; clip-path: none; }
}
```

### Pattern 3: BatteryBar Thresholds via Props

**What:** BatteryBar accepts optional `thresholds` prop to support different color breakpoints. Budget uses 80/100, credit utilization uses 30/70, debt ratio uses 35/50. Defaults to budget thresholds so most call sites need no extra props.

**When to use:** Any time a progress indicator exists in the app.

**Trade-offs:** BatteryBar internal logic has a mild branching complexity for the traffic-light coloring, but this is the right tradeoff vs having three different components.

```typescript
// Budget usage (default)
<BatteryBar value={percentUsed} />

// Credit card utilization
<BatteryBar value={utilizationPercent} thresholds={{ warning: 31, danger: 71 }} />

// Debt-to-income ratio
<BatteryBar value={dtiPercent} thresholds={{ warning: 36, danger: 51 }} />
```

### Pattern 4: FloatingInput Requires Relative Container

**What:** FloatingInput uses `position: absolute` for the label that floats above the input. The component renders its own `<div className="relative">` wrapper. The label and input are co-located siblings, not separate DOM elements.

**When to use:** All form inputs. Replaces every `<input>` + `<label>` pair in the codebase.

**Trade-offs:** Current forms use separate `<label htmlFor>` + `<input id>` patterns. FloatingInput merges these — callers pass `label` as a prop, not as a sibling DOM element. All form components need structural changes, not just class swaps.

```tsx
// BEFORE (current pattern in DebtForm, IncomeSourceForm, etc.)
<label htmlFor="name" className="text-sm text-text-secondary">Nombre</label>
<input id="name" className="border border-border rounded-lg bg-bg-input ..." />

// AFTER
<FloatingInput label="Nombre" value={name} onChange={setName} />
```

---

## Data Flow

### Font Loading Flow

```
layout.tsx
  ↓ next/font loads Satoshi (local or via Google Fonts)
  ↓ assigns CSS variable --font-satoshi to <html> element
  ↓ next/font loads IBM_Plex_Mono
  ↓ assigns CSS variable --font-ibm-plex-mono to <html> element
globals.css
  @theme inline {
    --font-sans: var(--font-satoshi);     ← Tailwind font-sans utility
  }
  @theme {
    --font-mono: 'IBM Plex Mono', 'Fira Code', monospace;  ← Direct value
  }
```

The `@theme inline` pattern is critical — this is how next/font CSS variables become available to Tailwind's `font-sans` utility. The existing pattern for DM Sans already demonstrates this correctly; only the variable name and font family change.

### Token Naming Migration Map

The token names change between v1.0 and v2.0. Both `globals.css` (defining tokens) and components (using Tailwind utilities derived from tokens) must be updated in sync.

| v1.0 Token | v2.0 Token | Class Change Required |
|------------|------------|----------------------|
| `--color-bg-primary` | `--color-bg` | `bg-bg-primary` → `bg-bg` |
| `--color-bg-card` | `--color-surface` | `bg-bg-card` → `bg-surface` |
| `--color-bg-card-hover` | `--color-surface-hover` | `bg-bg-card-hover` → `bg-surface-hover` |
| `--color-bg-elevated` | `--color-surface-elevated` | `bg-bg-elevated` → `bg-surface-elevated` |
| `--color-bg-input` | *(removed — inputs have no background)* | Remove `bg-bg-input` class |
| `--color-border` | `--color-border-divider` | `border-border` → `border-border-divider` |
| `--color-border-light` | *(removed)* | Remove all usage |
| `--color-border-focus` | *(handled via --color-accent in focus-visible)* | No class change — covered by global rule |
| `--color-text-muted` | `--color-text-tertiary` | `text-text-muted` → `text-text-tertiary` |
| `--color-accent` | `--color-accent` (value changes: `#22d3ee` → `#CCFF00`) | No class change, value updates automatically |
| `--color-positive` | `--color-positive` (value changes: `#34d399` → `#00E676`) | No class change |
| `--color-negative` | `--color-negative` (value changes: `#f87171` → `#FF3333`) | No class change |
| `--color-warning` | `--color-warning` (value changes: `#fb923c` → `#FF9100`) | No class change |
| `--shadow-sm/md/lg/glow` | *(deleted entirely)* | All `shadow-*` classes removed from JSX |
| `--radius-sm: 6px` | `--radius-sm: 8px` | Value increases, classes unchanged |
| `--radius-md: 8px` | `--radius-md: 12px` | Value increases |
| `--radius-lg: 12px` | `--radius-lg: 16px` | Value increases |
| `--radius-xl: 16px` | `--radius-xl: 24px` | Value increases (modals most affected) |

New tokens to add to `@theme`:
- `--color-surface-hover: #1A1A1A`
- `--color-dot-matrix: #1E1E1E`
- `--color-accent-subtle: rgba(204, 255, 0, 0.12)`
- `--color-positive-subtle: rgba(0, 230, 118, 0.12)`
- `--color-negative-subtle: rgba(255, 51, 51, 0.12)`
- `--color-warning-subtle: rgba(255, 145, 0, 0.12)`
- `--color-info-subtle: rgba(68, 138, 255, 0.12)`
- `--color-accent-hover: #B8E600`
- `--color-info: #448AFF`
- `--radius-full: 9999px`

Category color tokens stay named `--color-cat-*` but values change to desaturated palette:
- `--color-cat-food: #C88A5A` (was `#fb923c`)
- `--color-cat-services: #7A9EC4` (was `#60a5fa`)
- `--color-cat-entertainment: #9B89C4` (was `#a78bfa`)
- `--color-cat-subscriptions: #C48AA3` (was `#f472b6`)
- `--color-cat-transport: #C4A84E` (was `#fbbf24`)
- `--color-cat-other: #8A9099` (was `#94a3b8`)

### Chart Hardcoded Color Migration

All three chart files use a `CHART_COLORS` object with hardcoded hex values that bypass the CSS variable system. These must be updated directly to new Glyph Finance values:

```typescript
// Applies to TrendAreaChart.tsx, ExpenseDonutChart.tsx, BudgetBarChart.tsx
const CHART_COLORS = {
  tooltipBg: '#141414',       // was #0a0f1a  (surface-elevated)
  tooltipBorder: 'none',      // was #1e293b  (no decorative borders)
  positive: '#00E676',        // was #34d399  (new positive)
  negative: '#FF3333',        // was #f87171  (new negative)
  accent: '#CCFF00',          // was #22d3ee  (chartreuse)
  axis: '#666666',            // was #64748b  (text-tertiary)
  // Remove: grid (CartesianGrid component removed from JSX)
}
```

---

## Build Order: Recommended Phase Sequence

Dependencies flow token layer → layout → primitives → feature components. This order allows testing each layer before building on it.

```
Phase 1: Token foundation
  Files: globals.css (full @theme replacement + animations)
         layout.tsx (font swap: DM_Sans → Satoshi, JetBrains Mono → IBM Plex Mono)
  Expected after: app uses new palette/radius, looks partially broken
                  (token name mismatches between old CSS classes and new token names)
  Unblocks: all subsequent phases

Phase 2: Class name migration
  Action: search-replace old token utility class names across all components
          grep for: bg-bg-primary, bg-bg-card, bg-bg-elevated, border-border,
                    text-text-muted, shadow-sm, shadow-md, shadow-lg, shadow-glow,
                    bg-bg-input, border-border-light
          Update hardcoded hex values in CHART_COLORS objects
  Expected after: app looks visually correct with new palette (colors, sizes)
  Unblocks: nothing blocked, but clears visual noise for subsequent phases

Phase 3: New primitive components
  Files: BatteryBar.tsx (with tests), FloatingInput.tsx (with tests),
         StatusDot.tsx (with tests), TogglePills.tsx (with tests)
  Zero side effects — new files, nothing imports them yet
  Expected after: components exist and are tested in isolation
  Unblocks: BudgetProgressList, DebtCard, MobileNav, TransactionForm

Phase 4: Layout components
  Files: MobileNav.tsx (icon-only, status dot), Sidebar.tsx (polish),
         FAB.tsx (remove shadow, icon to text-black)
  Expected after: navigation fully correct per spec

Phase 5: Modal restructure
  Files: Modal.tsx (new header structure, correct radius, no border, no shadow)
  Expected after: all modals and bottom sheets correct per spec
  Unblocks: TransactionForm (which lives inside Modal)

Phase 6: TransactionForm redesign
  Files: TransactionForm.tsx (bottom sheet layout, dot-matrix hero, amount display,
         TogglePills, category grid, Numpad, FloatingInput for optional fields),
         Numpad.tsx (NEW — created here alongside TransactionForm)
  Most complex single-component change. Has existing tests — update tests alongside.
  Expected after: transaction registration flow fully spec-compliant

Phase 7: Progress bars
  Files: BudgetProgressList.tsx, DebtCard.tsx,
         any BudgetTable or progress usage in presupuesto page
  Action: Replace all smooth bars with BatteryBar component
  Expected after: all progress indicators are segmented battery-bar style

Phase 8: Charts
  Files: TrendAreaChart.tsx, ExpenseDonutChart.tsx, BudgetBarChart.tsx
  Action: Update CHART_COLORS, remove CartesianGrid, adjust strokeWidth/dots/radius
  Expected after: charts match minimal no-grid spec with 1.5px strokes

Phase 9: Remaining feature components
  Files: KPICard.tsx (font-mono values, no border, hero dot-matrix),
         TransactionRow.tsx (font-mono amounts, +/- prefix colors),
         TransactionFilters.tsx (pill chips),
         IncomeSourceCard.tsx, IncomeSummaryCards.tsx,
         AnnualPivotTable.tsx (table header uppercase tracking)
  Expected after: all pages visually complete

Phase 10: Visual QA
  Action: Every page reviewed against STYLE_GUIDE.md spec
          Focus rings, touch targets, contrast ratios
          Update all affected unit tests
```

---

## Component Dependencies

```
StatusDot ← MobileNav (active tab indicator)
StatusDot ← PageHeader (active period indicator)
BatteryBar ← BudgetProgressList
BatteryBar ← DebtCard (credit utilization, different thresholds)
BatteryBar ← presupuesto page BudgetTable (if progress bars exist there)
FloatingInput ← TransactionForm (optional fields section)
FloatingInput ← DebtForm
FloatingInput ← IncomeSourceForm
TogglePills ← TransactionForm (Gasto/Ingreso toggle)
Numpad ← TransactionForm (amount entry)
dot-matrix-bg (CSS class) ← KPICard hero variant
dot-matrix-bg (CSS class) ← TransactionForm amount hero zone
```

FloatingInput and BatteryBar have the widest fan-out — build and test them first (Phase 3) before migrating any feature components.

---

## Anti-Patterns

### Anti-Pattern 1: Partial Token Migration with Hardcoded Hex Values

**What people do:** Update `globals.css` but leave hardcoded hex values in components — specifically the `CHART_COLORS` objects in all three chart files and any `style={{ backgroundColor: '#0a0f1a' }}` inline styles.

**Why it's wrong:** Creates a split-brain state where the design system changes but scattered hardcoded values remain old colors. Charts look completely wrong while everything else updates.

**Do this instead:** After updating `globals.css`, grep for all old hex values (`#0a0f1a`, `#111827`, `#1e293b`, `#22d3ee`, `#34d399`, `#f87171`, `#64748b`, `#64748b`) and update every occurrence in the same phase.

### Anti-Pattern 2: Keeping Any Smooth Progress Bars

**What people do:** Implement BatteryBar but only use it in new components, leaving existing smooth bars in `BudgetProgressList` and `DebtCard` unchanged.

**Why it's wrong:** Two progress bar systems means visual inconsistency. Glyph Finance's identity requires 100% segmented bars everywhere.

**Do this instead:** Migrate all three locations in Phase 7 as a single atomic change. There are only 3 files with progress bars.

### Anti-Pattern 3: Floating Labels via Classes on Existing Inputs

**What people do:** Apply underline styling to existing `<input>` elements via classes (e.g., `className="border-b border-border-divider bg-transparent"`) without implementing the floating label behavior.

**Why it's wrong:** Underline inputs without floating labels lose label context while typing. The spec requires floating labels on every input.

**Do this instead:** Build FloatingInput as a proper component. The CSS transform requires a relative container wrapping both label and input — cannot be done with Tailwind classes on the input element alone.

### Anti-Pattern 4: Implementing Numpad Before Bottom Sheet Layout

**What people do:** Build Numpad in isolation before redesigning the TransactionForm bottom sheet structure.

**Why it's wrong:** The Numpad's 4-row grid needs known container dimensions. Building it out of context causes sizing mistakes that require rework when placed in the actual bottom sheet.

**Do this instead:** Establish the TransactionForm bottom sheet structure (sections, proportions: dot-matrix hero zone + category grid + numpad area) before sizing the Numpad keys.

### Anti-Pattern 5: Modal Title Prop Driving Bottom Sheet Header

**What people do:** Keep the existing `title` prop in Modal and try to style it to match the Glyph Finance spec, which has "X" on the left and "GUARDAR" on the right.

**Why it's wrong:** The current Modal renders title as `<h2>` centered with close button on the right. The new spec has a fundamentally different header layout. Trying to fit it in the existing prop causes either a messy prop API or incorrect layouts.

**Do this instead:** Add a `headerContent?: ReactNode` prop to Modal that replaces the default title/close layout entirely for the bottom sheet case. TransactionForm passes its own header JSX. The desktop modal can keep the standard title+X layout.

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Current: 1 user, ~100 files | Monolith is correct. No extraction needed. |
| Token system growth | If token count grows significantly, extract to `tokens.css` imported into globals.css — not needed for this milestone |
| Component library extraction | BatteryBar, FloatingInput, Numpad are generic enough to publish as a separate package if the project becomes an open-source design system — not in scope |

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| next/font (Google) | `IBM_Plex_Mono` from `next/font/google` | IBM Plex Mono is on Google Fonts — HIGH confidence. Satoshi may require local font files if not available via Google Fonts — verify before Phase 1 |
| Sonner toasts | `theme="dark"` already set | Toast appearance inherits page CSS — no changes needed |
| Recharts | Hardcoded hex values in CHART_COLORS objects | Must update manually — Recharts does not use CSS variables |
| Lucide React | `strokeWidth` prop on DynamicIcon | Update DynamicIcon.tsx default `strokeWidth` from `2` to `1.5` for all category icons |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| globals.css → Tailwind utilities | `@theme` block defines token values; Tailwind generates utility classes | Token rename = class rename everywhere in JSX |
| layout.tsx → globals.css | `@theme inline` requires font CSS variable on `<html>` | Font variable set via `className` on `<html>`, consumed by `@theme inline` — existing pattern, just swap variable name |
| BatteryBar → lib/budget-shared.ts | `getBudgetColor()` returns thresholds — BatteryBar can accept thresholds as props instead | Recommendation: keep getBudgetColor() utility, expose thresholds as BatteryBar props for flexibility |
| TransactionForm → Modal | Modal's header restructuring affects TransactionForm's close/save button placement | Solution: add `headerContent` prop to Modal or have TransactionForm render its own header outside Modal's built-in title area |

---

## Sources

- `/Users/freptar0/Desktop/Projects/centik/STYLE_GUIDE.md` — Glyph Finance design tokens, component specs, animation implementations (HIGH confidence — authoritative project doc)
- `/Users/freptar0/Desktop/Projects/centik/UX_RULES.md` — Interaction patterns, layout rules, numpad spec, floating inputs (HIGH confidence — authoritative project doc)
- `/Users/freptar0/Desktop/Projects/centik/.planning/PROJECT.md` — Active requirements, confirmed decisions (HIGH confidence)
- Codebase inspection: `src/app/globals.css`, `src/app/layout.tsx`, `src/components/ui/Modal.tsx`, `src/components/layout/Sidebar.tsx`, `src/components/layout/MobileNav.tsx`, `src/components/layout/FAB.tsx`, `src/components/transactions/TransactionForm.tsx`, `src/components/budgets/BudgetProgressList.tsx`, `src/components/charts/TrendAreaChart.tsx`, `src/components/dashboard/KPICard.tsx` (HIGH confidence — direct source inspection)
- Tailwind v4 `@theme` / `@theme inline` pattern (HIGH confidence — based on working implementation already in globals.css)

---

*Architecture research for: Glyph Finance design system implementation in existing Next.js 16 app*
*Researched: 2026-04-06*
