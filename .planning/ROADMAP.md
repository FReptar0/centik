# Roadmap: Centik

## Overview

Centik delivers a personal finance tracking app for the Mexican quincenal pay cycle. The roadmap moves from infrastructure reconciliation (Next.js 16, Tailwind v4, Prisma 7 all have breaking changes from documentation assumptions) through foundational libraries, layout shell, and then vertical feature slices ordered by dependency: income sources (simplest CRUD, validates the pattern) to categories and transactions (core loop) to dashboard (read-only aggregation needing transaction data) to debts, budgets, history/period-close (most complex mutation, built last on stable ground), and finally a polish pass for loading states, accessibility, and edge cases.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Infrastructure + Scaffolding** - Reconcile actual installed versions (Next.js 16, Tailwind v4, Prisma 7, ESLint 9), configure toolchain, Docker Compose, passing build with zero tests
- [ ] **Phase 2: Database Schema + Seed** - Prisma schema for all 7 MVP entities + v2 stubs, migrations, idempotent seed with non-zero BigInt amounts
- [ ] **Phase 3: Foundation Libraries** - Utilities, serializer, Zod validators, constants, TypeScript types -- all at 100% test coverage
- [ ] **Phase 4: Layout Shell** - Root layout with dark theme, desktop sidebar, mobile bottom tabs, floating FAB, DynamicIcon, period selector
- [ ] **Phase 5: Income Sources** - Full CRUD for simplest entity, validates Server Component + Server Action pattern end-to-end
- [ ] **Phase 6: Categories + Transactions** - Category list view, transaction quick-add, list with filters, edit/delete, closed-period enforcement
- [ ] **Phase 7: Dashboard** - 6 KPI cards via SQL aggregation, 3 charts (budget bar, trend area, expense donut), recent transactions
- [ ] **Phase 8: Debts** - Credit card and loan tracking with type-specific calculated fields, inline balance editing, summary metrics
- [ ] **Phase 9: Budget Configuration + Progress** - Quincenal budget input, auto-calculated views, progress bars with traffic light, budget-copy-from-previous
- [ ] **Phase 10: History + Period Close** - Annual pivot table, atomic period close transaction, read-only closed periods, reopen capability
- [ ] **Phase 11: Polish + Accessibility** - Skeleton loading states, toast notifications, empty states, a11y audit, form UX refinements

## Phase Details

### Phase 1: Infrastructure + Scaffolding
**Goal**: Developer can run the full toolchain (build, lint, test, dev server) with zero errors on the actual installed versions
**Depends on**: Nothing (first phase)
**Requirements**: INFRA-01, INFRA-02, INFRA-03, INFRA-04, INFRA-05, INFRA-06, INFRA-07
**Success Criteria** (what must be TRUE):
  1. `npm run build` completes with zero errors and zero warnings
  2. `npm run lint` (via `eslint .` with flat config) completes with zero warnings
  3. `npm run test:run` executes Vitest successfully (even with zero test files)
  4. Docker Compose starts dev DB (port 5432) and test DB (port 5433, tmpfs) without manual intervention
  5. Tailwind v4 `@theme` CSS config renders custom dark palette correctly in the dev server
**Plans:** 3 plans

Plans:
- [x] 01-01-PLAN.md -- Restructure to src/ layout, install all dependencies, Docker Compose, environment files
- [ ] 01-02-PLAN.md -- ESLint + Prettier config, Vitest + Playwright setup, Prisma 7 stub schema
- [ ] 01-03-PLAN.md -- Tailwind v4 @theme dark palette, DM Sans font, Recharts validation, full build pass

### Phase 2: Database Schema + Seed
**Goal**: Complete database schema exists with seeded reference data including non-zero monetary amounts that exercise BigInt serialization
**Depends on**: Phase 1
**Requirements**: DB-01, DB-02, DB-03, DB-04, DB-05, DB-06, DB-07, DB-08, DB-09
**Success Criteria** (what must be TRUE):
  1. `npm run prisma migrate dev` applies all migrations cleanly on a fresh database
  2. Seed script creates 8 categories (6 expense + 2 income) with correct Lucide icon names and hex colors
  3. Seed script creates current period, default income sources, default debts, and zero-amount budget entries
  4. Seed is idempotent -- running it twice produces no errors and no duplicate records
  5. All BigInt monetary fields in seed data include at least one non-zero value to validate serialization paths
**Plans**: TBD

Plans:
- [ ] 02-01: TBD
- [ ] 02-02: TBD

### Phase 3: Foundation Libraries
**Goal**: All shared utilities, validators, and types are built and tested to 100% coverage before any feature code depends on them
**Depends on**: Phase 2
**Requirements**: FOUND-01, FOUND-02, FOUND-03, FOUND-04, FOUND-05, FOUND-06, FOUND-07, FOUND-08
**Success Criteria** (what must be TRUE):
  1. `serializeBigInts()` correctly converts nested BigInt fields to strings (verified by tests with non-zero values, arrays, and nested objects)
  2. `formatMoney("15075")` returns "$150.75" in MXN format and handles edge cases (zero, large amounts)
  3. `toCents("150.75")` returns "15075" without float contamination (string-split parsing, not parseFloat * 100)
  4. All Zod schemas (transaction, debt, budget, income source, category) reject invalid input with descriptive errors
  5. `npm run test:coverage` reports 100% coverage on `src/lib/` files
**Plans**: TBD

Plans:
- [ ] 03-01: TBD
- [ ] 03-02: TBD
- [ ] 03-03: TBD

### Phase 4: Layout Shell
**Goal**: Every page renders inside a responsive layout with navigation, period context, and the always-visible quick-add button
**Depends on**: Phase 3
**Requirements**: LAYOUT-01, LAYOUT-02, LAYOUT-03, LAYOUT-04, LAYOUT-05, LAYOUT-06, LAYOUT-07
**Success Criteria** (what must be TRUE):
  1. Desktop viewport shows fixed 240px sidebar with Lucide icons and active state highlighting on current route
  2. Mobile viewport shows bottom tab bar with 5 items (Dashboard, Movimientos, [+], Deudas, Presupuesto)
  3. Floating "+" FAB button is visible on all pages across both desktop and mobile viewports
  4. Period selector displays current month/year and allows navigation to previous periods
  5. DynamicIcon component renders any Lucide icon by its string name from the database
**Plans**: TBD

Plans:
- [ ] 04-01: TBD
- [ ] 04-02: TBD
- [ ] 04-03: TBD

### Phase 5: Income Sources
**Goal**: User can manage all income sources and see how they aggregate into quincenal, monthly, semester, and annual totals
**Depends on**: Phase 4
**Requirements**: INC-01, INC-02, INC-03, INC-04, INC-05, INC-06
**Success Criteria** (what must be TRUE):
  1. User can view a list of income sources showing name, formatted amount, frequency, and calculated monthly equivalent
  2. User can create a new income source with name, amount, frequency, and type -- and it appears in the list without page refresh
  3. User can edit and delete income sources with confirmation dialog on delete
  4. Summary cards display quincenal, monthly, semester, and annual income estimates derived from all sources
**Plans**: TBD

Plans:
- [ ] 05-01: TBD
- [ ] 05-02: TBD

### Phase 6: Categories + Transactions
**Goal**: User can register a financial transaction in under 30 seconds and browse/filter their transaction history for the current period
**Depends on**: Phase 5
**Requirements**: CAT-01, CAT-02, CAT-03, TXN-01, TXN-02, TXN-03, TXN-04, TXN-05, TXN-06, TXN-07, TXN-08, TXN-09, TXN-10
**Success Criteria** (what must be TRUE):
  1. User can view all categories with their Lucide icons, colors, and type (expense/income), and can create custom expense categories
  2. User can register a transaction via quick-add modal in under 30 seconds: toggle type, enter amount, pick category from icon grid, save
  3. Transaction list shows current period entries sorted by date descending with green +$X for income, red -$X for expense
  4. User can filter transactions by category, type, date range, and payment method
  5. User can edit and delete transactions (with inline confirmation on delete), and closed-period transactions are protected server-side
**Plans**: TBD

Plans:
- [ ] 06-01: TBD
- [ ] 06-02: TBD
- [ ] 06-03: TBD
- [ ] 06-04: TBD

### Phase 7: Dashboard
**Goal**: User opens the app and immediately sees their financial health: income, expenses, available balance, debt, savings rate, and visual breakdowns
**Depends on**: Phase 6
**Requirements**: DASH-01, DASH-02, DASH-03, DASH-04, DASH-05, DASH-06, DASH-07
**Success Criteria** (what must be TRUE):
  1. Dashboard displays 6 KPI cards: monthly estimated income, month expenses, available (income - expenses), total debt, savings rate, debt-to-income ratio
  2. Bar chart shows budget vs actual spending per category for the current month
  3. Area/line chart shows income vs expenses trend for the last 6 months (from MonthlySummary data)
  4. Donut chart shows expense distribution by category for the current month
  5. Recent transactions section shows the last 8 movements with category icon, description, date, and formatted amount
**Plans**: TBD

Plans:
- [ ] 07-01: TBD
- [ ] 07-02: TBD
- [ ] 07-03: TBD

### Phase 8: Debts
**Goal**: User can track credit cards and loans with type-specific metrics and see their total debt position at a glance
**Depends on**: Phase 4
**Requirements**: DEBT-01, DEBT-02, DEBT-03, DEBT-04, DEBT-05, DEBT-06, DEBT-07
**Success Criteria** (what must be TRUE):
  1. User can view all debts as expandable cards showing type-specific metrics (credit card: utilization bar, cut-off/payment dates, estimated interest; loan: progress bar, remaining months, total remaining)
  2. User can create a new debt (credit card or personal loan) with type-specific fields
  3. User can update a debt balance inline and delete a debt with confirmation
  4. Summary section shows total debt, total monthly debt payments, and debt-to-income ratio
**Plans**: TBD

Plans:
- [ ] 08-01: TBD
- [ ] 08-02: TBD
- [ ] 08-03: TBD

### Phase 9: Budget Configuration + Progress
**Goal**: User can set quincenal budgets per category and see real-time progress bars showing how much of each budget has been spent
**Depends on**: Phase 6
**Requirements**: BDG-01, BDG-02, BDG-03, BDG-04, BDG-05, BDG-06
**Success Criteria** (what must be TRUE):
  1. User can configure budget amounts per category using quincenal input, with calculated monthly/semester/annual columns displayed
  2. Total row shows quincenal income vs total quincenal budget with surplus/deficit indicator
  3. Progress bars per category show % spent with traffic light coloring (green <80%, orange 80-100%, red >100%)
  4. If no budget exists for the current period, budgets are automatically copied from the previous period
**Plans**: TBD

Plans:
- [ ] 09-01: TBD
- [ ] 09-02: TBD
- [ ] 09-03: TBD

### Phase 10: History + Period Close
**Goal**: User can close a month to lock it as a permanent financial record and view annual history across all closed periods
**Depends on**: Phase 7, Phase 8, Phase 9
**Requirements**: HIST-01, HIST-02, HIST-03, HIST-04, HIST-05, HIST-06
**Success Criteria** (what must be TRUE):
  1. Annual pivot table displays 12 months of data (income, expenses, savings, savings rate, debt at close, debt payments) with annual totals
  2. Period close button triggers atomic transaction: calculates totals, creates MonthlySummary, marks period closed, creates next period, copies budgets
  3. Confirmation modal shows preview of totals before close, and closed periods display lock icon with read-only banner
  4. User can reopen a closed period (deletes MonthlySummary, unlocks editing)
**Plans**: TBD

Plans:
- [ ] 10-01: TBD
- [ ] 10-02: TBD
- [ ] 10-03: TBD

### Phase 11: Polish + Accessibility
**Goal**: Every page has proper loading states, error feedback, empty states, and meets baseline accessibility standards
**Depends on**: Phase 10
**Requirements**: UX-01, UX-02, UX-03, UX-04, UX-05, UX-06, UX-07, UX-08, UX-09
**Success Criteria** (what must be TRUE):
  1. All mutations show toast notifications (green success for 3s, red error for 5s) via sonner
  2. Every page route has a `loading.tsx` with skeleton placeholders (no generic spinners)
  3. All sections with no data show empty states with descriptive icon, text, and call-to-action button
  4. Amount inputs show numeric keyboard on mobile, "$" prefix, right-aligned text, and comma formatting on blur
  5. All interactive elements have visible focus rings, semantic HTML uses nav/main/section with aria-labelledby, and monetary amounts use tabular-nums
**Plans**: TBD

Plans:
- [ ] 11-01: TBD
- [ ] 11-02: TBD
- [ ] 11-03: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8 -> 9 -> 10 -> 11

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Infrastructure + Scaffolding | 0/3 | Planning complete | - |
| 2. Database Schema + Seed | 0/2 | Not started | - |
| 3. Foundation Libraries | 0/3 | Not started | - |
| 4. Layout Shell | 0/3 | Not started | - |
| 5. Income Sources | 0/2 | Not started | - |
| 6. Categories + Transactions | 0/4 | Not started | - |
| 7. Dashboard | 0/3 | Not started | - |
| 8. Debts | 0/3 | Not started | - |
| 9. Budget Configuration + Progress | 0/3 | Not started | - |
| 10. History + Period Close | 0/3 | Not started | - |
| 11. Polish + Accessibility | 0/3 | Not started | - |
