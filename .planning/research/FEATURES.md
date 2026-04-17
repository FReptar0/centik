# Feature Research

**Domain:** Auth + Cloud Deploy — Email/Password + TOTP 2FA + Invite-Only + Vercel/Prisma Postgres
**Researched:** 2026-04-15
**Confidence:** HIGH (Auth.js official docs, Prisma official docs, Vercel official docs, multiple verified sources)

---

## Context: What This Milestone Is

This is NOT a new product. Centik v2.1 is a fully working personal finance app (479 passing tests, 102 source files). This milestone adds multi-user capability via Auth.js v5 with email+password+TOTP 2FA, invite-only registration, per-user data isolation in Prisma, security headers, rate limiting, and production deployment to Vercel with Prisma Postgres as the managed database.

The threat model is real: this app stores real financial data. Security is the primary quality bar.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features that must land correctly for the milestone to be considered done. Missing = feature is broken or insecure.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Email + password login | Baseline credential auth — no login = no access | LOW | Auth.js v5 Credentials provider. Passwords hashed with argon2id (preferred over bcrypt in 2025 security guidance) or bcrypt-js (simpler, widely used). Password verified in the `authorize()` callback. |
| Session management | Users must stay logged in across page loads | LOW | Auth.js JWT strategy recommended for Vercel serverless (avoids DB query on every request). JWT stored in httpOnly cookie. Session contains `userId` + `email` at minimum. |
| Protected routes via middleware | All app pages require authentication | LOW | Auth.js `auth()` in `middleware.ts` (now Node.js runtime in Next.js 16, no edge-compatibility workaround needed). Redirect unauthenticated users to `/login`. |
| Login form with proper UX | Error states, loading states, disable on submit | LOW | Server Action or API route. Show "Invalid credentials" on failure (never reveal which field is wrong). No difference between "email not found" and "wrong password" to prevent enumeration. |
| Logout | Users must be able to end session | LOW | Auth.js `signOut()`. Clears httpOnly cookie. Redirect to `/login`. |
| Per-user data isolation | Each user sees only their own data | MEDIUM | Add `userId` column to: Transaction, Budget, Period, IncomeSource, Debt, Category (custom ones), MonthlySummary. All Prisma queries add `where: { userId: session.user.id }`. This is a schema migration on existing data. |
| TOTP 2FA — verification at login | Second factor required on every login after 2FA is enabled | MEDIUM | Custom flow: after password check, if `user.twoFactorEnabled === true`, return a partial session or redirect to `/auth/2fa`. Verify TOTP token using `otplib` or `speakeasy`. Only issue full session after 2FA passes. |
| TOTP 2FA — setup flow | User generates secret, scans QR code, confirms first code | MEDIUM | Generate TOTP secret (`otplib.authenticator.generateSecret()`). Build otpauth URI. Render QR via `qrcode` library. Save encrypted secret to DB only after user confirms first valid code. |
| Invite-only registration | No self-signup — only invited users can register | MEDIUM | Admin (current single user) generates invite token stored in DB with expiry (24-48h) and `usedAt`. Registration page validates token before allowing account creation. Token marked used on success. |
| Security headers | Browser protections for financial app | LOW | Set via `next.config.js` headers() for static headers (X-Frame-Options, X-Content-Type-Options, Referrer-Policy) and middleware for nonce-based CSP. HSTS via Vercel (add to vercel.json or next.config.js). |
| Vercel deployment | App must run in production | LOW | Connect GitHub repo. Set environment variables (DATABASE_URL, AUTH_SECRET, AUTH_URL). Add `prisma generate` to postinstall script. Prisma Postgres from Vercel Marketplace provides built-in connection pooling. |

### Differentiators (What Makes This Implementation Solid)

Features beyond the minimum that make the auth system trustworthy and production-grade.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| TOTP backup codes | Recovery path if authenticator app is lost | MEDIUM | Generate 8-10 single-use recovery codes at 2FA setup time. Store as hashed values in DB (treat like passwords). Show once at setup, never again. Allow login with backup code in place of TOTP. Mark code as used after consumption. |
| Rate limiting on auth endpoints | Brute force protection on /api/auth/* | MEDIUM | Upstash Ratelimit + Vercel KV is the cleanest solution for Vercel deployments. Alternatively: cookie-based attempt tracking requires no extra infra. Limit: 5 attempts / 15 minutes per IP on login, 3 per minute on 2FA code submission. |
| Encrypted TOTP secrets in DB | TOTP secret exposure doesn't give attacker complete 2FA bypass | MEDIUM | Encrypt TOTP secret with AES-256-GCM using `AUTH_TOTP_ENCRYPTION_KEY` env var before storing in DB. Decrypt at verification time. Prevents DB dump from yielding working TOTP secrets. |
| Invite expiry + single-use enforcement | Prevents old links from being exploited | LOW | Invite tokens: `createdAt`, `expiresAt` (24-48h TTL), `usedAt` (null until consumed), `email` field (token is for a specific email, prevents forwarding attacks). |
| Argon2id for password hashing | Modern password hashing — more memory-hard than bcrypt | LOW | `@node-rs/argon2` is the 2025 recommendation. Falls back to bcrypt-js if native binaries cause issues on Vercel. Decision: bcrypt-js is simpler and widely battle-tested; argon2id is strictly better. Use argon2id unless build issues arise. |
| AUTH_SECRET rotation support | Secret can be rotated without invalidating all sessions immediately | LOW | Auth.js v5 supports multiple secrets via array. Document the rotation procedure. |
| 2FA can be disabled (with password confirmation) | User autonomy — not a one-way trap | LOW | Settings page: disable 2FA requires current password + one valid TOTP code. Clears `twoFactorSecret` and `twoFactorEnabled` in DB. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| OAuth providers (Google, GitHub) | "Easier login" | Adds OAuth complexity, requires app registration, callback URLs. Out of scope for invite-only personal use tool. | Email+password only. The user set is tiny (invited users). OAuth is extra surface area with no benefit. |
| SMS/email OTP as 2FA | "Backup to TOTP" | SMS requires Twilio (cost + complexity). Email OTP requires a transactional email provider. Both add infra. | TOTP + backup codes covers the recovery case without external providers. |
| "Remember this device" / skip 2FA | "Less friction" | Weakens 2FA significantly. Financial app — every login should require 2FA if enabled. | No device trust. Friction is intentional for a finance app. |
| Admin user management UI | "Need to manage users" | Admin panel is a separate feature with its own attack surface. Out of scope for this milestone. | Invite tokens generated via a seed script or direct DB insertion. Deactivate via Prisma Studio or DB query. |
| Passkeys / WebAuthn | "More secure than TOTP" | Significantly more complex. Device binding, credential storage, platform authenticator APIs. | Defer to post-v3.0. TOTP is well-understood and sufficient for a personal finance app. |
| PostgreSQL Row-Level Security (RLS) | "Database-enforced isolation" | RLS with Prisma requires custom extensions or Prisma extension setup. Adds complexity and makes migrations harder. | Application-level userId filtering is simpler, auditable in TypeScript code, and sufficient when there is no untrusted database user. RLS is valuable in multi-tenant SaaS, overkill here. |
| Self-hosted SMTP for invite emails | "Automated invite delivery" | SMTP requires a mail provider (SES, Resend, Postmark). Adds an integration point. | For an invite-only personal tool, generate a token and share the `/register?token=X` URL manually or via any communication channel. No email service needed. |
| Magic link authentication | "Passwordless" | Requires email provider. Also: magic links are single-use and expire, adding friction for a daily-use app. | Email+password is simpler for a persistent personal finance tool used daily. |

---

## Feature Dependencies

```
Password hashing library (argon2id or bcrypt-js)
    └──required by──> Email+password login
    └──required by──> Invite registration (password creation)
    └──required by──> 2FA disable (password re-confirmation)

Auth.js v5 + Prisma Adapter (User, Session, Account tables)
    └──required by──> Email+password login
    └──required by──> Session management
    └──required by──> Protected routes (middleware)
    └──enables──> All per-user data queries (session.user.id)

Invite token model (DB)
    └──required by──> Invite-only registration page
    └──blocks──> Account creation without valid token

Schema migration (userId on all data models)
    └──required by──> Per-user data isolation
    └──required by──> All existing queries (must add userId filter)
    └──WARNING──> Existing data (seed data) needs userId assignment

2FA secret + twoFactorEnabled on User model
    └──required by──> TOTP setup flow
    └──required by──> TOTP verification at login
    └──required by──> Backup codes (stored alongside secret)

TOTP verification at login
    └──requires──> Password check passing first (step-up flow)
    └──requires──> 2FA model fields on User
    └──blocks──> Session issuance until both factors pass

Security headers (next.config.js / middleware)
    └──independent of auth logic, but must be set before Vercel deploy

Vercel deploy
    └──requires──> Prisma Postgres instance provisioned
    └──requires──> AUTH_SECRET env var set
    └──requires──> DATABASE_URL env var pointing to Prisma Postgres
    └──requires──> prisma generate in postinstall script
    └──requires──> Security headers configured
```

### Dependency Notes

- **Schema migration is the riskiest step:** Adding `userId` to existing tables requires a migration that also backfills existing seed data. The seed script must be updated to associate all seed data with a default/admin user. Migration must run before any code change that queries with userId.
- **Auth.js adapter schema must align with Prisma schema:** Auth.js Prisma adapter expects specific model names (User, Account, Session, VerificationToken). These must be added to schema.prisma. The User model gains auth fields; existing app data models gain userId FK.
- **2FA login is a two-step flow not natively supported by Auth.js:** After Credentials `authorize()` succeeds, if `twoFactorEnabled === true`, Auth.js must NOT issue a session yet. Pattern: return a short-lived "pending 2FA" JWT or store a pending state. The `/auth/2fa` page accepts the TOTP code, verifies, then calls `signIn()` with a flag or issues session directly. This requires custom logic outside Auth.js defaults.
- **Prisma Postgres built-in connection pooling:** Prisma Postgres (the managed service) includes connection pooling by default, unlike self-managed Postgres which requires PgBouncer or Vercel's `?pgbouncer=true` connection string parameter. This simplifies the Vercel deployment.

---

## MVP Definition

This is a security milestone. "MVP" means minimum needed to safely deploy with real user data.

### Launch With (v3.0 required)

- [ ] Email + password login with argon2id/bcrypt hashing
- [ ] Auth.js v5 with Prisma adapter (User, Account, Session tables)
- [ ] Session middleware protecting all app routes
- [ ] TOTP 2FA setup flow (generate secret → QR code → confirm first code → save)
- [ ] TOTP 2FA verification at login (step-up after password check)
- [ ] Backup codes generated at 2FA setup (8-10 single-use hashed codes)
- [ ] Invite-only registration (token-gated, expiring, single-use)
- [ ] Schema migration adding userId to all data models
- [ ] Per-user data isolation (all queries scoped to session.user.id)
- [ ] Security headers (CSP with nonce, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy)
- [ ] Rate limiting on login endpoint (brute force protection)
- [ ] Prisma Postgres provisioned on Vercel Marketplace
- [ ] Vercel deployment with CI/CD from main branch

### Add After Core Is Working (v3.x)

- [ ] Rate limiting on 2FA endpoint (separate, tighter limit than login)
- [ ] Encrypted TOTP secrets (AES-256-GCM) — add after basic 2FA is verified working
- [ ] 2FA disable flow (settings page, requires password + TOTP confirmation)
- [ ] AUTH_SECRET rotation documentation

### Future Consideration (v4+)

- [ ] Passkeys / WebAuthn
- [ ] Audit log for auth events (login, logout, 2FA enable/disable)
- [ ] Multiple users with role-based data access
- [ ] Admin user management UI

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Email + password login | HIGH (gate to app) | LOW | P1 |
| Session middleware / protected routes | HIGH (security foundation) | LOW | P1 |
| Per-user data isolation (schema + queries) | HIGH (data safety) | MEDIUM | P1 |
| Invite-only registration | HIGH (access control) | MEDIUM | P1 |
| TOTP 2FA setup flow | HIGH (2FA is required) | MEDIUM | P1 |
| TOTP 2FA verification at login | HIGH (2FA is required) | MEDIUM | P1 |
| Backup codes | HIGH (recovery path) | MEDIUM | P1 |
| Security headers | HIGH (browser protections) | LOW | P1 |
| Rate limiting on login | HIGH (brute force) | MEDIUM | P1 |
| Prisma Postgres + Vercel deploy | HIGH (ships the app) | LOW | P1 |
| Encrypted TOTP secrets in DB | MEDIUM (defense-in-depth) | MEDIUM | P2 |
| Rate limiting on 2FA endpoint | MEDIUM (additional protection) | LOW | P2 |
| 2FA disable flow | MEDIUM (user autonomy) | LOW | P2 |
| AUTH_SECRET rotation docs | LOW (operational) | LOW | P2 |

**Priority key:**
- P1: Must have for v3.0 launch — app cannot ship without these
- P2: Should have — add within v3.x after P1 is verified and deployed
- P3: Future milestone

---

## Expected Behaviors by Feature

### TOTP 2FA Login Flow (Step-by-Step)

1. User submits email + password
2. Server: verify password hash. On failure → return generic "Invalid credentials" error (no enumeration)
3. Server: check `user.twoFactorEnabled`. If false → issue full Auth.js session. Done.
4. If `twoFactorEnabled === true` → do NOT issue session. Instead: issue a short-lived signed token (or cookie) marking "password-passed, awaiting 2FA" + redirect to `/auth/2fa`
5. `/auth/2fa` page: user enters 6-digit TOTP code from authenticator app
6. Server: decrypt TOTP secret, verify code with `otplib.authenticator.verify()` (30s window, allow ±1 window for clock drift)
7. On success: clear pending-2FA token, issue full Auth.js session
8. On failure: increment attempt counter (rate limit), return error. After 5 failures: lock out for 15 minutes
9. Backup code path: user can enter backup code instead of TOTP. Hash the entered code, find matching unhashed record, mark as used, issue session.

### TOTP 2FA Setup Flow (Step-by-Step)

1. User navigates to Settings → Security → Enable 2FA (authenticated, password login already done)
2. Server: generate TOTP secret with `otplib.authenticator.generateSecret()`
3. Build otpauth URI: `otpauth://totp/Centik:${user.email}?secret=${secret}&issuer=Centik`
4. Render QR code via `qrcode` npm package → display as `<img>` or SVG
5. Also show secret as plaintext (fallback for manual entry on same device)
6. User scans QR with authenticator app (Google Authenticator, Authy, etc.)
7. User enters the displayed 6-digit code to confirm setup
8. Server: verify code against the (not-yet-saved) secret. If valid:
   - Encrypt secret with AES-256-GCM using `AUTH_TOTP_ENCRYPTION_KEY`
   - Save encrypted secret to `user.twoFactorSecret`
   - Set `user.twoFactorEnabled = true`
   - Generate 8-10 backup codes: random 10-char strings, hash each with bcrypt, save hashed versions, show plaintext versions ONCE
9. Show backup codes page: "Save these now — they won't be shown again." Download as .txt button.
10. 2FA is now active on next login.

### Invite-Only Registration Flow

1. Admin generates invite: POST `/api/invites` with `{ email }` → creates DB record with token (crypto.randomUUID()), createdAt, expiresAt (+48h), email, usedAt: null
2. Admin shares URL: `/register?token=${token}` via any channel (Slack, email, etc.)
3. User visits URL → server validates: token exists, expiresAt > now, usedAt === null, token email matches (if email is pre-filled/fixed)
4. User fills registration form: name, email (pre-filled from token), password, confirm password
5. Server: re-validate token on submit (race condition guard). Create user with hashed password. Mark token `usedAt = now`.
6. Auto-login after registration (call Auth.js `signIn()` after account creation) → redirect to app.
7. If token is invalid/expired/used: show "This invitation is no longer valid" — no registration option.

### Per-User Data Isolation Pattern

All Prisma queries in Server Components, API routes, and Server Actions follow this pattern:

```typescript
// Get authenticated user
const session = await auth()
if (!session?.user?.id) redirect('/login')
const userId = session.user.id

// All queries scoped to userId
const transactions = await prisma.transaction.findMany({
  where: { userId, periodId: currentPeriodId },
  orderBy: { date: 'desc' }
})
```

No query that returns user-specific data should ever omit the `userId` filter. The `userId` field is never passed from the client — always sourced from the server-side session.

### Security Headers (Recommended Set)

Set in `next.config.js` `headers()`:

- `X-Frame-Options: DENY` — prevents clickjacking
- `X-Content-Type-Options: nosniff` — prevents MIME sniffing
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` (production only)

CSP requires a nonce (Recharts uses inline styles, breaking static CSP). Set via middleware:

```typescript
// middleware.ts
const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
const cspHeader = `
  default-src 'self';
  script-src 'self' 'nonce-${nonce}';
  style-src 'self' 'nonce-${nonce}' 'unsafe-inline';
  img-src 'self' data: blob:;
  font-src 'self';
  connect-src 'self';
  frame-ancestors 'none';
`
```

Note: Recharts renders SVG with inline styles. `unsafe-inline` for style-src may be required unless Recharts is patched to use nonce — test this during implementation.

---

## Schema Changes Required

These are the specific Prisma model additions this milestone requires:

**New models (Auth.js adapter):**
- `User` — id, email, name, emailVerified, image, passwordHash, twoFactorEnabled, twoFactorSecret, createdAt
- `Account` — Auth.js OAuth account (needed by adapter even for Credentials-only)
- `Session` — Auth.js session (if using database strategy; likely JWT so may not need)
- `VerificationToken` — Auth.js email verification (adapter requirement)
- `Invite` — token, email, createdAt, expiresAt, usedAt
- `TwoFactorBackupCode` — userId, codeHash, usedAt

**Modified models (add userId FK):**
- Transaction, Budget, Period, IncomeSource, Debt, Category, MonthlySummary — add `userId String`, `user User @relation(...)`

**Migration strategy for existing data:**
- Migration must include a `DEFAULT` or backfill step to assign existing seed data to the first/admin user
- Seed script must create admin user first, then create all seed data with that userId

---

## Sources

- [Auth.js v5 Prisma Adapter — authjs.dev](https://authjs.dev/getting-started/adapters/prisma) — HIGH confidence
- [Prisma + Auth.js + Next.js guide — prisma.io](https://www.prisma.io/docs/guides/authjs-nextjs) — HIGH confidence
- [Next.js Security Headers + CSP — nextjs.org](https://nextjs.org/docs/app/guides/content-security-policy) — HIGH confidence
- [Prisma Postgres Vercel Marketplace — prisma.io](https://www.prisma.io/blog/connect-your-apps-to-prisma-postgres-via-vercel-marketplace-integration) — HIGH confidence
- [Prisma Deploy to Vercel — prisma.io](https://www.prisma.io/docs/orm/prisma-client/deployment/serverless/deploy-to-vercel) — HIGH confidence
- [Vercel Rate Limiting — vercel.com](https://vercel.com/kb/guide/add-rate-limiting-vercel) — HIGH confidence
- [Auth.js 2FA GitHub Discussion #5278](https://github.com/nextauthjs/next-auth/discussions/5278) — MEDIUM confidence (community pattern, not official)
- [2FA UX Patterns — LogRocket Blog](https://blog.logrocket.com/ux-design/2fa-user-flow-best-practices/) — MEDIUM confidence
- [Vercel + Prisma Postgres starter template](https://vercel.com/templates/next.js/prisma-postgres) — HIGH confidence
- [Next.js Middleware 2026 — Node.js runtime](https://dev.to/bean_bean/nextjs-middleware-in-2026-beyond-auth-advanced-patterns-most-developers-miss-2d5k) — MEDIUM confidence (confirms middleware.ts is Node.js in Next.js 16)
- [Argon2 vs bcrypt 2025](https://stytch.com/blog/argon2-vs-bcrypt-vs-scrypt/) — MEDIUM confidence

---

*Feature research for: Auth + Cloud Deploy milestone (v3.0)*
*Researched: 2026-04-15*
