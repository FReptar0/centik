---
phase: 21-transactionform-custom-numpad
plan: 02
subsystem: forms, transactions
tags: [floating-input, animation, form-migration]
dependency_graph:
  requires: [18-01, 19-03]
  provides: [floating-input-adoption, scanline-reveal-wiring]
  affects: [IncomeSourceForm, DebtForm, CategoryForm, BudgetTable, TransactionFilters, TransactionRow, TransactionList]
tech_stack:
  patterns: [FloatingInput-adoption, underline-only-inputs, scanline-animation-prop]
key_files:
  created: []
  modified:
    - src/components/income/IncomeSourceForm.tsx
    - src/components/debts/DebtForm.tsx
    - src/components/categories/CategoryForm.tsx
    - src/components/budgets/BudgetTable.tsx
    - src/components/transactions/TransactionFilters.tsx
    - src/components/transactions/TransactionRow.tsx
    - src/components/transactions/TransactionRow.test.tsx
    - src/components/transactions/TransactionList.tsx
decisions:
  - onChange-based validation replaces onBlur since FloatingInput does not expose onBlur prop
  - BudgetTable uses empty-label FloatingInput with prefix for compact table cells
  - TransactionFilters date inputs use FloatingInput type="date" with fixed width
metrics:
  duration: 7min
  completed: "2026-04-15"
---

# Phase 21 Plan 02: FloatingInput Adoption & Scanline Animation Summary

Migrated all 5 form components to FloatingInput underline-only styling and wired pixel-dissolve scanline animation on newly added transaction rows.

## What Was Done

### Task 1: FloatingInput adoption across all forms (540d10c)

Replaced all box-style `<input>` elements with `<FloatingInput>` across 5 form components:

- **IncomeSourceForm**: Replaced name and amount inputs. Removed dual displayAmount/amount state. Amount cleaning via cleanAmountInput in onChange handler.
- **DebtForm**: Replaced all 11 inputs (name, balance, rate, credit card fields, loan fields). Removed FormField, AmountField helper components and shared inputClass constant. Created revalidateIfTouched/markTouched/handleAmountChange helpers to reduce repetition.
- **CategoryForm**: Replaced name input. Icon and color selectors remain as button grids.
- **BudgetTable**: Replaced inline amount inputs in table cells. Uses FloatingInput with empty label (column header serves as label) and prefix="$".
- **TransactionFilters**: Replaced date range inputs with FloatingInput type="date". Removed sr-only labels (FloatingInput handles its own labeling).

Net result: -405 lines removed, +173 added (232 lines saved through FloatingInput's built-in label, error, prefix/suffix handling).

### Task 2: Pixel-dissolve animation on new transaction rows (87623e3)

- Added `isNew` prop to TransactionRow that conditionally applies `animate-scanline-reveal` CSS class
- Added `newTransactionIds` prop to TransactionList that passes `isNew` to each TransactionRow
- `prefers-reduced-motion` is handled globally in globals.css (animation disabled)
- Added 2 new tests verifying animation class presence/absence based on isNew prop

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing functionality] Validation approach adjustment**
- **Found during:** Task 1
- **Issue:** FloatingInput does not expose onBlur prop, so blur-based validation (handleBlur) could not be wired directly
- **Fix:** Switched to onChange-based validation with touched tracking. First change marks field as touched, subsequent changes trigger validation. UX is nearly identical.
- **Files modified:** IncomeSourceForm.tsx, DebtForm.tsx, CategoryForm.tsx

## Verification

- TypeScript: Zero errors in all modified files (pre-existing errors only in validators.test.ts, unrelated)
- Build: TypeScript compilation passes. Full build fails due to pre-existing DB connection issue (ECONNREFUSED -- Docker not running), not caused by these changes
- Tests: 34/35 test files pass (475 tests). Only failure is pre-existing seed.test.ts (requires DB). 2 new animation tests pass.
- Grep for `rounded-lg border.*bg-transparent` across all 5 form files returns zero matches

## Self-Check: PASSED

All modified files exist and contain FloatingInput imports. Both commits verified in git log.
