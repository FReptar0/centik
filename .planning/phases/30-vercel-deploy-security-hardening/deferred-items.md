# Deferred Items — Phase 30

Out-of-scope discoveries that should be addressed later but NOT fixed within the
originating plan (per executor scope-boundary rule).

## Pre-existing lint warnings (discovered Plan 30-01)

**File:** `src/app/(app)/movimientos/actions.ts`

**Warnings (3):**
- L86: `'_error' is defined but never used` (`@typescript-eslint/no-unused-vars`)
- L141: `'_error' is defined but never used` (`@typescript-eslint/no-unused-vars`)
- L173: `'_error' is defined but never used` (`@typescript-eslint/no-unused-vars`)

**Cause:** Pre-existing from Phase 25/27 era — these are caught-but-ignored Prisma
errors in Server Actions. The underscore prefix convention should suppress the
warning; ESLint config may need `argsIgnorePattern: '^_'` explicitly set.

**Why deferred:** Not caused by Plan 30-01 changes (that plan touched
`prisma.config.ts`, `.env.example`, and `src/lib/env*.ts` stubs only). No file
in `src/app/(app)/movimientos/` was modified.

**Suggested owner:** A future lint-pass plan or integrated into Phase 30-06
(final polish/deploy verification).

## Flaky test: backup-codes consume unit test (re-confirmed Plan 30-04)

**File:** `src/lib/backup-codes.test.ts`

**Symptom:** When the full test suite is run in parallel (710 tests across
48 files), two tests in this file can fail with a mock-call-count assertion
(`expect(updateMany).not.toHaveBeenCalled()`) — but running the file in
isolation passes all 14 tests cleanly. Re-running the full suite immediately
after a failure also passes 710/710.

**Cause:** Parallel worker cross-contamination on shared `vi.fn()` spies for
`prisma.backupCode.updateMany`. Pre-existing from Phase 29 — not caused by
any Plan 30-04 change (30-04 only adds `prisma/seed.prod.ts` and one
`package.json` script).

**Why deferred:** Strictly a test-harness isolation issue, no production
behaviour affected. Adding `vi.resetAllMocks()` to the `backup-codes.test.ts`
`beforeEach` (or moving the file to `singleFork` pool) would address it.

**Suggested owner:** A future test-stability plan; not blocking for 30-04.

## upsertBudgets partial-IDOR hole (discovered Plan 30-05)

> **RESOLVED 2026-04-22 via Phase 30.1 (commits `33ac3b0` + `4a79b28`)** — see
> `.planning/phases/30.1-fix-upsertbudgets-period-ownership-idor/30.1-01-SUMMARY.md`.
> Both ownership guards (period + batched category) now run before any DB write;
> integration test proves no stale row is created under either attack vector.
> Original reproduction + proposed-fix text preserved below for historical context.

**File:** `src/app/(app)/presupuesto/actions.ts` L21-60 (`upsertBudgetsAction`)

**Severity:** Low — NO mutation of another user's data. An authenticated
User A can submit a `periodId` owned by User B with a `categoryId` owned by
User B; the action falls through to `create` and writes a stale
User-A-owned Budget row referencing User B's period and category. User B's
own budget is untouched, but stale rows accumulate.

**Reproduction:**
```
User A (session) → upsertBudgets(userB_periodId, { entries: [{ categoryId: userB_categoryId, quincenalAmount: '999' }] })
→ findFirst({ periodId: userB_periodId, categoryId: userB_categoryId, userId: userA_id }) → null
→ create({ periodId: userB_periodId, categoryId: userB_categoryId, userId: userA_id, quincenalAmount: 999n })
→ returns { success: true }
```

**Why it slipped past Phase 27:** The D-IDOR `findFirst({ id, userId })`
pattern protects UPDATE/DELETE paths that take a row id. `upsertBudgets`
takes a `periodId` (not a budget row id); the existing
`findFirst({ periodId, categoryId, userId })` guard correctly blocks
hijacking User B's EXISTING budget row (returns null → falls through) but
does NOT block CREATING a new row inside User B's period.

**Proposed fix:** add a period-ownership guard at the top of
`upsertBudgetsAction`:
```ts
const period = await prisma.period.findFirst({ where: { id: periodId, userId } })
if (!period) return { error: { _form: ['Periodo no encontrado'] } }
```
Matches the existing `closePeriod` / `reopenPeriod` pattern in the same file.

**Test coverage to add:** assert
`prisma.budget.count({ where: { periodId: userBPeriodId, userId: userAId } }) === 0`
after the attack in `tests/integration/isolation-actions.test.ts`.

**Why deferred:** Plan 30-05's `<sequential_execution>` scope prohibited
modifying `src/`. Plan 30-06 is documentation-only. Both called this out —
it is tracked here for the next code plan (Phase 30.1 gap-closure or a
follow-up issue).

**Surfaced in:** `30-VERIFICATION.md` §8.1 (operator post-deploy
watch-item).

