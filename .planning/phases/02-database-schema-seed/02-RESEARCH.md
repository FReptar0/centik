# Phase 2: Database Schema + Seed - Research

**Researched:** 2026-04-04
**Domain:** Prisma 7 schema design, PostgreSQL migrations, seed scripting
**Confidence:** HIGH

## Summary

Phase 2 replaces the stub Period model with the full 10-entity Prisma schema (7 MVP + 3 v2), creates the initial migration, and writes an idempotent TypeScript seed script with realistic demo data. The project runs Prisma 7.6.0 with the PrismaPg driver adapter on PostgreSQL 16.

The most critical findings are: (1) Prisma 7 seed scripts must instantiate their own PrismaClient with a PrismaPg adapter -- they cannot reuse the app's singleton; (2) `prisma migrate reset` still triggers seeding automatically in Prisma 7, despite `migrate dev` no longer doing so; (3) the existing generator uses `prisma-client-js` (deprecated but functional) -- switching to `prisma-client` is not in scope for this phase; (4) BigInt literal syntax in seed scripts uses `BigInt("value")` or the `n` suffix (e.g., `150075n`).

**Primary recommendation:** Write the full schema in one shot from DFR.md sections 2.1-2.10, create a single migration, then write a seed script using upsert-by-unique-key for idempotency. Split seed data into helper functions per entity for readability (< 300 lines per file if needed).

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- Use realistic non-zero amounts throughout -- NOT zero balances
- Debts: credit card ~$15K balance, personal loan ~$80K -- realistic Mexican amounts in centavos (BigInt)
- Budgets: quincenal amounts per category (e.g., Comida $2K, Servicios $1K) -- non-zero to exercise BigInt paths
- Income sources: made-up amounts, this is demo data -- user will replace with real data later
- Include 10-15 sample transactions for the current month (mix of income and expenses across categories)
- Include 1 closed previous month with MonthlySummary snapshot (enables trend chart and history table from day one)
- Include FULL schema from DFR.md for ValueUnit, UnitRate, and Asset -- all fields, all types, all constraints
- Include full relational integrity: Asset -> ValueUnit FK, UnitRate -> ValueUnit FK with proper cascading
- Seed default value units: MXN (precision=2, no provider), UDI (precision=6, Banxico SIE API), UMA (precision=2, manual/annual)
- No UI/API for v2 entities -- schema and seed only
- Use upsert by unique key for idempotency (categories by name, periods by month+year, income sources by name, etc.)
- Running seed twice must produce no errors and no duplicates
- Safe for development resets -- `npx prisma migrate reset` triggers seed automatically
- TypeScript seed script: `prisma/seed.ts` executed via `tsx`
- Configure seed command in `prisma.config.ts` (Prisma 7 native approach)
- DFR.md sections 2.1-2.10 are the authoritative specification for all entities
- All field names, types, relations, and indexes must match DFR.md exactly

### Claude's Discretion
- Exact demo amounts for income sources, transactions, debts (as long as they're realistic and non-zero)
- Transaction descriptions and dates for sample data
- Migration naming convention
- Whether to split seed into separate files per entity or keep in one seed.ts

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DB-01 | Prisma schema defines all 7 MVP entities (IncomeSource, Transaction, Category, Debt, Budget, Period, MonthlySummary) | Full field-by-field mapping from DFR.md 2.1-2.7; Prisma 7 schema syntax verified |
| DB-02 | All monetary fields stored as BigInt (centavos), interest rates as Int (basis points) | Prisma 7 BigInt type maps to PostgreSQL `bigint`; confirmed no breaking changes in 7.x |
| DB-03 | Enums defined: TransactionType, Frequency, DebtType, PaymentMethod, CategoryType | Prisma enum syntax verified; PascalCase naming, singular form required |
| DB-04 | Indexes on Transaction(periodId, date), Transaction(categoryId), Budget(periodId, categoryId) unique, Period(month, year) unique | `@@index` and `@@unique` syntax verified for Prisma 7 |
| DB-05 | Seed script creates default categories (6 expense + 2 income) with Lucide icon names and colors | Upsert-by-name pattern verified; icon names from DFR.md 2.3 |
| DB-06 | Seed script creates default income sources (TerSoft quincenal, Freelance variable) | Upsert-by-name pattern; realistic non-zero amounts per user decision |
| DB-07 | Seed script creates default debts (1 credit card, 1 personal loan) | Non-zero balances per user decision (~$15K CC, ~$80K loan) |
| DB-08 | Seed script creates current period and budget entries | Two periods needed: closed previous month + current open month; budgets with non-zero amounts |
| DB-09 | v2 entities (ValueUnit, UnitRate, Asset) included in schema but no UI/API | Full schema from DFR.md 2.8-2.10; seed 3 default value units; AssetCategory enum |

</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| prisma | 7.6.0 | Schema definition, migrations, seeding CLI | Already installed; Prisma 7 is the current major version |
| @prisma/client | 7.6.0 | Type-safe database client | Generated from schema; provides BigInt field typing |
| @prisma/adapter-pg | latest | PostgreSQL driver adapter | Required by Prisma 7 -- all DBs need explicit adapters |
| pg | latest | Node.js PostgreSQL driver | Underlying driver for PrismaPg adapter |
| tsx | latest | TypeScript execution for seed script | Already installed; executes seed.ts directly |
| dotenv | latest | Environment variable loading | Already installed; required in seed script (Prisma 7 does not auto-load .env) |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| PostgreSQL | 16-alpine | Database engine | Docker container already configured on port 5432 |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| prisma-client-js generator | prisma-client generator | prisma-client is the recommended Prisma 7 generator but prisma-client-js works fine; switching generators is out of scope for Phase 2 |
| BigInt for money | Decimal | Project decision: BigInt centavos eliminates float errors; Decimal adds complexity |
| cuid() IDs | uuid() | Project decision: cuid() is shorter, sortable, and already specified in DFR.md |

**Installation:**
No new packages needed. All dependencies are already installed from Phase 1.

## Architecture Patterns

### Schema File Structure
```
prisma/
  schema.prisma          # Full schema (all 10 models, 6 enums)
  seed.ts                # Idempotent seed script
  migrations/
    YYYYMMDDHHMMSS_init/ # Single initial migration
      migration.sql
```

### Pattern 1: Prisma 7 Schema with BigInt and Enums
**What:** Complete Prisma schema using BigInt for monetary fields, Int for rates, and native PostgreSQL enums
**When to use:** All entity definitions in this phase
**Example:**
```prisma
// Source: Prisma 7.6.0 schema reference + DFR.md
enum TransactionType {
  INCOME
  EXPENSE
}

model Transaction {
  id             String           @id @default(cuid())
  type           TransactionType
  amount         BigInt           // Centavos (e.g., $150.00 = 15000)
  description    String?
  categoryId     String
  incomeSourceId String?
  date           DateTime         @db.Date
  paymentMethod  PaymentMethod?
  periodId       String
  notes          String?
  createdAt      DateTime         @default(now())
  updatedAt      DateTime         @updatedAt

  category       Category         @relation(fields: [categoryId], references: [id])
  incomeSource   IncomeSource?    @relation(fields: [incomeSourceId], references: [id])
  period         Period           @relation(fields: [periodId], references: [id])

  @@index([periodId, date])
  @@index([categoryId])
}
```

### Pattern 2: Prisma 7 Seed Script with PrismaPg Adapter
**What:** Standalone seed script that creates its own PrismaClient with driver adapter
**When to use:** The `prisma/seed.ts` file
**Critical:** The seed script cannot import the app's prisma singleton -- it must instantiate its own client with its own PrismaPg adapter.
**Example:**
```typescript
// Source: Prisma 7 seeding docs
import 'dotenv/config'
import { PrismaClient } from '../generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
})
const prisma = new PrismaClient({ adapter })

async function main() {
  // Seed operations here using prisma.model.upsert()
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
```

### Pattern 3: Idempotent Upsert by Unique Key
**What:** Use `upsert()` with the model's unique constraint in `where` and `update: {}` (no-op) to achieve idempotency
**When to use:** Every seed operation
**Example:**
```typescript
// Source: Prisma upsert documentation
// For models with simple unique fields:
const category = await prisma.category.upsert({
  where: { name: 'Comida' },
  update: {},
  create: {
    name: 'Comida',
    icon: 'utensils',
    color: '#fb923c',
    type: 'EXPENSE',
    isDefault: true,
    isActive: true,
    sortOrder: 1,
  },
})

// For models with composite unique constraints (@@unique):
const period = await prisma.period.upsert({
  where: {
    month_year: { month: 4, year: 2026 },
  },
  update: {},
  create: {
    month: 4,
    year: 2026,
    startDate: new Date('2026-04-01'),
    endDate: new Date('2026-04-30'),
    isClosed: false,
  },
})

// For Budget with composite unique (periodId + categoryId):
const budget = await prisma.budget.upsert({
  where: {
    periodId_categoryId: {
      periodId: currentPeriod.id,
      categoryId: category.id,
    },
  },
  update: {},
  create: {
    periodId: currentPeriod.id,
    categoryId: category.id,
    quincenalAmount: BigInt('200000'), // $2,000.00 MXN
  },
})
```

### Pattern 4: BigInt Literal Syntax in Seed Data
**What:** Use `BigInt()` constructor or `n` suffix for monetary values in seed data
**When to use:** All monetary fields in seed operations
**Example:**
```typescript
// Both are valid:
const amount1 = BigInt('1500075')   // $15,000.75 as constructor
const amount2 = 1500075n            // $15,000.75 as literal suffix

// In seed data, prefer BigInt() constructor for clarity with large amounts:
currentBalance: BigInt('1500000'),  // $15,000.00 -- credit card
currentBalance: BigInt('8000000'),  // $80,000.00 -- personal loan
```

### Anti-Patterns to Avoid
- **Importing app's prisma singleton in seed.ts:** The seed script runs standalone via `tsx`, not inside Next.js. It must create its own PrismaClient with adapter.
- **Using create() instead of upsert():** Fails on second run with unique constraint violations. Always upsert.
- **Using JavaScript number for BigInt amounts:** `BigInt(15000.75)` would truncate decimals. Always convert to centavos first, then use `BigInt('1500075')`.
- **Hardcoding IDs:** Let Prisma generate IDs with `cuid()`. Capture returned IDs from earlier upserts to use as foreign keys in later upserts.
- **Seeding in wrong dependency order:** Must seed in order: enums (auto from schema) -> Categories -> Periods -> IncomeSource -> Debts -> ValueUnits -> Budgets -> Transactions -> MonthlySummary -> UnitRates -> Assets.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| ID generation | Custom UUID/CUID functions | `@default(cuid())` in schema | Prisma handles this at insert time; consistent, collision-free |
| Date calculations (start/end of month) | Manual day counting | `new Date(year, month, 0).getDate()` for last day | Edge cases with Feb, leap years, 30/31 day months |
| Schema validation | Custom SQL DDL | `npx prisma migrate dev` | Prisma validates schema, generates SQL, applies atomically |
| Composite unique constraints | Application-level checks | `@@unique([field1, field2])` in schema | Database enforces, Prisma generates typed `where` clause for upsert |
| Enum type safety | String literals | Prisma `enum` definitions | Compile-time safety in TypeScript, DB-level constraint in PostgreSQL |

**Key insight:** Prisma's schema-first approach means the schema.prisma file IS the source of truth. The migration SQL is generated, not hand-written. Focus effort on getting the schema right; the migration follows automatically.

## Common Pitfalls

### Pitfall 1: Seed Script Import Path
**What goes wrong:** Importing PrismaClient from `@prisma/client` instead of the generated output directory
**Why it happens:** Prisma 7 with `prisma-client-js` and custom output generates to `generated/prisma/`, not `node_modules/@prisma/client`
**How to avoid:** Always import from `../generated/prisma/client` in seed.ts (relative to `prisma/` directory)
**Warning signs:** `PrismaClient is not a constructor` or missing type errors

### Pitfall 2: Composite Unique Where Clause Naming
**What goes wrong:** Using wrong field name in upsert `where` clause for composite unique constraints
**Why it happens:** Prisma auto-generates compound key names by joining field names with underscore: `@@unique([month, year])` generates `month_year`, `@@unique([periodId, categoryId])` generates `periodId_categoryId`
**How to avoid:** The where clause key for `@@unique([fieldA, fieldB])` is `fieldA_fieldB` containing an object with both fields
**Warning signs:** TypeScript error on the `where` clause; runtime "Unknown arg" error

### Pitfall 3: BigInt JSON Serialization in Tests
**What goes wrong:** Test assertions on seed data fail because BigInt cannot be compared with `===` to numbers or JSON.stringify throws
**Why it happens:** BigInt is a separate type from number; `15000n === 15000` is `false`; `JSON.stringify({ amount: 15000n })` throws
**How to avoid:** Compare BigInt values using `toBe(15000n)` or `toBe(BigInt('15000'))` in tests; use `serializeBigInts()` when serializing
**Warning signs:** Test failures with "Expected BigInt, received Number" or "Do not know how to serialize a BigInt"

### Pitfall 4: Prisma 7 Seed Not Auto-Running on migrate dev
**What goes wrong:** Developer runs `npx prisma migrate dev` and expects seeding to happen
**Why it happens:** Prisma 7 removed automatic seeding from `migrate dev`. Only `prisma migrate reset` and explicit `prisma db seed` trigger seeding.
**How to avoid:** Document the workflow: after `migrate dev`, run `npx prisma db seed` explicitly. Only `migrate reset` auto-seeds.
**Warning signs:** Empty database after migration

### Pitfall 5: Period endDate Calculation
**What goes wrong:** End date for February or months with 30 days is wrong
**Why it happens:** Hardcoding `endDate` to day 31 or calculating incorrectly
**How to avoid:** Use `new Date(year, month, 0)` -- month is 1-indexed here, and day 0 gives the last day of the previous month. So `new Date(2026, 4, 0)` gives April 30.
**Warning signs:** Invalid dates in period records; off-by-one in month boundaries

### Pitfall 6: Prisma migrate dev After Schema Replacement
**What goes wrong:** Running `npx prisma migrate dev` on a database that already has the stub Period model creates a diff migration instead of a clean initial migration
**Why it happens:** The database already has the Period table from Phase 1's migration history
**How to avoid:** Use `npx prisma migrate reset` to drop and recreate everything, OR delete the existing migration history and run `migrate dev --name init` fresh. Since this is a development-only database, a full reset is the cleanest approach.
**Warning signs:** Migration SQL contains ALTER TABLE instead of CREATE TABLE; migration name suggests incremental change

### Pitfall 7: Category Name Uniqueness
**What goes wrong:** Upsert by name requires `name` to have a `@unique` constraint, but DFR.md does not explicitly specify one
**Why it happens:** DFR.md lists fields but doesn't always list every constraint
**How to avoid:** Add `@unique` to Category.name so upsert works. This is necessary for the idempotent seed pattern and makes sense semantically (no two categories should have the same name).
**Warning signs:** Prisma error "Argument `where` of type CategoryWhereUniqueInput needs at least one of `id` or `name` arguments"

## Code Examples

### Complete Enum Definitions
```prisma
// Source: DFR.md sections 2.1-2.10

enum TransactionType {
  INCOME
  EXPENSE
}

enum Frequency {
  QUINCENAL
  MENSUAL
  SEMANAL
  VARIABLE
}

enum DebtType {
  CREDIT_CARD
  PERSONAL_LOAN
  AUTO_LOAN
  OTHER
}

enum PaymentMethod {
  EFECTIVO
  DEBITO
  CREDITO
  TRANSFERENCIA
}

enum CategoryType {
  EXPENSE
  INCOME
  BOTH
}

enum AssetCategory {
  PPR
  INVESTMENT
  SAVINGS
  CRYPTO
  OTHER
}
```

### Full Period Model with Relations
```prisma
// Source: DFR.md section 2.6

model Period {
  id        String    @id @default(cuid())
  month     Int
  year      Int
  startDate DateTime  @db.Date
  endDate   DateTime  @db.Date
  isClosed  Boolean   @default(false)
  closedAt  DateTime?
  createdAt DateTime  @default(now())

  transactions   Transaction[]
  budgets        Budget[]
  monthlySummary MonthlySummary?

  @@unique([month, year])
}
```

### MonthlySummary with Unique Period Relation
```prisma
// Source: DFR.md section 2.7

model MonthlySummary {
  id           String   @id @default(cuid())
  periodId     String   @unique
  totalIncome  BigInt
  totalExpenses BigInt
  totalSavings BigInt
  savingsRate  Int      // Basis points (2050 = 20.50%)
  debtAtClose  BigInt
  debtPayments BigInt
  notes        String?
  createdAt    DateTime @default(now())

  period       Period   @relation(fields: [periodId], references: [id])
}
```

### ValueUnit with JSON Headers Field
```prisma
// Source: DFR.md section 2.8

model ValueUnit {
  id              String   @id @default(cuid())
  code            String   @unique
  name            String
  precision       Int
  symbol          String?
  providerUrl     String?
  providerPath    String?
  providerHeaders Json?
  refreshInterval Int      @default(0)
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  rates           UnitRate[]
  assets          Asset[]
}
```

### Seed Script: Dependency Order
```typescript
// prisma/seed.ts -- execution order
async function main() {
  // 1. Categories (no dependencies)
  const categories = await seedCategories()

  // 2. Periods (no dependencies)
  const { previousPeriod, currentPeriod } = await seedPeriods()

  // 3. Income Sources (no dependencies)
  const incomeSources = await seedIncomeSources()

  // 4. Debts (no dependencies)
  await seedDebts()

  // 5. Value Units (no dependencies, v2)
  const valueUnits = await seedValueUnits()

  // 6. Budgets (depends on: categories, periods)
  await seedBudgets(categories, currentPeriod)

  // 7. Transactions (depends on: categories, periods, income sources)
  await seedTransactions(categories, currentPeriod, previousPeriod, incomeSources)

  // 8. Monthly Summary (depends on: previous period)
  await seedMonthlySummary(previousPeriod)

  // 9. Unit Rates (depends on: value units, v2)
  await seedUnitRates(valueUnits)
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `prisma-client-js` generator | `prisma-client` generator | Prisma 7.0 (2025) | New generator recommended but old still works; not switching in Phase 2 |
| Seed auto-runs on `migrate dev` | Seed only on `db seed` or `migrate reset` | Prisma 7.0 (2025) | Must explicitly seed after migrations in dev workflow |
| `--skip-seed` flag on `migrate dev` | Flag removed | Prisma 7.0 (2025) | No longer relevant since seeding was removed from migrate dev |
| `package.json` prisma.seed | `prisma.config.ts` migrations.seed | Prisma 7.0 (2025) | Already configured correctly in existing prisma.config.ts |
| Connection string in schema.prisma | `prisma.config.ts` datasource.url | Prisma 7.0 (2025) | Already configured correctly |
| PrismaClient() without adapter | PrismaClient({ adapter }) required | Prisma 7.0 (2025) | All client instantiation must provide a driver adapter |

**Deprecated/outdated:**
- `prisma-client-js` generator: Deprecated in Prisma 7 but still functional. Will be removed in a future release. The existing project setup uses it and should continue for Phase 2 stability.
- `package.json#prisma.seed`: Replaced by `prisma.config.ts#migrations.seed`. Already migrated in Phase 1.

## Open Questions

1. **Should Phase 2 switch from `prisma-client-js` to `prisma-client` generator?**
   - What we know: `prisma-client-js` is deprecated but works in 7.6.0. `prisma-client` is the recommended generator.
   - What's unclear: Whether switching would require changes to import paths throughout the codebase.
   - Recommendation: Keep `prisma-client-js` for now. It works, and switching generators is a separate concern from schema + seed work. Can be done as a standalone task later.

2. **Whether to split seed.ts into multiple files**
   - What we know: The seed needs 9 entity types. With realistic data (10-15 transactions, multiple categories, budgets, etc.), a single file could exceed 300 lines.
   - What's unclear: Exact line count until written.
   - Recommendation: Split into `prisma/seed.ts` (main orchestrator, ~50 lines) and `prisma/seed-data.ts` (data constants and helper functions). If it still exceeds 300 lines, split further by entity group.

3. **Existing migration from Phase 1 stub**
   - What we know: The Phase 1 stub Period model may or may not have created a migration in the dev database.
   - What's unclear: Whether a migration directory exists with the stub schema.
   - Recommendation: Check for existing migrations. If any exist from the stub, use `prisma migrate reset` to start clean after writing the full schema. If no migrations exist yet (confirmed: `prisma/migrations/` directory does not exist), a fresh `migrate dev --name init` will work.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest latest (already configured) |
| Config file | vitest.integration.config.mts |
| Quick run command | `npm run test:run` |
| Full suite command | `npm run quality` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DB-01 | All 7 MVP entities defined with correct fields | integration | `npx prisma validate` (schema check) + `npx prisma migrate dev --name init` | N/A -- Wave 0 |
| DB-02 | Monetary fields are BigInt, rates are Int | integration | Seed script creates records with BigInt values, query back and verify types | Wave 0 |
| DB-03 | All 6 enums defined correctly | integration | Seed script uses all enum values without error | Wave 0 |
| DB-04 | Required indexes exist | integration | `npx prisma validate` + duplicate insert attempt on unique constraints should fail | Wave 0 |
| DB-05 | 8 default categories seeded with icons/colors | integration | `npx vitest run --config vitest.integration.config.mts tests/integration/seed.test.ts` | Wave 0 |
| DB-06 | 2 income sources seeded | integration | Same as DB-05 | Wave 0 |
| DB-07 | 2 debts seeded with non-zero balances | integration | Same as DB-05 | Wave 0 |
| DB-08 | Periods and budgets seeded | integration | Same as DB-05 | Wave 0 |
| DB-09 | v2 entities in schema, value units seeded | integration | Same as DB-05 | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx prisma validate && npx prisma generate`
- **Per wave merge:** `npm run quality`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/integration/seed.test.ts` -- covers DB-05, DB-06, DB-07, DB-08, DB-09 (seed idempotency and data correctness)
- [ ] `tests/setup.ts` -- needs real test DB connection setup (currently a placeholder comment)
- [ ] Test DB must be running: `docker compose -f docker-compose.test.yml up -d`

## Sources

### Primary (HIGH confidence)
- [Prisma 7 Config Reference](https://www.prisma.io/docs/orm/reference/prisma-config-reference) -- prisma.config.ts structure, seed configuration
- [Prisma 7 Seeding Docs](https://www.prisma.io/docs/orm/prisma-migrate/workflows/seeding) -- seed behavior changes, PrismaPg adapter in seed scripts
- [Prisma 7 Upgrade Guide](https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-versions/upgrading-to-prisma-7) -- breaking changes, generator migration
- [Prisma Schema Reference](https://www.prisma.io/docs/orm/reference/prisma-schema-reference) -- field types, BigInt, enum syntax, @@index, @@unique
- [Prisma 7 Generator Docs](https://www.prisma.io/docs/orm/prisma-schema/overview/generators) -- prisma-client vs prisma-client-js comparison
- [Prisma Migrate Reset Docs](https://www.prisma.io/docs/cli/migrate/reset) -- confirmed reset still triggers seeding in v7
- [Prisma v7 Migration Prompt](https://www.prisma.io/docs/ai/prompts/prisma-7) -- seed script example with PrismaPg adapter

### Secondary (MEDIUM confidence)
- [Prisma 7.3.0 Blog](https://www.prisma.io/blog/prisma-orm-7-3-0) -- BigInt JSON precision fix in relationJoins
- [Prisma Composite Unique Constraints](https://www.prisma.io/docs/orm/prisma-client/special-fields-and-types/working-with-composite-ids-and-constraints) -- upsert where clause syntax for compound keys

### Tertiary (LOW confidence)
- None -- all findings verified against official Prisma documentation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed and verified; Prisma 7.6.0 confirmed
- Architecture: HIGH -- schema patterns directly from Prisma docs + DFR.md entity definitions
- Pitfalls: HIGH -- composite unique naming, seed import paths, and BigInt serialization verified against official docs
- Seed script pattern: HIGH -- PrismaPg adapter requirement in seed confirmed by official Prisma 7 seeding docs

**Research date:** 2026-04-04
**Valid until:** 2026-05-04 (stable -- Prisma 7 is current major, schema APIs unlikely to change)
