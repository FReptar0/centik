# Phase 17: Token Foundation + Class Migration - Context

**Gathered:** 2026-04-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace globals.css @theme tokens with the Glyph Finance palette, swap DM Sans → Satoshi (next/font/local) and JetBrains Mono → IBM Plex Mono (next/font/google), add @keyframes animations, remove shadow tokens, update radius scale, rename all Tailwind utility classes across 36+ component files, update constants.ts with new hex values, update seed data, and fix all existing tests. This must be atomic — token swap + class rename happen together to avoid silent styling breakage.

</domain>

<decisions>
## Implementation Decisions

### Income Category Colors
- Claude's Discretion — pick what harmonizes with the desaturated expense palette
- Both income category colors (Empleo #34d399, Freelance #22d3ee) need updating
- Update seed script + database with new colors (not just constants.ts)
- Running `prisma db seed` or `prisma migrate reset` should apply the new colors

### Satoshi Font Loading
- **Commit .woff2 files to repo** in `src/app/fonts/`
- Download both `Satoshi-Variable.woff2` (regular) AND `Satoshi-VariableItalic.woff2` (italic) from fontshare.com
- Load via `next/font/local` with variable font configuration (weight range '300 900')
- CSS variable `--font-satoshi` injected via `@theme inline { --font-sans: var(--font-satoshi) }`

### IBM Plex Mono Loading
- Use `next/font/google` with `IBM_Plex_Mono`, weights ['400', '600', '700']
- CSS variable `--font-ibm-plex-mono`
- Replaces JetBrains Mono in `@theme { --font-mono: 'IBM Plex Mono', ... }`

### Token Rename (Atomic)
- Replace the entire globals.css @theme block with STYLE_GUIDE.md Tailwind Config section
- All token renames happen in the same commit as class name updates across 36+ files
- Research identified 21 token renames — key ones:
  - `--color-bg-primary` → `--color-bg` (class: `bg-bg-primary` → `bg-bg`)
  - `--color-bg-card` → `--color-surface-elevated` (class: `bg-bg-card` → `bg-surface-elevated`)
  - `--color-bg-card-hover` → `--color-surface-hover`
  - `--color-bg-elevated` → removed (modals use `--color-surface-elevated`)
  - `--color-bg-input` → removed (inputs are transparent/underline)
  - `--color-border` → `--color-border-divider`
  - `--color-border-light` → removed
  - `--color-border-focus` → replaced by `--color-accent` in focus ring
  - `--color-text-muted` → `--color-text-tertiary`
  - `--color-text-disabled` → `--color-text-disabled` (same name, new value #444444)
  - `--color-accent` → `--color-accent` (same name, value #22d3ee → #CCFF00)
  - `--color-positive` → `--color-positive` (same name, value #34d399 → #00E676)
  - `--color-negative` → `--color-negative` (same name, value #f87171 → #FF3333)
  - `--color-warning` → `--color-warning` (same name, value #fb923c → #FF9100)
  - `--color-info` → `--color-info` (same name, value #60a5fa → #448AFF)
  - All shadow tokens removed (--shadow-sm/md/lg/glow)
  - New tokens added: `--color-surface`, `--color-surface-hover`, `--color-dot-matrix`, `--color-text-tertiary`
  - New radius: `--radius-full: 9999px`

### Shadow Removal
- Delete all 4 shadow tokens from @theme
- Replace `shadow-glow` focus rings with solid `outline: 2px solid var(--color-accent)`
- Update `:focus-visible` rule in globals.css
- Remove any `shadow-sm/md/lg` classes from components

### Animation Keyframes
- Add to @theme: `status-pulse` (2.5s ease-in-out infinite), `scanline-reveal` (500ms steps(12,end) forwards)
- Add `prefers-reduced-motion` override in globals.css
- These are defined now but not used until Phase 19+ (StatusDot, pixel-dissolve)

### Constants + Seed Data
- `constants.ts` DEFAULT_CATEGORIES: update all 8 color hex values (6 expense desaturated + 2 income TBD by Claude)
- `seed-data.ts`: update category colors to match constants.ts
- CATEGORY_COLORS derived map updates automatically from DEFAULT_CATEGORIES

### Test Updates
- All 394 existing tests must pass after migration
- Key files that will break: tests asserting old hex values, old class names, or shadow-glow
- Fix assertions to match new tokens — don't skip or remove tests

### Claude's Discretion
- Exact income category desaturated hex values
- Order of operations within the atomic commit (globals first, then layout, then components)
- Whether to add `--color-surface` as an intermediate step or go directly to the full rename
- How to handle components that reference both renamed AND unchanged tokens

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/app/globals.css`: 52-line @theme block — will be fully replaced
- `src/app/layout.tsx`: DM_Sans import, `--font-dm-sans` variable, body classes `bg-bg-primary text-text-primary font-sans`
- `src/lib/constants.ts`: 8 category colors, CATEGORY_COLORS map, nav items
- `prisma/seed-data.ts`: Category seed colors matching constants.ts

### Established Patterns
- Tailwind v4 CSS-first @theme + @theme inline two-block pattern (already working)
- next/font variable injection via className on `<html>` element
- `:focus-visible` global CSS rule for focus rings
- `cn()` utility for conditional class names (clsx + tailwind-merge)

### Integration Points
- ~115 occurrences of old token classes across 30+ files (grep verified)
- Body classes in layout.tsx reference old tokens
- Chart components (3 files) use hardcoded CHART_COLORS — NOT affected by @theme but need MIGRATE-02
- 394 existing unit tests — some assert specific hex values and class names

### Files That Need Updating (from grep)
Top 30 files with old token references:
src/app/loading.tsx, src/app/ingresos/loading.tsx, src/components/categories/CategoryForm.tsx, src/components/categories/CategoryList.tsx, src/components/history/CloseConfirmationModal.tsx, src/components/charts/TrendAreaChart.tsx, src/components/history/AnnualPivotTable.tsx, src/components/charts/ExpenseDonutChart.tsx, src/components/layout/FAB.tsx, src/components/ui/Modal.tsx, src/components/charts/BudgetBarChart.tsx, src/components/history/YearSelector.tsx, src/components/layout/Sidebar.tsx, src/components/layout/MobileMoreSheet.tsx, src/components/budgets/BudgetProgressList.tsx, src/components/income/IncomeSourceList.tsx, src/components/layout/MobileNav.tsx, src/components/debts/DebtCard.tsx, src/components/income/IncomeSourceForm.tsx, src/components/budgets/BudgetSummaryRow.tsx, + more

</code_context>

<specifics>
## Specific Ideas

- The @theme block from STYLE_GUIDE.md "Configuracion Tailwind" section is ready to copy-paste (27 color tokens + font-mono + 4 radii)
- Research STACK.md has the complete token rename map (21 renames)
- Research PITFALLS.md warns: "the build passes with zero errors" even with broken styles — visual verification is essential
- Satoshi-Variable.woff2 must be downloaded BEFORE starting implementation

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 17-token-foundation-class-migration*
*Context gathered: 2026-04-07*
