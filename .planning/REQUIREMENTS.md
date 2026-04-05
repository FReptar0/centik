# Requirements: Centik

**Defined:** 2026-04-04
**Core Value:** A single user can register a financial transaction in under 30 seconds and immediately see how it impacts their budget, debt ratio, and savings rate across all views.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Infrastructure

- [x] **INFRA-01**: Project scaffolded with Next.js 16, TypeScript strict, Tailwind v4, Prisma 7, npm
- [x] **INFRA-02**: Docker Compose for dev PostgreSQL (port 5432) and test PostgreSQL (port 5433, tmpfs)
- [x] **INFRA-03**: ESLint flat config + Prettier configured with zero warnings
- [x] **INFRA-04**: Vitest configured for unit tests with coverage reporting
- [x] **INFRA-05**: Playwright configured for E2E tests
- [x] **INFRA-06**: `npm run build` passes with zero errors and zero warnings
- [x] **INFRA-07**: Environment files (.env, .env.example, .env.test) configured

### Database

- [x] **DB-01**: Prisma schema defines all 7 MVP entities (IncomeSource, Transaction, Category, Debt, Budget, Period, MonthlySummary)
- [x] **DB-02**: All monetary fields stored as BigInt (centavos), interest rates as Int (basis points)
- [x] **DB-03**: Enums defined: TransactionType, Frequency, DebtType, PaymentMethod, CategoryType
- [x] **DB-04**: Indexes on Transaction(periodId, date), Transaction(categoryId), Budget(periodId, categoryId) unique, Period(month, year) unique
- [x] **DB-05**: Seed script creates default categories (6 expense + 2 income) with Lucide icon names and colors
- [x] **DB-06**: Seed script creates default income sources (TerSoft quincenal, Freelance variable)
- [x] **DB-07**: Seed script creates default debts (1 credit card, 1 personal loan, with realistic non-zero balances for demo)
- [x] **DB-08**: Seed script creates current period with non-zero quincenal budget entries, plus 1 closed previous month with MonthlySummary
- [x] **DB-09**: v2 entities (ValueUnit, UnitRate, Asset) included in schema but no UI/API

### Foundation

- [ ] **FOUND-01**: `serializeBigInts()` correctly converts BigInt fields to String in nested objects and arrays
- [ ] **FOUND-02**: `formatMoney()` converts cents string to MXN currency display ($1,234.56)
- [ ] **FOUND-03**: `toCents()` converts user decimal input to cents string without float contamination
- [ ] **FOUND-04**: `parseCents()` converts string to BigInt for DB operations
- [ ] **FOUND-05**: `formatRate()` converts basis points to percentage display (4500 → "45.00%")
- [ ] **FOUND-06**: Zod schemas defined for all mutation endpoints (transaction, debt, budget, income source, category)
- [ ] **FOUND-07**: 100% test coverage on all utility functions and Zod schemas
- [ ] **FOUND-08**: `cn()` utility (clsx + tailwind-merge) for conditional class names

### Layout

- [ ] **LAYOUT-01**: Root layout with dark theme (bg #0a0f1a), DM Sans font, and Tailwind v4 custom color palette
- [ ] **LAYOUT-02**: Desktop sidebar navigation (fixed, 240px) with Lucide icons and active state highlighting
- [ ] **LAYOUT-03**: Mobile bottom tab bar (5 items: Dashboard, Movimientos, [+], Deudas, Presupuesto)
- [ ] **LAYOUT-04**: Floating "+" FAB button for quick transaction entry (always visible)
- [ ] **LAYOUT-05**: Page header pattern with title, period indicator, and primary action button
- [ ] **LAYOUT-06**: Period selector showing current month/year with navigation to previous periods
- [ ] **LAYOUT-07**: DynamicIcon component that renders Lucide icons by name from DB string

### Income Sources

- [ ] **INC-01**: User can view list of income sources with name, amount, frequency, and monthly equivalent
- [ ] **INC-02**: User can create a new income source with name, default amount, frequency, and type
- [ ] **INC-03**: User can edit an existing income source
- [ ] **INC-04**: User can delete an income source with confirmation
- [ ] **INC-05**: Variable frequency sources show 3-month average (or available months if <3)
- [ ] **INC-06**: Summary cards show quincenal, monthly, semester, and annual income estimates

### Categories

- [ ] **CAT-01**: User can view all categories with icons, colors, and type (expense/income)
- [ ] **CAT-02**: User can create a custom expense category with name, Lucide icon name, and color
- [ ] **CAT-03**: Default categories are not deletable (isDefault=true)

### Transactions

- [ ] **TXN-01**: User can register a transaction in under 30 seconds via quick-add modal
- [ ] **TXN-02**: Quick-add modal: toggle expense/income, amount input (auto-focus, numeric keyboard), category icon grid, save button
- [ ] **TXN-03**: Optional fields collapsed by default: description, payment method, notes, date (defaults to today)
- [ ] **TXN-04**: User can view transaction list for current period, sorted by date descending
- [ ] **TXN-05**: User can filter transactions by category, type (income/expense), date range, and payment method
- [ ] **TXN-06**: User can edit an existing transaction
- [ ] **TXN-07**: User can delete a transaction with inline confirmation
- [ ] **TXN-08**: Transactions in closed periods cannot be created/edited/deleted (enforced server-side)
- [ ] **TXN-09**: Income transactions optionally link to an income source
- [ ] **TXN-10**: Transaction amounts display with sign and color: green +$X for income, red -$X for expense

### Dashboard

- [ ] **DASH-01**: KPI cards: monthly estimated income, month expenses, available (income - expenses), total debt, savings rate, debt-to-income ratio
- [ ] **DASH-02**: Bar chart: budget vs actual spending per category (current month)
- [ ] **DASH-03**: Area/line chart: income vs expenses trend (last 6 months from MonthlySummary)
- [ ] **DASH-04**: Donut chart: expense distribution by category (current month)
- [ ] **DASH-05**: Recent transactions list (last 8) with category icon, description, date, and amount
- [ ] **DASH-06**: All KPIs computed via SQL aggregation queries (not client-side)
- [ ] **DASH-07**: Empty states with descriptive text and CTA when no data exists

### Debts

- [ ] **DEBT-01**: User can view all active debts as expandable cards with type-specific metrics
- [ ] **DEBT-02**: Credit card view: utilization bar (green <30%, orange 30-70%, red >70%), minimum payment, cut-off/payment dates, estimated monthly interest
- [ ] **DEBT-03**: Loan view: progress bar (% paid), monthly payment, remaining months, total remaining
- [ ] **DEBT-04**: User can create a new debt (credit card or personal loan) with type-specific fields
- [ ] **DEBT-05**: User can update debt balance (inline edit or modal)
- [ ] **DEBT-06**: User can delete a debt with confirmation
- [ ] **DEBT-07**: Summary: total debt, total monthly debt payments, debt-to-income ratio

### Budget

- [ ] **BDG-01**: User can configure budget per category with quincenal amount input
- [ ] **BDG-02**: Calculated columns display: monthly (x2), semester (x6), annual (x12)
- [ ] **BDG-03**: Total row and comparison: quincenal income vs total quincenal budget → surplus/deficit
- [ ] **BDG-04**: Progress bars per category showing % spent with traffic light (green <80%, orange 80-100%, red >100%)
- [ ] **BDG-05**: Budget amounts and spent shown side-by-side per category
- [ ] **BDG-06**: If no budget exists for current period, copy from previous period automatically

### History

- [ ] **HIST-01**: Annual pivot table: rows = metrics (income, expenses, savings, savings rate, debt at close, debt payments), columns = Jan-Dec + annual total
- [ ] **HIST-02**: Year selector to navigate between years
- [ ] **HIST-03**: Period close button triggers atomic transaction: calculate totals → create MonthlySummary → mark period closed → create next period → copy budgets
- [ ] **HIST-04**: Confirmation modal before close showing preview of totals
- [ ] **HIST-05**: Closed periods show lock icon and read-only banner across all views
- [ ] **HIST-06**: User can reopen a closed period (deletes MonthlySummary, unlocks editing)

### UX & Polish

- [ ] **UX-01**: Toast notifications for all mutations (success: 3s green, error: 5s red)
- [ ] **UX-02**: Skeleton loading states for all pages (no generic spinners)
- [ ] **UX-03**: Empty states with icon, descriptive text, and CTA for all sections
- [ ] **UX-04**: Form validation on blur with error messages below inputs
- [ ] **UX-05**: Amount inputs: numeric keyboard on mobile, "$" prefix, right-aligned, comma formatting on blur
- [ ] **UX-06**: Focus-visible rings on all interactive elements (a11y)
- [ ] **UX-07**: Semantic HTML: nav, main, section with aria-labelledby, proper table markup
- [ ] **UX-08**: All monetary amounts use tabular-nums for column alignment
- [ ] **UX-09**: Loading.tsx Suspense boundaries on each page route

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Value Units & Assets

- **UNIT-01**: User can configure value units (UDI, UMA, USD) with API provider details
- **UNIT-02**: Automatic rate refresh via cron/API route based on configurable interval
- **UNIT-03**: User can create/edit/delete assets linked to value units
- **UNIT-04**: Asset list shows native amount + MXN equivalent at latest rate
- **UNIT-05**: Portfolio total in MXN

### Authentication

- **AUTH-01**: User authentication via NextAuth or Clerk
- **AUTH-02**: Session management across browser refresh

### Platform

- **PLAT-01**: PWA with offline support
- **PLAT-02**: CSV/PDF statement import
- **PLAT-03**: Debt payoff simulator (avalanche vs snowball)
- **PLAT-04**: Savings goals with tracking
- **PLAT-05**: Export reports (PDF/Excel)
- **PLAT-06**: Notification alerts for cut-off/payment dates

## Out of Scope

| Feature | Reason |
|---------|--------|
| Bank API connections | Mexican bank APIs are unreliable; manual entry with fast UX is the strategy |
| AI categorization | Single user already knows categories; adds unpredictability |
| Multi-currency in MVP | MXN only; v2 ValueUnit system handles UDI/UMA/USD |
| Light mode | Doubles styling work; dark-only is the design decision |
| Real-time notifications | Single user, no urgency; passive date display suffices |
| Complex investments | Options, futures, rebalancing — out of scope entirely |
| Client-side state management | React state + Server Components is sufficient |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFRA-01 | Phase 1 | Complete |
| INFRA-02 | Phase 1 | Complete |
| INFRA-03 | Phase 1 | Complete |
| INFRA-04 | Phase 1 | Complete |
| INFRA-05 | Phase 1 | Complete |
| INFRA-06 | Phase 1 | Complete |
| INFRA-07 | Phase 1 | Complete |
| DB-01 | Phase 2 | Complete |
| DB-02 | Phase 2 | Complete |
| DB-03 | Phase 2 | Complete |
| DB-04 | Phase 2 | Complete |
| DB-05 | Phase 2 | Complete |
| DB-06 | Phase 2 | Complete |
| DB-07 | Phase 2 | Complete |
| DB-08 | Phase 2 | Complete |
| DB-09 | Phase 2 | Complete |
| FOUND-01 | Phase 3 | Pending |
| FOUND-02 | Phase 3 | Pending |
| FOUND-03 | Phase 3 | Pending |
| FOUND-04 | Phase 3 | Pending |
| FOUND-05 | Phase 3 | Pending |
| FOUND-06 | Phase 3 | Pending |
| FOUND-07 | Phase 3 | Pending |
| FOUND-08 | Phase 3 | Pending |
| LAYOUT-01 | Phase 4 | Pending |
| LAYOUT-02 | Phase 4 | Pending |
| LAYOUT-03 | Phase 4 | Pending |
| LAYOUT-04 | Phase 4 | Pending |
| LAYOUT-05 | Phase 4 | Pending |
| LAYOUT-06 | Phase 4 | Pending |
| LAYOUT-07 | Phase 4 | Pending |
| INC-01 | Phase 5 | Pending |
| INC-02 | Phase 5 | Pending |
| INC-03 | Phase 5 | Pending |
| INC-04 | Phase 5 | Pending |
| INC-05 | Phase 5 | Pending |
| INC-06 | Phase 5 | Pending |
| CAT-01 | Phase 6 | Pending |
| CAT-02 | Phase 6 | Pending |
| CAT-03 | Phase 6 | Pending |
| TXN-01 | Phase 6 | Pending |
| TXN-02 | Phase 6 | Pending |
| TXN-03 | Phase 6 | Pending |
| TXN-04 | Phase 6 | Pending |
| TXN-05 | Phase 6 | Pending |
| TXN-06 | Phase 6 | Pending |
| TXN-07 | Phase 6 | Pending |
| TXN-08 | Phase 6 | Pending |
| TXN-09 | Phase 6 | Pending |
| TXN-10 | Phase 6 | Pending |
| DASH-01 | Phase 7 | Pending |
| DASH-02 | Phase 7 | Pending |
| DASH-03 | Phase 7 | Pending |
| DASH-04 | Phase 7 | Pending |
| DASH-05 | Phase 7 | Pending |
| DASH-06 | Phase 7 | Pending |
| DASH-07 | Phase 7 | Pending |
| DEBT-01 | Phase 8 | Pending |
| DEBT-02 | Phase 8 | Pending |
| DEBT-03 | Phase 8 | Pending |
| DEBT-04 | Phase 8 | Pending |
| DEBT-05 | Phase 8 | Pending |
| DEBT-06 | Phase 8 | Pending |
| DEBT-07 | Phase 8 | Pending |
| BDG-01 | Phase 9 | Pending |
| BDG-02 | Phase 9 | Pending |
| BDG-03 | Phase 9 | Pending |
| BDG-04 | Phase 9 | Pending |
| BDG-05 | Phase 9 | Pending |
| BDG-06 | Phase 9 | Pending |
| HIST-01 | Phase 10 | Pending |
| HIST-02 | Phase 10 | Pending |
| HIST-03 | Phase 10 | Pending |
| HIST-04 | Phase 10 | Pending |
| HIST-05 | Phase 10 | Pending |
| HIST-06 | Phase 10 | Pending |
| UX-01 | Phase 11 | Pending |
| UX-02 | Phase 11 | Pending |
| UX-03 | Phase 11 | Pending |
| UX-04 | Phase 11 | Pending |
| UX-05 | Phase 11 | Pending |
| UX-06 | Phase 11 | Pending |
| UX-07 | Phase 11 | Pending |
| UX-08 | Phase 11 | Pending |
| UX-09 | Phase 11 | Pending |

**Coverage:**
- v1 requirements: 72 total
- Mapped to phases: 72
- Unmapped: 0

---
*Requirements defined: 2026-04-04*
*Last updated: 2026-04-04 — INFRA-01 and INFRA-06 corrected from pnpm to npm per locked user decision*
