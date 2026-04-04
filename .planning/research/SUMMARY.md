# Project Research Summary

**Project:** Centik (MisFinanzas)
**Domain:** Single-user personal finance tracking (Mexican quincenal cycle)
**Researched:** 2026-04-04
**Confidence:** HIGH

## Executive Summary

Centik is a single-user personal finance web app with a specialized Mexican quincenal (biweekly) pay cycle. Research reveals that the scaffolded project already ships with versions substantially ahead of what the project documentation describes: Next.js 16.2.2 (not 14+), React 19.2.4, Tailwind CSS v4, and Prisma 7. These are not minor bumps — each has breaking changes that make the CLAUDE.md documentation a liability if followed without auditing. The single highest-priority action before any code is written is reconciling the installed versions against actual documentation, specifically Next.js 16 bundled docs at `node_modules/next/dist/docs/`.

The recommended architecture is Server Component-first with Server Actions for mutations, PostgreSQL with BigInt centavo storage, and no client-side state management. This is well-suited to the domain: it is an aggregation-heavy, single-user CRUD app where data freshness matters more than caching and where floating-point money errors are a correctness risk, not just a performance concern. The serialization boundary between PostgreSQL BigInt and client-consumed strings is the single most architecturally load-bearing concept in the codebase — every data path must pass through `serializeBigInts()` and this must be tested with non-zero values from day one.

The core risks are version-mismatch footguns (async `params`/`searchParams`/`cookies`/`headers`, removed `next lint`, CSS-first Tailwind, Prisma 7 `prisma.config.ts`), a Recharts 3.x + React 19 blank-chart bug that needs early validation, and the period-close atomic transaction which is the most critical mutation in the app. None of these are blockers — all have clear documented mitigations — but they must be addressed in the correct phases or they will cause expensive rewrites.

## Key Findings

### Recommended Stack

The project is already scaffolded with production-ready versions that need to be understood and used correctly rather than installed fresh. Prisma 7 introduces a `prisma.config.ts` that replaces both the `package.json` seed config and the `schema.prisma` datasource URL. Tailwind v4 eliminates `tailwind.config.ts` entirely in favor of a CSS `@theme` directive in `globals.css`. ESLint 9 uses flat config (`eslint.config.mjs`), and the `next lint` command is gone. All dynamic APIs (`params`, `searchParams`, `cookies`, `headers`) are now Promise types that must be awaited.

The one genuinely unresolved technical question is Recharts 3.x compatibility with React 19.2.4. There is an open GitHub issue (#6857) documenting blank chart rendering with no console error. The workaround is installing `react-is@^19.2.4` and/or adding a pnpm override. This must be validated with a test chart during Phase 1 scaffolding, with nivo or react-chartjs-2 as a ready fallback.

**Core technologies:**
- Next.js 16.2.2: Full-stack framework — already installed; breaking changes from 14+ docs require immediate reconciliation before Phase 1
- React 19.2.4: UI library — stable Server Components and Server Actions; async dynamic APIs are a breaking change
- PostgreSQL 16: Database — robust BigInt support, Docker-friendly, handles all dataset sizes this app will ever reach
- Prisma 7.6: ORM — new `prisma.config.ts` format, TypeScript query engine, BigInt JSON fix in 7.3+
- Tailwind CSS v4: Styling — CSS-first `@theme` config, 100x faster incremental builds, no JS config file
- Zod 4.3: Validation — 14x faster, 57% smaller, minimal breaking changes from v3 patterns
- Vitest 4.1 + Playwright 1.59: Testing — Vite-native unit tests, industry-standard E2E, both React 19 compatible
- Recharts 3.8: Charts — needs `react-is@^19.2.4` workaround; must validate in Phase 1
- sonner 2.0: Toast notifications — zero-config, no provider/context needed
- lucide-react 1.7: Icons — 1500+ icons, tree-shakable, React 19 compatible; CLAUDE.md mandates exclusively

### Expected Features

The feature set is defined by the existing DFR.md. Research confirms the dependency order is critical: categories and periods must exist (seeded) before transactions can be created, and transactions must exist before the dashboard displays anything meaningful. The quincenal-native budgeting is the clearest differentiator — no mainstream finance app handles Mexican pay cycles natively. The period close atomic transaction is the highest-complexity feature and must be built last when all other features are stable.

**Must have (table stakes):**
- Transaction CRUD — core action; the entire app exists to record transactions; quick entry (<30s) is the key UX requirement
- Category-based expense tracking — universal mental model; 6 expense + 2 income categories seeded
- Monthly budget with progress bars — table stakes for any finance app; traffic light visual (green/orange/red) is low-effort high-value
- Dashboard with KPIs and charts — first thing users see; drives all aggregation query design
- Debt tracking — universal need; credit card utilization and loan progress
- Income source management — simplest entity; validates full-stack pattern before complex features
- Period management — auto-create, close with atomic snapshot, read-only for closed periods
- Responsive layout with dark theme — mobile is how users check finances

**Should have (differentiators):**
- Quincenal-native budgeting — input in quincenal, auto-calculate monthly/semester/annual; unique to Mexican context
- 30-second transaction entry — floating "+" button, smart defaults, 4 taps/clicks max
- Budget traffic light system — pure presentation logic; <80% green, 80-100% orange, >100% red
- Period close as atomic transaction — data integrity guarantee; most critical integration test in the app
- Annual history pivot table — year-over-year financial narrative; rare in simple finance apps

**Defer to v2+:**
- ValueUnit/UnitRate/Asset entities — schema can be included but no UI/API in v1
- Authentication — single user, not needed for MVP
- CSV/PDF bank statement import — brittle, validate demand before building
- Bank API connections — Mexican APIs unreliable, institutional agreements required
- PWA/offline support — low priority for web-first personal tool

### Architecture Approach

The architecture follows a Server Component-first, Server Action-preferred pattern on Next.js 16 App Router. Pages are Server Components that run Prisma queries in parallel via `Promise.all`, call `serializeBigInts()` on results, and pass plain string-valued objects as props to child components. Client Components handle only interactive logic (forms, modals, charts, navigation toggles). All mutations flow through Server Actions that validate with Zod, write via Prisma, and call `revalidatePath()` for all affected routes. There are no client-side state management libraries — React `useState` for local state, URL search params for filter state. The `use cache` directive is explicitly NOT used because all data is personal and must always be fresh per-request.

**Major components:**
1. Foundation libraries (`lib/`) — `prisma.ts`, `serialize.ts`, `utils.ts`, `validators.ts`, `constants.ts`; built and tested to 100% coverage first; all other layers depend on these
2. Server Component pages (`app/`) — data fetching with parallel queries, serialization, prop passing; zero interactive logic
3. Server Actions (`actions/`) — Zod validation, Prisma writes, `revalidatePath()` per entity; preferred over API routes for all internal UI mutations
4. Client Components (`components/`) — forms, modals, charts, navigation; receive serialized props, never fetch data directly
5. API Routes (`app/api/`) — only for external consumers (dashboard aggregation endpoint, future cron targets); not for internal UI mutations
6. PostgreSQL via Prisma — BigInt centavos for all monetary values, Int basis points for rates, `$transaction` with explicit timeout for multi-table atomics

### Critical Pitfalls

1. **Next.js 16 async dynamic APIs** — `params`, `searchParams`, `cookies`, and `headers` are all Promise types and must be awaited. Synchronous access throws at runtime with no helpful error. Also: `middleware.ts` is replaced by `proxy.ts`, `next lint` is removed (use `eslint .`), and do not enable `use cache`. Mitigate by reading `node_modules/next/dist/docs/` before Phase 1.

2. **Tailwind v4 + Prisma 7 configuration** — `tailwind.config.ts` is silently ignored in v4 (use `@theme` in CSS); `prisma.config.ts` replaces `package.json` seed config and `schema.prisma` datasource URL in Prisma 7. Both files must be created in Phase 1 before any application code. Missing either causes invisible failures.

3. **BigInt serialization boundary leaks** — Zero-value seeds mask missing `serializeBigInts()` calls because `0n` serializes as the number `0`. Crashes appear in production with real data. Seed data must include non-zero monetary amounts from Phase 2. Every Prisma result must pass through `serializeBigInts()` before leaving the server boundary.

4. **Period close partial failure** — The most critical mutation: creates MonthlySummary, closes period, creates next period, copies budgets — all atomically. Must use `prisma.$transaction` with explicit timeout (`{ timeout: 15000 }`), unique constraint on `MonthlySummary.periodId`, and idempotency checks. The integration test for this is the most important test in the entire app.

5. **Recharts + React 19 blank charts** — Open GitHub issue (#6857). Charts render as blank white space with no console error. Fix: install `react-is@^19.2.4`, add pnpm override if needed. Validate with a test BarChart in Phase 1. Ready fallback: nivo (SSR-friendly, React 19 compatible).

## Implications for Roadmap

Based on the architecture's strict dependency order and the critical pitfalls identified, here is the recommended phase structure:

### Phase 1: Infrastructure + Scaffolding
**Rationale:** Every subsequent phase depends on the toolchain being correct. The version mismatches (Next.js 16, Tailwind v4, Prisma 7, ESLint 9) must be resolved before any application code is written. A broken toolchain invalidates every downstream phase.
**Delivers:** Working dev environment, passing `pnpm build`, passing `pnpm lint`, running `pnpm test` with zero tests, Docker Compose for dev and test DBs, `prisma.config.ts`, `eslint.config.mjs`, Tailwind `@theme` CSS config, Recharts validation chart to confirm React 19 compatibility.
**Avoids:** Pitfall 1 (Next.js version mismatch), Pitfall 2 (Tailwind v4 config), Pitfall 3 (Prisma 7 config), Pitfall 7 (Recharts blank charts — validate here), Pitfall 8 (ESLint flat config), Pitfall 17 (test DB migration drift)

### Phase 2: Database Schema + Seed
**Rationale:** All application features require the schema to exist. Seed data provides categories, periods, income sources, debts, and budgets that are prerequisites for testing every other feature. Non-zero monetary seed values are required to expose BigInt serialization failures that zero values would hide.
**Delivers:** Complete Prisma schema with all entities and relations, migrations, idempotent seed script with non-zero amounts for all BigInt monetary fields.
**Uses:** Prisma 7 (`prisma.config.ts` seed configuration), PostgreSQL 16, `tsx` runner
**Avoids:** Pitfall 4 (zero-value seeds hiding BigInt issues), Pitfall 11 (seed non-idempotency — use upsert), Pitfall 12 (period race condition — use upsert not find-then-create)

### Phase 3: Foundation Libraries
**Rationale:** `lib/utils.ts`, `lib/serialize.ts`, `lib/validators.ts`, `lib/constants.ts`, and `types/index.ts` are used by every feature. Building and testing them to 100% coverage first means all subsequent phases stand on verified ground. The `toCents()` float contamination risk must be caught here with exhaustive edge case tests.
**Delivers:** Bulletproof utility functions, complete Zod schemas, BigInt serializer, TypeScript types — all with 100% test coverage before any feature work begins.
**Uses:** Zod 4.3, Vitest 4.1
**Avoids:** Pitfall 6 (toCents float contamination — parse string without float intermediate), Pitfall 4 (BigInt serialization — tested with non-zero values)

### Phase 4: Layout Shell
**Rationale:** Every page renders inside the root layout. Sidebar, mobile nav, and floating "+" button are prerequisites for testing all features in context. No data dependencies from the database, so this can be built immediately after the foundation library layer.
**Delivers:** Root layout with Sidebar (desktop), MobileNav (mobile bottom tabs), Header, FAB button, UI primitives (Button, Input, Modal, Card, DynamicIcon, ProgressBar, Badge).
**Uses:** Tailwind v4 `@theme` CSS config, lucide-react 1.7 (static icon map for DynamicIcon), clsx + tailwind-merge v3
**Avoids:** Pitfall 13 (Lucide bundle size — static icon map, not dynamic imports)

### Phase 5: Income Sources CRUD
**Rationale:** Income Sources is the simplest full-stack entity — one table, straightforward CRUD, no computed fields. Building it first validates the entire pattern: Server Component page → Server Action → Prisma → `revalidatePath()` → re-render. If anything is wrong with the architecture, it surfaces here at minimum cost.
**Delivers:** Income Sources list page, create/edit/delete via Server Actions, Zod validation, BigInt serialization for `defaultAmount`.
**Implements:** Server Component + Server Action pattern end-to-end; establishes centralized `revalidateAfterMutation` utility
**Avoids:** Pitfall 9 (revalidation gaps — establish the pattern here before it becomes habitual to miss paths)

### Phase 6: Categories + Transactions
**Rationale:** Transactions are the core feature — the entire app exists to record them. Categories are seeded but need a list view. Both entities are required for all subsequent features (Dashboard, Budget). This is the first E2E test target.
**Delivers:** Categories list page (mostly read-only), Transaction page with form + list + filters, first Playwright E2E test for the transaction registration flow.
**Uses:** TransactionForm (Client Component with `toCents` conversion), Server Actions, Zod `createTransactionSchema`
**Avoids:** Closed period bypass (check `isClosed` before insert), Pitfall 9 (revalidate `/`, `/movimientos`, `/presupuesto`)

### Phase 7: Dashboard
**Rationale:** Dashboard requires transaction data to display anything meaningful, so it follows Phase 6. It is read-only aggregation — no mutations — making it lower risk than write-path features. All 5+ independent queries must run in parallel.
**Delivers:** KPI cards (6 metrics), 3 Recharts charts (expense pie, budget bar, trend area), recent transactions list.
**Uses:** Recharts 3.8 (validated in Phase 1), `Promise.all` parallel queries, `loading.tsx` skeleton
**Avoids:** Pitfall 10 (N+1 queries — `Promise.all` for all dashboard queries), Pitfall 7 (Recharts blank charts — already validated)

### Phase 8: Debts
**Rationale:** Debts are an independent entity with no dependency on transactions or budgets. Can theoretically run in parallel with Phase 7 but sequential is simpler. Calculated fields (credit utilization, monthly interest) involve BigInt arithmetic edge cases that need careful testing.
**Delivers:** Debt cards with inline balance editing, calculated fields (credit utilization %, monthly interest estimate), debt-to-income ratio contribution to Dashboard.
**Avoids:** Pitfall 16 (integer division truncation — multiply before dividing: `balance * rate / 12 / 10000`)

### Phase 9: Budget Configuration + Progress
**Rationale:** Budget progress bars require transaction spending data (Phase 6) to display spent vs. budgeted. The quincenal input and traffic light visual are the core differentiators and should be built once the transaction loop is solid.
**Delivers:** Budget configuration table with inline quincenal amount editing, progress bars with green/orange/red traffic light, budget vs. spent aggregation query (LEFT JOIN + COALESCE for zero-spend categories).
**Avoids:** Budget vs. spent query returning null for categories with no transactions (use COALESCE)

### Phase 10: History + Period Close
**Rationale:** Period close is the most complex mutation — it touches MonthlySummary, Period, and Budget tables atomically. It requires all previous features to be working correctly because it snapshots their state. This is the last feature built and is gated on the most important integration test in the app.
**Delivers:** Annual history pivot table (12-column from MonthlySummary), period close modal with preview, `closePeriod` Server Action with Prisma `$transaction`.
**Avoids:** Pitfall 5 (partial failure — `$transaction` with `{ timeout: 15000 }`, idempotency check, unique constraint on `MonthlySummary.periodId`), Pitfall 15 (missing budget entries — reconcile ALL active expense categories against new period, create zero-amount entries for gaps)

### Phase 11: Polish + Accessibility
**Rationale:** After all features are functional, a dedicated pass for `loading.tsx` skeletons, error boundaries, accessibility attributes, edge case handling, and final `pnpm quality` clean sweep.
**Delivers:** Complete `loading.tsx` for all routes, error boundaries, a11y audit, zero TypeScript errors, zero ESLint warnings, all tests passing.
**Avoids:** Pitfall 14 (timezone edge cases — consistent UTC construction for all dates)

### Phase Ordering Rationale

- **Foundation first (Phases 1-3):** Version mismatches and utility correctness errors are the most expensive to fix late. Resolving them in dedicated early phases is the lowest-risk highest-leverage sequencing decision.
- **Dependency order enforced:** Each feature layer depends on what came before — layout needs utilities, income sources needs layout, transactions needs income sources to prove the pattern, dashboard needs transactions for data, budget needs transactions for spent amounts, history needs all of them.
- **Period close last (Phase 10):** This mutation touches every entity. Building it last gives it the most stable, tested foundation. The integration test for period close is the most important test in the app and deserves to be written when all the entities it touches are fully stable.
- **Infrastructure and schema separated (Phases 1-2):** Infrastructure must produce a passing `pnpm build` before schema work begins. A broken toolchain invalidates every migration attempt.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1:** Next.js 16 bundled docs at `node_modules/next/dist/docs/` are the authoritative source for exact API signatures; must be read before any configuration decisions during `/gsd:plan-phase 1`
- **Phase 7:** If Recharts + React 19 validation in Phase 1 fails even with the `react-is` workaround, Phase 7 needs research on nivo API and chart component patterns before planning
- **Phase 10:** Prisma 7 `$transaction` API with mixed aggregation reads and writes needs verification of exact timeout/maxWait parameter syntax before implementation

Phases with standard patterns (skip research-phase):
- **Phase 3:** Vitest + Zod 4 + TypeScript utility testing is extremely well-documented with established patterns
- **Phase 5:** Income Sources CRUD is a textbook Server Component + Server Action implementation
- **Phase 8:** Debt CRUD follows the same pattern as Phase 5; calculated fields are pure integer math

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All versions sourced from official release blogs and upgrade guides; installed versions confirmed from package.json |
| Features | HIGH | Defined by existing DFR.md; research confirms dependency order and anti-features; no surprises or conflicts |
| Architecture | HIGH | Sourced from Next.js 16 bundled docs (authoritative); Prisma official guides; Server Component patterns are stable and well-established |
| Pitfalls | HIGH | Critical pitfalls sourced from official upgrade guides; only Recharts + React 19 issue is MEDIUM confidence (open unresolved GitHub issue) |

**Overall confidence:** HIGH

### Gaps to Address

- **Recharts 3.x + React 19 compatibility:** The `react-is` workaround is documented but not confirmed resolved. Validate with a rendered test chart in Phase 1 before committing to Recharts. Nivo is the ready fallback — build the fallback plan before it is needed.
- **Prisma 7 `$transaction` API with aggregations inside the transaction:** The period close action runs `SUM()` aggregations inside a `$transaction`. Confirm exact Prisma 7 API for mixing read aggregations and writes in a single interactive transaction during Phase 10 planning.
- **`toCents()` string-based parsing implementation:** Research recommends parsing peso strings by splitting on the decimal point rather than using `parseFloat`. The exact implementation must be designed and exhaustively tested in Phase 3 — the `Math.round(pesos * 100)` approach in CLAUDE.md is the float-contaminated pattern to replace.
- **Tailwind v4 custom `@theme` variables with `tailwind-merge`:** `tailwind-merge` v3.5 supports Tailwind v4, but custom `@theme` color variables may require explicit merge configuration to deduplicate correctly. Test in Phase 3 with the `cn()` utility.

## Sources

### Primary (HIGH confidence)
- Next.js 16 Release Blog — breaking changes, proxy.ts, async params
- Next.js 16 Upgrade Guide — migration patterns, removed commands
- Next.js 16 bundled docs (`node_modules/next/dist/docs/`) — authoritative source for installed version; forms guide, rendering philosophy, route handlers, revalidatePath behavior
- Prisma 7 Release Announcement + Upgrade Guide — prisma.config.ts, seed config, auto-generate removal
- Prisma 7.3 BigInt JSON Fix — BigInt precision in JSON aggregation
- Prisma Config Reference — `defineConfig` API, datasource, seed command
- Tailwind CSS v4 Release + Upgrade Guide — `@theme` directive, breaking class renames, no content array
- Zod v4 Release Notes — performance improvements, API compatibility with v3
- Vitest 4.0 Release — stable Browser Mode, React 19 compatibility
- Playwright 1.59 Release Notes — standard E2E patterns
- Next.js ESLint Configuration docs — flat config, `eslint-config-next` format
- Prisma seeding docs — explicit seed invocation in Prisma 7
- Project documents: DFR.md, DATA_FLOW.md, STYLE_GUIDE.md, UX_RULES.md, CLAUDE.md — authoritative project spec

### Secondary (MEDIUM confidence)
- Recharts React 19 Issue #6857 (open) — blank chart rendering bug and `react-is` workaround
- Recharts 3.0 Migration Guide — external dependency removal
- Prisma BigInt serialization discussion #9793 — serialization boundary patterns
- Server Actions vs Route Handlers comparison (makerkit.dev) — when to use each

### Tertiary (LOW confidence)
- None identified — all significant findings have HIGH or MEDIUM confidence sources

---
*Research completed: 2026-04-04*
*Ready for roadmap: yes*
