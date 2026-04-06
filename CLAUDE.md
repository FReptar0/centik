@AGENTS.md
# CLAUDE.md — MisFinanzas

## Project Overview

Personal finance tracking web app. Single user, no auth in MVP. Mexican peso (MXN), quincenal pay cycle. Tracks debts, income (employment + freelance), expenses by category, monthly budgets, and annual history.

---

## GSD (Get Shit Done) — Workflow Framework

This project uses [GSD](https://github.com/gsd-build/get-shit-done) as its spec-driven development system for Claude Code. GSD handles context engineering, multi-agent orchestration, and state management to prevent quality degradation across long sessions.

### Installation

```bash
# Install GSD globally for Claude Code
npx get-shit-done-cc@latest --claude --global

# Verify
# In Claude Code: /gsd:help
```

### Project Initialization

When starting this project for the first time:

```
/gsd:new-project
```

GSD will ask questions to understand the project. Feed it context from our existing docs — they map to GSD's system like this:

| Our Document | GSD Equivalent | How to Use |
|-------------|---------------|------------|
| `DFR.md` | Feeds → `REQUIREMENTS.md` | Pass as context during `/gsd:new-project` questions |
| `STYLE_GUIDE.md` | Feeds → phase CONTEXT.md | Pass during `/gsd:discuss-phase` for UI phases |
| `UX_RULES.md` | Feeds → phase CONTEXT.md | Pass during `/gsd:discuss-phase` for UI phases |
| `DATA_FLOW.md` | Feeds → phase CONTEXT.md | Pass during `/gsd:discuss-phase` for data/API phases |
| `CLAUDE.md` | `CLAUDE.md` stays as-is | GSD reads it automatically as project context |

### Workflow Per Phase

```
/gsd:discuss-phase N     → Shape implementation decisions (load relevant docs)
/gsd:plan-phase N        → Research + create atomic plans + verify
/gsd:execute-phase N     → Execute plans in parallel waves, fresh context per plan
/gsd:verify-work N       → Manual acceptance testing
/gsd:ship N              → Create PR from verified work
```

Or let GSD decide the next step:
```
/gsd:next
```

### GSD Configuration

Set in `.planning/config.json` after `/gsd:new-project`:

```json
{
  "mode": "interactive",
  "granularity": "standard",
  "model_profile": "balanced",
  "workflow": {
    "research": true,
    "plan_check": true,
    "verifier": true,
    "auto_advance": false
  }
}
```

### Phase Mapping to Implementation Order

GSD manages phases via its roadmap. Our implementation order (see section below) maps to GSD phases:

```
Phase 1:  Project scaffolding + DB schema + seed
Phase 2:  Utilities, validators, serialization (foundation)
Phase 3:  Layout + navigation (sidebar, mobile)
Phase 4:  Income Sources CRUD
Phase 5:  Categories + Transactions (core loop)
Phase 6:  Dashboard (KPIs, charts)
Phase 7:  Debts management
Phase 8:  Budget config + progress
Phase 9:  History + period close
Phase 10: Polish, a11y, final QA
```

### Quality Gates in GSD

GSD has built-in verification via `/gsd:verify-work`. In addition, our Quality Loop (see below) runs as part of every plan execution. The `<verify>` block in each GSD plan MUST include:

```xml
<verify>
  pnpm build (zero errors)
  pnpm lint (zero warnings)
  pnpm test (all pass)
  pnpm test:integration (if DB touched)
</verify>
```

### State Recovery

If a session is interrupted:
```
/gsd:resume-work          → Restore from last session
/gsd:progress             → Check where you are
```

---

## Tech Stack

- **Framework:** Next.js 14+ with App Router
- **Language:** TypeScript (strict mode)
- **Database:** PostgreSQL (Docker container for dev)
- **ORM:** Prisma
- **Styling:** Tailwind CSS (dark theme default)
- **Charts:** Recharts
- **Validation:** Zod
- **Testing:** Vitest (unit) + Playwright (e2e/integration)
- **Package Manager:** pnpm

---

## ⚠️ MANDATORY: Quality Loop (Non-Negotiable)

Every code change — feature, fix, refactor — MUST pass through this loop before being considered complete. The loop does NOT stop until ALL checks pass. No exceptions, no "I'll fix it later."

### The Loop

```
┌─────────────────────────────────────────────────┐
│  1. WRITE / MODIFY CODE                         │
│                                                 │
│  2. SECURITY CHECK                              │
│     ├── Input validation on every endpoint?     │
│     ├── SQL injection safe (Prisma parameterized)?│
│     ├── No secrets in code or logs?             │
│     ├── BigInt serialization correct?            │
│     ├── No raw user input in queries?           │
│     └── PASS? → Continue. FAIL? → Fix, restart. │
│                                                 │
│  3. COMPILE CHECK                               │
│     ├── pnpm build (zero errors, zero warnings) │
│     ├── TypeScript strict: no `any`, no @ts-ignore│
│     └── PASS? → Continue. FAIL? → Fix, restart. │
│                                                 │
│  4. LINT + FORMAT                               │
│     ├── pnpm lint (ESLint zero warnings)        │
│     ├── pnpm format:check (Prettier)            │
│     └── PASS? → Continue. FAIL? → Fix, restart. │
│                                                 │
│  5. TESTS                                       │
│     ├── pnpm test (all unit tests pass)         │
│     ├── pnpm test:integration (if applicable)   │
│     ├── Coverage: no regression                 │
│     └── PASS? → Continue. FAIL? → Fix, restart. │
│                                                 │
│  6. CODE REVIEW (self)                          │
│     ├── Is the code readable without comments?  │
│     ├── Could a new contributor understand it?  │
│     ├── Are functions < 50 lines?               │
│     ├── Are files < 300 lines?                  │
│     ├── Is naming clear and consistent?         │
│     └── PASS? → ✅ DONE. FAIL? → Refactor, restart.│
└─────────────────────────────────────────────────┘
```

**RESTART means go back to step 1.** Not to the step that failed. Every fix could introduce a new issue, so the full loop runs again.

### Security Rules (Mandatory)

These rules apply to EVERY piece of code. Violations are blocking — no merge, no deploy.

**Input Validation:**
- Every API route and Server Action validates ALL inputs with Zod before any database operation
- Never trust client data. Re-validate on the server even if the client already validated
- Monetary inputs: validate as string, verify it represents a non-negative integer (centavos), reject anything else
- Reject payloads larger than 1MB
- Rate limit API routes (in production): max 100 requests/minute per IP

**SQL & Data Access:**
- Use Prisma parameterized queries exclusively. Never concatenate strings into queries
- Never expose internal IDs, stack traces, or database structure in error responses
- Log full errors server-side only. Return generic messages to client
- Use Prisma `$transaction` for operations that modify multiple tables

**Secrets:**
- No hardcoded secrets, tokens, or passwords anywhere in the codebase
- All secrets go in `.env` (gitignored)
- `.env.example` contains only keys with placeholder values, never real secrets
- Provider API keys (Banxico, etc.) stored as environment variables, never in DB

**BigInt & Serialization:**
- Always use `serializeBigInts()` before `NextResponse.json()` or returning props
- Never pass raw Prisma results containing BigInt to Client Components
- Never use `JSON.stringify()` on objects that may contain BigInt

**Headers & CORS (production):**
- Set `Content-Security-Policy` headers
- Set `X-Content-Type-Options: nosniff`
- Set `X-Frame-Options: DENY`
- No CORS in MVP (single-origin app)

### Testing Rules (Mandatory)

**Unit Tests (Vitest) — REQUIRED for every feature:**

Every function, utility, and API route must have unit tests. No code ships without them.

| What | Tests Required | Examples |
|------|---------------|----------|
| `src/lib/utils.ts` | Every function | `toCents("150.75")` → `"15075"`, `formatMoney("15075")` → `"$150.75"`, edge cases (0, negative, large numbers) |
| `src/lib/serialize.ts` | Serialization | BigInt fields become strings, nested objects, arrays |
| `src/lib/validators.ts` | Every schema | Valid input passes, invalid input fails with correct error, edge cases |
| API routes | Request/response | Valid creates return 201, invalid returns 400 with Zod errors, not found returns 404 |
| Server Actions | Business logic | Transaction creation, period close, budget copy |
| Calculated fields | Derivations | Utilization rate, savings rate, MXN conversion from unit amounts |

**Test file location:** Co-located with source: `src/lib/utils.test.ts`, `src/app/api/transactions/route.test.ts`

**Test naming convention:**
```ts
describe('formatMoney', () => {
  it('formats centavos to MXN currency string', () => { ... })
  it('handles zero', () => { ... })
  it('handles large amounts without precision loss', () => { ... })
})
```

**Integration Tests — REQUIRED when applicable:**

| Scenario | Type | Tool |
|----------|------|------|
| Period close (multi-table transaction) | Integration | Vitest + test DB |
| Budget copy on period close | Integration | Vitest + test DB |
| Rate refresh from external API | Integration | Vitest + mocked fetch |
| Full transaction CRUD cycle | E2E | Playwright |
| Dashboard loads with correct data | E2E | Playwright |

Integration tests that touch the database use a dedicated test database (`misfinanzas_test`) that is reset before each test suite.

**When to write which type of test:**
- Pure function (no I/O) → Unit test only
- Function that queries DB → Integration test with test DB
- Function that calls external API → Integration test with mocked fetch
- User flow across multiple pages → E2E test with Playwright
- UI component rendering → Unit test with Vitest + Testing Library (only for complex interactive components, not for simple display components)

**Coverage expectations:**
- `src/lib/` — 100% coverage (utilities, validators, serializers)
- `src/app/api/` — 90%+ coverage (all routes, all error paths)
- Server Actions — 90%+ coverage
- Components — Coverage for interactive logic only, not for layout/styling

### Readability & Maintainability Rules

Code is read 10x more than it is written. Optimize for the reader.

**File Organization:**
- One component per file, one concern per function
- Files under 300 lines. If a file exceeds 300 lines, it needs to be split
- Functions under 50 lines. If a function exceeds 50 lines, extract sub-functions
- No nested ternaries deeper than 1 level
- No more than 3 levels of callback nesting

**Naming:**
- Variables and functions: descriptive, English, camelCase. `getMonthlyIncome()` not `getMI()` or `calcInc()`
- Boolean variables: prefix with `is`, `has`, `should`, `can`. `isClosed` not `closed`
- Constants: UPPER_SNAKE_CASE for true constants only (`MAX_TRANSACTIONS_PER_PAGE`)
- Files: PascalCase for components (`TransactionForm.tsx`), camelCase for utilities (`formatMoney.ts`)

**Comments:**
- Code should be self-documenting. If you need a comment to explain WHAT the code does, the code needs rewriting
- Comments are acceptable for explaining WHY (business rule justification, non-obvious trade-off)
- Every Zod schema should have a brief comment explaining what endpoint it validates
- Complex SQL queries (like the lateral join in assets) deserve a comment explaining the query strategy

**Imports:**
- Group imports: React/Next.js → Third party → Internal (lib, components, types)
- Absolute imports via `@/` prefix (configured in tsconfig)
- No circular imports

---

## Project Structure

```
misfinanzas/
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts               # Default categories + initial period
│   └── migrations/
├── src/
│   ├── app/
│   │   ├── layout.tsx        # Root layout with sidebar nav
│   │   ├── page.tsx          # Dashboard (server component)
│   │   ├── movimientos/
│   │   │   └── page.tsx      # Transactions list + quick add
│   │   ├── deudas/
│   │   │   └── page.tsx      # Debts management
│   │   ├── presupuesto/
│   │   │   └── page.tsx      # Budget config + progress
│   │   ├── ingresos/
│   │   │   └── page.tsx      # Income sources
│   │   ├── historial/
│   │   │   └── page.tsx      # Annual history table
│   │   └── api/
│   │       ├── transactions/
│   │       ├── debts/
│   │       ├── budgets/
│   │       ├── income-sources/
│   │       ├── categories/
│   │       ├── periods/
│   │       └── dashboard/
│   ├── components/
│   │   ├── ui/               # Reusable primitives (Button, Input, Modal, Card, etc.)
│   │   ├── layout/           # Sidebar, Header, MobileNav
│   │   ├── dashboard/        # KPI cards, charts
│   │   ├── transactions/     # TransactionForm, TransactionList
│   │   ├── debts/            # DebtCard, DebtForm
│   │   ├── budgets/          # BudgetTable, BudgetProgress
│   │   └── charts/           # Chart wrapper components (client)
│   ├── lib/
│   │   ├── prisma.ts         # Prisma client singleton
│   │   ├── serialize.ts      # serializeBigInts() for JSON responses
│   │   ├── utils.ts          # formatMoney, toCents, formatRate, formatUnitAmount, date helpers
│   │   ├── validators.ts     # Zod schemas
│   │   └── constants.ts      # Colors, category defaults
│   └── types/
│       └── index.ts          # Shared TypeScript types
├── tests/
│   ├── setup.ts              # Vitest global setup (test DB connection)
│   ├── helpers.ts            # Test factories, mock builders
│   └── integration/          # Integration tests (DB, external APIs)
├── e2e/                      # Playwright E2E tests
│   └── transactions.spec.ts
├── vitest.config.ts          # Unit test config
├── vitest.integration.config.ts  # Integration test config (separate DB)
├── playwright.config.ts
├── docker-compose.yml        # Dev DB
├── docker-compose.test.yml   # Test DB (port 5433)
├── .env
├── .env.example
├── .env.test                 # Test DB connection string
├── DFR.md
└── CLAUDE.md
```

## Key Architecture Decisions

### Server vs Client Components
- **Server Components (default):** Pages, data-fetching layouts, KPI calculations
- **Client Components:** Forms, modals, charts (Recharts), interactive tables, sidebar toggle
- Mark client components with `"use client"` only when needed
- Never fetch data in client components; pass data as props from server components or use server actions

### Data Access Pattern
- Use Prisma queries directly in Server Components and API routes
- Prisma client singleton in `src/lib/prisma.ts` using the standard pattern:
  ```ts
  import { PrismaClient } from '@prisma/client'
  const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }
  export const prisma = globalForPrisma.prisma || new PrismaClient()
  if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
  ```
- For mutations, prefer Server Actions over API routes when possible
- API routes exist for cases where Server Actions are not suitable

### Money Handling
- **Storage:** All monetary amounts stored as `BigInt` in centavos (e.g., $1,500.75 → `150075`). Maps to PostgreSQL `bigint` (8 bytes). Pure integer arithmetic eliminates floating point errors
- **Interest rates:** Stored as `Int` in basis points (e.g., 45.00% → `4500`)
- **Asset amounts:** Stored as `BigInt` in the unit's smallest subdivision based on its `precision` field (e.g., UDI with precision=6: 50,000.123456 → `50000123456`)
- **JSON Serialization:** `BigInt` cannot be serialized by `JSON.stringify()`. All API routes must convert BigInt fields to `String` before responding. Use a shared serializer:
  ```ts
  // src/lib/serialize.ts
  export function serializeBigInts<T>(obj: T): T {
    return JSON.parse(
      JSON.stringify(obj, (_key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      )
    )
  }
  ```
- **Conversion utilities** in `src/lib/utils.ts`:
  ```ts
  // String (from API) to cents BigInt (for DB operations)
  export function parseCents(value: string): bigint {
    return BigInt(value)
  }

  // Pesos (user input) to cents string (for API submission)
  export function toCents(pesos: number): string {
    return Math.round(pesos * 100).toString()
  }
  
  // Cents string (from API) to display
  export function formatMoney(centsStr: string): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(Number(centsStr) / 100)
  }
  
  // Basis points to percentage for display
  export function formatRate(bps: number): string {
    return `${(bps / 100).toFixed(2)}%`
  }

  // Asset amount to display (respects unit precision)
  export function formatUnitAmount(amountStr: string, precision: number): string {
    return (Number(amountStr) / Math.pow(10, precision)).toLocaleString('es-MX', {
      minimumFractionDigits: precision,
      maximumFractionDigits: precision,
    })
  }
  ```
- **Boundary rule:** Conversion happens ONLY at the presentation layer. Components convert user input to cents string before calling API/Server Actions. Components convert cents string to display format when rendering. All business logic, API routes, and DB queries operate in BigInt centavos exclusively
- All amounts are positive; `type` (INCOME/EXPENSE) determines sign in calculations

### Period Management
- A period = one calendar month
- Auto-create current period on first app load if it doesn't exist (middleware or layout-level check)
- Transactions are always linked to a period
- Closing a period snapshots totals into MonthlySummary and prevents further edits

## Database Schema (Prisma)

Reference the full schema in `DFR.md` sections 2.1-2.10. Key points:

- All IDs are `cuid()` generated by Prisma
- Enums: `TransactionType`, `Frequency`, `DebtType`, `PaymentMethod`, `CategoryType`, `AssetCategory`
- All monetary fields are `BigInt` (centavos). Interest rates are `Int` (basis points). Asset amounts are `BigInt` (unit's smallest subdivision based on precision)
- Relations: Transaction → Category, Transaction → Period, Transaction →? IncomeSource, Budget → Category + Period, MonthlySummary → Period, Asset → ValueUnit, UnitRate → ValueUnit
- Indexes on: `Transaction(periodId, date)`, `Transaction(categoryId)`, `Budget(periodId, categoryId)` unique composite, `Period(month, year)` unique composite, `UnitRate(unitId, date)` unique composite, `Asset(unitId)`
- BigInt serialization: all API responses must run through `serializeBigInts()` to convert BigInt → String for JSON compatibility

## Seed Data

The seed script must create:
1. Default expense categories: Comida (utensils, #fb923c), Servicios (zap, #60a5fa), Entretenimiento (clapperboard, #a78bfa), Suscripciones (smartphone, #f472b6), Transporte (car, #fbbf24), Otros (package, #94a3b8)
2. Default income categories: Empleo (briefcase, #34d399), Freelance (laptop, #22d3ee)
3. Default income sources: "TerSoft (Empleo)" quincenal, "Freelance" variable
4. Default debts: One credit card, one personal loan (both with zero balances, amounts as BigInt centavos)
5. Current period (current month/year)
6. Budget entries for each expense category with zero amounts (0n centavos) for current period
7. Default value units: MXN (precision=2, no provider), UDI (precision=6, Banxico SIE API), UMA (precision=2, manual/annual)

## Styling Guidelines

- **Theme (Glyph Finance):** Dark mode, OLED black
  - Background: #000000 (OLED black)
  - Surface: #0A0A0A (secondary bg, sidebar), #141414 (cards, elevated containers)
  - Borders: #222222 (dividers, separators)
  - Text: #E8E8E8 (primary), #999999 (secondary/labels), #666666 (tertiary/placeholders)
- **Accent:** Chartreuse #CCFF00 for primary actions, links, interactive elements. Hover: #B8E600
- **Semantic colors:** Green #00E676 (income/positive), Red #FF3333 (expense/debt), Orange #FF9100 (warnings), Blue #448AFF (info)
- **Iconography:** `lucide-react` exclusively. No emojis in the UI. Category icons are stored as Lucide icon names in the DB (e.g., "utensils", "zap") and rendered dynamically via a mapping component
- **Typography:** Satoshi (geometric sans-serif) for headings and body text. IBM Plex Mono for ALL financial numbers (monospaced, tabular alignment). Load both via `next/font`
- **Border radius:** `rounded-2xl` (16px) for cards, `rounded-xl` (12px) for inputs/tooltips, `rounded-full` (9999px, pill) for buttons/badges, 24px for modals
- **Elevation:** Depth communicated via background-shift only (#000000 -> #0A0A0A -> #141414). No box-shadow tokens, no decorative borders on cards
- **No default Tailwind colors** — use custom palette defined via CSS `@theme` tokens
- **Transitions:** `transition-all duration-200` on interactive elements
- **Spacing:** Generous padding in cards (p-5), compact in table rows (py-3 px-4)

## Component Conventions

- One component per file, default export
- File name = component name in PascalCase
- Props interface defined in the same file, named `{ComponentName}Props`
- Use `cn()` utility (clsx + tailwind-merge) for conditional class names
- Modals use a shared `Modal` primitive component
- Forms use controlled components with local state, submit via Server Action or fetch to API

## API Route Conventions

- All routes return `NextResponse.json()` with consistent shape:
  ```ts
  // Success
  { data: T }
  // Error
  { error: string, details?: unknown }
  ```
- HTTP status codes: 200 (OK), 201 (Created), 400 (Validation error), 404 (Not found), 500 (Server error)
- Validate request body with Zod before processing
- Wrap handler logic in try/catch, return 500 with generic message on unexpected errors

## Validation Schemas (Zod)

Define in `src/lib/validators.ts`:
- `createTransactionSchema` — type (enum), amount (string, BigInt centavos), categoryId (string), date (string → Date), description (optional), paymentMethod (optional enum), notes (optional)
- `createDebtSchema` — name, type (enum), currentBalance (string, BigInt centavos), annualRate (non-negative int, basis points), plus optional fields by type
- `updateDebtBalanceSchema` — just currentBalance (string, BigInt centavos)
- `createBudgetSchema` — array of { categoryId, quincenalAmount (string, BigInt centavos) }
- `createIncomeSourceSchema` — name, defaultAmount (string, BigInt centavos), frequency (enum), type (enum)
- `createAssetSchema` — name, unitId (string), amount (string, BigInt), category (enum), institution (optional)
- `createValueUnitSchema` — code, name, precision (int), providerUrl (optional), providerPath (optional), refreshInterval (int)

## Development Commands

```bash
# ─── Initial Setup ───
# Install GSD for Claude Code
npx get-shit-done-cc@latest --claude --local

# Start PostgreSQL
docker compose up -d

# Install dependencies
pnpm install

# Generate Prisma client
pnpm prisma generate

# Run migrations
pnpm prisma migrate dev

# Seed database
pnpm prisma db seed

# Start dev server
pnpm dev

# Reset database (drop + migrate + seed)
pnpm prisma migrate reset

# ─── Quality Loop Commands (run in this order) ───
# Build (must pass with zero errors and zero warnings)
pnpm build

# Lint
pnpm lint

# Format check
pnpm format:check

# Unit tests
pnpm test

# Unit tests with coverage report
pnpm test:coverage

# Integration tests (requires test DB running)
pnpm test:integration

# E2E tests (requires dev server running)
pnpm test:e2e

# Run full quality loop in one command
pnpm quality
```

The `quality` script in `package.json` should chain all checks:
```json
{
  "scripts": {
    "quality": "pnpm build && pnpm lint && pnpm format:check && pnpm test && pnpm test:integration"
  }
}
```

## Docker Compose

```yaml
# docker-compose.yml (development)
services:
  db:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: misfinanzas
      POSTGRES_PASSWORD: misfinanzas_dev
      POSTGRES_DB: misfinanzas
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

```yaml
# docker-compose.test.yml (testing — separate DB, separate port)
services:
  db-test:
    image: postgres:16-alpine
    ports:
      - "5433:5432"
    environment:
      POSTGRES_USER: misfinanzas
      POSTGRES_PASSWORD: misfinanzas_test
      POSTGRES_DB: misfinanzas_test
    tmpfs:
      - /var/lib/postgresql/data  # RAM-only, faster, no persistence needed
```

## Environment Variables

```
# .env (development)
DATABASE_URL="postgresql://misfinanzas:misfinanzas_dev@localhost:5432/misfinanzas"

# .env.test (testing — used by vitest.integration.config.ts)
DATABASE_URL="postgresql://misfinanzas:misfinanzas_test@localhost:5433/misfinanzas_test"
```

## Implementation Order

These map to GSD phases (see Phase Mapping above). Use `/gsd:discuss-phase N` → `/gsd:plan-phase N` → `/gsd:execute-phase N` → `/gsd:verify-work N` for each. **Every phase includes writing tests. No phase passes `/gsd:verify-work` without `pnpm quality` passing.**

1. **Project scaffolding:** Next.js + Tailwind + Prisma setup, Docker Compose (dev + test DBs), env files, Vitest config, Playwright config, ESLint + Prettier config. Verify: `pnpm build` passes, `pnpm test` runs (even with zero tests)
2. **Database:** Schema, migrations, seed script. **Tests:** schema validation, seed idempotency
3. **Utilities + Validators:** `utils.ts`, `serialize.ts`, `validators.ts`, `constants.ts`. **Tests:** 100% coverage of all utilities and schemas. This is the foundation — ship it bulletproof
4. **Layout:** Root layout with sidebar navigation, mobile responsive. No tests needed (pure UI)
5. **Income Sources:** CRUD page (simplest entity, validates the full stack). **Tests:** unit for API validation, integration for CRUD cycle
6. **Categories:** Seed + list page (mostly read-only with option to add custom). **Tests:** unit for API
7. **Transactions:** Form + list page with filters (core feature, most used). **Tests:** unit for API validation, integration for create/list/filter/delete cycle, E2E for registration flow
8. **Dashboard:** KPI cards + charts reading from transactions and other data. **Tests:** integration for KPI aggregation queries, E2E for dashboard loads with correct data
9. **Debts:** Cards with editable balances and calculated fields. **Tests:** unit for calculated fields (utilization, interest), integration for balance update
10. **Budget:** Configuration table + progress bars comparing vs actual spending. **Tests:** integration for budget vs spent query
11. **History:** Annual table with period close functionality. **Tests:** integration for close period transaction (the most critical test in the app)

## Error Handling

- Database errors: log full error server-side, return generic "Error de servidor" to client
- Validation errors: return Zod error messages formatted for display
- Not found: return 404 with "Recurso no encontrado"
- Client-side: show toast notifications for success/error on mutations
- Use `sonner` or similar lightweight toast library

## Performance Notes

- Dashboard KPIs should use SQL aggregation queries (SUM, COUNT) not load all transactions
- Charts data should be computed server-side and passed as simple arrays
- Use `loading.tsx` files for Suspense boundaries on each page
- Prisma queries: always select only needed fields for list views, include relations only when necessary

## Things to Avoid

- No `localStorage` for data persistence — everything in PostgreSQL
- No client-side state management libraries (Redux, Zustand) — use React state + server components
- No authentication system in MVP — single user, no login
- No SSG/ISR — all pages are dynamic (personal data)
- No external CSS frameworks besides Tailwind — no Bootstrap, Material UI, etc.
- No emojis anywhere in the UI — use Lucide React icons exclusively for a polished, professional look suitable for open source contribution
- No `Decimal` or `Float` for money in Prisma — use `BigInt` (centavos). All arithmetic is integer-only; conversion to display format happens solely in the presentation layer
- No raw `JSON.stringify()` on Prisma results containing BigInt — always use `serializeBigInts()` from `src/lib/serialize.ts`
- No money arithmetic with JavaScript `number` floating point — always operate in centavos (BigInt)
- No `any` in TypeScript — ever. Use `unknown` + type narrowing if the type is truly unknown
- No `@ts-ignore` or `@ts-expect-error` — fix the type, don't silence it
- No skipping tests — every feature ships with tests. `it.skip()` and `describe.skip()` are not allowed in main branch
- No API route without Zod validation — every input is validated before touching the database
- No string concatenation in queries — Prisma parameterized queries only
- No secrets in code — all credentials live in `.env` (gitignored)
- No `console.log` in production code — use a structured logger or remove after debugging

---

## Reference Documents

Always consult these before starting work on a related area:

| Document | When to Read | What It Covers |
|----------|-------------|----------------|
| `/gsd:progress` | **Every session start** | Current state, next step, blockers (GSD manages this) |
| `DFR.md` | Before touching any entity or API | Entities, fields, business rules, API routes |
| `STYLE_GUIDE.md` | Before any UI/component work | Colors, typography, spacing, component specs, Tailwind config |
| `UX_RULES.md` | Before any interaction/flow work | Navigation, forms, states, responsive, accessibility |
| `DATA_FLOW.md` | Before any query, mutation, or revalidation | Queries per page, mutation side effects, serialization boundary |
| `.planning/STATE.md` | When debugging GSD state | GSD's persistent state file — decisions, blockers, position |
