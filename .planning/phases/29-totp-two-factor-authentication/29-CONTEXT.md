# Phase 29: TOTP Two-Factor Authentication - Context

**Gathered:** 2026-04-20
**Status:** Ready for planning
**Mode:** `--auto` (recommended defaults selected)

<domain>
## Phase Boundary

Add TOTP-based 2FA to the existing NextAuth v5 (Credentials/JWT) login. Users opt in from `/configuracion`, scan a QR code with an authenticator app, verify a first code before the secret is persisted, and receive 10 single-use backup codes. TOTP secrets are encrypted at rest with AES-256-GCM. Login for 2FA-enabled users is split into two steps (password, then TOTP code or backup code). Login + TOTP verify endpoints are rate-limited via `@upstash/ratelimit`.

Requirements delivered: TOTP-01, TOTP-02, TOTP-03, TOTP-04, TOTP-05.

Out of scope: WebAuthn/passkeys, SMS 2FA, "remember this device" trust cookie, recovery email, admin UI to force-disable another user's 2FA, multi-admin promotion. (See Deferred Ideas.)

</domain>

<decisions>
## Implementation Decisions

### TOTP Library + QR Generation
- **D-01:** Use `otplib` for TOTP generation/verification (RFC 6238, HMAC-SHA1, 30s step, 6-digit codes — authenticator-app default). Issuer `Centik`, label `Centik:<email>`.
- **D-02:** Generate the QR code server-side with `qrcode` (`toDataURL(otpauthUri)`) and pass the data URL as a string prop to the client step component. Avoids shipping a QR library to the browser bundle.
- **D-03:** Always show the manual `base32` secret next to the QR (small monospace block) so users on devices without a camera can enter it manually.
- **D-04:** Verification window: `authenticator.options = { window: 1 }` (±30s tolerance) — standard guidance, accommodates clock drift without weakening the factor.

### Encryption at Rest (TOTP-02)
- **D-05:** Use Node built-in `node:crypto` (`createCipheriv('aes-256-gcm', ...)`) — no new dependency. Helper module `src/lib/totp-crypto.ts` exports `encryptSecret(plaintext)` and `decryptSecret(ciphertext)`.
- **D-06:** Storage format in `User.totpSecret`: `iv:ciphertext:authTag` (all hex), single column, single string. 96-bit (12-byte) random IV per record (NIST SP 800-38D recommendation for GCM).
- **D-07:** `AUTH_TOTP_ENCRYPTION_KEY` is required to be a 64-char hex string (32 bytes). The crypto module validates the key on first import and throws fast if missing/invalid — app fails to boot rather than silently using a weak key.
- **D-08:** Plaintext TOTP secret never crosses module boundaries except (a) inside `totp-crypto.ts` immediately before encrypting and (b) inside the verify path immediately after decrypting. Never logged. Never returned from any Server Action.

### Backup Codes (TOTP-04)
- **D-09:** Add a dedicated Prisma model `BackupCode { id, userId, codeHash, usedAt? , createdAt }` with `@@index([userId])` and `onDelete: Cascade` from User.
- **D-10:** Generate 10 codes per setup, each 8 hex chars (32 bits of entropy each), formatted for display as `XXXX-XXXX` (dash purely cosmetic; stripped before hash + verify).
- **D-11:** Hash codes with bcryptjs cost factor 12 (consistent with passwords / Phase 25 decision). Verification on login: load all unused `BackupCode`s for the user, `bcrypt.compare` against each in sequence, on first hit set `usedAt = NOW()` atomically (`updateMany where: { id, usedAt: null }` — concurrency-safe).
- **D-12:** Codes are shown ONCE at setup completion in a copy-friendly block + "Descargar (.txt)" button. The completion screen has a mandatory checkbox `He guardado mis códigos de respaldo` that gates the "Listo" CTA.
- **D-13:** "Regenerar códigos de respaldo" action available after setup. Requires a current TOTP code, atomically deletes existing codes and inserts a fresh 10. Shown once, same way.

### Two-Step Login Architecture (TOTP-03)
- **D-14:** Keep `authorizeUser` in `src/auth.ts` as the single source of credential validation, but extend its credentials to optionally accept `totpCode` and `challenge`. `authorize` rejects (returns null) when 2FA is enabled and a valid `totpCode` (or backup code) is not supplied.
- **D-15:** Split client flow into two Server Actions, **not** one extended action:
  - `loginAction(prev, formData)` — validates email + password; if user has `totpEnabled = false`, calls `signIn('credentials', ...)` and redirects (current behavior). If `totpEnabled = true`, returns `{ requiresTotp: true, challenge: <signed token> }` instead of issuing a session.
  - `verifyTotpAction(prev, formData)` — validates `challenge` + `code` (TOTP or backup); calls `signIn('credentials', { email, challenge, totpCode: code, ... })` so the session is finally issued. The challenge token authorizes the second step *without* re-asking for the password.
- **D-16:** Challenge token = HMAC-SHA256 of `{ userId, email, exp }` signed with `AUTH_SECRET` (already in env). Lifetime: 5 minutes. Embedded in a hidden form field, not a cookie — no extra cookie surface, no CSRF concerns beyond Next.js's existing Server Action protection. Decoded + verified server-side in both `verifyTotpAction` and `authorizeUser`.
- **D-17:** Login UI is a single page (`/login`) with two visual steps. After step 1 succeeds and `requiresTotp` is true, the form swaps to a 6-digit code input + "Usar código de respaldo" toggle. No new route. Browser back / refresh resets to step 1 (challenge expires, no harm).
- **D-18:** Backup-code path uses the same `verifyTotpAction` — server detects format (8-hex with optional dash vs 6-digit numeric) and routes to the appropriate verifier. UI toggles which input is shown but submits to the same action.

### Setup + Disable UX
- **D-19:** Add a "Seguridad" section to `/configuracion` (mirrors the existing `Invitaciones` section pattern). Visible to every authenticated user (not gated on `isAdmin`). Shows current 2FA status (Activado/Desactivado) and the relevant CTA.
- **D-20:** Setup wizard is a **bottom-sheet modal** (consistent with the rest of the app, e.g. TransactionForm) with three steps:
  1. **Generar y escanear** — show QR + manual base32 secret + "Continuar".
  2. **Verificar** — 6-digit code input. On valid code, the encrypted secret is persisted, `totpEnabled = true`, and 10 backup codes are generated. All three writes happen in a single `prisma.$transaction`.
  3. **Guardar códigos** — display the 10 backup codes, copy + download buttons, mandatory checkbox, "Listo" closes the wizard.
- **D-21:** Disable wizard is a smaller bottom-sheet: requires a current TOTP code (or backup code) before flipping `totpEnabled = false`, clearing `totpSecret`, and deleting all `BackupCode` rows for the user — all in a single `$transaction`. Cannot disable by password alone; must prove possession of the second factor.
- **D-22:** "Regenerar códigos" is a third bottom-sheet, requires a current TOTP code, and reuses the same display screen as setup step 3.
- **D-23:** Visual style follows the established Glyph Finance pattern: OLED-black surface, FloatingInput for the code, chartreuse pill button, IBM Plex Mono for the displayed secret + backup codes. No emojis (Lucide icons only: `shield-check`, `qr-code`, `key-round`, `download`, `copy`).

### Rate Limiting (TOTP-05)
- **D-24:** Use `@upstash/ratelimit` + `@upstash/redis`. Provisioned via Vercel Marketplace in Phase 30 — for Phase 29, install the libs, write the helper, and document `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` in `.env.example`. Local dev runs with the bypass (see D-26).
- **D-25:** Sliding-window limiter, **5 attempts per 60 seconds**, applied to:
  - `loginAction` — keyed by `email + ":" + ip`
  - `verifyTotpAction` — keyed by `userId + ":" + ip` (userId taken from challenge before verification)
  Both keys checked, both must pass. Rejection returns the same generic error as a wrong code/password — no oracle.
- **D-26:** Bypass mechanism: helper short-circuits and returns `{ success: true, remaining: Infinity }` when `process.env.NODE_ENV !== 'production'` OR `process.env.RATE_LIMIT_DISABLED === 'true'`. `.env.test` sets the bypass. Production deploy validates that Upstash env vars are present at boot (Phase 30 hardening).
- **D-27:** Centralize in `src/lib/rate-limit.ts` — exports `loginLimiter` and `totpLimiter` instances + a `getClientIp(headers)` helper that reads `x-forwarded-for` first hop with `127.0.0.1` fallback. Single import path keeps callsites uniform and testable.

### Schema Migration Scope
- **D-28:** Single Prisma migration `add_backup_code_model`. Adds the `BackupCode` model, the `User.backupCodes BackupCode[]` reverse relation, and the index. Does NOT touch `User.totpSecret` / `User.totpEnabled` — those already exist from Phase 25.
- **D-29:** Seed script unchanged. Admin user starts with `totpEnabled = false` and zero backup codes; 2FA setup happens via the UI after first login.

### Validators (Zod, in `src/lib/validators.ts`)
- **D-30:** Add four schemas:
  - `loginPasswordSchema` — email + password (replaces inline parse in current `loginAction`).
  - `verifyTotpSchema` — `challenge` (string), `code` (string, length 6-9 to cover both `123456` and `XXXX-XXXX`).
  - `enableTotpSchema` — `code` (6-digit numeric, regex `/^\d{6}$/`), used inside the setup wizard step 2.
  - `disableTotpSchema` — `code` (string, same shape as verifyTotp).
- **D-31:** All TOTP-related Zod messages in Spanish, consistent with existing app locale (e.g., `"Ingresa un código de 6 dígitos"`).

### Test Strategy
- **D-32:** **Unit tests** (Vitest):
  - `src/lib/totp-crypto.test.ts` — encrypt/decrypt round-trip, IV uniqueness across calls, tamper detection (mutated authTag fails), missing/invalid key throws.
  - `src/lib/totp.test.ts` — `generateSecret()` produces valid base32, `verifyTotp(secret, code, atTime)` mocks `Date.now()` to confirm window=1 tolerance and rejects out-of-window codes.
  - `src/lib/backup-codes.test.ts` — `generateBackupCodes()` returns 10 unique 8-hex strings, `consumeBackupCode(userId, code)` is single-use (second attempt with same code fails), wrong code returns false without throwing.
  - `src/lib/rate-limit.test.ts` — limiter mocks Upstash, asserts 5 pass / 6th fails, asserts bypass returns success when `RATE_LIMIT_DISABLED=true`.
  - `src/actions/auth.test.ts` — extend with: loginAction returns `requiresTotp` for 2FA users, verifyTotpAction rejects expired challenge / mismatched challenge / wrong code / consumed backup code.
- **D-33:** **Integration tests** (`tests/integration/totp.test.ts`, real test DB):
  - Full setup flow (enable wizard creates encrypted secret + 10 backup codes in one transaction).
  - Login with TOTP code (real `authorizeUser` + real `totp-crypto` + real DB).
  - Login with backup code (consumes the row, second use fails).
  - Disable flow (clears totpSecret, deletes BackupCode rows, `totpEnabled = false`).
  - **Cross-user isolation:** User B cannot use User A's backup code (extends Phase 27 `isolation.test.ts` pattern).
- **D-34:** **E2E** (Playwright, `e2e/totp.spec.ts`): one happy-path test — login → enable 2FA → logout → login with code → save backup code → logout → login with backup code. Mock `otplib.totp.generate` deterministically by injecting a fixed `Date.now()` shim in test bootstrap.
- **D-35:** Auth-related test mocks: `totp-crypto` is **not** mocked in unit tests of higher-level actions — it's a pure function and round-trips fast. `@upstash/ratelimit` IS mocked in unit tests via `vi.mock('@upstash/ratelimit')`. Real Upstash is never called from any test.

### Carried Forward (from prior phases — locked, do not re-decide)
- JWT session strategy, 30-day max age (Phase 26).
- bcryptjs cost factor 12 for all hashing (Phases 25, 26, 28).
- `requireAuth()` is mandatory at the top of every Server Action — CVE-2025-29927 defense-in-depth (Phase 27).
- Server Actions use `useActionState` + `{ error?: ... } | undefined` shape with `_form` for global errors (Phase 28 D-20).
- Hash BEFORE opening `$transaction` because bcrypt cost-12 is slow and would pin a connection (Phase 28 P03).
- Generic ambiguous error messages — never leak which credential was wrong, no token-state oracle (Phases 26 D-Error, 28 P03).
- `(auth)` route group layout is the minimal centered OLED-black layout — `/login` lives there, the new step-2 UI stays on `/login` (D-17), no new route in `(auth)`.
- `(app)/configuracion` page is the single home for user-level settings — Invitaciones pattern is the reference for adding the Seguridad section (Phase 28 D-01).
- All user-facing text in Spanish (es-MX).
- Lucide React icons only, no emojis (Glyph Finance design).
- Files <300 lines, functions <50 lines (CLAUDE.md quality rule).
- All Prisma writes that touch >1 row use `prisma.$transaction` (CLAUDE.md security rule).

### Claude's Discretion (downstream agents may choose)
- Exact bottom-sheet vs inline-card layout for the Seguridad section header (the wizard itself IS a bottom-sheet per D-20).
- Whether to extract a `<TotpCodeInput />` primitive (6-digit segmented input) or use a single FloatingInput — depends on what feels right with the existing form library; both acceptable.
- Whether the "Descargar (.txt)" backup-code download is a `<a download>` blob or a Server Action returning a File response.
- Migration filename + plan-file split (1 schema plan + 1 lib plan + 1 wizard/UI plan + 1 login plan, OR fewer larger plans — planner's call).
- Toast vs inline confirmation on "2FA activado" — inline is the established login/register pattern, but a toast is acceptable here since the user just dismissed a modal.
- Exact copy for the disable confirmation ("¿Seguro que quieres desactivar 2FA? Tu cuenta quedará protegida solo por contraseña.").

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Specs
- `.planning/REQUIREMENTS.md` §TOTP 2FA — TOTP-01..05 (the 5 requirements this phase delivers)
- `.planning/ROADMAP.md` §Phase 29 — goal and success criteria
- `.planning/PROJECT.md` §Constraints + Key Decisions — JWT/bcrypt/i18n/icon rules

### Prior Phase Decisions (carry-forward)
- `.planning/phases/25-schema-migration/25-CONTEXT.md` — User.totpSecret/totpEnabled fields exist; BackupCode was deferred to this phase (see Deferred Ideas)
- `.planning/phases/26-auth-wiring-login/26-CONTEXT.md` — Auth.js v5 config, login UX, FloatingInput, JWT 30d, generic error messages, callbackUrl
- `.planning/phases/27-per-user-data-isolation/27-CONTEXT.md` — `requireAuth()` placement, `connection()` on pages, cross-user isolation test pattern
- `.planning/phases/28-invite-only-registration/28-CONTEXT.md` — Configuracion section pattern (Invitaciones), Server Action shape, hash-before-`$transaction` rule, ambiguous-error rule

### Codebase
- `src/auth.ts` — Auth.js v5 config + `authorizeUser` (extend per D-14/D-16, do not replace)
- `src/actions/auth.ts` — `loginAction` (split per D-15), `registerAction` (reference pattern for `$transaction` + bcrypt-before-tx)
- `src/lib/auth-utils.ts` — `requireAuth()` (use as-is in setup/disable/regen actions)
- `src/lib/validators.ts` — add 4 schemas per D-30
- `src/proxy.ts` — already allows `/login` and `/register`; no changes expected
- `src/components/auth/LoginForm.tsx` — pattern reference for two-step UI
- `src/app/(auth)/login/page.tsx` — host of the two-step form
- `src/app/(auth)/layout.tsx` — minimal centered OLED-black layout (reused)
- `src/app/(app)/configuracion/page.tsx` — add Seguridad data fetch (`totpEnabled` for current user)
- `src/app/(app)/configuracion/ConfiguracionClientWrapper.tsx` — render new `<SeguridadSection />`
- `src/app/(app)/configuracion/invite-actions.ts` — pattern reference for new `totp-actions.ts` (requireAuth + Zod + $transaction)
- `prisma/schema.prisma` — User.totpSecret/totpEnabled exist; add `BackupCode` model + relation
- `prisma/seed.ts` — no changes expected (D-29)
- `tests/integration/isolation.test.ts` — pattern for the new cross-user backup-code isolation test
- `tests/integration/auth.test.ts` — pattern for new `totp.test.ts`

### Environment / Config
- `.env.example` — `AUTH_TOTP_ENCRYPTION_KEY` already declared. ADD: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, optional `RATE_LIMIT_DISABLED`. Document the 64-hex-char requirement for `AUTH_TOTP_ENCRYPTION_KEY` (32 bytes) inline.
- `CLAUDE.md` §Quality Loop + §Security Rules — must be passed for every commit; `pnpm` references should be read as `npm` (per `MEMORY.md` user preference)

### External Docs
- otplib README — https://github.com/yeojz/otplib (TOTP API: `authenticator.generate`, `verify`, `keyuri`)
- @upstash/ratelimit docs — https://upstash.com/docs/ratelimiting/sdks/ts/overview (sliding-window setup)
- RFC 6238 — TOTP algorithm (informational; otplib implements it)
- NIST SP 800-38D — AES-GCM IV recommendations (informational; informs D-06)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `FloatingInput` (`src/components/ui/FloatingInput.tsx`) — used for all auth/form inputs; reuse for TOTP code input.
- `LoginForm` (`src/components/auth/LoginForm.tsx`) — useActionState + Server Action + Loader2 pattern transfers directly to step 2.
- `RegisterForm` (`src/components/auth/RegisterForm.tsx`) — closer pattern for multi-field forms with `_form` global error.
- `requireAuth()` — drop-in for setup/disable/regen Server Actions.
- `signIn('credentials', ...)` from Auth.js — final session issuance after TOTP step (D-15).
- `prisma.$transaction` — used everywhere; reuse for atomic enable/disable/regen flows.
- `bcryptjs` — already installed, used for backup-code hashing (D-11).
- `(auth)` layout, `(app)` layout, `noStore`/`connection()` pattern — reuse without modification.
- Sonner toast — available for "2FA activado" confirmation if Claude prefers over inline.
- Bottom-sheet modal primitives used by TransactionForm — reuse for the wizard (D-20).

### Established Patterns
- **JWT Session shape:** `session.user.id` and `session.user.isAdmin` already populated — extend if needed (probably not; 2FA state is fetched from DB on demand, not stored in JWT — keeps JWT small and avoids stale-state issues).
- **Server Action result shape:** `{ error?: Record<string, string[]> } | undefined` (Phase 28 D-20) for forms; `{ error?: string }` (Phase 26) for simple cases. New TOTP actions follow Phase 28 shape.
- **Hash-before-`$transaction`:** never hold a DB connection during bcrypt cost-12 (Phase 28 P03 D-comment).
- **Ambiguous errors:** never expose which factor failed (Phase 26, Phase 28 P03).
- **CVE-2025-29927:** `requireAuth()` at the top of every action.
- **Cross-user isolation tests:** `tests/integration/isolation.test.ts` pattern — User B authenticates and asserts zero access to User A's data.
- **Spanish locale:** Zod `z.config(z.locales.es())` already set in validators.ts.

### Integration Points
- `prisma/schema.prisma` — add `BackupCode` model + relation; migrate.
- `src/auth.ts` — extend `authorizeUser` credentials with `totpCode` + `challenge`; do not change session/JWT callbacks.
- `src/actions/auth.ts` — split `loginAction`; add `verifyTotpAction`.
- `src/app/(app)/configuracion/page.tsx` — fetch `{ totpEnabled }` for the current user.
- `src/app/(app)/configuracion/ConfiguracionClientWrapper.tsx` — render `<SeguridadSection />`.
- New: `src/app/(app)/configuracion/totp-actions.ts` — `enableTotpAction`, `disableTotpAction`, `regenerateBackupCodesAction`, `prepareTotpSecretAction` (returns `{ secret, qrDataUrl }` for the wizard step 1; secret is held in client memory until step 2 confirms).
- New: `src/lib/totp-crypto.ts`, `src/lib/totp.ts`, `src/lib/backup-codes.ts`, `src/lib/rate-limit.ts`.
- New: `src/components/configuracion/SeguridadSection.tsx`, `src/components/configuracion/Activar2faModal.tsx`, `src/components/configuracion/Desactivar2faModal.tsx`, `src/components/configuracion/BackupCodesScreen.tsx`.
- New: `src/components/auth/TotpStep.tsx` — step-2 UI swapped into LoginForm.
- `.env.example` — additions per Canonical Refs.
- `package.json` — add `otplib`, `qrcode`, `@upstash/ratelimit`, `@upstash/redis`, `@types/qrcode`.

### Notes for the Researcher
- otplib has switched packaging across versions; planner should pin to a current major and confirm the `authenticator` import path.
- `@upstash/ratelimit` v2+ requires `@upstash/redis` v1+ as a peer; planner should verify the latest compatible pair.
- Next.js 16 App Router: `crypto.subtle` is also an option for AES-GCM (Edge-compatible), but `node:crypto` is fine because Server Actions run in the Node runtime, not Edge. Planner: verify by inspecting the runtime config of the relevant routes — do NOT add `export const runtime = 'edge'` to any route that touches `totp-crypto.ts`.

</code_context>

<specifics>
## Specific Ideas

- Setup wizard should feel like a guided 3-step flow inside one bottom-sheet, not three separate dialogs — consistent with the polish established in TransactionForm.
- "Seguridad" section header in `/configuracion` should communicate state at a glance: green StatusDot + "Activado" when on, neutral StatusDot + "Desactivado" when off (consistent with existing StatusDot primitive).
- Backup codes screen: monospace (IBM Plex Mono), copy-all button, download button, and a checkbox the user must tick before "Listo" enables — friction is intentional here.
- Login step 2 should accept either a 6-digit code or a backup code in the same input field, with a small toggle/hint "Usar código de respaldo" that switches the placeholder + visual style. One submit path on the server (D-18).

</specifics>

<deferred>
## Deferred Ideas

- WebAuthn / passkeys — out of scope for v3.0 (see Phase 25 decisions). Could be a v4.x phase.
- "Remember this device for 30 days" trust cookie — adds cookie surface + a "device" entity. Defer; revisit if 2FA friction becomes a real complaint.
- SMS or email second-factor — out of scope (no SMS infra; email is invite-only and admin-driven per PROJECT.md).
- Recovery email separate from login email — out of scope; backup codes are the recovery path.
- Admin "force disable 2FA for user X" UI — single-admin trust model; admin can edit DB directly if needed. Add only when there's a second admin.
- Notify-by-email on 2FA enable/disable — no email infra in MVP.
- Rate-limit on `/register` — backup-code brute force is the relevant attack here, already covered.
- Per-IP geographic / device fingerprint heuristics — out of scope.
- Audit log of 2FA events (enable/disable/code-used) — nice-to-have, not in v3.0.
- Push-based 2FA (Authy / Duo style) — out of scope; TOTP is the deliberate choice.

</deferred>

---

*Phase: 29-totp-two-factor-authentication*
*Context gathered: 2026-04-20*
*Mode: --auto (recommended defaults)*
