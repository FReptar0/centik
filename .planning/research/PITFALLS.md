# Domain Pitfalls

**Domain:** Personal finance tracking web app (Mexican quincenal cycle)
**Researched:** 2026-04-04
**Confidence:** HIGH (verified against official docs, npm registry, GitHub issues)

---

## Critical Pitfalls

Mistakes that cause rewrites, data corruption, or fundamental architecture failures.

### Pitfall 1: Next.js Version Mismatch -- CLAUDE.md Says 14+, Package.json Has 16.2.2

**What goes wrong:** The project documentation (CLAUDE.md, DFR.md) references "Next.js 14+" patterns, but `package.json` ships Next.js 16.2.2 with React 19.2.4 and Tailwind CSS v4. Next.js 16 has breaking changes in caching, middleware (now proxy.ts), async dynamic APIs (`params`, `searchParams`, `cookies`, `headers` must all be `await`ed), and a fundamentally different rendering model.

**Why it happens:** CLAUDE.md was written targeting Next.js 14+ but `create-next-app` installed the latest (v16). The AGENTS.md file warns about this ("This is NOT the Next.js you know") but the rest of the documentation has not been reconciled.

**Consequences:**
- `params` and `searchParams` accessed synchronously will throw at runtime (they are now `Promise` types that must be `await`ed)
- `cookies()` and `headers()` must be `await`ed (were synchronous in Next.js 14)
- `middleware.ts` is now `proxy.ts` running on Node.js runtime (not Edge). `middleware.ts` is deprecated.
- `next lint` command is removed. Must use `eslint` directly.
- `revalidatePath()` behavior differs: in Server Actions it immediately refreshes the UI, in Route Handlers it only marks for next visit
- Caching model is completely different: `use cache` directive + `cacheLife` + `cacheTag` replace `unstable_cache`
- Without `cacheComponents: true`, fetch requests are NOT cached by default (opposite of Next.js 14 behavior)

**Prevention:**
1. Before Phase 1 scaffolding, audit every API pattern in CLAUDE.md/DATA_FLOW.md against the bundled docs at `node_modules/next/dist/docs/`
2. Do NOT create `middleware.ts` -- use `proxy.ts` if request interception is needed, or handle period auto-creation in root layout
3. Do NOT enable `cacheComponents: true` in MVP -- all data is personal and should be fresh
4. All page/layout components that receive `params` or `searchParams` must destructure them with `await`
5. All `cookies()` and `headers()` calls must be `await`ed
6. Replace `"lint": "next lint"` with `"lint": "eslint ."` in package.json scripts

**Detection:** Build errors mentioning "Promise" types; runtime "cannot read properties of undefined" on params; stale data after mutations

**Phase impact:** Phase 1 (scaffolding) -- every subsequent phase inherits this

### Pitfall 2: Tailwind CSS v4 Configuration -- No tailwind.config.ts

**What goes wrong:** CLAUDE.md specifies custom colors in `tailwind.config.ts` under `extend.colors`. Tailwind CSS v4 eliminates `tailwind.config.js/ts` entirely. Configuration is CSS-first using `@theme` directives. Building a `tailwind.config.ts` will be silently ignored.

**Why it happens:** Documentation was written for Tailwind v3 conventions. Scaffolded project installs v4.

**Consequences:**
- Custom color palette will not apply if defined in JS config file
- Utility class renames: `bg-gradient-to-*` is now `bg-linear-to-*`, `flex-shrink-0` is now `shrink-0`
- `@tailwind base/components/utilities` directives replaced by `@import 'tailwindcss'`
- Content path configuration is no longer needed (automatic detection)

**Prevention:**
1. Define design system in `app/globals.css` using `@theme` directive
2. Do NOT create `tailwind.config.ts`
3. Use `tailwind-merge` v3.5+ (not v2.x which is for Tailwind v3)
4. Audit all utility class names against Tailwind v4 docs before Phase 3

**Detection:** Styles not applying; default Tailwind colors instead of custom dark theme

**Phase impact:** Phase 1 (scaffolding), Phase 3 (layout), every UI phase

### Pitfall 3: Prisma 7 Configuration -- prisma.config.ts Replaces Previous Patterns

**What goes wrong:** CLAUDE.md describes Prisma seed configuration in `package.json` and database URL in `schema.prisma`. Prisma 7 moves both to a new `prisma.config.ts` file. The old patterns silently fail or cause errors.

**Why it happens:** CLAUDE.md was written for Prisma v5/v6. The ecosystem has moved to Prisma 7.

**Consequences:**
- `prisma db seed` fails if seed command is only in `package.json` (Prisma 7 reads from `prisma.config.ts`)
- `prisma migrate dev` fails if database URL is only in `schema.prisma` datasource block (Prisma 7 reads from `prisma.config.ts`)
- `prisma migrate dev` no longer auto-runs `prisma generate` -- must run explicitly
- `prisma migrate dev/reset` no longer auto-runs seed -- must run `prisma db seed` explicitly
- Environment variables are NOT loaded by default in Prisma 7 -- must import `dotenv/config` in `prisma.config.ts`

**Prevention:**
1. Create `prisma.config.ts` at project root with `defineConfig()` from `prisma/config`
2. Move datasource URL to `prisma.config.ts`: `datasource: { url: process.env.DATABASE_URL }`
3. Configure seed command in `prisma.config.ts`: `seed: 'tsx prisma/seed.ts'`
4. Import `'dotenv/config'` at top of `prisma.config.ts`
5. Install `tsx` and `dotenv` as dev dependencies
6. Update scripts to chain `prisma generate` after `prisma migrate dev`

**Detection:** "seed command not found" errors; "datasource url not configured" errors; missing generated client after migration

**Phase impact:** Phase 1 (scaffolding), Phase 2 (schema + seed)

### Pitfall 4: BigInt Serialization Boundary Leaks

**What goes wrong:** Prisma returns `BigInt` for all monetary fields. `JSON.stringify()` throws on BigInt. Every path from Prisma to the client must pass through `serializeBigInts()`. Missing even one path causes a runtime crash that is invisible during development if the field happens to be `0n` (which serializes as `0` number).

**Why it happens:** BigInt serialization failures are silent at zero values. Seed data creates budgets with `0n` amounts. Developers test with seed data, everything works, then crashes when real non-zero data flows through.

**Consequences:**
- Runtime crash: "Do not know how to serialize a BigInt"
- Crashes in production with real data, not during dev with zero-value seeds
- Server Components passing BigInt props to Client Components crash during RSC serialization

**Prevention:**
1. Create `serializeBigInts()` in Phase 2 and enforce its use via code review
2. Seed data MUST include non-zero monetary values (e.g., `150075n` for $1,500.75)
3. Write unit tests that verify serialization with actual BigInt values, not just zero
4. Consider a Prisma Client extension that auto-serializes BigInt fields

**Detection:** Test with non-zero seed data from day one

**Phase impact:** Phase 2 (serializer), Phase 4+ (every feature with monetary data)

### Pitfall 5: Period Close Transaction -- Partial Failure Corrupts Financial History

**What goes wrong:** Period close must atomically: (1) calculate totals, (2) create MonthlySummary, (3) close period, (4) create next period, (5) copy budgets. Partial failure without proper Prisma `$transaction` wrapping leaves the database inconsistent.

**Why it happens:** Prisma `$transaction` has a default 5-second timeout. Complex period close with aggregation queries can exceed this.

**Consequences:**
- MonthlySummary created but period still open (or vice versa)
- Next period created without budget copies
- History table shows incorrect data permanently

**Prevention:**
1. Use `$transaction` with explicit timeout: `{ timeout: 15000, maxWait: 10000 }`
2. Add unique constraint on `MonthlySummary.periodId` to prevent duplicates
3. Implement idempotency: check if summary exists before creating
4. Validate preconditions BEFORE starting the transaction
5. Write integration test exercising the full close flow + retry

**Detection:** Integration test in Phase 10; database constraint violations on duplicate summary

**Phase impact:** Phase 10 (history + period close) -- most critical test in the app

### Pitfall 6: toCents() Floating Point Contamination

**What goes wrong:** `toCents()` uses `Math.round(pesos * 100)` where `pesos` is a JavaScript `number`. Edge cases like `toCents(0.1 + 0.2)` introduce rounding errors before BigInt takes over.

**Why it happens:** `parseFloat("0.1") + parseFloat("0.2")` returns `0.30000000000000004`. `Math.round()` catches most cases but masks the problem.

**Consequences:**
- Off-by-one-centavo errors that accumulate over months
- Impossible to reproduce intermittently -- depends on specific decimal values

**Prevention:**
1. NEVER do arithmetic on peso amounts before converting to centavos
2. Parse user input string directly to centavos without float intermediate: split on decimal point
3. Validate max 2 decimal places in Zod schema before conversion
4. Write tests for known edge cases: "0.10", "0.20", "19.99", "999999.99"

**Detection:** Unit tests with exhaustive edge cases; roundtrip integrity assertions

**Phase impact:** Phase 2 (utilities foundation)

---

## Moderate Pitfalls

### Pitfall 7: Recharts 3.x + React 19 Rendering Failure

**What goes wrong:** Recharts 3.x has an open issue (#6857) where charts render blank on React 19.2.3+. The `react-is` internal dependency version mismatch causes rendering failures with no console errors.

**Why it happens:** Recharts depends on `react-is` internally. When the version doesn't match the installed React version, component type checks fail silently.

**Prevention:**
1. Install `react-is@^19.2.4` explicitly alongside Recharts
2. Add `pnpm.overrides` for `react-is` if peer dependency conflicts arise
3. Validate with a test chart in Phase 1 (render a simple BarChart, verify it appears)
4. Have fallback plan: nivo (verbose but SSR-friendly) or react-chartjs-2
5. ALL chart components must have `"use client"` directive

**Detection:** Charts rendering as blank white space; `pnpm install` peer dependency warnings

**Phase impact:** Phase 7 (Dashboard charts)

### Pitfall 8: ESLint Flat Config + next lint Removal

**What goes wrong:** CLAUDE.md assumes `pnpm lint` runs `next lint`. Next.js 16 removed the `next lint` command entirely. The project must use `eslint` directly with flat config format.

**Why it happens:** `eslint-config-next` 16.x uses flat config format. The old `.eslintrc.json` pattern is incompatible.

**Consequences:**
- `next lint` command fails with "command not found" or similar
- Old `.eslintrc.json` config is ignored by ESLint 9 flat config
- Quality Loop script `pnpm lint` breaks

**Prevention:**
1. Create `eslint.config.mjs` (not `.eslintrc.json`) using `defineConfig` from `eslint/config`
2. Import `eslint-config-next/core-web-vitals` and `eslint-config-prettier/flat`
3. Set `"lint": "eslint ."` in package.json (not `"next lint"`)
4. Install `eslint-config-prettier@^10` for flat config compatibility

**Detection:** `pnpm lint` failing; ESLint warnings about unknown config format

**Phase impact:** Phase 1 (scaffolding)

### Pitfall 9: Revalidation Gaps -- Stale Data Across Views After Mutations

**What goes wrong:** Missing `revalidatePath()` calls after mutations cause stale data on pages the user navigates to. Creating a transaction should revalidate `/`, `/movimientos`, and `/presupuesto`. Missing one path = stale budget progress bars.

**Why it happens:** Mutation-to-view dependency graph grows with features. Easy to forget paths.

**Prevention:**
1. Create centralized `revalidateAfterMutation(entityType)` utility
2. Write E2E tests: perform mutation on one page, navigate to dependent page, verify fresh data
3. Document dependency graph (DATA_FLOW.md section 5)

**Detection:** Manual cross-page testing; E2E navigation tests after mutations

**Phase impact:** Phase 5+ (every phase with mutations)

### Pitfall 10: Dashboard N+1 Queries

**What goes wrong:** Dashboard requires 5+ independent queries. Sequential `await` serializes them, blocking page render for 200-500ms.

**Prevention:**
1. Use `Promise.all()` for parallel queries
2. Add `loading.tsx` for Suspense skeleton
3. Group related KPIs into fewer SQL queries where possible

**Phase impact:** Phase 7 (Dashboard)

### Pitfall 11: Seed Script Non-Idempotency

**What goes wrong:** Seed script crashes on unique constraint violations if run twice.

**Prevention:**
1. Use `upsert` for all seed operations
2. Test idempotency: run seed twice in integration tests
3. Use `month_year` unique composite for period check

**Phase impact:** Phase 1 (DB setup)

### Pitfall 12: Period Auto-Creation Race Condition

**What goes wrong:** `getCurrentPeriod()` check-then-create pattern can race in concurrent requests (multiple tabs), causing unique constraint violations.

**Prevention:**
1. Use Prisma `upsert` instead of find-then-create:
   ```ts
   await prisma.period.upsert({
     where: { month_year: { month, year } },
     create: { month, year, startDate, endDate, isClosed: false },
     update: {},
   })
   ```

**Phase impact:** Phase 2 (schema), Phase 5+ (anywhere getCurrentPeriod is called)

---

## Minor Pitfalls

### Pitfall 13: Lucide Icon Bundle Size

**What goes wrong:** Importing all icons from `lucide-react` via `{ icons }` includes ~150KB in client bundle.

**Prevention:** Create static map of only used icons (8 defaults + fallback). Individual imports for static usage.

**Phase impact:** Phase 3 (layout), Phase 5 (categories)

### Pitfall 14: Date Timezone Handling

**What goes wrong:** `new Date()` uses server timezone. Period boundaries could be off by one day if server timezone differs from Mexico City (UTC-6).

**Prevention:** Use UTC for all date construction; document expected timezone behavior.

**Phase impact:** Phase 2 (seed), Phase 6 (transactions), Phase 10 (period close)

### Pitfall 15: Budget Copy Missing New Categories

**What goes wrong:** Period close copies budgets but misses categories added after budget setup.

**Prevention:** During close, reconcile ALL active expense categories against new period budget entries. Create zero-amount entries for any missing.

**Phase impact:** Phase 10 (period close)

### Pitfall 16: Debt Interest Calculation -- Integer Division Truncation

**What goes wrong:** BigInt division truncates. `4575 / 12 = 381` (loses 0.25). Order of operations matters.

**Prevention:** Multiply before dividing: `currentBalance * annualRate / 12 / 10000`. Document that results are approximate.

**Phase impact:** Phase 8 (debts)

### Pitfall 17: Test Database Migration Drift

**What goes wrong:** Test DB schema falls out of sync with dev DB after new migrations.

**Prevention:**
1. Test setup runs `prisma migrate deploy` against test DB
2. Add `"pretest:integration": "dotenv -e .env.test -- prisma migrate deploy"` script
3. Use `docker-compose.test.yml` with `tmpfs` for test DB

**Phase impact:** Phase 1 (scaffolding), Phase 5+ (every integration test phase)

---

## Phase-Specific Warnings

| Phase | Likely Pitfall | Severity | Mitigation |
|-------|---------------|----------|------------|
| Phase 1: Scaffolding | Version mismatch (Pitfall 1) | CRITICAL | Audit all patterns against actual installed versions |
| Phase 1: Scaffolding | Prisma 7 config (Pitfall 3) | CRITICAL | Create prisma.config.ts, not package.json seed |
| Phase 1: Scaffolding | ESLint flat config (Pitfall 8) | HIGH | eslint.config.mjs, not .eslintrc.json |
| Phase 1: Scaffolding | Tailwind v4 config (Pitfall 2) | CRITICAL | @theme in CSS, no tailwind.config.ts |
| Phase 2: Schema + Seed | Seed non-idempotency (Pitfall 11) | MODERATE | Use upsert; include non-zero amounts |
| Phase 2: Schema + Seed | Period race condition (Pitfall 12) | MODERATE | Use upsert for period creation |
| Phase 3: Utilities | toCents() float contamination (Pitfall 6) | HIGH | Parse string without float; edge case tests |
| Phase 3: Utilities | BigInt serialization (Pitfall 4) | CRITICAL | Test with non-zero values |
| Phase 5: Income Sources | Revalidation gaps (Pitfall 9) | MODERATE | Centralize revalidation per entity |
| Phase 6: Transactions | Closed period bypass | MODERATE | Check isClosed before inserts |
| Phase 7: Dashboard | Recharts + React 19 (Pitfall 7) | HIGH | Validate in Phase 1; have fallback |
| Phase 7: Dashboard | Sequential queries (Pitfall 10) | MODERATE | Promise.all(); loading.tsx |
| Phase 8: Debts | Integer division truncation (Pitfall 16) | LOW | Multiply before dividing |
| Phase 9: Budget | Budget vs spent query | MODERATE | LEFT JOIN with COALESCE |
| Phase 10: Period Close | Partial failure (Pitfall 5) | CRITICAL | $transaction with timeout; idempotency |
| Phase 10: Period Close | Missing categories (Pitfall 15) | MODERATE | Reconcile all active categories |
| Phase 11: Polish | Timezone edge cases (Pitfall 14) | LOW | Consistent UTC handling |

---

## Sources

- [Next.js 16 Release Blog](https://nextjs.org/blog/next-16) -- HIGH confidence
- [Next.js 16 Upgrade Guide](https://nextjs.org/docs/app/guides/upgrading/version-16) -- HIGH confidence
- [Next.js 16 middleware to proxy](https://nextjs.org/docs/messages/middleware-to-proxy) -- HIGH confidence
- [Prisma 7 Upgrade Guide](https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7) -- HIGH confidence
- [Prisma Config Reference](https://www.prisma.io/docs/orm/reference/prisma-config-reference) -- HIGH confidence
- [Prisma 7.3 BigInt Fix](https://www.prisma.io/blog/prisma-orm-7-3-0) -- HIGH confidence
- [Tailwind CSS v4 Upgrade Guide](https://tailwindcss.com/docs/upgrade-guide) -- HIGH confidence
- [Recharts React 19 Issue #6857](https://github.com/recharts/recharts/issues/6857) -- MEDIUM confidence
- [Next.js ESLint Configuration](https://nextjs.org/docs/app/api-reference/config/eslint) -- HIGH confidence
- [eslint-config-next npm](https://www.npmjs.com/package/eslint-config-next) -- HIGH confidence
