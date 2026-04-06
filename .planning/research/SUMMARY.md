# Project Research Summary

**Project:** Centik (MisFinanzas) — Glyph Finance Design System v2.0
**Domain:** Design system migration — pure visual rebrand of an existing, fully functional personal finance app
**Researched:** 2026-04-06
**Confidence:** HIGH

## Executive Summary

This is not a new product build. All business logic, data models, API routes, and pages exist and work correctly in v1.0. This milestone is a complete visual identity swap: replacing the cyan/dark-slate v1.0 skin with the Glyph Finance design language (OLED black, chartreuse accent, Satoshi typography, segmented battery-bar progress, underline inputs with floating labels, custom numpad). The underlying data layer — Prisma, PostgreSQL, server actions, API routes — is untouched. Every task is either a CSS token rename, a component structural change, or a new primitive component.

The recommended approach is strictly layer-by-layer: tokens first, then fonts, then new primitive components (BatteryBar, FloatingInput, StatusDot, TogglePills), then layout and navigation, then forms, then charts, then remaining feature components, ending with a full visual QA pass. Attempting to update components before the token layer is stable causes double work and a split-brain visual state that is hard to debug. The token swap itself is the riskiest single step: renaming CSS custom properties breaks all Tailwind utility classes derived from the old names, and the build will pass with zero errors while the app renders unstyled.

The single largest risk is the Tailwind v4 token rename: 36+ component files reference old utility class names (`bg-bg-primary`, `text-text-muted`, `shadow-glow`) that disappear silently when tokens are renamed. This must be executed as one atomic change — rename tokens AND update all component class names in the same commit. The second major risk is the custom numpad in the transaction bottom sheet, which is the most complex new component and requires careful accessibility implementation (keyboard focus order, `<button>` elements, ARIA labels) to avoid trapping keyboard users.

## Key Findings

### Recommended Stack

No new npm packages are needed for this milestone. All three required capabilities — font loading, CSS animations, and token migration — are handled by tools already installed: Next.js 16.2.2 (`next/font/local`, `next/font/google`), Tailwind CSS 4.2.2 (`@theme`, `@theme inline`, `@keyframes`), and React 19.2.4 (the `key` prop re-mount trick for animation re-triggers).

**Core technologies (capability additions only):**
- `next/font/local`: loads Satoshi variable font from `src/app/fonts/` — required because Satoshi is NOT on Google Fonts (Fontshare exclusive)
- `next/font/google` (IBM_Plex_Mono): loads IBM Plex Mono automatically at build time — weights 400, 600, 700; no variable font available
- Tailwind `@theme inline`: required for font variables; `@theme` (build-time) cannot see `next/font` CSS variables injected at runtime
- CSS `@keyframes` inside `@theme`: generates `animate-status-pulse` and `animate-scanline-reveal` utility classes; keyframe name and duration must be on the same line (v4 requirement)
- React `key` prop: re-triggers scanline animation on data refresh by forcing unmount + remount; no animation library needed

**Critical non-npm step:** Satoshi font files (`Satoshi-Variable.woff2`, optionally `Satoshi-VariableItalic.woff2`) must be manually downloaded from https://www.fontshare.com/fonts/satoshi and placed in `src/app/fonts/`.

### Expected Features

**Must have (table stakes — v2.0 launch blockers):**
- `@theme` token swap in `globals.css` — foundation; everything else fails without correct tokens
- Satoshi + IBM Plex Mono via `next/font` — typography is 50% of the Glyph Finance identity
- Pill-shaped buttons (`border-radius: 9999px`) — most visible component change across the entire app
- Underline inputs with floating labels — every form in the app uses inputs; box inputs immediately break the visual spec
- Segmented battery-bar progress (10 rectangles, traffic-light color) — replaces ALL smooth progress bars on budgets page and debt cards
- Icon-only bottom nav with chartreuse status dot — text labels explicitly removed per spec
- Minimal charts: no `CartesianGrid`, 1.5px stroke, 4px solid dot endpoints, area fill at 10-15% opacity
- OLED black background and desaturated category colors — automatic once tokens are correct
- No shadows anywhere — delete all four shadow token definitions and remove `shadow-*` from every component

**Should have (v2.x polish — add after P1 verified):**
- Dot-matrix SVG texture on dashboard hero balance card and analytics card
- Pixel-dissolve scanline animation (`steps(12, end)`, NOT ease) on new transaction rows
- Status dot pulse animation on period header
- Custom numpad in transaction bottom sheet (HIGH complexity — can ship temporarily with OS keyboard)
- Silenced "$" prefix display (smaller span in tertiary color) on all monetary amounts
- Toggle pills for Gasto/Ingreso selector (partially exists; needs verification)
- Bottom sheet drag handle visual (aesthetic affordance, no gesture logic)

**Defer to future milestone (P3):**
- Drag-to-dismiss bottom sheet gesture — velocity calculation, pointer event tracking, scroll conflict
- Pixel-dissolve on KPI card refresh — needs data revision tracking hook pattern first
- Staggered scanline on chart re-render — Recharts animation interop complexity

### Architecture Approach

The migration is purely additive at the data layer and purely substitutive at the token layer. The architecture has four categories of work: (1) Token swap only — search-replace old CSS utility class names across 36+ files with no structural change; (2) Structural modifications — component logic or HTML structure changes in existing files (Modal, MobileNav, BudgetProgressList, DebtCard, KPICard, all charts, TransactionForm); (3) New primitive components — BatteryBar, FloatingInput, StatusDot, TogglePills (all in `src/components/ui/`), and Numpad (`src/components/transactions/`); (4) Unchanged — entire data layer (server actions, API routes, Prisma, PostgreSQL).

**Major components to create:**
1. `BatteryBar.tsx` — 10-segment rectangular progress bar with configurable warning/danger thresholds; `role="progressbar"` on container; `aria-hidden` on segments
2. `FloatingInput.tsx` — underline-only input with absolutely positioned `<label>` that transforms on focus/fill; requires real `<label htmlFor>` not `placeholder`
3. `StatusDot.tsx` — 4px chartreuse circle with `animate-status-pulse`, always `aria-hidden="true"`
4. `TogglePills.tsx` — row of pill buttons; active state: chartreuse bg + black text
5. `Numpad.tsx` — 4x4 CSS grid of `<button type="button">` elements; IBM Plex Mono 20px; custom digit/decimal/backspace state handlers

**Key patterns:**
- Token-first migration: replace entire `@theme` block before touching any component
- CSS animations centralized in `globals.css` with `@media (prefers-reduced-motion: reduce)` override in one place
- BatteryBar thresholds via props: default budget thresholds (80/100), overridable for credit utilization (31/71) and DTI (36/51)
- FloatingInput requires a relative container wrapper — cannot be done with Tailwind classes on the bare `<input>` element
- Recharts colors must be JavaScript hex values in `CHART_COLORS` constants, not CSS variable references — SVG does not inherit CSS custom properties

### Critical Pitfalls

1. **Token rename silently breaks all utility classes (Pitfall 7)** — When `--color-bg-primary` becomes `--color-bg`, the `bg-bg-primary` utility disappears from Tailwind's generated stylesheet. Build passes. App renders unstyled. Prevention: do the rename AND update all 36+ component files in one atomic commit; grep for all old token strings before declaring done.

2. **Recharts ignores CSS variables (Pitfall 9)** — Recharts renders via SVG; SVG attributes do not traverse the CSS cascade. All three chart files use hardcoded `CHART_COLORS` hex constants referencing the old v1.0 palette. Token migration has zero effect on chart colors. Prevention: update `CHART_COLORS` in all three chart files to match new palette hex values directly.

3. **Satoshi requires local font files, not Google Fonts (Pitfall 8)** — `import { Satoshi } from 'next/font/google'` fails at build time with "module not found." Satoshi is only available via Fontshare. Prevention: use `next/font/local` with manually downloaded `Satoshi-Variable.woff2`.

4. **Floating labels lose accessibility when using `placeholder` instead of `<label>` (Pitfall 13)** — The floating label animation can be implemented visually with `placeholder` but this is a WCAG failure: placeholder disappears on input, no persistent label context for screen readers. Prevention: always use real `<label htmlFor>` + `id` pair; use `placeholder=" "` (single space) as the CSS state machine trigger.

5. **Custom numpad traps keyboard focus (Pitfall 16)** — Implementing numpad keys as `<div>` elements removes them from tab order or creates unordered focus sequences. Prevention: use `<button type="button">` for every key; verify Tab navigation through entire bottom sheet form without mouse.

6. **Shadow tokens must be explicitly deleted (Pitfall 10)** — Leaving shadow tokens in `@theme` while removing shadow classes from components leaves a design system contract gap; FAB and Modal retain a cyan glow. Prevention: delete all four shadow token definitions AND remove `shadow-*` from FAB, Modal, and TransactionFilters in one atomic change.

7. **Tests assert old hex values and class names (Pitfall 15)** — `constants.test.ts` asserts `'#22d3ee'` and `'#fb923c'`; `FAB.test.tsx` asserts `shadow-lg shadow-glow`. These fail correctly after migration but can mask regressions if silenced with `it.skip()`. Prevention: update tests in the same commit as the code they test; never `it.skip()` in main branch.

## Implications for Roadmap

Based on research, the architecture enforces a strict dependency order: tokens must be stable before component work begins, and new primitives must exist before feature components can adopt them. The suggested phase structure maps directly to ARCHITECTURE.md's recommended build order.

### Phase 1: Token Foundation
**Rationale:** Every other visual change is downstream of the CSS token layer. Component work done before tokens are correct requires rework. This is the highest-risk phase.
**Delivers:** Complete `@theme` replacement in `globals.css`, font swap in `layout.tsx`, font files in `src/app/fonts/`, all `@keyframes` animations defined, all shadow tokens deleted, `@theme inline` pattern for font variables, `constants.ts` and `seed.ts` category colors updated to desaturated palette.
**Addresses:** OLED black background, chartreuse accent, radius scale changes, animation keyframes registered
**Avoids:** Pitfalls 7, 8, 10, 11, 15 — token rename atomicity, Satoshi local files, shadow deletion, constants.ts color updates, test synchronization

### Phase 2: Class Name Migration
**Rationale:** Once tokens are renamed, all existing components reference non-existent utility classes. This phase sweeps the codebase to restore visual correctness using the new token names. It is a search-replace operation, not a design task.
**Delivers:** All 36+ component files updated to new Tailwind utility class names; hardcoded hex values in `CHART_COLORS` objects updated; build passes and app renders with new palette
**Addresses:** Silent class name break from token rename (Pitfall 7)
**Avoids:** Working on structural changes against an unstable token layer

### Phase 3: New Primitive Components
**Rationale:** BatteryBar and FloatingInput have the widest fan-out — consumed by 5+ feature components. Building and testing them in isolation before any consumer exists eliminates cascading rework.
**Delivers:** `BatteryBar.tsx` (with tests), `FloatingInput.tsx` (with tests), `StatusDot.tsx` (with tests), `TogglePills.tsx` (with tests) — all tested in isolation, nothing imports them yet
**Addresses:** Battery-bar progress everywhere, underline inputs with floating labels, toggle pills for binary selects, status dot animation
**Avoids:** Pitfalls 12, 13 — BatteryBar ARIA, floating label accessibility

### Phase 4: Layout and Navigation
**Rationale:** Navigation is the frame visible on every screen. Getting it right early establishes the visual baseline for all subsequent QA.
**Delivers:** `MobileNav.tsx` (icon-only, StatusDot active indicator), `Sidebar.tsx` (token swap polish), `FAB.tsx` (remove shadow, icon to text-black), `PageHeader.tsx`
**Addresses:** Icon-only bottom nav with status dot, no shadows on layout components
**Avoids:** Shadow tokens persisting on FAB (Pitfall 10)

### Phase 5: Modal Restructure
**Rationale:** Modal drives the bottom sheet pattern used by TransactionForm. TransactionForm cannot be correctly redesigned until Modal's header API is settled (new `headerContent?: ReactNode` prop for custom X + GUARDAR layout).
**Delivers:** `Modal.tsx` with new header structure (left X, right GUARDAR slot), correct `rounded-[24px]` radius, no border, no shadow
**Addresses:** Bottom sheet header spec, modal radius and elevation
**Avoids:** Trying to fit the new header layout into the existing `title` prop API (ARCHITECTURE.md Anti-Pattern 5)

### Phase 6: TransactionForm and Numpad
**Rationale:** This is the most complex single-component change in the milestone. It depends on FloatingInput (Phase 3), TogglePills (Phase 3), and Modal (Phase 5) all being ready. The Numpad is built alongside TransactionForm because it needs the container dimensions to size correctly.
**Delivers:** `TransactionForm.tsx` (bottom sheet layout, dot-matrix hero zone, amount display, category grid, FloatingInput optional fields), `Numpad.tsx` (custom 4x4 grid with correct state handlers)
**Addresses:** Custom numpad, 30-second transaction flow, underline inputs in transaction form
**Avoids:** Numpad keyboard trap (Pitfall 16), numpad built outside container context (ARCHITECTURE.md Anti-Pattern 4)

### Phase 7: Progress Bars
**Rationale:** Atomic phase — all three smooth bar locations (BudgetProgressList, DebtCard utilization, DebtCard DTI) must change together to eliminate the mixed-bar inconsistency.
**Delivers:** All smooth `<div>` progress bars replaced with `<BatteryBar>` in BudgetProgressList, DebtCard, and any other progress locations
**Addresses:** Segmented battery-bar everywhere, correct threshold values per context (budget 80/100, credit utilization 31/71, DTI 36/51)
**Avoids:** Mixing smooth and segmented bars (ARCHITECTURE.md Anti-Pattern 2)

### Phase 8: Charts
**Rationale:** Chart components require direct hex value updates in `CHART_COLORS` constants because Recharts ignores CSS variables. Clean, isolated phase — three files, no structural dependencies on other phases.
**Delivers:** `TrendAreaChart.tsx`, `ExpenseDonutChart.tsx`, `BudgetBarChart.tsx` — updated CHART_COLORS, `<CartesianGrid>` removed, 1.5px stroke, 4px dot endpoints, correct inner radius for donut, flat bar tops
**Addresses:** Minimal chart aesthetic, no grid lines
**Avoids:** Pitfall 9 (Recharts CSS variable limitation)

### Phase 9: Remaining Feature Components
**Rationale:** Mop-up pass for feature components that need more than a token swap but do not fit earlier phases.
**Delivers:** `KPICard.tsx` (font-mono values, dot-matrix opt-in, no border), `TransactionRow.tsx` (font-mono amounts, +/- prefix colors), `TransactionFilters.tsx` (pill filter chips), `IncomeSourceCard.tsx`, `IncomeSummaryCards.tsx`, `AnnualPivotTable.tsx` (uppercase tracking table headers)
**Addresses:** Silenced "$" prefix pattern, filter chip pill shape, monospace tabular numbers throughout

### Phase 10: Visual QA
**Rationale:** Every page reviewed against STYLE_GUIDE.md spec. Accessibility audit. Touch target verification. The "looks done but isn't" checklist from PITFALLS.md drives this phase.
**Delivers:** Zero accessibility violations on axe audit, all focus rings visible in chartreuse, `prefers-reduced-motion` verified, loading skeletons updated, Sonner toast appearance verified
**Addresses:** Full spec compliance verification
**Avoids:** Shipping with partial migration (old tokens in loading.tsx files, wrong Sonner toast colors, missing reduced-motion overrides)

### Phase Ordering Rationale

- Token foundation must precede all component work because Tailwind generates utility class names from token keys — class names do not exist until tokens are defined
- New primitive components (BatteryBar, FloatingInput) precede their consumers because building consumers against non-existent APIs wastes effort
- Modal restructure precedes TransactionForm because TransactionForm lives inside Modal and its header API must be settled first
- Charts are isolated because their Recharts constraint (no CSS variables) makes them independent of the token system — they could technically happen any time after Phase 2 but are cleanest as a dedicated phase
- Visual QA is last because it validates the cumulative result of all 9 preceding phases

### Research Flags

Phases with well-documented patterns (skip deeper research):
- **Phase 1 (Token Foundation):** STACK.md provides exact CSS patterns; complete token rename map in STACK.md and ARCHITECTURE.md
- **Phase 2 (Class Name Migration):** Mechanical search-replace; grep patterns documented in PITFALLS.md
- **Phase 3 (Primitive Components):** Full TypeScript interfaces and behavioral specs already in ARCHITECTURE.md
- **Phase 7 (Progress Bars):** BatteryBar props API fully specified; all three target files are known
- **Phase 8 (Charts):** CHART_COLORS constants documented with exact new hex values; only three files affected

Phases likely needing more attention during planning:
- **Phase 6 (TransactionForm + Numpad):** Highest complexity in the milestone. Numpad state management (decimal handling, double-zero edge cases, backspace to empty string), category grid selection state, and bottom sheet section proportions are likely to surface unexpected sizing and layout issues. Budget extra planning time.
- **Phase 5 (Modal Restructure):** The `headerContent?: ReactNode` API change affects every consumer of Modal. Audit all Modal call sites before planning to avoid missing any that need the new header pattern.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Official Next.js and Tailwind v4 docs confirm all patterns; Satoshi availability on Fontshare confirmed directly |
| Features | HIGH | Authoritative source: STYLE_GUIDE.md and UX_RULES.md written by project owner — no ambiguity about spec |
| Architecture | HIGH | Codebase directly inspected; all affected files enumerated; component interfaces fully specified |
| Pitfalls | HIGH | Verified against official docs and GitHub issues; v4 keyframe formatting quirk confirmed in issue tracker |

**Overall confidence:** HIGH

### Gaps to Address

- **Income category colors for Glyph Finance:** STYLE_GUIDE.md specifies 6 expense category colors in the desaturated palette but does not explicitly list new colors for income categories (Empleo, Freelance). These must be determined before the Phase 1 atomic commit that updates `constants.ts`, `constants.test.ts`, and `seed.ts` together. Suggested resolution: derive from the same desaturation approach applied to expense categories, or use neutral values consistent with the existing income green (#00E676 positive semantic color).

- **Loading.tsx file inventory:** PITFALLS.md notes that `loading.tsx` files are frequently missed in visual migrations (they still reference old `bg-bg-card` tokens). The full list of `loading.tsx` files in the app should be audited during Phase 10 planning to ensure they are included in the migration sweep.

- **Numpad container sizing:** The 4x4 Numpad grid specifies 48px minimum touch targets, but the exact proportions of the transaction bottom sheet (dot-matrix hero zone height, category grid row count, numpad area height) need to be validated visually in Phase 5 before final key sizing is locked in Phase 6.

## Sources

### Primary (HIGH confidence)
- `STYLE_GUIDE.md` — Glyph Finance v1.1, complete token map, component specs, animation implementations
- `UX_RULES.md` — Glyph Finance v1.1, interaction patterns, numpad spec, floating label behavior
- [Next.js Font Optimization Docs](https://nextjs.org/docs/app/getting-started/fonts) — `next/font/local` array src, CSS variable pattern
- [Tailwind CSS v4 Animation Docs](https://tailwindcss.com/docs/animation) — `@theme` + `@keyframes`, `--animate-*` naming
- [Fontshare — Satoshi](https://www.fontshare.com/fonts/satoshi) — confirmed NOT on Google Fonts; free commercial license
- [Google Fonts — IBM Plex Mono](https://fonts.google.com/specimen/IBM+Plex+Mono) — confirmed available; weights 400/600/700; no variable font
- Codebase direct inspection: `src/app/globals.css`, `src/app/layout.tsx`, all chart and form components

### Secondary (MEDIUM confidence)
- [Tailwind v4 @theme vs @theme inline discussion](https://github.com/tailwindlabs/tailwindcss/discussions/18560) — next/font variables require `@theme inline`; aligns with working implementation in existing globals.css
- [Tailwind v4 keyframe formatting issue](https://github.com/tailwindlabs/tailwindcss/issues/16227) — same-line requirement for `--animate-*` + keyframe name in v4.2.x

---
*Research completed: 2026-04-06*
*Ready for roadmap: yes*
