---
phase: 27
slug: per-user-data-isolation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-18
---

# Phase 27 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.mts |
| **Quick run command** | `npm test -- --run` |
| **Full suite command** | `npm test -- --run && npm run build` |
| **Integration test command** | `npm run test:integration` |
| **Estimated runtime** | ~30 seconds (unit), ~60 seconds (integration) |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --run`
- **After every plan wave:** Run `npm test -- --run && npm run build`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 27-01-01 | 01 | 1 | ISOL-01 | unit | `npx vitest run src/lib/auth-utils.test.ts` | ❌ W0 | ⬜ pending |
| 27-01-02 | 01 | 1 | ISOL-02, ISOL-03 | unit+build | `npm test -- --run && npm run build` | ✅ existing | ⬜ pending |
| 27-02-01 | 02 | 2 | ISOL-04, DEPLOY-05 | build+tests | `npm run build && npm test -- --run` | ✅ existing | ⬜ pending |
| 27-02-02 | 02 | 2 | ISOL-02 | integration | `npm run test:integration` | ❌ Plan creates | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/auth-utils.test.ts` — stubs for requireAuth() behavior (ISOL-01)

*Existing test infrastructure covers action and page testing.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Cross-user data invisible in UI | ISOL-02 | Full browser flow | Log in as User B, verify zero transactions/debts/budgets from User A visible |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
