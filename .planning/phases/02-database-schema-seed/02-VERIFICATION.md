---
phase: 02-database-schema-seed
verified: 2026-04-05T18:30:00Z
status: gaps_found
score: 4/5 success criteria verified
re_verification: false
gaps:
  - truth: "Seed script creates current period, default income sources, default debts, and zero-amount budget entries"
    status: partial
    reason: "DB-07 requires zero balances for default debts; DB-08 requires zero-amount budget entries for current period. The seed script intentionally deviates from these requirements by creating non-zero balances ($15,000 CC, $80,000 loan) and non-zero budget amounts ($2,000–$400 per category). CLAUDE.md Seed Data section and REQUIREMENTS.md both explicitly specify zero balances and zero budget amounts. The ROADMAP phase goal requires 'non-zero monetary amounts' but SC-3 specifically says zero-amount budgets. This is a documented plan deviation that conflicts with the requirements spec."
    artifacts:
      - path: "prisma/seed-data.ts"
        issue: "DEBTS constant seeds non-zero currentBalance (1500000 and 8000000 centavos). DB-07 and CLAUDE.md require zero balances for default debts."
      - path: "prisma/seed-data.ts"
        issue: "BUDGET_AMOUNTS constant seeds non-zero quincenal amounts (200000–40000 centavos). DB-08 and CLAUDE.md require zero-amount budget entries."
    missing:
      - "Decide and document: either update DB-07/DB-08 requirements to reflect 'non-zero demo data' intent (acceptable deviation), or add a separate seed-reset command that zeros out these fields for production-fresh installs. The current state will confuse future developers who read REQUIREMENTS.md and expect zero defaults."
human_verification: []
---

# Phase 2: Database Schema + Seed Verification Report

**Phase Goal:** Complete database schema exists with seeded reference data including non-zero monetary amounts that exercise BigInt serialization
**Verified:** 2026-04-05T18:30:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (from ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `npm run prisma migrate dev` applies all migrations cleanly on a fresh database | VERIFIED | Migration `20260405001123_init` exists with 233-line SQL creating all 10 tables, 6 enums, all indexes and FKs. Dev DB has 10 application tables confirmed via Docker psql query. |
| 2 | Seed script creates 8 categories (6 expense + 2 income) with correct Lucide icon names and hex colors | VERIFIED | Dev DB confirmed: Comida/utensils/#fb923c, Servicios/zap/#60a5fa, Entretenimiento/clapperboard/#a78bfa, Suscripciones/smartphone/#f472b6, Transporte/car/#fbbf24, Outros/package/#94a3b8, Empleo/briefcase/#34d399, Freelance/laptop/#22d3ee. Exact match with DFR.md 2.3. |
| 3 | Seed script creates current period, default income sources, default debts, and zero-amount budget entries | PARTIAL | Period (April 2026 open) and income sources (TerSoft QUINCENAL, Freelance VARIABLE) created correctly. Debts seeded with non-zero balances: Tarjeta Nu = 1,500,000 centavos ($15,000), Prestamo Personal = 8,000,000 centavos ($80,000). Budget amounts non-zero: $2,000–$400 quincenal per category. Conflicts with DB-07 ("zero balances"), DB-08 ("zero-amount budget entries"), and CLAUDE.md Seed Data section. |
| 4 | Seed is idempotent — running it twice produces no errors and no duplicate records | VERIFIED | 15 integration tests pass including idempotency suite: second seed run produces no errors, category count stays at 8, period count stays at 2, transaction counts fixed at 13 (April) and 9 (March). |
| 5 | All BigInt monetary fields in seed data include at least one non-zero value to validate serialization paths | VERIFIED | Income sources (2,500,000 and 1,500,000 centavos), debts (1,500,000 and 8,000,000 centavos), budget amounts, transaction amounts, MonthlySummary totals, and unit rates all non-zero. Multiple BigInt fields exercised. |

**Score:** 4/5 truths verified (SC-3 partial due to requirements conflict)

---

## Required Artifacts

### Plan 02-01 Artifacts (Schema)

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `prisma/schema.prisma` | 10 models, 6 enums, all relations, indexes, constraints | VERIFIED | 228 lines. All 10 models present: IncomeSource, Transaction, Category, Debt, Budget, Period, MonthlySummary, ValueUnit, UnitRate, Asset. All 6 enums: TransactionType, Frequency, DebtType, PaymentMethod, CategoryType, AssetCategory. All monetary fields BigInt, all rates Int. |
| `prisma/migrations/` | Initial migration SQL for all entities | VERIFIED | `20260405001123_init/migration.sql` (233 lines) creates all 10 tables with correct column types, 6 PG enum types, all indexes, and FK constraints. `migration_lock.toml` present. |

### Plan 02-02 Artifacts (Seed + Tests)

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `prisma/seed.ts` | Idempotent orchestrator, `async function main` | VERIFIED | 275 lines. Orchestrates seed in dependency order: categories → periods → income sources → debts → value units → budgets → transactions → monthly summary → unit rates. Count-check idempotency for transactions. |
| `prisma/seed-data.ts` | Data constants for seed | VERIFIED | 136 lines. Exports CATEGORIES, BUDGET_AMOUNTS, INCOME_SOURCES, DEBTS, VALUE_UNITS, MARCH_SUMMARY, UNIT_RATES. All BigInt values non-zero. |
| `prisma/seed-transactions.ts` | Transaction builder functions | VERIFIED | 221 lines. `buildCurrentMonthTransactions` (13 txns for April) and `buildPreviousMonthTransactions` (9 txns for March). Mix of INCOME/EXPENSE, all categories covered. |
| `tests/setup.ts` | PrismaClient connected to test DB | VERIFIED | Loads `.env.test` via `dotenv.config({ path: '.env.test' })`. Creates PrismaClient with PrismaPg adapter. Exports `prisma`. beforeAll/afterAll connect/disconnect hooks. |
| `tests/integration/seed.test.ts` | 15 integration tests in 2 suites | VERIFIED | 237 lines. Suite 1: "Seed data correctness" (11 tests). Suite 2: "Seed idempotency" (4 tests). All 15 tests pass (`npm run test:integration`: 15 passed, 0 failed). |

---

## Key Link Verification

### Plan 02-01 Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `prisma/schema.prisma` | `generated/prisma/` | `prisma generate` | VERIFIED | `generator client { output = "../generated/prisma" }` present. `generated/prisma/` directory confirmed with client.js, index.d.ts, etc. |
| `prisma/schema.prisma` | `prisma/migrations/` | `prisma migrate dev` | VERIFIED | Migration SQL contains `CREATE TABLE` for all 10 entities matching schema models. |

### Plan 02-02 Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `prisma/seed.ts` | `prisma/schema.prisma` | PrismaClient generated types | VERIFIED | `prisma.category.upsert`, `prisma.period.upsert`, `prisma.incomeSource.upsert`, `prisma.debt.upsert`, `prisma.budget.upsert`, `prisma.transaction.create`, `prisma.monthlySummary.upsert`, `prisma.valueUnit.upsert`, `prisma.unitRate.findUnique/create` — all 9 MVP + v2 entities exercised. |
| `prisma/seed.ts` | `generated/prisma/client` | `import PrismaClient` | VERIFIED | `import { PrismaClient } from '../generated/prisma/client'` — correct relative path, not the app singleton. |
| `tests/integration/seed.test.ts` | `prisma/seed.ts` | verifies seed output by querying DB | VERIFIED | `prisma.category.findMany()`, `prisma.period.findMany()`, `prisma.incomeSource.findMany()`, `prisma.debt.findMany()`, `prisma.budget.findMany()`, `prisma.transaction.count()`, `prisma.monthlySummary.findUnique()`, `prisma.valueUnit.findMany()`, `prisma.unitRate.findMany()` — all 8 entity groups queried. |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| DB-01 | 02-01-PLAN | Prisma schema defines all 7 MVP entities | SATISFIED | All 7 MVP models confirmed in schema.prisma: IncomeSource, Transaction, Category, Debt, Budget, Period, MonthlySummary. |
| DB-02 | 02-01-PLAN | All monetary fields BigInt (centavos), rates Int (basis points) | SATISFIED | Migration SQL: `BIGINT` for all monetary columns. Schema: `Int` for annualRate/savingsRate. Confirmed field-by-field. |
| DB-03 | 02-01-PLAN | Enums: TransactionType, Frequency, DebtType, PaymentMethod, CategoryType | SATISFIED | All 5 listed enums defined. AssetCategory also defined (for v2 DB-09 entities) — not listed in DB-03 but covered under DB-09. |
| DB-04 | 02-01-PLAN | Indexes on Transaction(periodId,date), Transaction(categoryId), Budget(periodId,categoryId) unique, Period(month,year) unique | SATISFIED | Migration confirms: `Transaction_periodId_date_idx`, `Transaction_categoryId_idx`, `Budget_periodId_categoryId_key` unique, `Period_month_year_key` unique. UnitRate(unitId,date) unique and Asset(unitId) index also present. |
| DB-05 | 02-02-PLAN | Seed creates 8 default categories (6 expense + 2 income) with Lucide icon names and colors | SATISFIED | Dev DB confirmed: 8 rows with exact icon/color/type values from DFR.md 2.3. Integration test "seeds 8 categories" passes. |
| DB-06 | 02-02-PLAN | Seed creates default income sources (TerSoft quincenal, Freelance variable) | SATISFIED | Dev DB: "TerSoft (Empleo)" QUINCENAL 2,500,000 centavos; "Freelance" VARIABLE 1,500,000 centavos. Non-zero, isActive=true. |
| DB-07 | 02-02-PLAN | Seed creates default debts (1 credit card, 1 personal loan, **zero balances**) | CONFLICT | Seed creates "Tarjeta Nu" (CREDIT_CARD) and "Prestamo Personal" (PERSONAL_LOAN) correctly. However, balances are NON-ZERO: $15,000 and $80,000. CLAUDE.md and REQUIREMENTS.md explicitly specify "zero balances". Plan 02-02-PLAN intentionally chose non-zero amounts for demo data quality. Documented deviation but unresolved requirement conflict. |
| DB-08 | 02-02-PLAN | Seed creates current period and **zero-amount** budget entries | CONFLICT | Current period (April 2026) created correctly. Budget entries seeded with NON-ZERO amounts ($2,000–$400 quincenal). Additionally, a PREVIOUS closed period (March 2026) was created beyond what the requirement specifies — this is additive and valuable, not harmful. The "zero-amount" conflict is the same nature as DB-07. |
| DB-09 | 02-02-PLAN | v2 entities (ValueUnit, UnitRate, Asset) included in schema but no UI/API | SATISFIED | All 3 v2 models in schema. Seeded 3 ValueUnits (MXN, UDI, UMA) and 2 UnitRates. No UI or API routes created. |

**Requirement conflicts noted: DB-07 and DB-08** — requirements say "zero balances/amounts" but seed uses non-zero demo data. The ROADMAP phase goal ("non-zero monetary amounts") and SC-5 justify non-zero values, but SC-3 and the requirements text contradict this. The plan made an intentional, documented deviation that has not been reconciled in REQUIREMENTS.md or CLAUDE.md.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `vitest.integration.config.mts` | 10-11 | `pool: 'forks'` + `poolOptions.forks.singleFork` — removed in Vitest 4, generates DEPRECATED warning at runtime | Warning | Non-blocking; tests still pass. Causes console noise. Fix: move `singleFork: true` to top-level `forks: true` or equivalent Vitest 4 config. |

No TODO/FIXME/placeholder patterns found. No empty implementations or stub returns. No `console.log` in production code (only in seed.ts which is a dev-only script).

---

## Human Verification Required

None. All critical behaviors were verified programmatically:
- Schema structure verified against migration SQL
- Seed data verified via direct Docker PostgreSQL queries against the dev database
- Integration tests (15/15) executed successfully against the test database
- Build passes with zero errors (`npm run build`: "Compiled successfully")
- Lint passes with zero warnings (`npm run lint`: no output)

---

## Gaps Summary

**One gap found: DB-07 and DB-08 requirements conflict**

The seed script was intentionally designed to provide realistic non-zero demo data (documented decision in 02-02-SUMMARY.md), which directly contradicts CLAUDE.md's "Seed Data" section and REQUIREMENTS.md DB-07/DB-08 which specify zero balances for default debts and zero-amount budget entries.

This is not a broken implementation — the code works correctly and the phase goal ("non-zero monetary amounts that exercise BigInt serialization") is satisfied. The gap is a requirements document inconsistency: the ROADMAP and phase goal call for non-zero amounts, while CLAUDE.md and REQUIREMENTS.md call for zeros.

**Resolution options (for the team/planner):**

1. Update REQUIREMENTS.md DB-07 and DB-08 to reflect "realistic demo data" intent and remove the "zero balances" language (preferred — the non-zero data is more valuable for development and testing downstream phases).
2. Update CLAUDE.md Seed Data section to match the plan's intent.
3. Alternatively, add a separate `seed-reset.ts` for production-fresh installs that zeros out debt balances and budget amounts, keeping the demo data in `seed.ts`.

The gap does not block any downstream phase — every Phase 3+ plan will have meaningful data to work with. It is a documentation inconsistency, not a functional gap.

---

_Verified: 2026-04-05T18:30:00Z_
_Verifier: Claude (gsd-verifier)_
