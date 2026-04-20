# Phase 29: TOTP Two-Factor Authentication - Research

**Researched:** 2026-04-20
**Domain:** TOTP (RFC 6238) 2FA inside NextAuth v5 Credentials flow on Next.js 16 (Node runtime, Server Actions, PostgreSQL)
**Confidence:** HIGH

## Summary

This phase bolts TOTP-based 2FA onto the existing NextAuth v5 + Credentials + JWT login. Every building block is either already in the codebase (FloatingInput, `Modal` bottom-sheet primitive, `requireAuth()`, Sonner `toast`, `$transaction`, bcrypt cost-12, `signIn('credentials')`, Zod with Spanish locale) or is a tiny, well-understood Node built-in (`node:crypto` AES-256-GCM, HMAC-SHA256, `timingSafeEqual`). The only genuinely new dependencies are `otplib@13.4.0` (TOTP generation/verification), `qrcode@1.5.4` (+ `@types/qrcode@1.5.6`) for server-side QR data URL rendering, and `@upstash/ratelimit@2.0.8` + `@upstash/redis@1.37.0` for rate limiting.

Two research findings matter most:

1. **otplib v13 is a complete rewrite.** The `authenticator` object from v12 is gone. v13 exposes flat async named exports: `generateSecret`, `generate`, `verify`, `generateURI`. Defaults (`sha1`, 6 digits, 30 s period) match authenticator-app expectations out of the box. `verify()` returns `{ valid, delta }` — **not** a boolean — so downstream code must read `.valid`.
2. **@upstash/ratelimit@2.0.8 has a `peerDependencies` entry of `@upstash/redis@^1.34.3`.** `@upstash/redis@1.37.0` satisfies that caret range (`^1.34.3` matches any `1.x.x >= 1.34.3`). No `--legacy-peer-deps` needed. `Ratelimit.limit(identifier)` returns `{ success, limit, remaining, reset, pending, reason?, deniedValue? }`. `slidingWindow(limit, window)` takes a string window like `'60 s'`.

Every other decision locked in CONTEXT.md is directly implementable with the patterns already established in Phases 26–28 (Server Action shape, `useActionState`, hash-before-`$transaction`, NEXT_REDIRECT re-throw discipline, `{ error?: Record<string, string[]> } | undefined` result shape, Spanish ambiguous error messages, admin-gate-in-Server-Action).

**Primary recommendation:** 5 plans in dependency order — (1) Schema + libs/env, (2) Crypto/TOTP/backup-code/rate-limit utility modules + tests, (3) Two-step login wiring (`authorizeUser` extension + `loginAction` split + `verifyTotpAction` + challenge-token helper + step-2 UI), (4) Setup/Disable/Regen Server Actions + Seguridad section UI + bottom-sheet wizards, (5) Integration + E2E tests + .env.example updates + final `quality` pass.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**TOTP Library + QR Generation**
- **D-01:** Use `otplib` for TOTP generation/verification (RFC 6238, HMAC-SHA1, 30s step, 6-digit codes — authenticator-app default). Issuer `Centik`, label `Centik:<email>`.
- **D-02:** Generate the QR code server-side with `qrcode` (`toDataURL(otpauthUri)`) and pass the data URL as a string prop to the client step component. Avoids shipping a QR library to the browser bundle.
- **D-03:** Always show the manual `base32` secret next to the QR (small monospace block) so users on devices without a camera can enter it manually.
- **D-04:** Verification window: `authenticator.options = { window: 1 }` (±30s tolerance).

**Encryption at Rest (TOTP-02)**
- **D-05:** Use Node built-in `node:crypto` (`createCipheriv('aes-256-gcm', ...)`) — no new dependency. Helper module `src/lib/totp-crypto.ts` exports `encryptSecret(plaintext)` and `decryptSecret(ciphertext)`.
- **D-06:** Storage format in `User.totpSecret`: `iv:ciphertext:authTag` (all hex), single column. 96-bit (12-byte) random IV per record.
- **D-07:** `AUTH_TOTP_ENCRYPTION_KEY` is required to be a 64-char hex string (32 bytes). Crypto module validates the key on first import and throws fast.
- **D-08:** Plaintext TOTP secret never crosses module boundaries except inside `totp-crypto.ts` immediately before encrypting / immediately after decrypting. Never logged. Never returned from any Server Action.

**Backup Codes (TOTP-04)**
- **D-09:** New Prisma model `BackupCode { id, userId, codeHash, usedAt?, createdAt }` with `@@index([userId])` and `onDelete: Cascade` from User.
- **D-10:** 10 codes per setup, each 8 hex chars (32 bits entropy), formatted for display as `XXXX-XXXX` (dash cosmetic; stripped before hash+verify).
- **D-11:** Hash codes with bcryptjs cost factor 12. Verification: load all unused codes for user, `bcrypt.compare` in sequence, on first hit set `usedAt = NOW()` via `updateMany where: { id, usedAt: null }` — concurrency-safe.
- **D-12:** Codes shown ONCE at setup completion in a copy-friendly block + "Descargar (.txt)" button. Mandatory checkbox `He guardado mis códigos de respaldo` gates the "Listo" CTA.
- **D-13:** "Regenerar códigos de respaldo" action — requires current TOTP code, atomically deletes existing and inserts fresh 10.

**Two-Step Login (TOTP-03)**
- **D-14:** Keep `authorizeUser` in `src/auth.ts` as single source of credential validation; extend to optionally accept `totpCode` and `challenge`. `authorize` returns null when 2FA is enabled and valid `totpCode` (or backup code) not supplied.
- **D-15:** Split client flow into TWO Server Actions — `loginAction` (validates email+password, returns `{ requiresTotp: true, challenge }` if 2FA enabled, else `signIn`) and `verifyTotpAction` (validates `challenge` + `code`, calls `signIn` with all four fields).
- **D-16:** Challenge token = HMAC-SHA256 of `{ userId, email, exp }` signed with `AUTH_SECRET`. 5-minute lifetime. Hidden form field (not cookie). Decoded + verified in both `verifyTotpAction` and `authorizeUser`.
- **D-17:** Single `/login` page with two visual steps. After step 1 with `requiresTotp`, form swaps to 6-digit input + "Usar código de respaldo" toggle. No new route.
- **D-18:** Backup-code path uses same `verifyTotpAction` — server auto-detects 8-hex vs 6-digit.

**Setup + Disable UX**
- **D-19:** "Seguridad" section in `/configuracion` (mirrors Invitaciones pattern). Visible to EVERY authenticated user (not admin-gated).
- **D-20:** Setup wizard = bottom-sheet modal with 3 steps: Generar/escanear → Verificar → Guardar códigos. All three writes (secret + backup codes + flip `totpEnabled`) happen in one `$transaction`.
- **D-21:** Disable wizard = smaller bottom-sheet, requires current TOTP (or backup code), atomically clears `totpSecret`, flips `totpEnabled=false`, deletes all `BackupCode` rows.
- **D-22:** "Regenerar códigos" = third bottom-sheet, requires TOTP code, reuses setup step-3 UI.
- **D-23:** Glyph Finance visual style. FloatingInput for code. Chartreuse pill button. IBM Plex Mono for secret + backup codes. Lucide icons only (`shield-check`, `qr-code`, `key-round`, `download`, `copy`).

**Rate Limiting (TOTP-05)**
- **D-24:** `@upstash/ratelimit` + `@upstash/redis`. Provisioned via Vercel Marketplace in Phase 30 — install, write helper, document env vars for now. Local dev uses bypass.
- **D-25:** Sliding-window 5 attempts / 60 s. `loginAction` keyed by `email + ":" + ip`. `verifyTotpAction` keyed by `userId + ":" + ip`. Both must pass. Rejection returns the same generic error as wrong-password — no oracle.
- **D-26:** Bypass when `NODE_ENV !== 'production'` OR `RATE_LIMIT_DISABLED === 'true'`. `.env.test` sets the bypass.
- **D-27:** Centralize in `src/lib/rate-limit.ts` — exports `loginLimiter`, `totpLimiter`, and `getClientIp(headers)`.

**Schema Migration Scope**
- **D-28:** Single Prisma migration `add_backup_code_model`. Adds BackupCode + relation + index. Does NOT touch User.totpSecret / User.totpEnabled.
- **D-29:** Seed unchanged.

**Validators (src/lib/validators.ts)**
- **D-30:** Four new schemas: `loginPasswordSchema`, `verifyTotpSchema`, `enableTotpSchema`, `disableTotpSchema`.
- **D-31:** All TOTP Zod messages in Spanish.

**Test Strategy**
- **D-32:** Unit tests for `totp-crypto`, `totp`, `backup-codes`, `rate-limit`, and extended `auth.test.ts`.
- **D-33:** Integration tests in `tests/integration/totp.test.ts` (setup, login with TOTP, login with backup, disable, cross-user isolation).
- **D-34:** E2E Playwright happy-path in `e2e/totp.spec.ts`.
- **D-35:** `totp-crypto` NOT mocked in higher-level tests (pure, fast). `@upstash/ratelimit` mocked via `vi.mock`. Real Upstash never called from tests.

**Carried Forward (from prior phases)**
- JWT session strategy, 30-day max age (Phase 26).
- bcryptjs cost factor 12 for all hashing (25, 26, 28).
- `requireAuth()` mandatory at top of every Server Action — CVE-2025-29927 defense-in-depth (Phase 27).
- Server Actions use `useActionState` + `{ error?: Record<string, string[]> } | undefined`.
- Hash BEFORE `$transaction` — bcrypt cost-12 pins connections (Phase 28 P03).
- Generic ambiguous errors — no leak of which credential/factor was wrong.
- `(auth)` route group layout for `/login`; step-2 stays on same route.
- `(app)/configuracion` is single home for user settings — Invitaciones pattern reference.
- All UI text in Spanish (es-MX).
- Lucide React icons only, no emojis.
- Files <300 lines, functions <50 lines.
- All Prisma writes touching >1 row use `$transaction`.

### Claude's Discretion
- Exact bottom-sheet vs inline-card header layout for Seguridad section.
- Whether to extract a `<TotpCodeInput />` primitive (6-digit segmented input) or reuse FloatingInput.
- Whether "Descargar (.txt)" is `<a download>` blob or a Server Action returning a File.
- Migration filename + plan-file split.
- Toast vs inline confirmation on "2FA activado".
- Exact copy for disable confirmation.

### Deferred Ideas (OUT OF SCOPE)
- WebAuthn / passkeys.
- "Remember this device for 30 days" trust cookie.
- SMS or email second-factor.
- Recovery email separate from login email.
- Admin "force disable 2FA for user X" UI.
- Notify-by-email on 2FA enable/disable.
- Rate-limit on `/register` (backup-code brute force is the covered attack).
- Per-IP geo / device fingerprint.
- Audit log of 2FA events.
- Push-based 2FA.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TOTP-01 | TOTP setup flow — generate secret, display QR, verify first code before persisting | otplib v13 `generateSecret()` + `generateURI()` + `verify()`; qrcode `toDataURL()`; 3-step bottom-sheet wizard pattern (TransactionForm reuse); atomic `$transaction` for secret+backup-codes+flag write |
| TOTP-02 | TOTP secrets encrypted at rest with AES-256-GCM using `AUTH_TOTP_ENCRYPTION_KEY` | Node 20 `crypto.createCipheriv('aes-256-gcm', key, iv)` + `getAuthTag()` pattern; 96-bit IV per NIST SP 800-38D; `iv:ciphertext:authTag` hex storage format; key validation at module import |
| TOTP-03 | Two-step login — password first, then TOTP before session | Extend `authorizeUser` credentials with optional `totpCode` + `challenge`; split `loginAction` + new `verifyTotpAction`; HMAC-SHA256 challenge signed with `AUTH_SECRET` (5-min TTL); `timingSafeEqual` for signature comparison |
| TOTP-04 | 10 single-use backup codes, bcryptjs-hashed | `crypto.randomBytes(4).toString('hex')` × 10; bcryptjs cost 12; atomic single-use via `updateMany where: { id, usedAt: null }` returning count (Prisma + PostgreSQL READ COMMITTED is sufficient) |
| TOTP-05 | Rate-limit login + TOTP verify to 5 attempts/min via `@upstash/ratelimit` | `Ratelimit.slidingWindow(5, '60 s')`; composite key `email:ip` and `userId:ip`; `x-forwarded-for` first hop via `headers()`; dev/test bypass via env flag |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|--------------|----------------|-----------|
| AES-256-GCM encrypt/decrypt TOTP secret | API / Backend (Node) | — | `node:crypto` is Node-only; plaintext must never reach the browser |
| Generate TOTP secret + OTPAUTH URI + QR data URL | API / Backend (Server Action) | — | Avoid shipping qrcode to browser; produce data URL server-side and pass as prop (D-02) |
| Verify 6-digit TOTP code | API / Backend | — | Requires decrypted secret; plaintext must never leave server |
| Verify backup code (bcrypt.compare loop + atomic consume) | API / Backend (`$transaction`) | — | Bcrypt cost-12 + DB write; concurrent-safe via `updateMany` WHERE `usedAt: null` |
| Sign + verify HMAC-SHA256 challenge token | API / Backend | — | Uses `AUTH_SECRET`; signature comparison via `timingSafeEqual` |
| Extended `authorizeUser` (NextAuth v5) | API / Backend | — | Credentials provider's `authorize` runs server-side only |
| Two Server Actions (`loginAction`, `verifyTotpAction`) | API / Backend | Frontend Server (redirect) | `signIn` throws NEXT_REDIRECT routed by Next |
| Rate-limit checks | API / Backend | — | Must happen before credential verification; Upstash Redis REST call is a server-only HTTP call |
| Step-2 TOTP input UI (6-digit / backup toggle) | Browser / Client | Frontend Server | `useActionState` client form; swaps in after `loginAction` returns `requiresTotp` |
| Setup wizard (3-step bottom-sheet) | Browser / Client | API / Backend (per-step actions) | Wizard client state is interactive; each step invokes a Server Action |
| Backup-codes display + download + copy | Browser / Client | — | Blob download via `<a download>`; Clipboard API client-only |
| Seguridad section header + status dot | Frontend Server (SSR) | — | Renders `totpEnabled` from DB via `auth()` → DB lookup; non-sensitive flag, safe in initial HTML |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `otplib` | `13.4.0` | TOTP generate/verify/URI | Actively maintained RFC 6238 TOTP; v13 rewrite uses `@noble/hashes` + `@scure/base` (audited). Google Authenticator compatible defaults. [VERIFIED: `npm view otplib version` → 13.4.0, modified 2026-03-19] |
| `qrcode` | `1.5.4` | Render OTPAUTH URI as PNG data URL on server | De facto Node QR library; `toDataURL(text, options)` returns `Promise<string>`. [VERIFIED: `npm view qrcode version` → 1.5.4, modified 2025-11-13] |
| `@types/qrcode` | `1.5.6` | TypeScript types for qrcode | qrcode ships NO types. [VERIFIED: `npm view @types/qrcode version` → 1.5.6; README explicitly says "install @types/qrcode separately"] |
| `@upstash/ratelimit` | `2.0.8` | Sliding-window rate limiter | Upstash first-party SDK; only SDK that integrates natively with Upstash Redis REST API (no Node socket). [VERIFIED: `npm view @upstash/ratelimit version` → 2.0.8, modified 2026-04-20] |
| `@upstash/redis` | `1.37.0` | REST client Redis driver | Upstash first-party. `peerDependencies` of ratelimit is `^1.34.3` — 1.37.0 satisfies. [VERIFIED: `npm view @upstash/redis version` → 1.37.0, modified 2026-04-20] |
| `bcryptjs` | `^3.0.3` (installed) | Hash backup codes at cost 12 | Already in `package.json`; same cost factor as passwords per Phase 25 decision [VERIFIED: `package.json` L25] |
| `node:crypto` | built-in Node 20+ | AES-256-GCM, HMAC-SHA256, `randomBytes`, `timingSafeEqual` | No install. Node 20 is what Next.js 16 requires. [CITED: Node.js v20 crypto docs] |
| `next-auth` | `^5.0.0-beta.31` (installed) | Existing Auth.js wiring; extend `authorize` credentials | Already wired in Phase 26. `CredentialsConfig.credentials` type allows arbitrary input names; `authorize(credentials: Partial<Record<keyof CredentialsInputs, unknown>>)` so adding `totpCode`, `challenge` is natural. [VERIFIED: `node_modules/@auth/core/providers/credentials.d.ts` L13-55] |

### Supporting / Already Installed

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `zod` | installed | Validators (D-30) | All four new TOTP schemas |
| `lucide-react` | installed | `ShieldCheck`, `QrCode`, `KeyRound`, `Copy`, `Download`, `Loader2`, `Eye`, `EyeOff` | D-23 icon inventory |
| `sonner` | `^2.0.7` | Optional "2FA activado" toast | D-23 Claude's discretion; `Toaster` already mounted in root layout `src/app/layout.tsx` L47 |
| `@prisma/client` + `prisma` | installed | BackupCode model + migration | D-09, D-28 |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `otplib@13` | `speakeasy`, `@noble/hashes` + manual TOTP, `@epic-web/totp`, `otpauth` | CONTEXT D-01 locks `otplib`. `otpauth` is simpler but less maintained; `speakeasy` hasn't had major releases recently. `otplib@13` uses `@noble/hashes` internally — already audited — so we're getting the same security as hand-rolling with noble, but with a tested URI builder. |
| `node:crypto` AES-GCM | `crypto.subtle` (Web Crypto) | D-05 locks `node:crypto`. Web Crypto is Edge-compatible but our Server Actions run Node (no `runtime = 'edge'` in codebase — VERIFIED: `grep -rn "runtime" src/` finds zero hits). Staying with `node:crypto` keeps the API synchronous-ish (no Promise chains) and avoids CryptoKey import ceremony. |
| Upstash REST rate limit | Local in-memory limiter (e.g. `rate-limiter-flexible`) | CONTEXT D-24 locks Upstash. Serverless Vercel instances are ephemeral — in-memory would not share state across instances. Upstash is the standard choice for Next.js on Vercel. |
| 12-byte (96-bit) IV | 16-byte IV | D-06 locks 12 bytes. NIST SP 800-38D §8.2.1 specifically recommends 96 bits for GCM — longer IVs get internally hashed and lose uniqueness guarantees. |
| `updateMany` for single-use backup-code consume | `SELECT ... FOR UPDATE` + update | `updateMany({ where: { id, usedAt: null } })` returns `{ count }` — if `count === 0`, someone else already consumed it. Works at READ COMMITTED (Prisma default) because the UPDATE acquires a row lock and the WHERE clause re-evaluates under lock. [HIGH confidence, standard Postgres semantics per Postgres docs] |
| HMAC-SHA256 challenge token | JWT library (e.g., `jose`) | Rolling a plain HMAC is simpler (no library, no kid/alg negotiation, no clock skew semantics to explain). `AUTH_SECRET` already exists as a 256-bit+ key. Payload is 3 fields; no need for JWT overhead. |

### Installation

```bash
npm install otplib qrcode @upstash/ratelimit @upstash/redis
npm install -D @types/qrcode
```

**No `--legacy-peer-deps` required.** `@upstash/ratelimit@2.0.8` peer-dep `^1.34.3` is satisfied by `@upstash/redis@1.37.0` (verified).

**Version verification (executed 2026-04-20):**
- otplib: `13.4.0` (modified 2026-03-19)
- qrcode: `1.5.4` (modified 2025-11-13)
- @types/qrcode: `1.5.6`
- @upstash/ratelimit: `2.0.8` (modified 2026-04-20)
- @upstash/redis: `1.37.0` (modified 2026-04-20)

## Architecture Patterns

### System Architecture Diagram

```
┌───────────────────────────────────────────────────────────────────────────────────────┐
│                          PHASE 29 — TOTP 2FA DATA FLOW                                │
└───────────────────────────────────────────────────────────────────────────────────────┘

 LOGIN (2FA-enabled user)

  LoginForm (client, useActionState)
      │  step 1 submit: { email, password, callbackUrl }
      ▼
  loginAction (Server Action)
      ├── rateLimit(loginLimiter, key=email:ip)        ── fail → generic "Credenciales invalidas"
      ├── Zod: loginPasswordSchema
      ├── prisma.user.findUnique({ email, select: { id, totpEnabled } })
      │     ├── !user  → generic error
      │     ├── totpEnabled=false → signIn('credentials', { email, password }) → NEXT_REDIRECT
      │     └── totpEnabled=true  → bcrypt.compare(password, hashedPassword)
      │             ├── mismatch → generic error
      │             └── match → build challenge HMAC(userId|email|exp) signed w/ AUTH_SECRET
      │                    return { requiresTotp: true, challenge, callbackUrl }
      ▼
  LoginForm detects requiresTotp → swaps to TotpStep (same /login URL)
      │  step 2 submit: { challenge, code, callbackUrl }
      ▼
  verifyTotpAction (Server Action)
      ├── rateLimit(totpLimiter, key=userId:ip)        ── userId extracted from challenge PRE-verify
      ├── Zod: verifyTotpSchema
      ├── verifyChallenge(challenge)  (timingSafeEqual on HMAC, exp check)
      ├── detect code shape: 6 digits → TOTP path ; 8 hex (XXXX-XXXX strip) → backup path
      ├── signIn('credentials', { email, challenge, totpCode: code })
      │       ▼
      │    authorizeUser (extended — inside src/auth.ts)
      │       ├── if totpCode+challenge present: verify challenge matches user by email
      │       ├── decrypt user.totpSecret (totp-crypto.decryptSecret)
      │       ├── otplib.verify({ secret, token: code }) OR consumeBackupCode
      │       └── return user | null
      │  NEXT_REDIRECT on success

 SETUP (user enables 2FA)

  SeguridadSection (client) → Activar2faModal (bottom-sheet)
      │
      ├── Step 1 "Escanear"
      │       └── prepareTotpSecretAction()   [Server Action, requireAuth]
      │              ├── otplib.generateSecret()
      │              ├── otplib.generateURI({ issuer:'Centik', label:`Centik:${email}`, secret })
      │              ├── qrcode.toDataURL(uri, { errorCorrectionLevel:'M', margin:2 })
      │              └── return { secret, qrDataUrl }   (secret held in client memory)
      │
      ├── Step 2 "Verificar"
      │       └── enableTotpAction(secret, code)   [Server Action, requireAuth]
      │              ├── Zod: enableTotpSchema
      │              ├── otplib.verify({ secret, token: code })
      │              │     └── invalid → return { error: { code: [...] } }
      │              ├── encryptedSecret = totp-crypto.encryptSecret(secret)
      │              ├── backupCodes = generateBackupCodes(10)  // plain strings for display
      │              ├── hashes = await Promise.all(codes.map(c => bcrypt.hash(c,12)))  — BEFORE $transaction
      │              ├── prisma.$transaction([
      │              │       user.update({ totpSecret: encryptedSecret, totpEnabled: true }),
      │              │       backupCode.createMany({ data: hashes.map(h => ({ userId, codeHash:h })) })
      │              │    ])
      │              └── return { success: true, backupCodes }   (plain codes returned ONCE)
      │
      └── Step 3 "Guardar códigos" — display codes, copy/download, mandatory checkbox

 DISABLE

  Desactivar2faModal (bottom-sheet)
      └── disableTotpAction(code)   [Server Action, requireAuth]
             ├── Zod: disableTotpSchema
             ├── load user.totpSecret (encrypted)
             ├── decrypt → otplib.verify OR consumeBackupCode
             │     invalid → return generic error
             └── prisma.$transaction([
                    user.update({ totpSecret: null, totpEnabled: false }),
                    backupCode.deleteMany({ where: { userId } })
                 ])

 REGENERATE CODES

  RegenerarCodigosModal (bottom-sheet)
      └── regenerateBackupCodesAction(code)   [Server Action, requireAuth]
             ├── verify TOTP code (same path as disable)
             ├── hashes = generateAndHash(10)  — BEFORE $transaction
             └── prisma.$transaction([
                    backupCode.deleteMany({ where: { userId } }),
                    backupCode.createMany({ data: hashes })
                 ])
             return { backupCodes: plainCodes }
```

### Recommended Project Structure

```
src/
├── auth.ts                                   MODIFY: extend authorizeUser (totpCode, challenge); import totp-crypto, totp, backup-codes, challenge
├── proxy.ts                                  UNCHANGED
├── actions/
│   └── auth.ts                               MODIFY: split loginAction → returns { requiresTotp, challenge } for 2FA users; ADD verifyTotpAction
├── app/
│   ├── (auth)/login/page.tsx                 UNCHANGED (step-2 swap is inside LoginForm)
│   └── (app)/
│       └── configuracion/
│           ├── page.tsx                      MODIFY: load { totpEnabled } for user; pass to wrapper
│           ├── ConfiguracionClientWrapper.tsx MODIFY: render <SeguridadSection totpEnabled={...} />
│           └── totp-actions.ts               NEW: prepareTotpSecretAction, enableTotpAction, disableTotpAction, regenerateBackupCodesAction
├── components/
│   ├── auth/
│   │   ├── LoginForm.tsx                     MODIFY: accept requiresTotp branch, swap to <TotpStep> when state returns requiresTotp
│   │   └── TotpStep.tsx                      NEW: step-2 UI (FloatingInput code, "Usar código de respaldo" toggle, challenge hidden input)
│   └── configuracion/
│       ├── SeguridadSection.tsx              NEW: status + CTAs (Activar / Desactivar / Regenerar)
│       ├── Activar2faModal.tsx               NEW: 3-step wizard (Modal primitive)
│       ├── Desactivar2faModal.tsx            NEW: code input + confirm
│       ├── RegenerarCodigosModal.tsx         NEW: code input + new codes display
│       └── BackupCodesScreen.tsx             NEW: shared display block (codes + copy + download + checkbox)
├── lib/
│   ├── totp-crypto.ts                        NEW: encryptSecret, decryptSecret; validates AUTH_TOTP_ENCRYPTION_KEY at import
│   ├── totp.ts                               NEW: thin wrapper over otplib (generateSecret, buildOtpauthUri, verifyTotp); keeps import surface small + testable
│   ├── backup-codes.ts                       NEW: generateBackupCodes(n), hashBackupCodes, verifyBackupCode, consumeBackupCode (atomic)
│   ├── challenge.ts                          NEW: signChallenge(userId, email), verifyChallenge(token)
│   ├── rate-limit.ts                         NEW: loginLimiter, totpLimiter, getClientIp, checkRateLimit (bypass-aware wrapper)
│   ├── auth-utils.ts                         UNCHANGED
│   └── validators.ts                         MODIFY: +loginPasswordSchema, +verifyTotpSchema, +enableTotpSchema, +disableTotpSchema
├── types/
│   └── next-auth.d.ts                        UNCHANGED (challenge/totpCode are request-only; no session shape change)
prisma/
├── schema.prisma                             MODIFY: +BackupCode model + User.backupCodes relation
└── migrations/YYYYMMDDHHMMSS_add_backup_code_model/migration.sql  NEW
tests/
├── integration/totp.test.ts                  NEW (D-33)
└── e2e (playwright)/totp.spec.ts             NEW (D-34)
.env.example                                  MODIFY: add UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN, RATE_LIMIT_DISABLED; document 64-hex-char AUTH_TOTP_ENCRYPTION_KEY
package.json                                  MODIFY: +otplib, +qrcode, +@upstash/ratelimit, +@upstash/redis, +@types/qrcode
```

### Pattern 1: AES-256-GCM encryption with key validated at import

```typescript
// src/lib/totp-crypto.ts
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const ALGO = 'aes-256-gcm'
const IV_LENGTH = 12 // 96 bits — NIST SP 800-38D recommendation for GCM
const KEY_HEX_LENGTH = 64 // 32 bytes × 2 hex chars

function loadKey(): Buffer {
  const hex = process.env.AUTH_TOTP_ENCRYPTION_KEY
  if (!hex || hex.length !== KEY_HEX_LENGTH || !/^[0-9a-fA-F]+$/.test(hex)) {
    throw new Error(
      'AUTH_TOTP_ENCRYPTION_KEY must be a 64-character hex string (32 bytes). ' +
      'Generate one with: openssl rand -hex 32'
    )
  }
  return Buffer.from(hex, 'hex')
}

const KEY = loadKey() // Validates on first import — fail fast at boot

/** Encrypts a plaintext TOTP secret. Returns `iv:ciphertext:authTag` (hex). */
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGO, KEY, iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${ciphertext.toString('hex')}:${authTag.toString('hex')}`
}

/** Decrypts a stored TOTP secret. Throws on tamper (authTag mismatch). */
export function decryptSecret(stored: string): string {
  const parts = stored.split(':')
  if (parts.length !== 3) throw new Error('Invalid ciphertext format')
  const [ivHex, ctHex, tagHex] = parts
  const iv = Buffer.from(ivHex, 'hex')
  const ciphertext = Buffer.from(ctHex, 'hex')
  const authTag = Buffer.from(tagHex, 'hex')

  const decipher = createDecipheriv(ALGO, KEY, iv)
  decipher.setAuthTag(authTag)
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()])
  return plaintext.toString('utf8')
}
```

Source: Node 20 `crypto` docs [CITED: nodejs.org/docs/latest-v20.x/api/crypto.html]. Key rules: IV 12 bytes per NIST SP 800-38D; `getAuthTag()` after `final()`; `setAuthTag()` BEFORE `final()`. Any mutation of IV / ciphertext / authTag causes `final()` to throw — exactly the tamper-detection property we want. [VERIFIED: authoritative docs]

### Pattern 2: otplib v13 thin wrapper

```typescript
// src/lib/totp.ts
import { generateSecret, generate, verify, generateURI } from 'otplib'

const ISSUER = 'Centik'
const WINDOW = 1 // ±30s tolerance per D-04

export function createTotpSecret(): string {
  return generateSecret() // Returns base32 string
}

export function buildOtpauthUri(secret: string, email: string): string {
  return generateURI({
    issuer: ISSUER,
    label: `${ISSUER}:${email}`,
    secret,
    // digits=6, period=30, algorithm='sha1' are the library defaults — authenticator-app compatible
  })
}

/** Verify a 6-digit TOTP code. Returns true/false — unwraps otplib's VerifyResult. */
export async function verifyTotpCode(secret: string, code: string): Promise<boolean> {
  // otplib v13 `verify` signature: ({ secret, token, epochTolerance? }) → Promise<{ valid: boolean; delta?: number }>
  // epochTolerance is in seconds. WINDOW=1 step × 30s = 30s tolerance.
  const result = await verify({ secret, token: code, epochTolerance: 30 })
  return result.valid
}
```

Source: otplib v13.4.0 README [CITED: `npm view otplib@13.4.0 readme`]. Defaults: algorithm `sha1`, digits `6`, period `30`, secret `Base32`. `verify` returns `{ valid, delta? }` — **not** a boolean. The `authenticator` convenience object from v12 is removed. [VERIFIED: v13 README + otplib.yeojz.dev migration guide]

### Pattern 3: QR code as server-side data URL

```typescript
// Inside src/app/(app)/configuracion/totp-actions.ts
import QRCode from 'qrcode'

async function buildQrDataUrl(otpauthUri: string): Promise<string> {
  return QRCode.toDataURL(otpauthUri, {
    errorCorrectionLevel: 'M', // default; balances size vs scannability
    margin: 2,                 // default 4 — tighter for modal layout
    width: 240,                // ~240px — fits comfortably in bottom-sheet
  })
}
```

Source: node-qrcode README [CITED: github.com/soldair/node-qrcode]. `toDataURL` returns `Promise<string>` (PNG data URL). Default `errorCorrectionLevel: 'M'`. `@types/qrcode` must be installed separately (package ships no types). [VERIFIED]

### Pattern 4: HMAC-SHA256 challenge token (5-min TTL)

```typescript
// src/lib/challenge.ts
import { createHmac, timingSafeEqual } from 'node:crypto'

const CHALLENGE_TTL_MS = 5 * 60 * 1000 // 5 minutes per D-16

function getSecret(): Buffer {
  const s = process.env.AUTH_SECRET
  if (!s) throw new Error('AUTH_SECRET missing — required for challenge signing')
  return Buffer.from(s, 'utf8')
}

/** Build `base64url(payloadJSON).base64url(hmac)` — compact, single form-field value. */
export function signChallenge(userId: string, email: string): string {
  const payload = { userId, email, exp: Date.now() + CHALLENGE_TTL_MS }
  const payloadB64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
  const sig = createHmac('sha256', getSecret()).update(payloadB64).digest('base64url')
  return `${payloadB64}.${sig}`
}

/** Returns the payload if valid, null otherwise. Constant-time signature compare. */
export function verifyChallenge(token: string): { userId: string; email: string } | null {
  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [payloadB64, sig] = parts
  const expected = createHmac('sha256', getSecret()).update(payloadB64).digest('base64url')
  // timingSafeEqual requires equal-length buffers
  const a = Buffer.from(sig, 'utf8')
  const b = Buffer.from(expected, 'utf8')
  if (a.length !== b.length) return null
  if (!timingSafeEqual(a, b)) return null
  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'))
    if (typeof payload.exp !== 'number' || payload.exp < Date.now()) return null
    if (typeof payload.userId !== 'string' || typeof payload.email !== 'string') return null
    return { userId: payload.userId, email: payload.email }
  } catch {
    return null
  }
}
```

Source: Node 20 `crypto.createHmac` + `crypto.timingSafeEqual` [CITED: Node docs, `@types/node/crypto.d.ts` L-timingSafeEqual]. `timingSafeEqual` requires equal-length inputs — pre-check length BEFORE comparing to avoid throwing. Base64url encoding keeps the token safe for HTML form fields (no `+`, `/`, `=` that would need URL-encoding).

### Pattern 5: Rate-limit helper (bypass-aware)

```typescript
// src/lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { headers } from 'next/headers'

const bypass =
  process.env.NODE_ENV !== 'production' ||
  process.env.RATE_LIMIT_DISABLED === 'true'

// Lazy-instantiate so tests can mock @upstash/ratelimit without needing env vars
function buildLimiter() {
  return new Ratelimit({
    redis: Redis.fromEnv(), // reads UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
    limiter: Ratelimit.slidingWindow(5, '60 s'), // D-25
    analytics: false, // D-35 — never call Upstash analytics from our code
    prefix: '@centik/ratelimit',
  })
}

export const loginLimiter = bypass ? null : buildLimiter()
export const totpLimiter = bypass ? null : buildLimiter()

type LimitResult = { success: true } | { success: false; retryAfterMs: number }

/** Returns { success: true } in dev/test (bypass) OR on pass. Generic rejection on limit. */
export async function checkRateLimit(
  limiter: Ratelimit | null,
  key: string,
): Promise<LimitResult> {
  if (!limiter) return { success: true } // D-26
  const res = await limiter.limit(key)
  if (res.success) return { success: true }
  return { success: false, retryAfterMs: res.reset - Date.now() }
}

/** Parse first hop from x-forwarded-for, fall back to x-real-ip, then 127.0.0.1. */
export async function getClientIp(): Promise<string> {
  const h = await headers()
  const fwd = h.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0]!.trim()
  return h.get('x-real-ip') ?? '127.0.0.1'
}
```

Source: @upstash/ratelimit docs [CITED: upstash.com/docs/redis/sdks/ratelimit-ts]. `Ratelimit.limit(id)` returns `{ success, limit, remaining, reset, pending, reason?, deniedValue? }`. `slidingWindow(limit, window)` — window is a string like `'60 s'`. `Redis.fromEnv()` reads `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` [CITED: upstash docs].

### Pattern 6: Extended `authorizeUser` — two-step sign-in in one provider

```typescript
// src/auth.ts — only the authorize function changes
import { verifyChallenge } from '@/lib/challenge'
import { decryptSecret } from '@/lib/totp-crypto'
import { verifyTotpCode } from '@/lib/totp'
import { consumeBackupCode } from '@/lib/backup-codes'

export async function authorizeUser(
  credentials: Partial<Record<'email' | 'password' | 'totpCode' | 'challenge', unknown>>,
) {
  const email = credentials?.email
  const password = credentials?.password
  const totpCode = credentials?.totpCode
  const challenge = credentials?.challenge

  if (typeof email !== 'string' || typeof password !== 'string') return null

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, hashedPassword: true, isApproved: true, isAdmin: true, totpEnabled: true, totpSecret: true },
  })
  if (!user?.hashedPassword || !user.isApproved) return null
  if (!(await bcrypt.compare(password, user.hashedPassword))) return null

  // 1FA branch — password was enough
  if (!user.totpEnabled) {
    return { id: user.id, email: user.email, name: user.name, isAdmin: user.isAdmin }
  }

  // 2FA branch — require totpCode + matching challenge
  if (typeof totpCode !== 'string' || typeof challenge !== 'string') return null
  const payload = verifyChallenge(challenge)
  if (!payload || payload.userId !== user.id || payload.email !== user.email) return null
  if (!user.totpSecret) return null // defensive — totpEnabled w/ no secret is corrupt state

  // Auto-detect code shape: 6 digits = TOTP; 8 hex chars (optionally with dash) = backup
  const normalized = totpCode.replace(/-/g, '').trim().toLowerCase()
  let codeValid = false

  if (/^\d{6}$/.test(totpCode)) {
    const secret = decryptSecret(user.totpSecret)
    codeValid = await verifyTotpCode(secret, totpCode)
  } else if (/^[0-9a-f]{8}$/.test(normalized)) {
    codeValid = await consumeBackupCode(user.id, normalized)
  }

  if (!codeValid) return null
  return { id: user.id, email: user.email, name: user.name, isAdmin: user.isAdmin }
}
```

Key notes:
- The `credentials` object is typed `Partial<Record<..., unknown>>` — we add `totpCode` and `challenge` as optional inputs on the provider's `credentials` field declaration, so NextAuth accepts them as form fields on the `signIn` call [VERIFIED: `@auth/core/providers/credentials.d.ts` L13-15].
- Return `null` (do not throw) — matches existing Phase 26 pattern and yields the generic `'Credenciales invalidas'` response through the existing `loginAction` catch block.
- The challenge check binds the second factor to the specific email/userId AND the 5-minute window — replay-safe.

### Pattern 7: Split `loginAction` + new `verifyTotpAction`

```typescript
// src/actions/auth.ts (replaces current loginAction)
'use server'

import { AuthError } from 'next-auth'
import { signIn } from '@/auth'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'
import { loginPasswordSchema, verifyTotpSchema } from '@/lib/validators'
import { signChallenge, verifyChallenge } from '@/lib/challenge'
import { checkRateLimit, loginLimiter, totpLimiter, getClientIp } from '@/lib/rate-limit'

type LoginResult =
  | { error?: string }
  | { requiresTotp: true; challenge: string; callbackUrl: string }

export async function loginAction(
  _prev: LoginResult | undefined,
  formData: FormData,
): Promise<LoginResult> {
  const parsed = loginPasswordSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) return { error: 'Credenciales invalidas' }

  const ip = await getClientIp()
  const rl = await checkRateLimit(loginLimiter, `${parsed.data.email}:${ip}`)
  if (!rl.success) return { error: 'Credenciales invalidas' } // same generic — no oracle per D-25

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, email: true, hashedPassword: true, isApproved: true, totpEnabled: true },
  })
  if (!user?.hashedPassword || !user.isApproved) return { error: 'Credenciales invalidas' }
  if (!(await bcrypt.compare(parsed.data.password, user.hashedPassword))) {
    return { error: 'Credenciales invalidas' }
  }

  const callbackUrl = (formData.get('callbackUrl') as string) || '/'

  // 1FA user — existing flow
  if (!user.totpEnabled) {
    try {
      await signIn('credentials', { email: parsed.data.email, password: parsed.data.password, redirectTo: callbackUrl })
      return {}
    } catch (error) {
      if (error instanceof AuthError) return { error: 'Credenciales invalidas' }
      throw error // NEXT_REDIRECT — re-throw!
    }
  }

  // 2FA user — return challenge
  return {
    requiresTotp: true,
    challenge: signChallenge(user.id, user.email),
    callbackUrl,
  }
}

type VerifyResult = { error?: string } | undefined

export async function verifyTotpAction(
  _prev: VerifyResult,
  formData: FormData,
): Promise<VerifyResult> {
  const parsed = verifyTotpSchema.safeParse({
    challenge: formData.get('challenge'),
    code: formData.get('code'),
  })
  if (!parsed.success) return { error: 'Codigo invalido' }

  const payload = verifyChallenge(parsed.data.challenge)
  if (!payload) return { error: 'Codigo invalido' } // ambiguous — covers expired/tampered

  const ip = await getClientIp()
  const rl = await checkRateLimit(totpLimiter, `${payload.userId}:${ip}`)
  if (!rl.success) return { error: 'Codigo invalido' }

  const callbackUrl = (formData.get('callbackUrl') as string) || '/'

  try {
    // Pass the original password? We no longer have it. Instead, authorizeUser is extended to
    // treat { email + challenge + totpCode } as a valid second step without re-requiring password.
    // BUT: NextAuth Credentials `authorize` still requires *something* in the password slot or it
    // returns null. Passing `password` forces us to store it — which we don't.
    // Solution: authorize accepts EITHER { email, password } OR { email, challenge, totpCode }.
    // Detection: if challenge is present and verifies, password is NOT re-verified.
    // See Open Question #2 for the subtle discussion and the final implementation choice.
    await signIn('credentials', {
      email: payload.email,
      challenge: parsed.data.challenge,
      totpCode: parsed.data.code,
      password: '', // placeholder — authorize branches on presence of challenge/totpCode
      redirectTo: callbackUrl,
    })
    return undefined
  } catch (error) {
    if (error instanceof AuthError) return { error: 'Codigo invalido' }
    throw error // NEXT_REDIRECT
  }
}
```

### Pattern 8: Atomic single-use backup-code consumption

```typescript
// src/lib/backup-codes.ts
import { randomBytes } from 'node:crypto'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'

/** Returns 10 plain-text codes (8 hex chars, displayed as XXXX-XXXX). */
export function generateBackupCodes(n = 10): string[] {
  return Array.from({ length: n }, () => randomBytes(4).toString('hex'))
}

/** Formats a raw 8-hex code for user display: ab12cd34 → AB12-CD34. */
export function formatForDisplay(raw: string): string {
  const u = raw.toUpperCase()
  return `${u.slice(0, 4)}-${u.slice(4, 8)}`
}

/** Verify + consume a single backup code atomically. Returns true on success, false otherwise. */
export async function consumeBackupCode(userId: string, normalizedCode: string): Promise<boolean> {
  // normalizedCode has already been lowercased and dashes stripped by the caller
  const candidates = await prisma.backupCode.findMany({
    where: { userId, usedAt: null },
    select: { id: true, codeHash: true },
  })

  for (const c of candidates) {
    if (await bcrypt.compare(normalizedCode, c.codeHash)) {
      // Atomic claim: only succeeds if usedAt is still null
      const { count } = await prisma.backupCode.updateMany({
        where: { id: c.id, usedAt: null },
        data: { usedAt: new Date() },
      })
      return count === 1
    }
  }
  return false
}
```

Why `updateMany`: Prisma's `update` would throw on empty WHERE result (record-not-found). `updateMany` returns `{ count }` — 0 means a concurrent request already consumed it. Postgres under READ COMMITTED (Prisma default) re-evaluates the WHERE clause under the row lock acquired by the UPDATE statement, so two concurrent `updateMany({ where: { id, usedAt: null } })` calls for the same row produce exactly one `count === 1` and one `count === 0`. [HIGH confidence — documented behavior in PostgreSQL docs §13.2.1 "Read Committed Isolation Level"]

### Pattern 9: Atomic 3-write setup transaction (enableTotpAction)

```typescript
// src/app/(app)/configuracion/totp-actions.ts
'use server'

import { requireAuth } from '@/lib/auth-utils'
import { enableTotpSchema } from '@/lib/validators'
import { encryptSecret } from '@/lib/totp-crypto'
import { verifyTotpCode } from '@/lib/totp'
import { generateBackupCodes, formatForDisplay } from '@/lib/backup-codes'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'

type EnableResult =
  | { success: true; backupCodes: string[] } // displayed once in Step 3
  | { error: Record<string, string[]> }

export async function enableTotpAction(formData: FormData): Promise<EnableResult> {
  const { userId } = await requireAuth() // CVE-2025-29927 defense-in-depth

  const parsed = enableTotpSchema.safeParse({
    secret: formData.get('secret'),   // from Step 1 prepareTotpSecretAction (held in client memory)
    code: formData.get('code'),
  })
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  if (!(await verifyTotpCode(parsed.data.secret, parsed.data.code))) {
    return { error: { code: ['Codigo invalido'] } }
  }

  // Hash BEFORE opening the transaction — bcrypt cost 12 is slow (~300ms × 10 = ~3s)
  // Phase 28 P03 learned this: do not hold a DB connection during bcrypt
  const codes = generateBackupCodes(10)
  const hashes = await Promise.all(codes.map((c) => bcrypt.hash(c, 12)))

  const encryptedSecret = encryptSecret(parsed.data.secret)

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { totpSecret: encryptedSecret, totpEnabled: true },
    }),
    prisma.backupCode.deleteMany({ where: { userId } }), // defensive: clear any stale (shouldn't exist)
    prisma.backupCode.createMany({
      data: hashes.map((codeHash) => ({ userId, codeHash })),
    }),
  ])

  // Return PLAIN codes ONCE — step 3 displays + downloads
  return { success: true, backupCodes: codes.map(formatForDisplay) }
}
```

Source: composes Phase 28 P03 hash-before-transaction rule + Pattern 1 crypto + Pattern 2 totp.

### Anti-Patterns to Avoid

- **Returning the decrypted TOTP secret from any Server Action** — never crosses a module boundary except `totp-crypto.ts` internals. `prepareTotpSecretAction` is the one exception — it returns the *freshly generated* plaintext secret (not yet persisted) to the client so step 2 can submit it back with the first verification code. Treat it like a password: never log, never put it in URLs, hidden form field only.
- **Storing plaintext backup codes after display** — Step 3 of setup is the ONE moment plaintext codes exist in response payload. Never re-fetch, never store server-side except hashed.
- **Passing the user's password through to step 2** — it's gone after step 1. `authorizeUser` MUST branch on `{ challenge, totpCode }` presence rather than re-requiring the password.
- **Wrapping `signIn()` in a try/catch that swallows NEXT_REDIRECT** — same trap as Phase 26/28. Only catch `AuthError`; re-throw everything else. [VERIFIED: existing pattern at `src/actions/auth.ts` L30-36]
- **Calling bcrypt inside `$transaction`** — Phase 28 P03 learned this: cost-12 bcrypt is ~300ms × 10 codes = ~3s of DB connection pinned. Hash BEFORE opening the transaction.
- **`export const runtime = 'edge'` on any route that imports from `totp-crypto.ts`** — `node:crypto` isn't available in Edge runtime. Codebase currently uses zero `runtime = 'edge'` [VERIFIED: `grep -rn "runtime" src/` returns nothing].
- **Using `otplib.authenticator.verify` (v12 API)** — `authenticator` was removed in v13. Use named `verify({ secret, token, epochTolerance })` instead. Result is `{ valid, delta? }` — not boolean.
- **Boolean-coercing `otplib.verify` result** — `if (await verify(...))` treats the returned object as truthy always. Always destructure `{ valid }` or call `.valid`.
- **Calling `timingSafeEqual` on buffers of different lengths** — throws synchronously. Pre-check `a.length === b.length`.
- **Mutating the challenge format between client and server** — serialize/deserialize must be identical; base64url (no padding) works cleanly in form fields.
- **Returning Prisma `User` with `totpSecret` to the client** — the configuracion page must select only `{ totpEnabled }`, never `totpSecret`. [VERIFIED: the only ref is `src/auth.ts` L19-26 which select totpSecret — that's OK because it stays in Server Action scope]
- **Rate-limiting on the Zod-validation error path** — burn a rate-limit slot only once per *login attempt*, not per malformed field. Validate first, then check rate limit, then credentials.
- **Leaking which factor failed** — `verifyTotpAction` must return the exact same generic error (`'Codigo invalido'`) for: expired challenge, mismatched challenge, wrong TOTP code, consumed backup code, rate-limited, and Zod parse failure. Five different internal states, one user-visible message.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| RFC 6238 TOTP verify (HMAC-SHA1, time-step arithmetic) | Hand-coded HMAC loop | `otplib.verify({ secret, token, epochTolerance })` | otplib internally uses `@noble/hashes` (audited). Rolling this invites bugs in the time-window math. |
| Base32 secret generation | Custom RNG + base32 encode | `otplib.generateSecret()` | Base32 alphabet edge cases; padding rules; authenticator-app compatibility |
| otpauth:// URI construction | String template | `otplib.generateURI(...)` | URI spec has issuer/label encoding rules (colons, URI-encoding); library handles these |
| AES-GCM encryption | Subtle-crypto imports / custom key wrap | `node:crypto.createCipheriv('aes-256-gcm', ...)` | Node built-in. Full tamper-detection for free via authTag. |
| HMAC signature comparison | `a === b` | `crypto.timingSafeEqual(a, b)` | Prevents timing oracles. Note: requires equal-length buffers — pre-check. |
| Cryptographic token generation | `Math.random()` / `Date.now()` encoding | `crypto.randomBytes(n)` | CSPRNG; same standard applied in Phase 28 for invite tokens |
| Redis rate limiter / sliding window | Custom counters | `@upstash/ratelimit` | Distributed, serverless-safe, sliding-window algorithm verified |
| QR code PNG | Hand-rolled SVG/PNG encoder | `qrcode.toDataURL(uri)` | Error-correction level + version sizing is non-trivial; library is de facto Node standard |
| Password hashing | Custom scrypt/argon wrapper | `bcryptjs.hash(code, 12)` | Phase 25 locked cost factor 12; changing cost destabilizes existing admin password |
| Single-use resource claim under concurrency | `SELECT THEN UPDATE` with manual lock | `prisma.backupCode.updateMany({ where: { id, usedAt: null } })` returning `{ count }` | Postgres READ COMMITTED + row-level WHERE re-eval under lock gives exactly-once semantics |
| Form state machine | useReducer + effect juggling | `useActionState` from React 19 | Project-standard (LoginForm, RegisterForm, CategoryForm). Two-step login = two actions wired to the same form shell. |
| Bottom-sheet / modal container | Custom dialog scaffolding | `@/components/ui/Modal` | Existing primitive with mobile sheet + desktop modal, `Escape` handling, backdrop click, drag handle. Used by `TransactionForm`, `CategoryForm`, `DebtForm`, `IncomeSourceForm`, `CloseConfirmationModal` [VERIFIED] |
| IP extraction | Custom X-Forwarded-For parser | `headers()` → `h.get('x-forwarded-for').split(',')[0].trim()` | Trivial but universally done wrong; documented fallback to `x-real-ip` and `127.0.0.1` |

**Key insight:** Every cryptographic primitive is either in `node:crypto` or in `otplib` (which itself uses `@noble/hashes`). No custom crypto anywhere in this phase. UI primitives all exist. Four small "glue" modules in `src/lib/` + four Server Actions + five new components = complete feature.

## Runtime State Inventory

This phase is additive (new feature + schema additions), not a rename or migration. The inventory still matters because one new env var is required at boot and one schema change ships.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `User` table already has `totpSecret` (nullable) and `totpEnabled` (default false) from Phase 25. New rows in `BackupCode` table created on setup. | New migration `add_backup_code_model` adds BackupCode. Existing users start with `totpEnabled=false` (default) — zero data migration needed for them. |
| Live service config | **Upstash Redis instance** — not yet provisioned (per D-24 deferred to Phase 30). Local/test env will bypass. Dev env will run with Upstash too once configured. | Document `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` in `.env.example`. Add `RATE_LIMIT_DISABLED=true` to `.env.test`. Phase 30 provisions the instance. |
| OS-registered state | None. No Docker service names, pm2, systemd, Task Scheduler, launchd referenced. | None. |
| Secrets and env vars | `AUTH_TOTP_ENCRYPTION_KEY` — already listed in `.env.example` but the format constraint (64-char hex) needs documenting inline. `AUTH_SECRET` — already present, used for challenge HMAC. New: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, optional `RATE_LIMIT_DISABLED`. | Update `.env.example` with documentation comments for all three new keys + the format requirement for `AUTH_TOTP_ENCRYPTION_KEY`. Dev/test `.env.test` sets `RATE_LIMIT_DISABLED=true`. |
| Build artifacts / installed packages | `generated/prisma/client` — regenerates after BackupCode migration via `prisma generate` (already in `postinstall`). No stale artifacts with old names. | None beyond normal migration workflow. |

**Key fact confirmed:** `User.totpSecret` (nullable string) and `User.totpEnabled` (Boolean @default(false)) ALREADY EXIST in `prisma/schema.prisma` L64-65 [VERIFIED]. This phase does NOT add or rename them. The migration scope (D-28) is correctly limited to `BackupCode`.

## Common Pitfalls

### Pitfall 1: NEXT_REDIRECT swallowed inside `verifyTotpAction` (Phase 26/28 re-learned)
**What goes wrong:** `signIn('credentials', ...)` throws a NEXT_REDIRECT error on success. If `verifyTotpAction` wraps `signIn` in `try { ... } catch (e) { return { error } }`, the redirect is eaten and the user stays on `/login` despite a valid code.
**Why it happens:** Next.js uses thrown errors as the redirect mechanism in Server Actions.
**How to avoid:** Catch `AuthError` only, re-throw everything else. Mirror the exact pattern from `src/actions/auth.ts:30-36`. Add the same test that exists for `loginAction` (`'re-throws non-AuthError exceptions'`) to `verifyTotpAction`.
**Warning signs:** Playwright test where valid TOTP submits, spinner spins, no redirect, form stays mounted — that's a swallowed redirect.
**Evidence:** `/Users/freptar0/Desktop/Projects/centik/src/actions/auth.ts:30-36` already documents this pattern inline.

### Pitfall 2: Edge runtime incompatibility with `node:crypto`
**What goes wrong:** A future developer adds `export const runtime = 'edge'` to a page or route that eventually imports `totp-crypto.ts`. `createCipheriv` isn't available in Edge. Cryptic error at runtime.
**Why it happens:** Edge runtime uses Web Crypto only.
**How to avoid:** (a) Don't add `runtime = 'edge'` anywhere that imports `@/lib/totp-crypto`, `@/lib/totp`, or `@/lib/challenge`. (b) Add a plan-level verification step: `grep -rn "runtime = 'edge'" src/` must return zero matches. [VERIFIED current state: zero matches.]
**Warning signs:** Build error `Module not found: Can't resolve 'node:crypto'` or runtime error `createCipheriv is not a function`.

### Pitfall 3: `AUTH_TOTP_ENCRYPTION_KEY` wrong length / format silently "works"
**What goes wrong:** Developer sets `AUTH_TOTP_ENCRYPTION_KEY=changeme` (a 9-character non-hex string). `Buffer.from('changeme', 'hex')` returns a 4-byte buffer (partial parse). `createCipheriv('aes-256-gcm', 4-byte-buffer, iv)` throws `Invalid key length`. OR worse, if someone lengthens the key to an acceptable size without making it hex, `Buffer.from` silently parses only the valid hex prefix.
**Why it happens:** Node's hex parser is permissive until the key fails length check.
**How to avoid:** Validate format AND length at module import — `loadKey()` pattern in Pattern 1. Fail-fast with a clear error message that tells the user how to generate a valid key (`openssl rand -hex 32`). `.env.example` also documents the requirement inline.
**Warning signs:** App boot fails with explicit "AUTH_TOTP_ENCRYPTION_KEY must be 64 hex characters" — that IS the success case here (fail loudly).

### Pitfall 4: `timingSafeEqual` throws on unequal buffer lengths
**What goes wrong:** Attacker (or test) sends a malformed challenge with a truncated signature. `timingSafeEqual(a, b)` where `a.length !== b.length` throws synchronously (not returns false). Uncaught, this crashes `verifyTotpAction`.
**Why it happens:** `timingSafeEqual` is only timing-safe when the inputs have the same length; Node enforces this at the API.
**How to avoid:** Pre-check `a.length === b.length` and return `null`/`false` immediately if not. Pattern 4 does this correctly.
**Warning signs:** 500 errors in production on the `verifyTotpAction` endpoint correlated with unusual form payloads.

### Pitfall 5: otplib v12→v13 API mismatch (training-data hazard)
**What goes wrong:** Developer (or tutorial) uses `authenticator.generate()` / `authenticator.verify()` (v12) — fails at import with "authenticator is not exported from otplib".
**Why it happens:** otplib v13 REMOVED `authenticator` and made all functions flat named exports. Most online tutorials still reference v12.
**How to avoid:** Use exact imports `import { generateSecret, generate, verify, generateURI } from 'otplib'`. Never `import { authenticator }`. Also: `verify` returns `{ valid, delta? }` — destructure `valid`, don't boolean-coerce the whole result.
**Warning signs:** `TypeError: authenticator is undefined` or `if (result)` always truthy when the code is wrong.
**Evidence:** otplib v13.4.0 README [VERIFIED: `npm view otplib@13.4.0 readme` returned the migration notice in ALL CAPS "v13 is a complete rewrite with breaking changes"].

### Pitfall 6: @upstash/ratelimit peer-dependency false alarm
**What goes wrong:** Developer reads `peerDependencies: { "@upstash/redis": "^1.34.3" }` and assumes it pins to 1.34.x. Installs `@upstash/redis@1.34.3` instead of current 1.37.0, missing fixes.
**Why it happens:** Misreading caret semantics — `^1.34.3` matches any `1.x.x >= 1.34.3`, up to but not including `2.0.0`.
**How to avoid:** Install `@upstash/redis` at `1.37.0` (current). npm's peer-dep check will pass. Document the version pinning in the Standard Stack table so the planner doesn't regress.

### Pitfall 7: IDOR on `disableTotpAction` / `regenerateBackupCodesAction`
**What goes wrong:** Developer writes `disableTotpAction(userId, code)` taking `userId` as a parameter. Malicious request supplies another user's ID. Catastrophic — turns off someone else's 2FA.
**Why it happens:** Forgetting that `userId` must come from the authenticated session, not from form data.
**How to avoid:** Every TOTP Server Action starts with `const { userId } = await requireAuth()`. Use that userId exclusively; NEVER accept `userId` from formData. Zod schema for these actions must not include `userId`. This mirrors Phase 28 `requireAdmin()` pattern exactly.
**Evidence:** The Phase 28 invite-actions.ts is the exact pattern to replicate: `src/app/(app)/configuracion/invite-actions.ts:22-30`.

### Pitfall 8: Cross-user backup-code acceptance
**What goes wrong:** User A's backup code, submitted by User B (during 2FA step 2 after supplying User B's email+password), is accepted because the consume loop isn't scoped by userId.
**Why it happens:** `consumeBackupCode(userId, code)` must filter `BackupCode.findMany` by `userId` — easy to forget if the signature is wrong.
**How to avoid:** Pattern 8 takes `userId` as required first param. The challenge-verified `payload.userId` flows into `authorizeUser` and then into `consumeBackupCode`. Cross-user integration test asserts User B cannot use User A's code.
**Evidence:** Extends `tests/integration/isolation.test.ts` pattern verbatim.

### Pitfall 9: Race on enable-2FA transaction if bcrypt runs inside
**What goes wrong:** Opening `$transaction` → hashing 10 codes at cost 12 inside → updating user → inserting BackupCodes → commit. Pins a DB connection for ~3 seconds. Under concurrency, connection pool exhausts rapidly.
**Why it happens:** bcrypt cost-12 is intentionally slow; DB transaction should be fast.
**How to avoid:** Generate codes + compute hashes BEFORE `$transaction([...])`. Inside the transaction, only DB work. Phase 28 P03 made this explicit. Pattern 9 above demonstrates.
**Evidence:** `src/actions/auth.ts:68-69` has the exact inline comment: "Hash BEFORE the transaction (bcrypt is slow; do not hold a DB transaction open during it)".

### Pitfall 10: JWT issued with stale `totpEnabled` after disable
**What goes wrong:** User has 2FA enabled → JWT issued → user disables 2FA → next login would... wait, actually `totpEnabled` is NOT stored in the JWT per the current design (not carried in `sessionCallback`). Login re-reads from DB. So this is NOT a pitfall — just worth confirming.
**Status:** Verified non-issue. `totpEnabled` is read from DB inside `loginAction` and `authorizeUser` each time. No JWT coupling. If this changes later (e.g., if a dev adds `token.totpEnabled = user.totpEnabled` to `jwtCallback`), the pitfall reappears — document as a forbidden change.
**Evidence:** `src/auth.ts:39-58` — sessionCallback only writes `id` and `isAdmin`, not `totpEnabled`.

### Pitfall 11: Returning plain backup codes via a GET route / in server logs
**What goes wrong:** Developer adds `console.log({ codes })` for debugging. Or exposes a `GET /api/backup-codes` endpoint for "regenerate". The 10 plain codes leak.
**Why it happens:** Convenience during development or misunderstanding of the one-time-display invariant.
**How to avoid:** Plain codes are returned from `enableTotpAction` and `regenerateBackupCodesAction` ONCE, in the response shape `{ success: true, backupCodes: string[] }`. They are never fetched via any GET. Step 3 of the wizard is the only consumer. After the checkbox → "Listo" → modal close, the client state holding the codes is discarded. No logging anywhere. No error-reporter breadcrumbs with the array in them.
**Warning signs:** Codes appearing in Vercel function logs or error-tracking.

### Pitfall 12: Sonner toast called from a Server Component
**What goes wrong:** Developer adds `toast.success('2FA activado')` inside the page.tsx (Server Component). `sonner` is a client-only library. Build fails or runtime exception.
**Why it happens:** Confusion over where the toast call lives.
**How to avoid:** Toast calls only inside client components (`'use client'`), typically in the `useActionState` result effect or after `await enableTotpAction` resolves. `Toaster` is mounted at root layout already [VERIFIED: `src/app/layout.tsx:47`]. Pattern: client wizard component observes Server Action result via `useActionState` and calls `toast.success` inside an effect keyed on result.

## Code Examples

### Zod schemas for `src/lib/validators.ts`

```typescript
// --- Phase 29 TOTP schemas (D-30, D-31) ---

/** Replaces the inline parse in loginAction — email + password only. */
export const loginPasswordSchema = z.object({
  email: z
    .string({ error: 'El correo es requerido' })
    .email({ error: 'Correo electronico no valido' })
    .trim(),
  password: z
    .string({ error: 'La contrasena es requerida' })
    .min(1, { error: 'La contrasena es requerida' }),
})

/** verifyTotpAction input — challenge + code (6-digit OR backup XXXX-XXXX). */
export const verifyTotpSchema = z.object({
  challenge: z.string({ error: 'Sesion expirada' }).min(10),
  code: z
    .string({ error: 'Ingresa un codigo' })
    .trim()
    .min(6, { error: 'Codigo invalido' })
    .max(9, { error: 'Codigo invalido' }), // "XXXX-XXXX" = 9 chars with dash
})

/** enableTotpAction input — secret (from step 1) + 6-digit code from authenticator app. */
export const enableTotpSchema = z.object({
  secret: z.string({ error: 'Reinicia el asistente' }).min(16),
  code: z
    .string({ error: 'Ingresa un codigo de 6 digitos' })
    .regex(/^\d{6}$/, { error: 'Ingresa un codigo de 6 digitos' }),
})

/** disableTotpAction + regenerateBackupCodesAction input — one code (TOTP or backup). */
export const disableTotpSchema = z.object({
  code: z
    .string({ error: 'Ingresa un codigo' })
    .trim()
    .min(6, { error: 'Codigo invalido' })
    .max(9, { error: 'Codigo invalido' }),
})
```

### Prisma schema addition (D-09, D-28)

```prisma
/// 2FA backup codes — 10 single-use hex codes per user
model BackupCode {
  id        String    @id @default(cuid())
  userId    String
  codeHash  String
  usedAt    DateTime?
  createdAt DateTime  @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}

// and inside `model User { ... }`:
//   backupCodes      BackupCode[]
```

### `.env.example` additions

```bash
# TOTP 2FA (Phase 29)
# MUST be a 64-character hex string (32 bytes). Generate with: openssl rand -hex 32
AUTH_TOTP_ENCRYPTION_KEY=your-64-hex-character-totp-encryption-key-here

# Upstash Redis — rate limiter (Phase 29 / provisioned in Phase 30)
# In development/test, set RATE_LIMIT_DISABLED=true to bypass.
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
RATE_LIMIT_DISABLED=true
```

### Testing otplib with deterministic time

```typescript
// tests/*/totp.test.ts — mock time for stable verification
import { vi } from 'vitest'

vi.useFakeTimers()
vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))

// Now otplib.generate and otplib.verify compute against a fixed clock.
// Calling vi.advanceTimersByTime(31_000) pushes to next step — code should become invalid.
```

### Mocking @upstash/ratelimit in unit tests (D-35)

```typescript
import { vi } from 'vitest'

vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: Object.assign(
    vi.fn().mockImplementation(() => ({
      limit: vi.fn().mockResolvedValue({
        success: true,
        limit: 5,
        remaining: 4,
        reset: Date.now() + 60_000,
        pending: Promise.resolve(),
      }),
    })),
    {
      slidingWindow: vi.fn(),
      fixedWindow: vi.fn(),
    },
  ),
}))

vi.mock('@upstash/redis', () => ({
  Redis: { fromEnv: vi.fn(() => ({})) },
}))
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `otplib.authenticator.verify(...)` (v12) | `import { verify } from 'otplib'; await verify({ secret, token, epochTolerance })` (v13) | otplib v13 (early 2026) | Training data mostly references v12 — verify before coding |
| `crypto.createCipher` (deprecated) | `crypto.createCipheriv` with explicit IV | Node 10+ (long deprecated, removed in Node 22) | Use the IV form exclusively |
| Hand-rolled fixed-window counters in Redis | `@upstash/ratelimit` sliding window | Upstash ratelimit v2 | Upstash is the serverless-Redis default for Next on Vercel |
| Database sessions for 2FA (storing pending-2FA state) | Short-lived HMAC challenge token in hidden form field | This phase | Avoids a DB round-trip for "is there a pending challenge for this user?"; 5-min TTL eliminates stale-state concerns |
| SMS / email OTP | TOTP with authenticator app | Already industry norm; SMS declining due to SIM-swap attacks | Authenticator apps are the "secure enough + usable" default for a small single-admin app |
| Passwordless / WebAuthn / passkey | TOTP 2FA after password | Deferred in CONTEXT | Passkeys are the future but require a UX investment larger than this phase |

**Deprecated / outdated:**
- `otplib.authenticator` — removed in otplib v13. Zero references acceptable.
- `crypto.createCipher` / `createDecipher` — do not use. IV-less APIs.
- `@upstash/ratelimit@0.x` tutorials — `ephemeralCache` and older constructor shape differ from v2.
- JWT-library-based challenge tokens — unnecessary here; plain HMAC is simpler.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `otplib@13.4.0` is stable and API is final (no `@beta` tag). | Standard Stack | LOW — Phase 30 will re-verify before production deploy. `13.4.0` published 2026-03-19, no `@beta` tag on npm dist-tags. [VERIFIED] |
| A2 | `@upstash/redis@1.37.0` works with `@upstash/ratelimit@2.0.8` despite peer-dep range being `^1.34.3`. | Standard Stack / Pitfall 6 | LOW — caret range on 1.34.x matches 1.37.x. If npm install warns, drop to `^1.34.3` (= 1.34.5 is the 1.34.x patch). |
| A3 | Adding optional `totpCode` + `challenge` keys to the Credentials `credentials: {}` field works with NextAuth v5 beta.31 without special configuration beyond declaring them as inputs. | Pattern 6 | LOW — `@auth/core/providers/credentials.d.ts` declares `credentials` as `Partial<Record<keyof CredentialsInputs, unknown>>` with no constraint on which keys exist. Passing extra keys into `signIn('credentials', {...})` is documented. [VERIFIED] |
| A4 | Passing `password: ''` as a placeholder to `signIn` in step 2 will be accepted by `authorizeUser` because the extended authorize branches on `(challenge && totpCode)` presence before checking password. | Pattern 7 + Open Q2 | MEDIUM — if NextAuth internal validation rejects empty strings before reaching `authorize`, a different approach is needed (see Open Question 2 for alternatives). |
| A5 | Sonner's `Toaster` mounted at root layout handles toasts called from components rendered inside either `(app)/` or `(auth)/` route groups. | Pitfall 12 | LOW — `Toaster` is at the true root (`src/app/layout.tsx`), which wraps both groups. |
| A6 | The bottom-sheet `Modal` primitive used by `TransactionForm` can host a 3-step wizard by conditionally rendering step content inside its children — no need for a new Wizard primitive. | Architecture | LOW — `Modal` is layout-only; step state lives in the wizard client component. |
| A7 | Setting `RATE_LIMIT_DISABLED=true` in `.env.test` is sufficient to make the full integration test suite bypass Upstash without mocking. | Test Strategy | LOW — the bypass is the first check in `checkRateLimit`; test DB already loads `.env.test`. |
| A8 | Postgres READ COMMITTED (Prisma default) + `updateMany({ where: { id, usedAt: null } })` gives exactly-once backup-code consumption even under concurrent calls. | Pattern 8 | LOW — documented Postgres behavior: UPDATE acquires a row lock and re-evaluates WHERE under that lock. An integration test with `Promise.all([consume, consume])` for the same code should verify exactly one returns true. |

## Open Questions

### 1. Where to compute + pass the QR data URL to the wizard

**What we know:** D-02 locks server-side rendering. The data URL is ~2-3KB for a short OTPAUTH URI. Step 1 of the wizard needs it; step 2 doesn't.
**What's unclear:** Whether `prepareTotpSecretAction` should return both `{ secret, qrDataUrl }` as a Server Action result (client holds them in state) OR whether the page Server Component should preload them on first render.
**Recommendation:** Server Action returning both. The user doesn't always want to enable 2FA; preloading would be wasteful and expose the secret in SSR HTML. Server Action triggered when the user clicks "Activar 2FA" → return values flow into wizard state via `useActionState`. `secret` stays in client state only until step 2 submits it back. This matches `prepareTotpSecretAction` in CONTEXT `code_context` L195.

### 2. How to call `signIn` in step 2 without re-requiring the password

**What we know:** D-15 locks "calls `signIn('credentials', ...)` so the session is finally issued." The user typed their password in step 1; the client has discarded it by step 2.
**What's unclear:** NextAuth's `signIn('credentials', { ... })` posts form data to `/api/auth/callback/credentials` which runs `authorize(credentials, request)`. If `authorize` receives `{ email, challenge, totpCode, password: '' }`, does `authorize` get a chance to process this OR does NextAuth prevalidate and reject empty passwords before calling `authorize`?
**What the docs say:** `CredentialsConfig.authorize` receives `Partial<Record<keyof CredentialsInputs, unknown>>` — NextAuth does NOT validate individual field presence or value. [VERIFIED: `@auth/core/providers/credentials.d.ts` L55-65]. The authorize function is fully responsible.
**Recommendation:** The extended `authorize` branches on `(challenge && totpCode)` presence FIRST: if both present and challenge verifies, skip the bcrypt.compare on password and use only the 2FA factor. If absent, fall through to password path. Passing `password: ''` keeps the signature uniform; the 2FA branch never reads it. An integration test should exercise exactly this: `signIn('credentials', { email, challenge, totpCode: '123456', password: '' })` with a valid challenge must succeed if code is valid.
**Risk:** LOW — matches documented authorize contract. Integration test is the canary.

### 3. Should `User.totpEnabled` be denormalized into the JWT?

**What we know:** Currently JWT contains only `userId` + `isAdmin`. Login flow reads `totpEnabled` from DB inside `loginAction` and `authorizeUser`.
**What's unclear:** Whether storing `totpEnabled` in the JWT would avoid one DB lookup per login.
**Recommendation:** DON'T. Stale JWTs are worse than the extra DB read. If a user disables 2FA, their JWT would still read `totpEnabled: true` until it refreshes, and their login flow would (incorrectly) still demand the second factor. Keep the DB read. Performance cost is ~1ms; correctness matters more.

### 4. Should the `code` input in step 2 of login be a segmented 6-digit component?

**What we know:** D-23 says "FloatingInput for the code." D-18 says the same input accepts TOTP (6 digits) or backup (XXXX-XXXX, 8 hex). Claude's Discretion allows extracting a `<TotpCodeInput />` primitive.
**Recommendation:** Start with FloatingInput + a small "Usar código de respaldo" toggle that swaps label + placeholder. Segmented inputs are fiddly with paste, IME, mobile keyboards. The plain input already auto-formats nothing (user types 6 digits). If real-user feedback suggests otherwise post-launch, extract a primitive. Avoid pre-optimizing.

### 5. Transaction scope around `prepareTotpSecretAction`

**What we know:** Step 1 of setup generates a secret but does NOT persist it. Persistence happens in step 2 (`enableTotpAction`).
**What's unclear:** Whether step 1 should pre-reserve anything in the DB (lock a row, set `totpEnabled = 'pending'`, etc.).
**Recommendation:** No. Zero DB writes in `prepareTotpSecretAction`. The secret lives in client memory between step 1 and step 2. If the user abandons the wizard, nothing persists. If the user completes it, step 2 does the whole $transaction atomically. This matches the no-server-state-between-steps principle of two-step Server Actions.

### 6. Should the disable flow allow a 6-digit code only, or accept backup codes too?

**What we know:** D-21 says "requires a current TOTP code (or backup code)." Clear: either.
**What's unclear:** Whether using a backup code to disable should ALSO consume that backup code (since backup codes are single-use).
**Recommendation:** Yes — consume it. If the code is a backup code, it is marked used before the `totpSecret` is cleared. After disable, all `BackupCode` rows are deleted (per D-21), so the consumed row is deleted along with the rest. Net effect: the consume flag is moot but the code path stays uniform with login's `consumeBackupCode` — one consistent implementation.

### 7. Where does `getClientIp()` belong — `rate-limit.ts` or a separate `headers-utils.ts`?

**Recommendation:** Keep in `rate-limit.ts` for this phase. It's the only consumer. If future phases add IP-aware logic elsewhere (geo-block, audit log), refactor to `lib/request-context.ts`. Premature abstraction otherwise.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js 20+ (for `node:crypto` AES-GCM and `randomBytes`) | All crypto ops | ✓ | Node 20 (Next 16 requires it) | — |
| PostgreSQL 16 (dev via docker-compose.yml) | BackupCode migration + all Prisma writes | ✓ | 16-alpine per CLAUDE.md | — |
| Prisma CLI | `add_backup_code_model` migration | ✓ | `latest` in devDependencies | — |
| Upstash Redis instance (production) | Rate limiter real runtime | ✗ | — | Dev/test bypass via `RATE_LIMIT_DISABLED=true`. Provisioned in Phase 30. |
| Playwright | E2E `totp.spec.ts` (D-34) | ✓ | `latest` in devDependencies | — |
| Sonner `Toaster` in root layout | "2FA activado" toast (D-23) | ✓ | already mounted [VERIFIED: `src/app/layout.tsx:47`] | Inline confirmation if toast fails |
| HTTPS (production) | Clipboard API for "Copiar códigos" | runtime (deploy) | depends on Phase 30 | Localhost is secure context; prod HTTPS a Vercel default |
| `openssl` for generating `AUTH_TOTP_ENCRYPTION_KEY` in dev setup | First-time setup instruction | ✓ (macOS/Linux default) | — | Developer can use `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` if openssl unavailable |

**Missing dependencies with no fallback:** None (Upstash has bypass).

**Missing dependencies with fallback:** Upstash Redis (bypassed in dev/test; required in prod per Phase 30).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.x (`latest`) + jsdom/RTL for unit + Vitest integration config for DB + Playwright for E2E |
| Config file | `vitest.config.ts` (unit), `vitest.integration.config.mts` (integration), `playwright.config.ts` (e2e) |
| Quick run command | `npm run test:run -- <changed-file-area>` |
| Full suite command | `npm run quality` (build + lint + format:check + test:run) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| TOTP-01 | `prepareTotpSecretAction` returns `{ secret, qrDataUrl }`; QR is a valid `data:image/png;base64,...` URL | unit | `npm run test:run -- src/app/(app)/configuracion/totp-actions.test.ts -t "prepare"` | ❌ Wave 0 |
| TOTP-01 | `enableTotpAction` rejects wrong code, persists secret on correct code, creates 10 BackupCode rows all in one `$transaction` | integration | `npm run test:integration -- tests/integration/totp.test.ts -t "enable"` | ❌ Wave 0 |
| TOTP-02 | `encryptSecret` + `decryptSecret` round-trip preserves plaintext | unit | `npm run test:run -- src/lib/totp-crypto.test.ts` | ❌ Wave 0 |
| TOTP-02 | Tamper detection — mutating any byte of ciphertext or authTag causes `decryptSecret` to throw | unit | `npm run test:run -- src/lib/totp-crypto.test.ts -t "tamper"` | ❌ Wave 0 |
| TOTP-02 | IV is unique across 1000 encryptions of the same plaintext (collision check) | unit | same file, "IV uniqueness" | ❌ Wave 0 |
| TOTP-02 | Missing / short / non-hex `AUTH_TOTP_ENCRYPTION_KEY` throws at module import | unit | same file, "key validation" | ❌ Wave 0 |
| TOTP-02 | DB `User.totpSecret` string format matches `^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$` after enable | integration | `tests/integration/totp.test.ts -t "stored format"` | ❌ Wave 0 |
| TOTP-03 | `loginAction` with 2FA user returns `{ requiresTotp: true, challenge }` without issuing session | unit | `src/actions/auth.test.ts -t "requiresTotp"` | ❌ Wave 0 (file exists, test missing) |
| TOTP-03 | `loginAction` with 1FA user preserves existing behavior (signIn + NEXT_REDIRECT) | unit | `src/actions/auth.test.ts -t "loginAction 1FA"` | ❌ Wave 0 |
| TOTP-03 | `verifyTotpAction` rejects expired / tampered / mismatched challenge → generic `'Codigo invalido'` | unit | `src/actions/auth.test.ts -t "verifyTotp challenge"` | ❌ Wave 0 |
| TOTP-03 | `verifyTotpAction` rejects wrong code → generic `'Codigo invalido'` | unit | same file | ❌ Wave 0 |
| TOTP-03 | `verifyTotpAction` with valid code calls `signIn('credentials', { email, challenge, totpCode })` and NEXT_REDIRECTs | unit | same file | ❌ Wave 0 |
| TOTP-03 | Extended `authorizeUser` rejects 2FA user with no challenge | unit | `src/auth.test.ts -t "2FA no challenge"` | ❌ Wave 0 (file exists) |
| TOTP-03 | End-to-end: real user, real DB, real crypto, login → challenge → verify → session | integration | `tests/integration/totp.test.ts -t "full login"` | ❌ Wave 0 |
| TOTP-03 | E2E: user logs in with 2FA happy path | e2e | `e2e/totp.spec.ts` | ❌ Wave 0 |
| TOTP-04 | `generateBackupCodes(10)` returns 10 unique 8-hex strings | unit | `src/lib/backup-codes.test.ts` | ❌ Wave 0 |
| TOTP-04 | Code display formatting (`ab12cd34` → `AB12-CD34`) | unit | same file | ❌ Wave 0 |
| TOTP-04 | `consumeBackupCode` consumes on first call, returns false on second call (single-use) | integration | `tests/integration/totp.test.ts -t "backup single-use"` | ❌ Wave 0 |
| TOTP-04 | Concurrent `Promise.all([consume, consume])` on the same code: exactly one returns true | integration | same file, "concurrent consume" | ❌ Wave 0 |
| TOTP-04 | Cross-user: User B cannot consume User A's backup code (no cross-account leak) | integration | `tests/integration/totp.test.ts -t "isolation"` extends `isolation.test.ts` | ❌ Wave 0 |
| TOTP-05 | `checkRateLimit` returns success=true when `RATE_LIMIT_DISABLED=true` | unit | `src/lib/rate-limit.test.ts` | ❌ Wave 0 |
| TOTP-05 | `checkRateLimit` returns success=false on 6th call when mocked limiter reports exhausted | unit | same file | ❌ Wave 0 |
| TOTP-05 | `loginAction` returns generic error (not a "rate-limited" message) when limit hit — no oracle | unit | `src/actions/auth.test.ts -t "rate limit oracle"` | ❌ Wave 0 |
| TOTP-05 | `getClientIp` parses first hop of `x-forwarded-for`, falls back to `x-real-ip`, then `127.0.0.1` | unit | `src/lib/rate-limit.test.ts -t "getClientIp"` | ❌ Wave 0 |
| (Phase smoke) | Disable flow clears totpSecret, sets totpEnabled=false, deletes all BackupCode rows — one transaction | integration | `tests/integration/totp.test.ts -t "disable"` | ❌ Wave 0 |

### Observable Signals (Nyquist dimensions)

1. **Encryption round-trip:** encrypt(plaintext) → decrypt → plaintext (byte-for-byte).
2. **Tamper detection:** mutate 1 bit of iv / ciphertext / authTag → decrypt throws.
3. **Key-format failure:** missing / short / non-hex key → throws at import before serving traffic.
4. **TOTP time-window tolerance:** valid code at T+0, T+29 (window=1); invalid at T+60.
5. **Single-use backup-code enforcement:** consume same code twice → exactly 1 success.
6. **Concurrent-use backup code:** N parallel consumes on same code → exactly 1 success.
7. **Cross-user backup-code isolation:** User B cannot consume User A's code.
8. **Challenge-token expiry:** signed at T0 → verify at T+6m → null.
9. **Challenge-token tamper:** flip one byte of signature → null.
10. **Challenge-token userId binding:** token for User A, verifyTotpAction called as User B → reject.
11. **Rate-limit enforcement:** 6th attempt in 60s → `success=false`.
12. **Rate-limit bypass:** `RATE_LIMIT_DISABLED=true` → all attempts pass.
13. **Oracle-resistance:** wrong password, wrong code, rate-limited, expired challenge → ALL return the same string.
14. **NEXT_REDIRECT propagation:** both `loginAction` and `verifyTotpAction` re-throw NEXT_REDIRECT (test via checking that `AuthError` is caught but unknown `Error` is re-thrown).
15. **Transaction atomicity:** `enableTotpAction` rollback when any step fails → totpSecret unchanged, no BackupCode rows created.
16. **Disable atomicity:** `disableTotpAction` rollback → totpSecret preserved if delete fails.
17. **Regen atomicity:** `regenerateBackupCodesAction` → old codes deleted AND new codes inserted together, or neither.
18. **IDOR resistance:** `disableTotpAction` always uses `requireAuth().userId`, never any userId from form data.
19. **Edge-runtime safety:** `grep -rn "runtime = 'edge'" src/` returns 0 matches (CI/plan-check step).

### Sampling Rate
- **Per task commit:** `npm run test:run -- <changed-file-area>` (sub-5s feedback)
- **Per wave merge:** `npm run test:run && npm run test:integration`
- **Phase gate:** `npm run quality` green + E2E green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/lib/totp-crypto.test.ts` — crypto round-trip, tamper, IV uniqueness, key validation (TOTP-02)
- [ ] `src/lib/totp.test.ts` — generateSecret base32 format, buildOtpauthUri shape, verifyTotpCode window tolerance (TOTP-01)
- [ ] `src/lib/backup-codes.test.ts` — generation, formatting, consume single-use, cross-user (TOTP-04)
- [ ] `src/lib/challenge.test.ts` — sign+verify round-trip, expiry, tamper, length-mismatch safety (TOTP-03)
- [ ] `src/lib/rate-limit.test.ts` — bypass, limit exhaustion, getClientIp fallback chain (TOTP-05)
- [ ] `src/app/(app)/configuracion/totp-actions.test.ts` — enable/disable/regen action unit tests (TOTP-01, TOTP-04)
- [ ] `src/actions/auth.test.ts` extensions — loginAction 2FA branch, verifyTotpAction full behavior (TOTP-03)
- [ ] `src/auth.test.ts` extensions — authorizeUser 2FA branch (TOTP-03)
- [ ] `tests/integration/totp.test.ts` — full flows with real DB (D-33)
- [ ] `e2e/totp.spec.ts` — Playwright happy path (D-34)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | NextAuth Credentials + bcryptjs(12) for password + TOTP (otplib RFC 6238) for 2FA + HMAC-SHA256 challenge binding |
| V3 Session Management | yes | JWT 30d (Phase 26); challenge token 5-min TTL bridges step 1 → step 2 without cookie surface |
| V4 Access Control | yes | `requireAuth()` + `userId` from session ONLY in every TOTP Server Action; IDOR-safe |
| V5 Input Validation | yes | Zod on every action BEFORE touching DB; `enableTotpSchema`, `verifyTotpSchema`, `disableTotpSchema` |
| V6 Cryptography | yes | `node:crypto` AES-256-GCM + `@noble/hashes` (via otplib) + bcryptjs; no hand-rolled crypto; secrets never logged |
| V7 Error Handling + Logging | yes | Generic error strings; plaintext secrets + backup codes never logged; stack traces not returned to client |

### Known Threat Patterns for {NextAuth v5 Credentials + TOTP + Next.js 16 + Postgres + Upstash rate-limit}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| CVE-2025-29927 middleware bypass → direct RPC to Server Actions | Elevation of Privilege | `requireAuth()` at top of every TOTP Server Action (Phase 27 standard); `userId` from session only |
| Brute-force TOTP (10^6 space in a 30s window) | Spoofing | `@upstash/ratelimit` sliding-window 5/60s keyed by `userId + ip` on `verifyTotpAction`; effectively caps attempts per user even if the attacker rotates IPs inside the 60s |
| Brute-force password | Spoofing | Sliding-window 5/60s on `loginAction` keyed by `email + ip` (stacks with password bcrypt cost-12) |
| Backup-code brute-force | Spoofing | 32 bits × 10 codes = ~4 × 10^9 search space per user. Sliding-window rate-limit on TOTP verify caps at 300 attempts per 60 min per user — not exploitable in a realistic timeframe |
| Challenge-token replay | Spoofing / Tampering | 5-min exp embedded in signed payload; `timingSafeEqual` signature compare; userId+email bound in payload |
| Challenge-token forgery | Spoofing | HMAC-SHA256 with `AUTH_SECRET` (≥ 256 bits); verifier rejects any unsigned payload |
| Oracle: distinguishing "wrong code" from "rate-limited" | Information disclosure | All failures return exact same string `'Codigo invalido'` from `verifyTotpAction` |
| Oracle: distinguishing "password wrong" from "2FA wrong" | Information disclosure | `loginAction` only transitions to `requiresTotp: true` on correct password; an attacker who gets `requiresTotp: true` knows the password was right. **This is accepted — it's the point of two-step login. An attacker still needs the second factor. Compare to OAuth: first step reveals "valid email". Same trade-off.** |
| Oracle: distinguishing "expired challenge" from "tampered challenge" | Information disclosure | Both paths in `verifyChallenge` return null — caller returns same `'Codigo invalido'` |
| Oracle: timing attack on signature compare | Side channel | `crypto.timingSafeEqual` (constant-time buffer compare) |
| TOTP secret at rest compromise (DB dump) | Information disclosure | AES-256-GCM at rest with `AUTH_TOTP_ENCRYPTION_KEY` separate from DB; attacker needs both DB and env to reveal secrets |
| Key rotation for `AUTH_TOTP_ENCRYPTION_KEY` | — | OUT OF SCOPE for this phase. A future phase can add key-id prefix to stored format (`v2:iv:ct:tag`) and a migration script. Document in deferred. |
| Tamper with stored ciphertext | Tampering | AES-GCM authTag detects any mutation; `decryptSecret` throws — login fails closed |
| Single-use backup-code race | Race / TOCTOU | `updateMany where: { id, usedAt: null }` returning count; Postgres READ COMMITTED re-evals WHERE under row lock |
| Cross-user backup-code acceptance | Elevation of Privilege | `consumeBackupCode(userId, code)` scopes `findMany` by `userId` from challenge; integration test asserts |
| IDOR on disable / regen (Forge form with another userId) | Tampering | `userId` derived from `requireAuth()`, never from form data; Zod schemas do not include `userId` |
| XSS via email reflected in otpauth URI | Tampering | otplib URL-encodes the label; React auto-escapes when rendered; no `dangerouslySetInnerHTML` used |
| Secret leakage via error reporting | Information disclosure | No `console.log`, no Sentry breadcrumb, no toast copy contains secret or code. Only plaintext emissions: (a) prepareTotpSecretAction returns `{ secret, qrDataUrl }` to client, (b) enable/regen returns `backupCodes` to client. Both paths are over HTTPS within same origin |
| Password retention between step 1 and step 2 | Information disclosure | Client does NOT store the password between steps; step 2 uses challenge + code only. Server does NOT store it either. |
| Edge runtime exposure of node:crypto | Availability / Fail-loud | Grep check in plan-check: `runtime = 'edge'` must stay zero |
| CSRF on Server Actions | Tampering | Next.js 16 Server Actions include built-in origin-check CSRF protection [CITED: Next.js 16 security docs] |

## Sources

### Primary (HIGH confidence)
- `/Users/freptar0/Desktop/Projects/centik/src/auth.ts` — existing authorizeUser signature (confirms Partial<Record<...>> type shape)
- `/Users/freptar0/Desktop/Projects/centik/src/actions/auth.ts` — existing loginAction + registerAction patterns (NEXT_REDIRECT handling, hash-before-transaction)
- `/Users/freptar0/Desktop/Projects/centik/src/app/(app)/configuracion/invite-actions.ts` — Server Action pattern (requireAdmin, Zod, revalidatePath, IDOR-safe)
- `/Users/freptar0/Desktop/Projects/centik/prisma/schema.prisma` — User.totpSecret + totpEnabled ALREADY EXIST (no migration needed for them)
- `/Users/freptar0/Desktop/Projects/centik/src/components/ui/Modal.tsx` — bottom-sheet primitive (responsive, escape, backdrop) used by 5 other forms
- `/Users/freptar0/Desktop/Projects/centik/src/app/layout.tsx` — Sonner Toaster mounted at root
- `/Users/freptar0/Desktop/Projects/centik/src/proxy.ts` — /login + /register in publicPaths; no changes needed
- `/Users/freptar0/Desktop/Projects/centik/tests/integration/{auth,registration,isolation}.test.ts` — integration test harness patterns to extend
- `/Users/freptar0/Desktop/Projects/centik/node_modules/@auth/core/providers/credentials.d.ts` L13-65 — CredentialsConfig.authorize contract
- `/Users/freptar0/Desktop/Projects/centik/node_modules/@types/node/crypto.d.ts` — timingSafeEqual signature
- npm registry queries (executed 2026-04-20): otplib 13.4.0, qrcode 1.5.4, @upstash/ratelimit 2.0.8, @upstash/redis 1.37.0, @types/qrcode 1.5.6
- otplib v13.4.0 README (via `npm view otplib readme`) — confirms removal of `authenticator`, named exports, defaults
- Node.js v20 crypto docs [CITED: nodejs.org/docs/latest-v20.x/api/crypto.html] — AES-GCM API, `getAuthTag`/`setAuthTag` ordering, IV recommendation

### Secondary (MEDIUM confidence)
- upstash.com/docs/redis/sdks/ratelimit-ts/{gettingstarted,methods,algorithms} — Ratelimit.limit return shape, slidingWindow signature, required env vars
- github.com/soldair/node-qrcode — toDataURL signature, errorCorrectionLevel options, TypeScript note
- otplib.yeojz.dev/guide/getting-started — default options (sha1/6/30)

### Tertiary (LOW confidence)
- None — every asserted claim is backed by either a local codebase read or a primary-source fetch executed in this research session.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions executed via `npm view` today (2026-04-20); peer-dep math double-checked.
- Architecture: HIGH — every pattern adapts an existing Phase 26–28 pattern; no greenfield invention.
- Pitfalls: HIGH — all 12 pitfalls cite either existing code, Node docs, or the otplib migration notice directly.
- Security: HIGH — ASVS/STRIDE table enumerates known TOTP-specific threats with concrete mitigations already encoded in locked decisions.
- otplib v13 API: HIGH — read the actual `npm view` README, not training data; API delta from v12 explicitly documented.
- Upstash peer-dep: HIGH — read the `peerDependencies` field directly; confirmed caret-range semantics.

**Research date:** 2026-04-20
**Valid until:** 2026-05-20 (30 days — otplib v13.4.0 is the current stable; no imminent major-version turbulence expected. Upstash SDKs release frequently but public API has been stable since v2 GA.)

## Recommended Plan Decomposition

The planner should produce five plans in strict dependency order. Each plan is sized to stay under 300 lines of net new code and under 2 hours of execution wall-clock time per the project's plan granularity.

### Plan 29-01: Schema + libs + test stubs (Wave 0)
**Scope:** Foundation everything else needs.
**Files:**
- `prisma/schema.prisma` — add `BackupCode` model + User.backupCodes relation
- `prisma/migrations/YYYYMMDDHHMMSS_add_backup_code_model/migration.sql` — generated
- `package.json` — add otplib, qrcode, @upstash/ratelimit, @upstash/redis, @types/qrcode
- `.env.example` — add 3 new keys + format docs for AUTH_TOTP_ENCRYPTION_KEY
- `.env.test` — set `RATE_LIMIT_DISABLED=true`
- Wave-0 test stub files (empty describe/it.todo blocks per Phase 26 precedent):
  - `src/lib/totp-crypto.test.ts`
  - `src/lib/totp.test.ts`
  - `src/lib/backup-codes.test.ts`
  - `src/lib/challenge.test.ts`
  - `src/lib/rate-limit.test.ts`
  - `src/app/(app)/configuracion/totp-actions.test.ts`
  - `tests/integration/totp.test.ts`
**Verify:** `prisma migrate dev` creates the table; `npm run build` passes with new deps installed; `npm run test:run` runs zero failures (stubs only).

### Plan 29-02: Crypto + TOTP + backup-code + rate-limit + challenge libs
**Scope:** Pure-function utility modules with full unit-test coverage. No consumers yet.
**Files:**
- `src/lib/totp-crypto.ts` (Pattern 1) + test
- `src/lib/totp.ts` (Pattern 2) + test
- `src/lib/backup-codes.ts` (Pattern 8) + test (unit portion; integration in Plan 29-05)
- `src/lib/challenge.ts` (Pattern 4) + test
- `src/lib/rate-limit.ts` (Pattern 5) + test (mocks @upstash/ratelimit)
- `src/lib/validators.ts` — add four new Zod schemas (D-30)
**Verify:** 100% unit-test coverage on each new lib file. `npm run test:run -- src/lib/` passes. Observable signals 1–11, 13 from Nyquist section covered.

### Plan 29-03: Two-step login wiring
**Scope:** The authentication flow itself.
**Files:**
- `src/auth.ts` — extend `authorizeUser` (Pattern 6); add `totpCode` + `challenge` to Credentials `credentials: {}` declaration
- `src/actions/auth.ts` — replace `loginAction` (Pattern 7 step-1 branch); add `verifyTotpAction` (Pattern 7 step-2 branch); preserve `logoutAction` + `registerAction` unchanged
- `src/components/auth/LoginForm.tsx` — add `requiresTotp` branch: on `useActionState` result, swap to `<TotpStep />`; preserve callbackUrl across steps
- `src/components/auth/TotpStep.tsx` — NEW: FloatingInput for code, hidden `challenge` + `callbackUrl` inputs, "Usar código de respaldo" toggle label swap, `useActionState(verifyTotpAction)`
- `src/actions/auth.test.ts` — extend with loginAction 2FA branch + verifyTotpAction tests
- `src/auth.test.ts` — extend with authorizeUser 2FA branch tests
- Integration test additions in `tests/integration/totp.test.ts` — full-login happy path (real DB, real crypto, real otplib, mocked signIn)
**Verify:** `npm run test:run` + login integration test + E2E happy path for 2FA user.

### Plan 29-04: Setup / Disable / Regen flows + Seguridad UI
**Scope:** User-facing /configuracion controls.
**Files:**
- `src/app/(app)/configuracion/page.tsx` — fetch `{ totpEnabled }` for current user, pass to wrapper
- `src/app/(app)/configuracion/ConfiguracionClientWrapper.tsx` — render `<SeguridadSection totpEnabled={...} />` below Invitaciones
- `src/app/(app)/configuracion/totp-actions.ts` — `prepareTotpSecretAction`, `enableTotpAction` (Pattern 9), `disableTotpAction`, `regenerateBackupCodesAction`
- `src/components/configuracion/SeguridadSection.tsx` — status dot + CTAs
- `src/components/configuracion/Activar2faModal.tsx` — 3-step wizard using `Modal`
- `src/components/configuracion/Desactivar2faModal.tsx` — code input + confirm
- `src/components/configuracion/RegenerarCodigosModal.tsx` — code input + new codes
- `src/components/configuracion/BackupCodesScreen.tsx` — shared display (copy + download + checkbox gate)
- Unit tests for each Server Action in `totp-actions.test.ts`
**Verify:** `npm run test:run -- src/app/(app)/configuracion/` passes. Visual QA of wizard in dev.

### Plan 29-05: Integration + E2E + final `quality` pass
**Scope:** End-to-end validation + polish.
**Files:**
- `tests/integration/totp.test.ts` — complete all flows per D-33 (setup atomicity, login with TOTP, login with backup, disable atomicity, backup-code single-use, cross-user isolation, concurrent consume)
- `e2e/totp.spec.ts` — Playwright happy path per D-34 (login → enable 2FA → logout → login with code → logout → login with backup code)
- Any minor fixes surfaced during integration testing
- Final run: `npm run quality` + `npm run test:integration` + `npm run test:e2e`
**Verify:** All green. Requirement IDs TOTP-01..05 covered by passing tests. Plan-check grep confirms `runtime = 'edge'` absent.

---

## RESEARCH COMPLETE
