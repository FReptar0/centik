---
phase: 5
slug: income-sources
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-05
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (unit + integration) |
| **Config file** | `vitest.config.mts` (unit), `vitest.integration.config.mts` (integration) |
| **Quick run command** | `npx vitest run` |
| **Full suite command** | `npm run quality` |
| **Estimated runtime** | ~20 seconds |

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
| 05-01-01 | 01 | 1 | INC-02, INC-03, INC-04 | unit | `npx vitest run src/app/ingresos/actions.test.ts` | ❌ W0 | ⬜ pending |
| 05-01-02 | 01 | 1 | INC-01, INC-05, INC-06 | unit + visual | `npm run build && npm run lint` | N/A | ⬜ pending |
| 05-02-01 | 02 | 2 | INC-01-INC-06 | integration | `npm run test:integration` | ❌ W0 | ⬜ pending |

---

## Wave 0 Requirements

- [ ] `src/app/ingresos/actions.test.ts` — Server Action unit tests
- [ ] `tests/integration/income-sources.test.ts` — Integration tests for full CRUD cycle

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Income cards display correctly | INC-01 | Visual layout check | View /ingresos — verify cards show name, amount, frequency, monthly equivalent |
| Create/edit modal works | INC-02, INC-03 | Interactive UI check | Open modal, fill form, save, verify list updates |
| Summary cards aggregate correctly | INC-06 | Visual + math check | Verify quincenal/monthly/semester/annual totals match sources |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
