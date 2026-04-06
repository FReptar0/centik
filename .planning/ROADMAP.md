# Roadmap: Centik

## Milestones

- v1.0 MVP - Phases 1-11 (shipped 2026-04-06)
- v1.1 Glyph Finance Design System - Phases 12-16 (in progress)

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

### v1.1 Glyph Finance Design System (In Progress)

**Milestone Goal:** Replace the current cyan/dark design system documentation with a Nothing OS-inspired "Glyph Finance" aesthetic across all reference documents. No code changes -- docs-only milestone establishing the visual language for future implementation.

- [x] **Phase 12: Design Tokens** - Replace STYLE_GUIDE.md foundational sections with Glyph Finance color palette, typography, spacing, elevation, and Tailwind config (completed 2026-04-06)
- [x] **Phase 13: Component Specifications** - Update all component specs in STYLE_GUIDE.md to reflect new tokens (cards, buttons, progress bars, charts, inputs, tables, badges) (completed 2026-04-06)
- [x] **Phase 14: Signature Visual Identity** - Document the six distinctive Glyph Finance visual elements that differentiate it from generic dark themes (completed 2026-04-06)
- [ ] **Phase 15: UX Interaction Patterns** - Update UX_RULES.md with new navigation model, amount display, transaction flow, responsive patterns, and form patterns
- [ ] **Phase 16: Reference Synchronization** - Update CLAUDE.md styling section to reference Glyph Finance tokens consistently

## Phase Details

### Phase 12: Design Tokens
**Goal**: STYLE_GUIDE.md foundational sections (colors, typography, spacing, elevation, Tailwind config) are fully rewritten with Glyph Finance tokens, forming the single source of truth for all downstream component and UX documentation
**Depends on**: Nothing (first phase of v1.1)
**Requirements**: TOKENS-01, TOKENS-02, TOKENS-03, TOKENS-04, TOKENS-05
**Success Criteria** (what must be TRUE):
  1. STYLE_GUIDE.md color palette section documents all Glyph Finance tokens (OLED #000000 background, #0A0A0A secondary, #141414 surface, #222222 borders, #E8E8E8 text, #CCFF00 accent, #FF3333 negative, #00E676 positive, #1E1E1E dot-matrix) with named semantic roles
  2. STYLE_GUIDE.md typography section specifies monospaced font (JetBrains Mono or Space Mono) for financial numbers, geometric sans (Outfit or Satoshi) for headings, and a 3-level hierarchy (Display, Body, Meta) with uppercase letterspaced metadata style
  3. STYLE_GUIDE.md spacing and radius section documents the new scale (20-24px card padding, 12px gaps, 16px margins, 16px card radius, 12px button radius, 24px modal radius)
  4. STYLE_GUIDE.md elevation section replaces decorative borders and shadows with background-shift depth hierarchy (#000000 -> #0A0A0A -> #141414) and no visible card borders
  5. STYLE_GUIDE.md Tailwind config section contains a complete CSS @theme block with all Glyph Finance tokens ready for copy-paste into the codebase
**Plans**: 2 plans

Plans:
- [x] 12-01: Color palette, elevation hierarchy, and shadow replacement in STYLE_GUIDE.md
- [ ] 12-02: Typography system, spacing scale, radius values, and Tailwind @theme config in STYLE_GUIDE.md

### Phase 13: Component Specifications
**Goal**: Every component spec in STYLE_GUIDE.md is updated to use Glyph Finance tokens, so a developer implementing any component has unambiguous visual specifications
**Depends on**: Phase 12
**Requirements**: COMP-01, COMP-02, COMP-03, COMP-04, COMP-05, COMP-06, COMP-07
**Success Criteria** (what must be TRUE):
  1. Card spec documents borderless design (#141414 surface on #000000 background) with 1px #222222 separator rule for stacked cards
  2. Button spec documents pill-shaped primary (accent fill, dark text), ghost secondary, and outline tertiary variants with the new radius
  3. Progress bar spec documents segmented battery-bar style (10 rectangular segments, 2px gaps, chartreuse fill) replacing continuous bars
  4. Chart, input, table, and badge specs all reference Glyph Finance tokens exclusively -- no leftover cyan/dark palette references remain in STYLE_GUIDE.md
**Plans**: 2 plans

Plans:
- [ ] 13-01: Card, button, and progress bar component specs
- [ ] 13-02: Chart, input, table, and badge component specs

### Phase 14: Signature Visual Identity
**Goal**: The six distinctive Glyph Finance visual signatures are documented with enough detail that a developer (or Stitch AI) can implement each one from the specification alone
**Depends on**: Phase 12
**Requirements**: SIG-01, SIG-02, SIG-03, SIG-04, SIG-05, SIG-06
**Success Criteria** (what must be TRUE):
  1. Dot-matrix texture spec includes pixel-grid pattern definition (size, color #1E1E1E, 40% opacity), usage contexts (section headers, card accents), and CSS/SVG implementation guidance
  2. Segmented battery-bar spec includes segment count (10), gap size (2px), fill color (chartreuse), and usage mapping (budget progress, credit utilization)
  3. Monospaced financial display spec includes layout rules (left-aligned muted dollar sign at smaller font size, right-aligned off-white digits), font choice, and color-coding by income/expense direction
  4. Category icon, status dot animation, and pixel-dissolve micro-animation specs each include enough visual and behavioral detail to implement without ambiguity
**Plans**: 2 plans

Plans:
- [ ] 14-01: Dot-matrix texture, battery-bar indicator, and monospaced financial display specs
- [ ] 14-02: Category icon style, status dot animation, and pixel-dissolve micro-animation specs

### Phase 15: UX Interaction Patterns
**Goal**: UX_RULES.md is fully updated with Glyph Finance interaction patterns, so every user-facing flow references the new visual language
**Depends on**: Phase 13, Phase 14
**Requirements**: UX-01, UX-02, UX-03, UX-04, UX-05
**Success Criteria** (what must be TRUE):
  1. Navigation section documents icon-only bottom tab bar (no text labels), small dot indicator for active state, and circular accent-filled Add button -- replacing the current text-labeled tab bar spec
  2. Amount display section documents monospaced numbers, muted smaller dollar sign, off-white digits, and color-coding by direction -- consistent with SIG-03 spec
  3. Transaction flow section documents bottom sheet modal (85% screen height), category circular icon grid with accent ring selection, and optional custom dark numpad
  4. Responsive patterns and form patterns sections reference new component specs (pill buttons, underline inputs in modals, uppercase letterspaced labels, circular category grid) with no leftover references to the old design system
**Plans**: TBD

Plans:
- [ ] 15-01: Navigation model, amount display rules, and transaction flow in UX_RULES.md
- [ ] 15-02: Responsive patterns and form patterns in UX_RULES.md

### Phase 16: Reference Synchronization
**Goal**: CLAUDE.md styling section accurately references Glyph Finance tokens, so any Claude session reading CLAUDE.md gets the correct design system context
**Depends on**: Phase 15
**Requirements**: REF-01
**Success Criteria** (what must be TRUE):
  1. CLAUDE.md "Styling Guidelines" section references Glyph Finance colors (#000000 bg, #CCFF00 accent, etc.) instead of the current cyan (#22d3ee) and dark (#0a0f1a) palette
  2. CLAUDE.md font references updated to geometric sans + monospaced number system instead of DM Sans
  3. No contradictions exist between CLAUDE.md styling section and the updated STYLE_GUIDE.md -- a developer reading either document gets consistent guidance
**Plans**: TBD

Plans:
- [ ] 16-01: Update CLAUDE.md styling section, cross-check against STYLE_GUIDE.md and UX_RULES.md for consistency

## Progress

**Execution Order:**
Phases execute in numeric order: 12 -> 13 -> 14 -> 15 -> 16
(Note: Phases 13 and 14 can execute in parallel since both depend only on Phase 12)

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1-11 | v1.0 | 27/27 | Complete | 2026-04-06 |
| 12. Design Tokens | 2/2 | Complete    | 2026-04-06 | - |
| 13. Component Specifications | 2/2 | Complete    | 2026-04-06 | - |
| 14. Signature Visual Identity | 2/2 | Complete    | 2026-04-06 | - |
| 15. UX Interaction Patterns | v1.1 | 0/2 | Not started | - |
| 16. Reference Synchronization | v1.1 | 0/1 | Not started | - |
