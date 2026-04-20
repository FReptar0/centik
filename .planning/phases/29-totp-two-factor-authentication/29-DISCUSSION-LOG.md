# Phase 29: TOTP Two-Factor Authentication - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-20
**Phase:** 29-totp-two-factor-authentication
**Mode:** `--auto` (Claude auto-selected all gray areas, then chose the recommended option for each — no interactive Q&A)
**Areas discussed:** TOTP library + QR generation, AES-256-GCM encryption helper, Backup codes storage model, Two-step login architecture, Setup + disable UX, Rate limiting, Schema migration scope, Test scope

---

## TOTP Library + QR Generation

| Option | Description | Selected |
|--------|-------------|----------|
| `otplib` + `qrcode` (server-render data URL) | Most-adopted RFC 6238 lib in JS; QR rendered in Node, sent as data-URL string to client | ✓ |
| `speakeasy` + client-side `qrcode.react` | Older lib (less maintained); QR rendered in the browser | |
| `notp` + manual otpauth URI | Tiny lib; user provides their own QR | |
| Roll-your-own HMAC-SHA1 | RFC 6238 in ~50 LOC; no dep | |

**Auto choice rationale:** otplib is currently maintained, has a tiny footprint, and `keyuri()` returns the otpauth URI directly. Server-rendering the QR avoids shipping a QR library to the browser bundle and is trivial in a Server Action.

---

## AES-256-GCM Encryption Helper

| Option | Description | Selected |
|--------|-------------|----------|
| `node:crypto` AES-256-GCM, format `iv:ciphertext:authTag` (hex) | Built-in, no new dep, GCM provides authenticated encryption | ✓ |
| `crypto.subtle` (WebCrypto) AES-GCM | Edge-runtime compatible, but Server Actions run in Node | |
| `libsodium-wrappers` (XChaCha20-Poly1305) | Modern AEAD, but adds 200KB+ dep for one use | |
| `@aws-sdk/client-kms` envelope encryption | Operationally heavy for a single user's TOTP secret | |

**Auto choice rationale:** Built-in `node:crypto` is the right tool — no dep, well-understood, and meets the requirement (TOTP-02). 96-bit IV per record is the NIST GCM recommendation. App fails fast at boot if `AUTH_TOTP_ENCRYPTION_KEY` is missing or wrong length.

---

## Backup Codes Storage Model

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated `BackupCode` model (one row per code, `usedAt` per row) | Atomic per-code consume, easy regenerate, indexable | ✓ |
| JSON column on `User` (array of `{ codeHash, used }`) | Fewer tables, but write-amplification + harder to consume atomically | |
| Single hashed string with bitmask of used codes | Compact, but obscure and hard to audit | |
| HMAC of code with per-user salt (no DB row) | Stateless, but no way to mark used → not single-use | |

**Auto choice rationale:** Per-row model gives atomic single-use semantics via `updateMany where: { id, usedAt: null }` and supports the "Regenerar códigos" flow cleanly. Index on `userId` keeps the verify path O(10).

---

## Two-Step Login Architecture

| Option | Description | Selected |
|--------|-------------|----------|
| Two Server Actions (`loginAction` + `verifyTotpAction`) with HMAC challenge token bridging them | Keeps NextAuth `authorize` idempotent; no half-session in cookie; 5-min challenge | ✓ |
| Single extended `authorize` accepting all three fields up front | UI must collect TOTP code before knowing if it's needed | |
| Issue a partial JWT after password, full JWT after TOTP | Half-session in cookie; multiple session shapes — error-prone | |
| Custom `/api/login` handler bypassing NextAuth Credentials | Loses NextAuth's CSRF + cookie handling | |

**Auto choice rationale:** Two actions with a short-lived signed challenge cleanly separates "did the password match" from "did the second factor match" without ever issuing a session that's only half-authenticated. The challenge is signed with `AUTH_SECRET` (already in env), embedded in a hidden form field — no new cookie, no new state, 5-min expiry.

---

## Setup + Disable UX

| Option | Description | Selected |
|--------|-------------|----------|
| `/configuracion` "Seguridad" section + 3-step bottom-sheet wizard | Mirrors Invitaciones pattern; consistent with TransactionForm style | ✓ |
| Dedicated `/configuracion/2fa` route | Heavier; needs its own page + back navigation | |
| Inline accordion in /configuracion | Less guided; QR + verify + backup codes in one long scroll | |
| First-run forced setup at next login | Coercive; Centik is single-admin self-managed | |

**Auto choice rationale:** The Invitaciones section already established the in-page section pattern in /configuracion. Bottom-sheet wizard matches the existing TransactionForm bottom-sheet UX. Disable also requires the second factor (D-21) — cannot disable by password alone.

---

## Rate Limiting

| Option | Description | Selected |
|--------|-------------|----------|
| `@upstash/ratelimit` + `@upstash/redis`, sliding window, IP+identity, dev bypass | Required by TOTP-05; Vercel-friendly; testable via mock | ✓ |
| Custom in-memory limiter | Will not work on serverless (per-instance state) | |
| DB-backed limiter (`prisma.rateLimit`) | Adds write traffic on every login attempt; slow | |
| Cloudflare Turnstile / hCaptcha challenge | Different threat model; doesn't replace rate limit | |

**Auto choice rationale:** Requirement TOTP-05 names `@upstash/ratelimit` directly. Sliding-window 5/min is the standard auth-endpoint shape. Bypass via `RATE_LIMIT_DISABLED=true` keeps tests deterministic. Production hardening (env-var validation at boot) is delegated to Phase 30.

---

## Schema Migration Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Single migration: add `BackupCode` model + index, no User changes | Additive, low risk; User.totpSecret/totpEnabled already exist | ✓ |
| Add `BackupCode` + `lastTotpUsedAt` on User | Anti-replay would need it; otplib's window=1 + per-code single-use covers replay | |
| Add `BackupCode` + audit-log `AuthEvent` model | Nice-to-have; out of scope per Deferred Ideas | |
| Defer schema; store backup codes in a JSON column | Rejected upstream in "Backup Codes Storage Model" | |

**Auto choice rationale:** The schema slice is intentionally minimal. Anti-replay is handled by otplib's internal step-based verification + the single-use BackupCode rows; an explicit `lastTotpUsedAt` would only matter if we wanted to forbid re-using the same 30s window, which is overkill for a single-user app.

---

## Test Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Unit (crypto, totp, backup codes, rate limit, actions) + Integration (full flow + cross-user) + 1 E2E happy path | Matches CLAUDE.md mandatory test policy + Phase 27 isolation pattern | ✓ |
| Unit only | Misses the auth.js + Prisma integration surface | |
| Integration + E2E only | Loses fast-feedback unit tests on pure crypto/utils | |
| Snapshot tests for the wizard UI | Brittle; visual regressions not the right shield for an auth feature | |

**Auto choice rationale:** Mirrors the layered approach Phase 26 used for login (unit + integration + E2E). The cross-user backup-code isolation test extends the Phase 27 isolation suite — important because backup codes are the recovery factor and IDOR there would be catastrophic.

---

## Claude's Discretion

The following items are explicitly left to downstream agents (researcher, planner, executor):

- Bottom-sheet vs inline-card layout for the Seguridad section header
- Whether to extract a `<TotpCodeInput />` segmented-input primitive
- Backup-code download mechanism (`<a download>` blob vs Server Action File response)
- Plan-file split (1 schema + 1 lib + 1 wizard + 1 login, OR fewer larger plans)
- Toast vs inline confirmation on "2FA activado"
- Exact disable confirmation copy

## Deferred Ideas (out of phase scope)

- WebAuthn / passkeys
- "Remember this device" trust cookie
- SMS / email second-factor
- Separate recovery email
- Admin "force disable" UI
- Email notification on 2FA enable/disable
- Rate limit on /register
- Per-IP geographic / device fingerprint heuristics
- Audit log of 2FA events
- Push-based 2FA (Authy / Duo style)

---

*Generated 2026-04-20 by `/gsd-discuss-phase 29 --auto`.*
