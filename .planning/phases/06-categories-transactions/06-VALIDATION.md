---
phase: 6
slug: categories-transactions
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-05
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (unit + integration) |
| **Config file** | `vitest.config.mts` (unit), `vitest.integration.config.mts` (integration) |
| **Quick run command** | `npx vitest run` |
| **Full suite command** | `npm run quality` |
| **Estimated runtime** | ~25 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run build && npm run lint`
- **After every plan wave:** Run `npm run quality`
- **Before `/gsd:verify-work`:** Full quality + manual CRUD walkthrough
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | CAT-01, CAT-02, CAT-03 | unit | `npx vitest run src/app/configuracion/` | W0 | pending |
| 06-02-01 | 02 | 1 | TXN-01-TXN-10 | unit | `npx vitest run src/app/movimientos/actions.test.ts` | W0 | pending |
| 06-03-01 | 03 | 2 | TXN-01, TXN-02, TXN-03 | unit | `npx vitest run src/components/transactions/` | W0 | pending |
| 06-04-01 | 04 | 3 | TXN-04, TXN-05, TXN-10 | unit + build | `npx vitest run src/components/transactions/TransactionList.test.tsx && npm run build && npm run lint` | W0 (created by 06-04 Task 1) | pending |

---

## Wave 0 Requirements

- [ ] `src/app/configuracion/actions.test.ts` — Category Server Action tests (created by Plan 06-01)
- [ ] `src/app/movimientos/actions.test.ts` — Transaction Server Action tests (created by Plan 06-02)
- [ ] `src/components/transactions/TransactionForm.test.tsx` — Quick-add form tests (created by Plan 06-03)
- [ ] `src/components/transactions/TransactionList.test.tsx` — List empty state, item rendering, pagination tests (created by Plan 06-04 Task 1)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Quick-add completes in <30s | TXN-01 | Timing test with real UI | Open FAB -> fill form -> save, time the flow |
| Category icon grid renders | CAT-01 | Visual layout | View /configuracion, verify 3-col grid with icons |
| Filter chips work | TXN-05 | Interactive UI | Apply filters, verify URL updates, clear works |
| Closed period blocked | TXN-08 | Multi-step | Navigate to closed period, verify edit/delete disabled |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
