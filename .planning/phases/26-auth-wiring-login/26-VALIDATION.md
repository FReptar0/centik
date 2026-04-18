---
phase: 26
slug: auth-wiring-login
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-17
---

# Phase 26 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npm test -- --run` |
| **Full suite command** | `npm test -- --run && npm run build` |
| **Estimated runtime** | ~30 seconds |

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
| 26-01-01 | 01 | 1 | AUTH-02 | unit | `npm test -- --run src/lib/auth.test.ts` | ❌ W0 | ⬜ pending |
| 26-01-02 | 01 | 1 | AUTH-05 | unit | `npm test -- --run src/lib/auth.test.ts` | ❌ W0 | ⬜ pending |
| 26-01-03 | 01 | 1 | AUTH-03 | unit | `npm test -- --run src/proxy.test.ts` | ❌ W0 | ⬜ pending |
| 26-02-01 | 02 | 2 | AUTH-04 | unit | `npm test -- --run src/app/(auth)/login` | ❌ W0 | ⬜ pending |
| 26-02-02 | 02 | 2 | TEST-02 | integration | `npm test -- --run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/auth.test.ts` — stubs for AUTH-02, AUTH-05
- [ ] `src/proxy.test.ts` — stubs for AUTH-03 proxy redirect behavior

*Existing vitest infrastructure covers framework requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Login page visual design matches Glyph Finance | AUTH-04 | Visual verification | Visit /login, verify OLED black bg, FloatingInput, chartreuse button, Centik branding |
| Redirect preserves callbackUrl | AUTH-03 | Full browser flow | Visit /movimientos unauthenticated, verify redirect to /login?callbackUrl=/movimientos, login, verify landing on /movimientos |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
