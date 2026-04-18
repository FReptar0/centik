---
phase: 28
slug: invite-only-registration
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-18
---

# Phase 28 — Validation Strategy

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
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 28-01-01 | 01 | 1 | INVITE-02 | migration+unit | `npx prisma migrate dev && npx vitest run src/auth.test.ts` | ✅ existing | ⬜ pending |
| 28-02-01 | 02 | 2 | INVITE-02 | unit | `npx vitest run src/app/\(app\)/configuracion/invite-actions.test.ts` | ❌ Plan creates | ⬜ pending |
| 28-02-02 | 02 | 2 | INVITE-02 | build+lint | `npm run build && npm run lint` | ✅ existing | ⬜ pending |
| 28-03-01 | 03 | 2 | INVITE-03, INVITE-04 | unit | `npx vitest run src/actions/auth.test.ts` | ✅ existing | ⬜ pending |
| 28-03-02 | 03 | 2 | INVITE-03, INVITE-04 | integration | `npm run test:integration` | ❌ Plan creates | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/app/(app)/configuracion/invite-actions.test.ts` — stubs for invite admin actions (INVITE-02)
- [ ] `tests/integration/invite-registration.test.ts` — integration test for full registration flow (INVITE-03, INVITE-04)

*Test files created as first action in each TDD-style task (RED step before GREEN). Existing `src/auth.test.ts` and `src/actions/auth.test.ts` are extended, not newly created.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Registration visual matches login | INVITE-03 | Visual verification | Visit /register?token=X with valid token, verify OLED black bg, Centik wordmark (font-semibold), FloatingInput, chartreuse pill button |
| Invitaciones admin section renders correctly | INVITE-02 | Visual verification | Log in as admin, visit /configuracion, verify Invitaciones section with generate form, URL copy button, recent tokens list with revoke |
| Token errors display differentiated messages | INVITE-03 | Visual verification | Visit /register?token=INVALID, ?token=EXPIRED, ?token=USED — verify distinct Spanish messages |
| /register without token returns 404 | INVITE-04 | Browser verification | Visit /register → verify Next.js 404 page |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
