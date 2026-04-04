# Architecture Patterns

**Domain:** Personal finance tracking web app (Mexican quincenal cycle)
**Researched:** 2026-04-04
**Overall confidence:** HIGH

---

## Recommended Architecture

Centik follows a **Server Component-first, Server Action-preferred** architecture on Next.js 16 App Router with PostgreSQL via Prisma. The system is a single-user CRUD application with aggregation-heavy dashboard views, meaning the architecture optimizes for: (1) minimal client-side JavaScript, (2) server-side data aggregation, and (3) a clean serialization boundary between BigInt storage and string-based client consumption.

### High-Level System Diagram

```
                         Browser (Client)
                              |
          ┌───────────────────┼───────────────────┐
          |                   |                    |
   Server Components    Client Components    Server Actions
   (pages, layouts)     (forms, charts,      (mutations via
                         modals, sidebar)     'use server')
          |                   |                    |
          └───────────────────┼───────────────────┘
                              |
                   serializeBigInts() boundary
                              |
                    ┌─────────┴─────────┐
                    |                   |
               Prisma ORM         API Routes
               (direct DB)        (external/fallback)
                    |                   |
                    └─────────┬─────────┘
                              |
                      PostgreSQL (Docker)
                      bigint centavos
```

### Architecture Layers

| Layer | Technology | Responsibility |
|-------|-----------|---------------|
| **Presentation** | React Server Components + Client Components | Render UI, convert cents-string to display format, convert user input to cents-string |
| **Mutation** | Server Actions (`'use server'`) | Validate with Zod, execute Prisma writes, call `revalidatePath()` |
| **Query** | Prisma in Server Components | Direct database reads, SQL aggregations for KPIs/charts |
| **Serialization** | `serializeBigInts()` | Convert BigInt to String at the server/client boundary |
| **Persistence** | PostgreSQL via Prisma | Store all monetary values as `bigint` centavos, rates as `int` basis points |
| **Validation** | Zod schemas | Validate all inputs at the mutation layer before any DB operation |

---

## Component Boundaries

### 1. Page Components (Server Components)

Each route has a Server Component page that fetches data and passes serialized props downward. Pages never contain interactive logic -- they orchestrate data flow.

| Component | Path | Responsibility | Communicates With |
|-----------|------|---------------|-------------------|
| Dashboard | `app/page.tsx` | Fetch KPIs, chart data, recent transactions via parallel `Promise.all` | KPICards, ExpensePieChart, BudgetBarChart, TrendAreaChart, RecentTransactions |
| Movimientos | `app/movimientos/page.tsx` | Fetch transactions (filtered), categories, income sources | TransactionFilters, TransactionList, TransactionForm |
| Deudas | `app/deudas/page.tsx` | Fetch debts, monthly income for ratio calculation | DebtCard, DebtForm |
| Presupuesto | `app/presupuesto/page.tsx` | Fetch budgets with spent amounts, quincenal income | BudgetTable, BudgetProgress |
| Ingresos | `app/ingresos/page.tsx` | Fetch income sources, variable averages | IncomeSourceCard, IncomeSourceForm |
| Historial | `app/historial/page.tsx` | Fetch MonthlySummaries for year, available years | HistoryTable, PeriodCloseModal |

### 2. Client Components (Interactive)

These handle user interaction, local form state, and chart rendering. They never fetch data directly -- they receive serialized data as props and call Server Actions for mutations.

| Component | Type | Why Client | Receives From |
|-----------|------|-----------|--------------|
| TransactionForm | Form | Controlled inputs, toggle, category grid, modal lifecycle | Server Component props (categories, income sources) |
| TransactionFilters | Interaction | Filter state management, URL query param sync | Server Component props (categories) |
| DebtForm | Form | Inline editing, modal for full edit | Server Component props (debt data) |
| BudgetTable | Form | Inline editable cells for quincenal amounts | Server Component props (budgets + spent) |
| IncomeSourceForm | Form | Modal with controlled inputs | Server Component props |
| PeriodCloseModal | Modal | Confirmation dialog with preview data | Server Component props (period totals) |
| KPICards | Display | Only if animated transitions needed; otherwise Server Component | Props from Dashboard page |
| ExpensePieChart | Chart | Recharts requires DOM access | Serialized chart data arrays |
| BudgetBarChart | Chart | Recharts requires DOM access | Serialized chart data arrays |
| TrendAreaChart | Chart | Recharts requires DOM access | Serialized chart data arrays |
| Sidebar | Navigation | Toggle state on mobile, active route highlighting | Layout props |
| MobileNav | Navigation | Bottom tab bar, FAB button | Layout props |
| Modal | UI Primitive | Overlay, escape handling, focus trap | Any parent component |

### 3. Shared Library Layer

Pure functions and utilities with zero side effects. These are the foundation -- built and tested first.

| Module | Purpose | Used By |
|--------|---------|---------|
| `lib/prisma.ts` | Singleton Prisma client | All Server Components, Server Actions, API Routes |
| `lib/serialize.ts` | `serializeBigInts()` -- BigInt to String conversion | Every data-fetching Server Component and API Route |
| `lib/utils.ts` | `formatMoney()`, `toCents()`, `parseCents()`, `formatRate()`, `formatUnitAmount()`, date helpers | Client Components (display), Server Actions (conversion) |
| `lib/validators.ts` | Zod schemas for every entity mutation | Server Actions, API Routes |
| `lib/constants.ts` | Color palette, category defaults, pagination limits | Components, seed script |
| `types/index.ts` | Shared TypeScript interfaces | Everywhere |

### 4. Server Actions Layer

Server Actions are the preferred mutation mechanism. Each action validates input, performs the write, and calls `revalidatePath()` for affected routes. They live in dedicated files colocated with their domain.

| Action Module | Actions | Revalidation Targets |
|---------------|---------|---------------------|
| `actions/transactions.ts` | createTransaction, updateTransaction, deleteTransaction | `/`, `/movimientos`, `/presupuesto` |
| `actions/debts.ts` | createDebt, updateDebt, deleteDebt | `/`, `/deudas` |
| `actions/budgets.ts` | upsertBudgets | `/`, `/presupuesto` |
| `actions/income-sources.ts` | createIncomeSource, updateIncomeSource, deleteIncomeSource | `/`, `/ingresos`, `/presupuesto` |
| `actions/categories.ts` | createCategory | `/movimientos` |
| `actions/periods.ts` | closePeriod, reopenPeriod | `/`, `/historial`, `/presupuesto` |

### 5. API Routes (Fallback)

API Routes exist only for cases where Server Actions are insufficient. In this project, that means:

| Route | Reason Not Server Action |
|-------|------------------------|
| `GET /api/dashboard` | Complex aggregation endpoint that could be called by future external tools |
| `GET /api/dashboard/trend` | Separate data endpoint for 6-month trend |
| `GET /api/history/[year]` | Read-only data endpoint |
| `POST /api/cron/refresh-rates` | v2.0: External cron invocation target |

All other CRUD operations use Server Actions.

---

## Data Flow

### Read Path (Server Components)

```
1. User navigates to /movimientos
2. Next.js renders app/movimientos/page.tsx (Server Component)
3. Page calls Prisma directly:
   - getCurrentPeriod()
   - getTransactions({ periodId, filters })
   - getCategories()
   - getIncomeSources()
4. Results contain BigInt fields
5. Page calls serializeBigInts() on each result set
6. Serialized data (BigInt -> String) passed as props to child components
7. Client Components render, calling formatMoney(centsStr) for display
```

### Write Path (Server Actions)

```
1. User fills TransactionForm (Client Component)
2. User input: "$150.75" -> toCents(150.75) -> "15075" (in the component)
3. Form calls Server Action: createTransaction({ amount: "15075", ... })
4. Server Action:
   a. Validates with Zod (createTransactionSchema)
   b. Checks period is not closed
   c. Prisma create with BigInt(amount)
   d. revalidatePath('/') 
   e. revalidatePath('/movimientos')
   e. revalidatePath('/presupuesto')
5. Next.js re-renders affected Server Components with fresh data
6. Client sees updated list + toast confirmation
```

### The Serialization Boundary

This is the single most important architectural concept in the project. The boundary is a one-directional conversion wall:

```
PostgreSQL (bigint)
       |
  Prisma Client (JavaScript BigInt)
       |
  serializeBigInts() -- CONVERTS BigInt -> String
       |
  Server Component props / API Response (String)
       |
  Client Component (receives String, never BigInt)
       |
  formatMoney("15075") -> "$150.75" (display only)
  toCents(150.75) -> "15075" (submission only)
       |
  Server Action receives String
       |
  BigInt("15075") -> Prisma write
```

**Rules:**
- No Client Component ever sees a JavaScript `BigInt`
- No business logic operates on floating point numbers
- Conversion to/from display format happens ONLY in the presentation layer
- `serializeBigInts()` is called in exactly one place per data path: the Server Component or API Route that first receives Prisma results

### Dashboard Data Flow (Most Complex Read)

The Dashboard is the most query-intensive page. All queries run in parallel:

```
app/page.tsx (Server Component)
|
+-- Promise.all([
|     getDashboardKPIs(),         // 4 aggregation queries in parallel
|     getCategoryExpenses(),       // 1 GROUP BY query for pie chart
|     getBudgetVsSpent(),          // 1 JOIN + GROUP BY for bar chart
|     getMonthlyTrend(),           // 1 query on MonthlySummary (6 months)
|     getRecentTransactions(),     // 1 query with LIMIT 8
|   ])
|
+-- serializeBigInts() on each result
|
+-- Props to children:
    +-- <KPICards data={kpis} />                  (could be Server or Client)
    +-- <ExpensePieChart data={expenses} />        (Client -- Recharts)
    +-- <BudgetBarChart data={budget} />            (Client -- Recharts)
    +-- <TrendAreaChart data={trend} />             (Client -- Recharts)
    +-- <RecentTransactions data={txns} />          (Server Component)
```

### Period Close Data Flow (Most Complex Write)

This is the most critical mutation -- a multi-table atomic transaction:

```
1. User clicks "Cerrar Abril 2026" on Historial page
2. PeriodCloseModal shows preview (calculated from props already in Server Component)
3. User confirms -> calls closePeriod Server Action

closePeriod Server Action:
|
+-- Verify period is not already closed
+-- prisma.$transaction(async (tx) => {
|     // 1. Calculate totals
|     totalIncome = SUM(Transaction.amount WHERE type=INCOME AND periodId)
|     totalExpenses = SUM(Transaction.amount WHERE type=EXPENSE AND periodId)
|     debtAtClose = SUM(Debt.currentBalance WHERE isActive=true)
|
|     // 2. Create MonthlySummary snapshot
|     tx.monthlySummary.create({ data: { totalIncome, totalExpenses, ... } })
|
|     // 3. Close period
|     tx.period.update({ where: { id }, data: { isClosed: true, closedAt: now() } })
|
|     // 4. Create next period if not exists
|     tx.period.create({ data: { month: nextMonth, year: nextYear, ... } })
|
|     // 5. Copy budgets to next period
|     budgets = tx.budget.findMany({ where: { periodId: id } })
|     tx.budget.createMany({ data: budgets.map(b => ({ ...b, id: undefined, periodId: nextPeriod.id })) })
|   })
|
+-- revalidatePath('/')
+-- revalidatePath('/historial')
+-- revalidatePath('/presupuesto')
```

### View Dependency Map

When an entity changes, these views need revalidation:

```
Transaction mutation   -> /, /movimientos, /presupuesto
Debt mutation          -> /, /deudas
Budget mutation        -> /, /presupuesto
IncomeSource mutation  -> /, /ingresos, /presupuesto
Period close/reopen    -> /, /historial, /presupuesto
```

---

## Patterns to Follow

### Pattern 1: Server Component Data Fetching with Parallel Queries

**What:** Pages use `Promise.all` to run independent Prisma queries in parallel, then serialize results before passing to children.

**When:** Any page that needs multiple independent data sources (Dashboard, Movimientos, Presupuesto).

**Example:**

```typescript
// app/page.tsx (Server Component)
import { prisma } from '@/lib/prisma'
import { serializeBigInts } from '@/lib/serialize'

export default async function DashboardPage() {
  const [kpis, expenses, budgetVsSpent, trend, recentTxns] = await Promise.all([
    getDashboardKPIs(),
    getCategoryExpenses(),
    getBudgetVsSpent(),
    getMonthlyTrend(),
    getRecentTransactions(),
  ])

  return (
    <main>
      <KPICards data={serializeBigInts(kpis)} />
      <ExpensePieChart data={serializeBigInts(expenses)} />
      <BudgetBarChart data={serializeBigInts(budgetVsSpent)} />
      <TrendAreaChart data={serializeBigInts(trend)} />
      <RecentTransactions data={serializeBigInts(recentTxns)} />
    </main>
  )
}
```

### Pattern 2: Server Actions with Zod Validation

**What:** All mutations go through Server Actions that validate input with Zod, execute Prisma writes, and revalidate affected paths.

**When:** Every create/update/delete operation.

**Example:**

```typescript
// actions/transactions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { createTransactionSchema } from '@/lib/validators'

export async function createTransaction(data: unknown) {
  const validated = createTransactionSchema.safeParse(data)
  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors }
  }

  const { amount, categoryId, date, type, ...rest } = validated.data

  // Verify period is open
  const period = await getCurrentPeriod()
  if (period.isClosed) {
    return { error: 'El periodo esta cerrado' }
  }

  await prisma.transaction.create({
    data: {
      amount: BigInt(amount),
      categoryId,
      date: new Date(date),
      type,
      periodId: period.id,
      ...rest,
    },
  })

  revalidatePath('/')
  revalidatePath('/movimientos')
  revalidatePath('/presupuesto')

  return { success: true }
}
```

### Pattern 3: Dynamic Icon Rendering via Static Map

**What:** Category icons are stored as Lucide icon name strings in the database and resolved at render time via a static map. Avoids dynamic imports of the entire Lucide library.

**When:** Rendering any category-associated icon (transaction lists, category grids, chart legends).

**Example:**

```typescript
// components/ui/DynamicIcon.tsx
import {
  Utensils, Zap, Clapperboard, Smartphone,
  Car, Package, Briefcase, Laptop, type LucideIcon
} from 'lucide-react'

const iconMap: Record<string, LucideIcon> = {
  utensils: Utensils,
  zap: Zap,
  clapperboard: Clapperboard,
  smartphone: Smartphone,
  car: Car,
  package: Package,
  briefcase: Briefcase,
  laptop: Laptop,
}

interface DynamicIconProps {
  name: string
  size?: number
  className?: string
}

export default function DynamicIcon({ name, size = 16, className }: DynamicIconProps) {
  const Icon = iconMap[name] ?? Package
  return <Icon size={size} className={className} />
}
```

### Pattern 4: Automatic Period Resolution

**What:** The current period is resolved (and created if missing) in the root layout or a shared data-fetching utility, ensuring every page always has a valid current period.

**When:** App load, month boundary crossing.

**Example:**

```typescript
// lib/periods.ts
import { prisma } from '@/lib/prisma'

export async function getCurrentPeriod() {
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()

  let period = await prisma.period.findUnique({
    where: { month_year: { month, year } },
  })

  if (!period) {
    period = await prisma.period.create({
      data: {
        month,
        year,
        startDate: new Date(year, month - 1, 1),
        endDate: new Date(year, month, 0),
        isClosed: false,
      },
    })
  }

  return period
}
```

### Pattern 5: Prisma Client Singleton

**What:** Single Prisma Client instance stored in `globalThis` to prevent connection pool exhaustion during Next.js hot reload in development.

**When:** Always. This is the only way to import Prisma.

**Example:**

```typescript
// lib/prisma.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma || new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Fetching Data in Client Components

**What:** Using `useEffect` + `fetch` in Client Components to load data.

**Why bad:** Causes waterfalls, requires loading states the user sees, adds unnecessary client-side JavaScript, bypasses Server Component benefits, and requires manual serialization handling.

**Instead:** Fetch in Server Components, pass serialized data as props. If a Client Component needs fresh data after a mutation, use `revalidatePath()` in the Server Action to trigger a Server Component re-render.

### Anti-Pattern 2: Passing Raw Prisma Results to Client Components

**What:** Returning Prisma query results directly as props without calling `serializeBigInts()`.

**Why bad:** BigInt values crash `JSON.stringify` at the RSC serialization boundary. The error is "Do not know how to serialize a BigInt" and it breaks the entire page render.

**Instead:** Always call `serializeBigInts()` on Prisma results before passing as props or returning from API Routes.

### Anti-Pattern 3: Money Arithmetic with JavaScript `number`

**What:** Using `Number()` on centavo strings to perform calculations like subtraction or percentage.

**Why bad:** Floating point precision loss. `0.1 + 0.2 !== 0.3` in JavaScript. For financial calculations, even small errors compound.

**Instead:** All arithmetic in Server Components, Server Actions, or SQL uses `BigInt`. The only place `Number()` appears is in `formatMoney()` for display-only formatting, where precision loss on a final display value is acceptable.

### Anti-Pattern 4: Fat API Routes for Internal Mutations

**What:** Creating REST API routes for every CRUD operation, then calling them with `fetch()` from Client Components.

**Why bad:** Unnecessary HTTP overhead. Server Actions are called like functions and Next.js handles the transport. API Routes add boilerplate (request parsing, response formatting) that Server Actions handle automatically.

**Instead:** Use Server Actions for all mutations called from your own UI. Reserve API Routes for external consumers (cron jobs, future integrations).

### Anti-Pattern 5: Global State Management Libraries

**What:** Adding Redux, Zustand, or similar for managing application state.

**Why bad:** Server Components handle most data display. The few pieces of client state (form inputs, modal open/close, filter selections) are local to individual components. A global store adds complexity and bundle size for zero benefit in this architecture.

**Instead:** React `useState` for local component state. URL search params for filter state that needs to survive navigation. Server Components for all data that comes from the database.

### Anti-Pattern 6: Using `use cache` for Personal Data

**What:** Applying the new `use cache` directive to pages or components that display personal financial data.

**Why bad:** This app serves a single user with entirely personal, always-changing data. Caching responses would risk serving stale financial data. The `use cache` feature in Next.js 16 is designed for content that benefits from caching (blog posts, product catalogs) -- not real-time personal data.

**Instead:** Let all pages render dynamically per-request. The data is fast to query (single-user, small dataset) and must always be fresh.

---

## Key Architecture Decisions for Next.js 16

### params is Now a Promise

In Next.js 16 (since v15.0.0-RC), dynamic route `params` are a Promise and must be awaited:

```typescript
// API Route in Next.js 16
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params  // MUST await
  // ...
}
```

This applies to all dynamic route handlers and page components.

### Server Functions (not Server Actions)

Next.js 16 docs refer to these as "Server Functions" -- functions marked with `'use server'`. The term "Server Actions" is being phased out in the docs, but the functionality is identical. The project documentation uses both terms interchangeably.

### `revalidatePath()` Behavior in Server Functions

In Next.js 16, `revalidatePath()` called from a Server Function updates the UI immediately if the user is viewing the affected path. For other paths, it marks them for revalidation on next visit. This is the correct behavior for Centik's mutation -> revalidation pattern.

### Default Dynamic Rendering for GET Route Handlers

Since Next.js 15/16, GET Route Handlers default to dynamic (not static). This aligns with Centik's needs -- all data is personal and should be fresh.

---

## Project Structure (Architecture View)

```
src/
├── app/
│   ├── layout.tsx                    # Root layout: Sidebar, period resolution
│   ├── loading.tsx                   # Root loading skeleton
│   ├── page.tsx                      # Dashboard (Server Component)
│   ├── movimientos/
│   │   ├── page.tsx                  # Transactions (Server Component)
│   │   └── loading.tsx               # Transactions skeleton
│   ├── deudas/
│   │   ├── page.tsx                  # Debts (Server Component)
│   │   └── loading.tsx
│   ├── presupuesto/
│   │   ├── page.tsx                  # Budget (Server Component)
│   │   └── loading.tsx
│   ├── ingresos/
│   │   ├── page.tsx                  # Income Sources (Server Component)
│   │   └── loading.tsx
│   ├── historial/
│   │   ├── page.tsx                  # History (Server Component)
│   │   └── loading.tsx
│   └── api/
│       ├── dashboard/
│       │   ├── route.ts              # GET: KPIs + chart data
│       │   └── trend/
│       │       └── route.ts          # GET: 6-month trend
│       └── cron/
│           └── refresh-rates/
│               └── route.ts          # POST: v2.0 rate refresh
├── actions/
│   ├── transactions.ts               # Transaction CRUD Server Functions
│   ├── debts.ts                      # Debt CRUD Server Functions
│   ├── budgets.ts                    # Budget upsert Server Functions
│   ├── income-sources.ts             # Income Source CRUD Server Functions
│   ├── categories.ts                 # Category creation Server Function
│   └── periods.ts                    # Close/reopen period Server Functions
├── components/
│   ├── ui/                           # Reusable primitives
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   ├── Card.tsx
│   │   ├── ProgressBar.tsx
│   │   ├── Badge.tsx
│   │   ├── DynamicIcon.tsx
│   │   └── Toast.tsx                 # Via sonner
│   ├── layout/
│   │   ├── Sidebar.tsx               # Desktop nav (Client Component)
│   │   ├── MobileNav.tsx             # Bottom tab bar (Client Component)
│   │   ├── Header.tsx                # Page header with period selector
│   │   └── FAB.tsx                   # Floating action button (Client)
│   ├── dashboard/
│   │   ├── KPICards.tsx
│   │   └── RecentTransactions.tsx
│   ├── transactions/
│   │   ├── TransactionForm.tsx       # Client Component
│   │   ├── TransactionList.tsx       # Server Component
│   │   └── TransactionFilters.tsx    # Client Component
│   ├── debts/
│   │   ├── DebtCard.tsx              # Client Component (inline edit)
│   │   └── DebtForm.tsx              # Client Component
│   ├── budgets/
│   │   ├── BudgetTable.tsx           # Client Component (inline edit)
│   │   └── BudgetProgress.tsx
│   └── charts/
│       ├── ExpensePieChart.tsx        # Client Component (Recharts)
│       ├── BudgetBarChart.tsx         # Client Component (Recharts)
│       └── TrendAreaChart.tsx         # Client Component (Recharts)
├── lib/
│   ├── prisma.ts                     # Singleton
│   ├── serialize.ts                  # serializeBigInts()
│   ├── utils.ts                      # formatMoney, toCents, etc.
│   ├── validators.ts                 # Zod schemas
│   ├── constants.ts                  # Colors, defaults
│   └── periods.ts                    # getCurrentPeriod(), period utilities
└── types/
    └── index.ts                      # Shared TypeScript types
```

---

## Scalability Considerations

This app is a single-user personal finance tracker, so traditional scalability concerns (millions of users, horizontal scaling) do not apply. The relevant scaling dimensions are:

| Concern | At Launch (1 month data) | At 1 year (12 months) | At 5 years (60 months) |
|---------|------------------------|----------------------|----------------------|
| Transaction volume | ~100 rows | ~1,200 rows | ~6,000 rows |
| Query performance | Negligible | Negligible | Still negligible -- indexes handle this |
| Period data | 1 MonthlySummary | 12 MonthlySummary | 60 MonthlySummary -- tiny table |
| Chart data | 0-1 month trend | 6-month trend window | Still 6-month window (MonthlySummary) |
| Database size | < 1 MB | < 10 MB | < 50 MB |
| Client bundle | Fixed | Fixed | Fixed |

**The only scaling concern is the v2.0 UnitRate table** if many value units are tracked with daily rate updates. At 3 units with daily rates, that is ~1,095 rows/year -- still trivial.

**Performance optimization strategy is SQL aggregation**, not caching:
- Dashboard KPIs use `SUM()`, `COUNT()` at the database level
- Chart data is computed server-side as simple arrays
- No N+1 queries -- use Prisma `include` and `select` deliberately
- Composite indexes on `Transaction(periodId, date)` and `Budget(periodId, categoryId)` handle all common query patterns

---

## Build Order (Dependency-Driven)

The architecture imposes a strict build order because components at each layer depend on the layer below:

```
Phase 1: Infrastructure
    Docker + PostgreSQL + Next.js config + Prisma setup + test configs
    (No app code depends on anything else yet)

Phase 2: Database Schema + Seed
    Prisma schema + migrations + seed script
    (Depends on: Phase 1 infrastructure)

Phase 3: Foundation Libraries
    lib/prisma.ts, lib/serialize.ts, lib/utils.ts, lib/validators.ts,
    lib/constants.ts, types/index.ts
    (Depends on: Phase 2 schema for types; 100% test coverage required)

Phase 4: Layout Shell
    Root layout, Sidebar, MobileNav, Header, UI primitives (Button, Input,
    Modal, Card, DynamicIcon)
    (Depends on: Phase 3 for cn() utility, constants)

Phase 5: Income Sources (Full Stack Validation)
    Simplest CRUD entity -- validates the entire Server Component -> Server
    Action -> Prisma -> revalidatePath pipeline works end to end.
    (Depends on: Phase 3 validators, Phase 4 layout + UI primitives)

Phase 6: Categories + Transactions
    Categories are mostly read (seeded). Transactions are the core loop --
    form, list, filters. Most used feature in the app.
    (Depends on: Phase 5 proves the CRUD pattern; categories needed for transactions)

Phase 7: Dashboard
    KPI cards + charts. Read-only, aggregation-heavy. Needs transaction data
    to display anything meaningful.
    (Depends on: Phase 6 for transaction data to aggregate)

Phase 8: Debts
    Independent CRUD with calculated fields (utilization, interest). Can be
    built in parallel with Phase 7 in theory, but sequential is safer.
    (Depends on: Phase 4 layout + Phase 3 foundation)

Phase 9: Budget
    Configuration + progress bars. Needs categories (Phase 6) and transaction
    spending data (Phase 6) to show progress.
    (Depends on: Phase 6 for category + transaction data)

Phase 10: History + Period Close
    The most complex mutation (atomic transaction). Needs MonthlySummary,
    budgets, periods all working. Build last because it touches everything.
    (Depends on: Phases 6, 8, 9 all complete)

Phase 11: Polish
    Accessibility, loading states, error boundaries, final QA.
    (Depends on: All features complete)
```

**Critical path:** Phase 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 (Dashboard requires transactions, transactions require the full stack). Phases 8 and 9 could theoretically run in parallel after Phase 6 but share the same developer, so sequential is practical.

---

## Sources

- Next.js 16 bundled documentation (`node_modules/next/dist/docs/`) -- HIGH confidence
  - `01-app/03-api-reference/01-directives/use-cache.md` -- `use cache` available in v16 via `cacheComponents` config
  - `01-app/03-api-reference/03-file-conventions/route.md` -- `params` is now a Promise since v15.0.0-RC
  - `01-app/03-api-reference/04-functions/revalidatePath.md` -- revalidation behavior in Server Functions
  - `01-app/02-guides/forms.md` -- `useActionState` for form validation pattern with Server Functions
  - `01-app/02-guides/rendering-philosophy.md` -- component-level static/dynamic boundaries
- [Prisma BigInt serialization discussion](https://github.com/prisma/prisma/discussions/9793) -- MEDIUM confidence
- [Server Actions vs Route Handlers comparison](https://makerkit.dev/blog/tutorials/server-actions-vs-route-handlers) -- MEDIUM confidence
- [Prisma + Next.js troubleshooting guide](https://www.prisma.io/docs/orm/more/troubleshooting/nextjs) -- HIGH confidence
- Project documents: DFR.md, DATA_FLOW.md, STYLE_GUIDE.md, UX_RULES.md, CLAUDE.md -- authoritative (project-defined)
