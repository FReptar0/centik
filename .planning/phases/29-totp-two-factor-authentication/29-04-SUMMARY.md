---
phase: 29-totp-two-factor-authentication
plan: 04
subsystem: auth
tags: [totp, 2fa, setup-wizard, backup-codes, server-actions, configuracion, wave-2]

requires:
  - phase: 29-02
    provides: "src/lib/totp (createTotpSecret, buildOtpauthUri, verifyTotp), src/lib/totp-crypto (encryptSecret, decryptSecret), src/lib/backup-codes (generateBackupCodes, formatForDisplay, consumeBackupCode), enableTotpSchema + disableTotpSchema"
  - phase: 29-01
    provides: "BackupCode Prisma model + qrcode + bcryptjs + AUTH_TOTP_ENCRYPTION_KEY env"
  - phase: 28-invite-only-registration
    provides: "Configuracion section pattern (Invitaciones analog), hash-before-transaction rule (P03), ambiguous-error rule, Server Action shape {success}|{error}"
  - phase: 27-per-user-data-isolation
    provides: "requireAuth() discipline (first-line in every action), connection() on the page server component"
provides:
  - "src/app/(app)/configuracion/totp-actions.ts: 4 Server Actions — prepareTotpSecretAction, enableTotpAction, disableTotpAction, regenerateBackupCodesAction"
  - "src/components/configuracion/SeguridadSection.tsx: status card + CTAs (NOT admin-gated, every authenticated user sees it — D-19)"
  - "src/components/configuracion/Activar2faModal.tsx: 3-step bottom-sheet wizard (scan → verify → codes)"
  - "src/components/configuracion/Desactivar2faModal.tsx: single-step destructive sheet (TOTP or backup code required)"
  - "src/components/configuracion/RegenerarCodigosModal.tsx: single-step verify → BackupCodesScreen"
  - "src/components/configuracion/BackupCodesScreen.tsx: shared 10-code display with Copy + Descargar (.txt Blob) + mandatory checkbox"
  - "src/app/(app)/configuracion/page.tsx: fetches user.totpEnabled in Promise.all"
  - "src/app/(app)/configuracion/ConfiguracionClientWrapper.tsx: renders <SeguridadSection totpEnabled={...} />"
affects:
  - "Plan 29-05 (integration tests + E2E) — will exercise enable → login-with-code → disable → regenerate flows end-to-end against the real DB"

tech-stack:
  added: []  # no new runtime deps — all consumed libs shipped in 29-01/29-02
  patterns:
    - "Hash-before-$transaction discipline carried forward from Phase 28 P03: bcrypt.hash cost-12 × 10 is slow (~3s) and must not pin a DB connection, so Promise.all(plainCodes.map(bcrypt.hash)) runs BEFORE prisma.$transaction in both enableTotpAction and regenerateBackupCodesAction"
    - "Plaintext TOTP secret crosses exactly one module boundary: enableTotpAction → encryptSecret → Prisma write. Never stored in plaintext, never returned from any Server Action, never logged"
    - "Plaintext backup codes returned ONCE via the Server Action response payload, rendered in step 3 of Activar2faModal (or the post-regen view of RegenerarCodigosModal), then dropped. No GET endpoint, no second-chance retrieval — if the user loses them, they regenerate"
    - "Ambiguous form-level error rule (_form: ['Codigo invalido']) whenever disable or regenerate verification fails — disable cannot distinguish no-2FA / wrong-TOTP / wrong-backup / stale-state (oracle-resistance from Phase 26 + 28)"
    - "Client-held secret between wizard steps 1 and 2: prepareTotpSecretAction returns { secret, qrDataUrl } with ZERO DB writes; step 2 submits the secret back via a hidden form field; encryption + persistence happen only after TOTP code verification succeeds (Open Q5 resolution)"
    - "IDOR-safe userId: every action derives userId from requireAuth() only; formData.get('userId') is never read (Pitfall 7 — gate confirmed via grep)"
    - "React 19 react-hooks/set-state-in-effect compliance: Activar2faModal derives step/codes from useActionState result rather than syncing via useEffect+setState (useEffect limited to pure side-effects: prepare-on-mount + toast)"
    - "Shared BackupCodesScreen: same 10-code display + mandatory checkbox + download .txt (Blob URL) used by Activar step 3 and RegenerarCodigos success state — single source of truth for the D-12 UX rule"

key-files:
  created:
    - src/app/(app)/configuracion/totp-actions.ts
    - src/components/configuracion/SeguridadSection.tsx
    - src/components/configuracion/Activar2faModal.tsx
    - src/components/configuracion/Desactivar2faModal.tsx
    - src/components/configuracion/RegenerarCodigosModal.tsx
    - src/components/configuracion/BackupCodesScreen.tsx
  modified:
    - src/app/(app)/configuracion/totp-actions.test.ts
    - src/app/(app)/configuracion/page.tsx
    - src/app/(app)/configuracion/ConfiguracionClientWrapper.tsx

key-decisions:
  - "Phase 29 P04: prepareTotpSecretAction does zero DB writes — secret + QR data URL return via Server Action response, client holds it in wizard state until step 2 submits it back alongside the first TOTP code (Open Q5 RESOLVED, avoids orphan 'provisional secret' rows)"
  - "Phase 29 P04: enableTotpAction bundles 3 writes in a single prisma.$transaction (user.update + backupCode.deleteMany + backupCode.createMany) with all 10 bcrypt.hash calls completed BEFORE the transaction opens (Phase 28 P03 rule reapplied, T-29-AUTH-007)"
  - "Phase 29 P04: verifyCurrentCode private helper detects TOTP vs backup by regex (^\\d{6}$ vs ^[0-9a-f]{8}$ after dash strip) and never leaks which branch ran — callers observe a single boolean and map to the generic 'Codigo invalido' (_form) message"
  - "Phase 29 P04: Desactivar2faModal accepts EITHER a TOTP code OR a backup code per D-18 (same path as login step 2) — a user who lost their authenticator can still disable 2FA using any remaining backup code"
  - "Phase 29 P04: Seguridad section is NOT admin-gated (D-19) — every authenticated user manages their own 2FA. Only Invitaciones stays admin-gated. Both sections coexist in the same wrapper"
  - "Phase 29 P04: BackupCodesScreen download uses client-side Blob URL (<a download> with URL.createObjectURL) rather than a Server Action file response — the codes are already in client memory at that point, routing through the server would need to re-render them. D-12 Claude's Discretion chose Blob"
  - "Phase 29 P04: Activar2faModal derives its wizard step + success codes from useActionState result (const successCodes = state.success ? state.backupCodes : null) rather than syncing via useEffect+setState — matches React 19 react-hooks/set-state-in-effect rule, pattern also applied to RegenerarCodigosModal"
  - "Phase 29 P04: Desactivar2faModal keeps its useEffect (for onClose + toast.success) because onClose is a prop callback + toast is an external-system side-effect — neither triggers the react-hooks/set-state-in-effect rule; setState (setCodes/setStep) is the rule's trigger, not callback invocation"

requirements-completed:
  - TOTP-01
  - TOTP-02
  - TOTP-04

duration: ~52min
completed: 2026-04-21
---

# Phase 29 Plan 04: 2FA Lifecycle UI Summary

**Delivered the user-facing 2FA enrollment + disable + regenerate flow in `/configuracion` — 4 Server Actions (prepare/enable/disable/regen) with hash-before-transaction + atomic multi-table writes, a non-admin-gated Seguridad section, a 3-step bottom-sheet activation wizard, and a shared BackupCodesScreen with mandatory-save checkbox. Completes TOTP-01 (enrollment), TOTP-02 (at-rest AES-256-GCM encryption now actually written), and TOTP-04 (10 bcrypt-hashed single-use backup codes).**

## Performance

- **Duration:** ~52 min
- **Started:** 2026-04-21T18:21:03Z
- **Completed:** 2026-04-21T19:13:12Z
- **Tasks:** 3
- **Files created:** 6
- **Files modified:** 3
- **Tests added:** 29 (totp-actions unit tests — Wave 0 stubs fully promoted)
- **Total tests passing:** 701 (up from 672 at plan start)

## What Shipped

### Server Actions (`src/app/(app)/configuracion/totp-actions.ts` — 192 lines)

```ts
export async function prepareTotpSecretAction(): Promise<
  { secret: string; qrDataUrl: string } | { error: string }
>

export async function enableTotpAction(
  _prev: EnableResult | undefined,
  formData: FormData,
): Promise<
  { success: true; backupCodes: string[] } | { error: Record<string, string[]> }
>

export async function disableTotpAction(
  _prev: SimpleFormResult | undefined,
  formData: FormData,
): Promise<{ success: true } | { error: Record<string, string[]> }>

export async function regenerateBackupCodesAction(
  _prev: RegenResult | undefined,
  formData: FormData,
): Promise<
  { success: true; backupCodes: string[] } | { error: Record<string, string[]> }
>
```

All 4 actions:
- `await requireAuth()` as the first awaited call (CVE-2025-29927 defense-in-depth)
- userId derived from session only — never from formData (IDOR-safe)
- `prisma.$transaction` for any multi-row write (enable = 3 ops, disable = 2 ops, regen = 2 ops)
- Generic `_form` errors on failure — no oracle
- No `console.log`, no logging of secret/code material

### UI Components

| Component | Purpose | Lines |
|-----------|---------|-------|
| `SeguridadSection` | ShieldCheck + StatusDot + Activado/Desactivado + CTAs. NOT admin-gated | 70 |
| `Activar2faModal` | 3-step wizard: scan → verify → save codes | 157 |
| `Desactivar2faModal` | Single-step destructive; accepts TOTP or backup code | 86 |
| `RegenerarCodigosModal` | Verify current code → BackupCodesScreen with fresh 10 | 81 |
| `BackupCodesScreen` | Shared 10-code grid + copy + download + mandatory checkbox | 104 |

All files < 300 lines. All functions < 50 lines. Spanish copy throughout. Lucide icons only.

### State-Machine Diagrams

**Activar2faModal** (wizard):
```
        Modal opens
            │
            ▼
   prepareTotpSecretAction() ── error ──► [error view]
            │
         success
            │
            ▼
   ┌──[scan]─────────────┐
   │  QR + manual secret │
   │  [Continuar]        │
   └─────────┬───────────┘
             ▼
   ┌──[verify]───────────┐     wrong code
   │  FloatingInput code │◄──────────┐
   │  [Atras] [Verificar]│           │
   └─────────┬───────────┘           │
             │                       │
    enableTotpAction                 │
             │                       │
    ┌────────┴──────┐                │
    │               │                │
error               success          │
    │               │                │
    └───────────────┘                │
                    │                │
                    ▼                │
            [codes] ─────────────────┘
          BackupCodesScreen
         (mandatory checkbox
          gates "Listo")
                    │
                    ▼
                onClose()
```

**Desactivar2faModal**:
```
  Modal opens → form (code input)
       │
  disableTotpAction
       │
  ┌────┴────┐
  │         │
error    success
  │         │
  └──►[stay, show error]
            │
            ▼
    toast "2FA desactivado"
       + onClose()
```

**RegenerarCodigosModal**:
```
  Modal opens → form (code input)
       │
  regenerateBackupCodesAction
       │
  ┌────┴────┐
  │         │
error    success
  │         │
  └──►[stay, show error]
            │
            ▼
   BackupCodesScreen (fresh 10)
       checkbox → Listo
            │
            ▼
        onClose()
```

## Claude's Discretion Choices

- **`<img>` for QR:** data-URLs render fine in a plain `<img>` and avoid `next/image`'s optimization pipeline for base64 payloads. Existing codebase uses `next/image` in exactly one place (`src/proxy.ts`), so a new dependency on it was not warranted.
- **Blob-URL download for backup codes:** `new Blob([codes.join('\n') + '\n'])` + `URL.createObjectURL` + `<a download>` keeps the download path fully client-side. A Server Action file response would require re-sending the already-displayed codes over the wire, which is both slower and (marginally) risks the payload hitting a log along the way.
- **Sonner `toast.success` vs inline confirmation:** Activar + Desactivar fire `toast.success('2FA activado' / '2FA desactivado')` because the modal closes around the user. Regenerar uses inline confirmation (BackupCodesScreen replaces the form) — the user is still in the modal and the new codes ARE the confirmation.
- **`FloatingInput` reused for code entry:** single 6–9 character input accepts either `123456` or `ABCD-EFGH` without a specialized `<TotpCodeInput />` primitive. Matches D-18 single-path server-side detection. Keeps the input surface identical across Activar step 2, Desactivar, Regenerar, and login step 2 (which was already using FloatingInput from 29-03).
- **`useActionState` result as derived state** (Activar + Regenerar): `const successCodes = state.success ? state.backupCodes : null` replaces a `useEffect([state]) { setCodes(state.backupCodes) }` pattern. Satisfies React 19's `react-hooks/set-state-in-effect` without losing the "display codes once the action succeeds" semantics. Desactivar retains its useEffect because it invokes `onClose()` + `toast.success` — both external-system side-effects, neither setState.
- **`_form` vs field-specific errors:** enableTotpAction uses field-specific `code: ['Codigo invalido']` for a wrong verification code (the user is literally looking at a code input, so the error renders inline right under the input). Disable + regen use `_form: ['Codigo invalido']` because the failure could mean wrong TOTP, wrong backup, no 2FA active, or stale state — collapsing into form-level preserves oracle-resistance.

## Deviations from Plan

### Rule 3 — Auto-fixed blocking issues (React 19 lint errors)

**[Rule 3 — Blocking] React 19 `react-hooks/set-state-in-effect` errors in Activar2faModal + RegenerarCodigosModal**
- **Found during:** Task 3 (initial build + lint after writing the 3 modals)
- **Issue:** Both modals had `useEffect([state]) { setCodes(state.backupCodes); setStep('codes') }` patterns to transition to the "display codes" step on success. React 19's eslint rule flags any `setState` call inside `useEffect` as a cascading-renders anti-pattern (per https://react.dev/learn/you-might-not-need-an-effect)
- **Fix:** Derive both the step and the codes directly from the `useActionState` result. `const successCodes = state.success ? state.backupCodes : null` + `const step = successCodes ? 'codes' : localStep`. Local step state reduced to `Exclude<Step, 'codes'>` (only 'scan' | 'verify'). Toast stays in a useEffect because it's a pure external-system side-effect (no setState).
- **Files modified:** `src/components/configuracion/Activar2faModal.tsx`, `src/components/configuracion/RegenerarCodigosModal.tsx`
- **Commit:** `dee8acc` (initial modals had the issue, same commit fixed it before the final lint pass)

**[Rule 3 — Blocking] Prettier format drift on Task 1 files**
- **Found during:** Post-Task-3 `npm run format:check`
- **Issue:** My initial hand-formatted `totp-actions.ts` + `totp-actions.test.ts` used narrower line-wrapping than repo-standard prettier config (100 cols). Other new files (SeguridadSection, the 4 modals, BackupCodesScreen) had the same issue.
- **Fix:** Ran `npx prettier --write` on all 9 plan-related files. No semantic changes — only whitespace reflow.
- **Commit:** `33f0eee` (cleanup for Task 1 files; Tasks 2 + 3 files were formatted before their initial commits since prettier was run in the same session)

**[Rule 1 — Bug] vi.mock hoisting + top-level const ReferenceError**
- **Found during:** First test run after writing `totp-actions.test.ts`
- **Issue:** The mock factory `vi.mock('@/lib/auth-utils', () => ({ requireAuth: vi.fn().mockResolvedValue({ userId: TEST_USER_ID }) }))` referenced the top-level `const TEST_USER_ID`. vi.mock is hoisted above all top-level consts, so the reference tripped a `Cannot access 'TEST_USER_ID' before initialization` ReferenceError.
- **Fix:** Replaced the factory's reference with the literal string `'test-user-id'`, kept `TEST_USER_ID` as a top-level const for assertions. Added a comment explaining the hoisting gotcha.
- **Commit:** folded into `bdbbf4c` (the Task 1 commit — test file was iterated to green before commit)

No other deviations. Threat register items T-29-AUTH-007, T-29-AUTH-008, T-29-AUTH-003, T-29-CRYPTO-001, T-29-DATA-001, T-29-AUTH-009 all addressed as planned.

## Threat Model Coverage (Plan 29-04 scope)

| Threat | Mitigation | Verification |
|--------|------------|--------------|
| T-29-AUTH-007 (partial 2FA state after crash) | enableTotpAction bundles user.update + backupCode.deleteMany + backupCode.createMany in one $transaction; Prisma rolls back all on any failure | Unit test `persists encrypted secret + 10 backup codes in one $transaction on success` asserts `$transaction` called once with 3 ops |
| T-29-AUTH-008 (disable by password alone) | disableTotpAction requires a current TOTP or backup code before any write; verifyCurrentCode returns false for non-matching code | Unit tests `rejects with "Codigo invalido"` + `valid TOTP code triggers transaction` + `backup code triggers consumeBackupCode` |
| T-29-CRYPTO-001 (plaintext secret leak) | encryptSecret called BEFORE user.update; plaintext stays local; no console.log | Unit test `plaintext secret NEVER leaks to user.update — only ciphertext`; grep gate `! grep console.log` returns 0 |
| T-29-DATA-001 (totpSecret leaks via selects) | page.tsx selects `{ totpEnabled: true }` only; wrapper prop is `totpEnabled: boolean` | Grep gate `! grep -rn 'totpSecret' src/app src/components src/actions | grep -v '…lib/totp\|auth.ts\|totp-actions'` returns empty |
| IDOR via formData userId injection | Every action uses `const { userId } = await requireAuth()` only; `formData.get('userId')` never called | Unit tests (3x) `uses userId from requireAuth ONLY, never from formData`; grep gate `grep -c "formData.get('userId')"` returns 0 |
| Connection-pinning bcrypt inside $transaction | Promise.all(bcrypt.hash) runs BEFORE prisma.$transaction in enable + regen | Unit test `hashes all 10 codes BEFORE opening $transaction` asserts `invocationCallOrder` ordering |

## Loose Ends for Plan 29-05

- Full integration flow against real test DB: register → enable 2FA → disable → regenerate. Exercises the encrypted round-trip (encryptSecret → DB → decryptSecret → verifyTotp) end-to-end.
- Cross-user isolation: confirm User B cannot use User A's backup code or disable User A's 2FA (extends Phase 27 isolation.test.ts pattern).
- E2E Playwright happy path: login → /configuracion → Activar 2FA → scan mocked QR → verify with deterministic otplib.generate → save backup codes → logout → login with TOTP code → logout → login with backup code.
- Verification that the Sonner Toaster is mounted at the root layout (it already is — used by register/transactions/categories — 29-05 integration suite will confirm via UI assertions).

## Self-Check: PASSED

- `src/app/(app)/configuracion/totp-actions.ts` — FOUND (192 lines)
- `src/app/(app)/configuracion/totp-actions.test.ts` — FOUND (29 tests passing)
- `src/app/(app)/configuracion/page.tsx` — FOUND (totpEnabled fetch added)
- `src/app/(app)/configuracion/ConfiguracionClientWrapper.tsx` — FOUND (SeguridadSection rendered)
- `src/components/configuracion/SeguridadSection.tsx` — FOUND (70 lines)
- `src/components/configuracion/Activar2faModal.tsx` — FOUND (157 lines)
- `src/components/configuracion/Desactivar2faModal.tsx` — FOUND (86 lines)
- `src/components/configuracion/RegenerarCodigosModal.tsx` — FOUND (81 lines)
- `src/components/configuracion/BackupCodesScreen.tsx` — FOUND (104 lines)
- Commit `bdbbf4c` (feat 29-04 server actions) — FOUND
- Commit `8dcb0a1` (feat 29-04 Seguridad section wiring) — FOUND
- Commit `dee8acc` (feat 29-04 3 modals + BackupCodesScreen) — FOUND
- Commit `33f0eee` (style 29-04 prettier) — FOUND
- `npm run build` — passes (Next 16.2.2 Turbopack)
- `npm run lint` — 0 errors, 3 pre-existing unused-var warnings in `movimientos/actions.ts` (out-of-scope)
- `npm run test:run` — 701/701 passing
- `! grep -rn 'totpSecret' src/app src/components src/actions | grep -v lib/totp | grep -v auth.ts | grep -v totp-actions` — PASS (empty)
- `! grep -rn 'console.log' src/app/(app)/configuracion/totp-actions.ts` — PASS (zero)
- `grep -c 'requireAuth()' src/app/(app)/configuracion/totp-actions.ts` — 4 (one per action)
- `grep -c 'prisma.$transaction' src/app/(app)/configuracion/totp-actions.ts` — 3 (enable, disable, regen)
- Hash-before-$transaction ordering — 2 `Promise.all` calls both before their respective `$transaction` calls
