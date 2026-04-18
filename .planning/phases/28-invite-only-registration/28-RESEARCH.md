# Phase 28: Invite-Only Registration - Research

**Researched:** 2026-04-18
**Domain:** Auth.js v5 Credentials registration, admin-gated Server Actions, secure token generation
**Confidence:** HIGH

## Summary

This phase wires admin-generated invite tokens to a gated `/register` flow that auto-logs in the new user on success. Every building block already exists in the codebase — the task is composition and wiring, not foundational research.

- **Token generation** uses Node's `crypto.randomBytes(32).toString('hex')` (64-char hex) inside a Server Action guarded by `requireAuth()` + an `isAdmin` check. `crypto` is a built-in Node module and works in Server Actions (Node runtime) without any install.
- **Token validation** at `/register` is a server-side Prisma lookup in the page component that resolves three discrete failure modes (missing row, expired, used) plus one success path. `notFound()` from `next/navigation` handles the "no token param" case per D-19.
- **Account creation + auto-login** atomically: `prisma.$transaction` creates the User with `isApproved: true`/`isAdmin: false` and marks `InviteToken.usedAt = now()` together. Immediately after, the Server Action calls `signIn('credentials', { email, password, redirectTo: '/' })` — reusing the exact pattern from `loginAction`, including the `AuthError` swallow / `NEXT_REDIRECT` re-throw discipline already documented in `src/actions/auth.ts`.
- **Admin UI** extends existing `/configuracion/page.tsx` with a conditional Invitaciones section visible only when `session.user.isAdmin === true`. The session type needs a new `isAdmin: boolean` field; this requires both a Prisma schema change and a type augmentation in `src/types/next-auth.d.ts` (the file that currently augments `Session` and `JWT`).
- **Two schema changes** are required before anything else: (1) `isAdmin Boolean @default(false)` on the User model, and (2) seed script updated to set `isAdmin: true` on the ADMIN_EMAIL user. These are the only destructive/ordering-sensitive tasks in the phase.

**Primary recommendation:** Treat this as a 3-wave phase. Wave A: schema migration + session type augmentation + JWT callback updates. Wave B: admin invite actions + Invitaciones UI in /configuracion. Wave C: /register page + RegisterForm + registerAction with auto-login. Waves B and C can parallelize after Wave A lands because they share no runtime code paths (only the InviteToken model and the type augmentation).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Generate 32-byte random token | API / Backend (Server Action) | — | `crypto.randomBytes` needs Node runtime; exposing token generation to the client would defeat secrecy |
| Persist InviteToken row | API / Backend (Prisma in Server Action) | — | Database ownership lives with backend — no client writes |
| Validate token at /register | API / Backend (Server Component page.tsx) | — | Database lookup must happen server-side before rendering the form; client cannot be trusted to gate itself |
| Render RegisterForm | Browser / Client ("use client") | Frontend Server (shell) | Form state (password + confirm + toggles) is interactive; page.tsx is a Server Component that passes validated-token props to the client form |
| Hash password + create User | API / Backend (Server Action) | — | bcrypt cost factor 12 runs server-side; hashedPassword never leaves the server |
| Auto-login after registration | API / Backend (`signIn` in Server Action) | Frontend Server (redirect) | Auth.js `signIn` from the server-side module sets the JWT cookie; throws `NEXT_REDIRECT` which Next.js routes through the response |
| Admin-gate Invitaciones section | Frontend Server (SSR with session) | — | `session.user.isAdmin` check runs in Server Component before hydration — non-admins never receive the HTML |
| Revoke token (destructive) | API / Backend (Server Action with requireAuth + admin check) | — | Same tier as create; keeps admin boundary consistent |
| Copy URL to clipboard | Browser / Client | — | Clipboard API is a browser capability only |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `next-auth` | `5.0.0-beta.31` | `signIn()` auto-login after registration, session shape | Already wired in Phase 26; same pattern as `loginAction` [VERIFIED: package.json] |
| `@auth/prisma-adapter` | `^2.11.2` | Session persistence through Prisma | Already wired in Phase 26 [VERIFIED: package.json] |
| `bcryptjs` | `^3.0.3` | Hash new user's password at cost factor 12 | Already used in seed + authorize; cost 12 locked in Phase 25 [VERIFIED: package.json] |
| `zod` | `4.3.6` | Validate register form + invite creation form | Already in `src/lib/validators.ts`; uses `z.config(z.locales.es())` for Spanish errors [VERIFIED: package.json] |
| `node:crypto` | built-in (Node 20+) | `randomBytes(32)` for invite token | Native Node API, no install — used server-side only [CITED: Node.js docs] |
| `@prisma/client` | `latest` | InviteToken + User model access | Already wired; `$transaction` used for multi-row atomic writes [VERIFIED: package.json] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `lucide-react` | `latest` | `Copy`, `Check`, `Trash2`, `Loader2`, `Eye`, `EyeOff`, `Mail`, `Ticket` | Per UI-SPEC icon inventory [CITED: 28-UI-SPEC.md] |
| `sonner` | `^2.0.7` | Admin action toasts (create success / revoke success / copy fail) | Registration errors stay INLINE per D-20; admin actions use toast per UI-SPEC |
| `react` (useActionState) | `19.2.4` | Server Action wiring in RegisterForm | Same pattern as LoginForm [VERIFIED: package.json] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `crypto.randomBytes(32)` | `nanoid` / `uuid v4` | REQUIREMENTS.md INVITE-02 explicitly mandates `crypto.randomBytes(32)` — decision locked, no tradeoff |
| `$transaction` for createUser + markTokenUsed | Sequential awaits | Transaction guarantees atomicity: if markTokenUsed fails after createUser succeeds, we'd have a dangling user with no token record. Use `$transaction` [HIGH confidence] |
| `notFound()` for missing token param | Inline error | D-19 locks `notFound()`. Next.js will render the app's `not-found.tsx` (if exists) or the default 404 [CITED: Next.js 16.2.2 docs, `next/navigation`] |
| Separate `/register` with token in path (`/register/[token]`) | Query param | D-07 locks `?token=` query param — single route handles all states cleanly |
| Dedicated `revokedAt` field on InviteToken | Set `usedAt` with sentinel value OR delete row | D-05 leaves this to Claude. Recommendation below |

**Installation:**

No new packages required. `crypto` is a Node built-in; everything else is already installed. Zero install commands.

**Version verification (executed 2026-04-18):**

All versions taken directly from the installed `package.json` files in `node_modules/*/package.json`:
- next-auth: 5.0.0-beta.31 (beta — intentional, Auth.js v5 has no stable release for Next.js 16 yet)
- bcryptjs: 3.0.3
- zod: 4.3.6
- next: 16.2.2 (from package.json dependencies)

## Architecture Patterns

### System Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                         PHASE 28 DATA FLOW                                       │
└──────────────────────────────────────────────────────────────────────────────────┘

 ADMIN SIDE (authenticated, session.user.isAdmin === true)

  /configuracion (Server Component)
     │
     │ auth() -> session.user.isAdmin check
     │ prisma.inviteToken.findMany({ where: { createdBy: userId }, orderBy: createdAt desc, take: 20 })
     ▼
  ConfiguracionClientWrapper (props: categories, inviteTokens, isAdmin)
     │
     ├── if isAdmin -> render <InvitacionesSection>
     │     ├── email input + "Generar invitacion" button
     │     │      │
     │     │      ▼ Server Action: createInviteToken(email)
     │     │          │
     │     │          ├── requireAuth() -> { userId }
     │     │          ├── admin check (prisma.user.findUnique -> isAdmin)
     │     │          ├── zod validate email
     │     │          ├── conflict checks (existing active token? existing user?)
     │     │          ├── crypto.randomBytes(32).toString('hex')
     │     │          ├── prisma.inviteToken.create({ token, email, expiresAt: +7d, createdBy })
     │     │          └── revalidatePath('/configuracion')
     │     │
     │     ├── <GeneratedUrlPanel> (if just created)
     │     │      └── Clipboard API on Copy button (client only)
     │     │
     │     └── <InvitacionesList>
     │            └── Row: email + status badge + "Revocar" (Pendiente only)
     │                   │
     │                   ▼ Server Action: revokeInviteToken(tokenId)
     │                        ├── requireAuth() + admin check
     │                        ├── prisma.inviteToken.update({ where: { id }, data: { usedAt: new Date() } })
     │                        └── revalidatePath('/configuracion')


 INVITEE SIDE (unauthenticated)

  URL from admin -> /register?token=<hex>
     │
     ▼
  proxy.ts: pathname starts with '/register' -> public path, allow through
     │
     ▼
  /register/page.tsx (Server Component)
     │
     ├── searchParams -> Promise<{ token?: string }>
     ├── if !token -> notFound()
     ├── prisma.inviteToken.findUnique({ where: { token } })
     │
     ├── if !row            -> render <TokenErrorScreen state="invalid" />
     ├── if expiresAt < now -> render <TokenErrorScreen state="expired" />
     ├── if usedAt !== null -> render <TokenErrorScreen state="used" />
     │
     └── else -> render <RegisterForm email={token.email} token={token.token} />
              │
              ▼ form submit -> Server Action: registerAction(_prev, formData)
                   │
                   ├── zod validate (email, name, password, confirmPassword)
                   ├── prisma.$transaction([
                   │       inviteToken.findUnique(again with SELECT FOR UPDATE semantics - see Pitfall #2),
                   │       user.create({ email, name, hashedPassword, isApproved: true, isAdmin: false }),
                   │       inviteToken.update({ usedAt: now() })
                   │   ])
                   ├── signIn('credentials', { email, password, redirectTo: '/' })
                   │       └── throws NEXT_REDIRECT -> page redirects to /
                   └── (error paths: return { error: Record<string, string[]> } like ingresos actions)
```

### Recommended Project Structure

```
src/
├── app/
│   ├── (auth)/
│   │   └── register/
│   │       └── page.tsx                     # NEW: Server Component, validates token, renders form OR error screen
│   └── (app)/
│       └── configuracion/
│           ├── page.tsx                     # MODIFY: load invite tokens + pass isAdmin
│           ├── ConfiguracionClientWrapper.tsx # MODIFY: conditionally render <InvitacionesSection>
│           └── invite-actions.ts            # NEW: createInviteToken, revokeInviteToken, listInviteTokens
├── actions/
│   └── auth.ts                              # MODIFY: add registerAction alongside loginAction/logoutAction
├── components/
│   ├── auth/
│   │   ├── LoginForm.tsx                    # (unchanged reference)
│   │   └── RegisterForm.tsx                 # NEW: client form, useActionState, password+confirm, eye toggles
│   └── configuracion/
│       ├── InvitacionesSection.tsx          # NEW: client shell composing all admin invite UI
│       ├── InvitacionForm.tsx               # NEW: email input + "Generar invitacion" submit
│       ├── GeneratedUrlPanel.tsx            # NEW: URL display + Copy button with 1600ms feedback
│       ├── InvitacionesList.tsx             # NEW: rows with status badge + Revocar
│       └── TokenErrorScreen.tsx             # NEW: shared error-state UI for /register (invalid/expired/used)
├── lib/
│   ├── auth-utils.ts                        # (unchanged — requireAuth() already correct)
│   ├── validators.ts                        # MODIFY: add registerSchema, createInviteSchema
│   └── invite-utils.ts                      # NEW: pure helpers — generateToken(), computeStatus(token), tokenUrl(token, origin)
├── types/
│   ├── index.ts                             # MODIFY: export InviteToken type (re-export from Prisma)
│   └── next-auth.d.ts                       # MODIFY: add isAdmin: boolean to Session.user and JWT
├── auth.ts                                  # MODIFY: authorizeUser SELECT isAdmin; jwtCallback copy to token; sessionCallback expose on session
prisma/
├── schema.prisma                            # MODIFY: User.isAdmin Boolean @default(false)
├── seed.ts                                  # MODIFY: seedAdminUser sets isAdmin: true
└── migrations/
    └── 20260418XXXXXX_add_user_isadmin/
        └── migration.sql                    # NEW: single ALTER TABLE ADD COLUMN "isAdmin"
```

### Pattern 1: Guarded Admin Server Action

**What:** Every invite-related Server Action is double-gated — `requireAuth()` proves a session, then a dedicated admin check proves the role. Non-admin sessions must NOT be allowed to call `createInviteToken` even via direct RPC.
**When to use:** Every action in `invite-actions.ts`.

```typescript
// src/app/(app)/configuracion/invite-actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import prisma from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-utils'
import { createInviteSchema } from '@/lib/validators'
import { randomBytes } from 'node:crypto'

type ActionResult = { success: true; token?: string } | { error: Record<string, string[]> }

async function requireAdmin(): Promise<{ userId: string } | null> {
  const { userId } = await requireAuth()
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { isAdmin: true } })
  if (!user?.isAdmin) return null
  return { userId }
}

export async function createInviteToken(formData: FormData): Promise<ActionResult> {
  const parsed = createInviteSchema.safeParse({ email: formData.get('email') })
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  const admin = await requireAdmin()
  if (!admin) return { error: { _form: ['No autorizado'] } }

  try {
    const existingUser = await prisma.user.findUnique({ where: { email: parsed.data.email }, select: { id: true } })
    if (existingUser) return { error: { email: ['Este usuario ya tiene una cuenta'] } }

    const existingToken = await prisma.inviteToken.findFirst({
      where: { email: parsed.data.email, usedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true },
    })
    if (existingToken) return { error: { email: ['Ya existe una invitacion activa para este correo'] } }

    const token = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    await prisma.inviteToken.create({
      data: { token, email: parsed.data.email, expiresAt, createdBy: admin.userId },
    })

    revalidatePath('/configuracion')
    return { success: true, token }
  } catch {
    return { error: { _form: ['No pudimos generar la invitacion'] } }
  }
}
```
Source: composition of `src/app/(app)/configuracion/actions.ts` (createCategory) + `src/app/(app)/ingresos/actions.ts` (requireAuth flow) + `src/actions/auth.ts` (AuthError handling).

### Pattern 2: Server-Side Token Validation in Page Component

**What:** `/register/page.tsx` resolves the token to one of four render states — all logic happens on the server before any HTML ships. D-19 says missing token → `notFound()`.
**When to use:** The `/register` page entry point.

```typescript
// src/app/(auth)/register/page.tsx
import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import prisma from '@/lib/prisma'
import RegisterForm from '@/components/auth/RegisterForm'
import TokenErrorScreen from '@/components/configuracion/TokenErrorScreen'

interface PageProps {
  searchParams: Promise<{ token?: string }>
}

export default async function RegisterPage({ searchParams }: PageProps) {
  await connection()
  const { token } = await searchParams
  if (!token) notFound()

  const row = await prisma.inviteToken.findUnique({ where: { token } })

  if (!row) return <TokenErrorScreen state="invalid" />
  if (row.usedAt !== null) return <TokenErrorScreen state="used" />
  if (row.expiresAt.getTime() < Date.now()) return <TokenErrorScreen state="expired" />

  return (
    <div className="max-w-sm w-full px-6">
      <h1 className="text-4xl font-semibold text-accent mb-2">Centik</h1>
      <p className="text-text-secondary text-sm mb-10">Crea tu cuenta para empezar</p>
      <RegisterForm email={row.email} token={row.token} />
    </div>
  )
}
```
Source: adapted from `src/app/(auth)/login/page.tsx` + Next.js 16.2.2 `notFound()` pattern from `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/not-found.md`.

### Pattern 3: Atomic User Creation + Token Consumption + Auto-Login

**What:** Use `prisma.$transaction` to create the User and mark the token used in one DB round-trip; then call `signIn` OUTSIDE the transaction (signIn triggers a redirect, which throws — do not wrap it in a try/catch that swallows it).
**When to use:** `registerAction` after Zod validation.

```typescript
// src/actions/auth.ts (addition)
import { AuthError } from 'next-auth'
import bcrypt from 'bcryptjs'
import { signIn } from '@/auth'
import prisma from '@/lib/prisma'
import { registerSchema } from '@/lib/validators'

type RegisterResult = { error?: Record<string, string[]> } | undefined

export async function registerAction(
  _prevState: RegisterResult,
  formData: FormData,
): Promise<RegisterResult> {
  const parsed = registerSchema.safeParse({
    email: formData.get('email'),
    name: formData.get('name'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
    token: formData.get('token'),
  })

  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  // Pre-check token (re-check inside transaction to prevent TOCTOU)
  try {
    const hashed = await bcrypt.hash(parsed.data.password, 12)

    await prisma.$transaction(async (tx) => {
      const token = await tx.inviteToken.findUnique({ where: { token: parsed.data.token } })
      if (!token) throw new Error('INVITE_INVALID')
      if (token.usedAt !== null) throw new Error('INVITE_USED')
      if (token.expiresAt.getTime() < Date.now()) throw new Error('INVITE_EXPIRED')
      if (token.email !== parsed.data.email) throw new Error('INVITE_EMAIL_MISMATCH')

      await tx.user.create({
        data: {
          email: parsed.data.email,
          name: parsed.data.name,
          hashedPassword: hashed,
          isApproved: true,
          isAdmin: false,
        },
      })

      await tx.inviteToken.update({
        where: { id: token.id },
        data: { usedAt: new Date() },
      })
    })
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('INVITE_')) {
      return { error: { _form: ['Este enlace ya no es valido'] } }
    }
    return { error: { _form: ['No pudimos crear tu cuenta. Intenta de nuevo.'] } }
  }

  // signIn throws NEXT_REDIRECT on success — do not swallow it
  try {
    await signIn('credentials', {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: '/',
    })
    return undefined
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: { _form: ['No pudimos iniciar sesion automaticamente'] } }
    }
    throw error // re-throw NEXT_REDIRECT
  }
}
```
Source: composes `src/actions/auth.ts` (loginAction NEXT_REDIRECT handling) + `prisma/seed.ts` (bcrypt cost 12) + `src/auth.ts` (signIn import).

### Pattern 4: Session Augmentation for isAdmin

**What:** Auth.js v5 uses module augmentation via `next-auth.d.ts` to extend `Session` and `JWT`. Because the project uses JWT session strategy, `isAdmin` must flow: DB → `authorize` return → `jwtCallback` (write to token) → `sessionCallback` (write to session.user) → components read `session.user.isAdmin`.
**When to use:** Schema migration wave, before admin UI can reliably check role.

```typescript
// src/types/next-auth.d.ts
import { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      isAdmin: boolean
    } & DefaultSession['user']
  }
  interface User {
    isAdmin?: boolean
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId?: string
    isAdmin?: boolean
  }
}
```

```typescript
// src/auth.ts (diffs)
// In authorizeUser -- add isAdmin to select + return:
const user = await prisma.user.findUnique({
  where: { email },
  select: { id: true, email: true, name: true, hashedPassword: true, isApproved: true, isAdmin: true },
})
// ...
return { id: user.id, email: user.email, name: user.name, isAdmin: user.isAdmin }

// In jwtCallback:
export async function jwtCallback({ token, user }: { token: JWT; user?: User | AdapterUser }) {
  if (user) {
    token.userId = user.id
    token.isAdmin = (user as User).isAdmin ?? false
  }
  return token
}

// In sessionCallback:
export async function sessionCallback({ session, token }: { session: Session; token: JWT }) {
  if (token.userId) session.user.id = token.userId as string
  if (typeof token.isAdmin === 'boolean') session.user.isAdmin = token.isAdmin
  return session
}
```
Source: extended from current `src/auth.ts` + `src/types/next-auth.d.ts`. [VERIFIED: read both files]

### Anti-Patterns to Avoid

- **Generating tokens with `Math.random()`:** Not cryptographically secure. Always `crypto.randomBytes`. REQUIREMENTS.md locks this.
- **Returning the raw token via API (JSON route):** This phase uses Server Actions exclusively — no API route receives or returns tokens. The token is rendered into the admin's DOM once (GeneratedUrlPanel) and logged to the Invitaciones list, never exposed as JSON.
- **Checking `session.user.isAdmin` in the client component only:** The client check is for UX (rendering the section). The Server Action must RE-check because a malicious client could call the action via direct RPC. See CVE-2025-29927 note in STATE.md.
- **Creating the User without a transaction:** If `inviteToken.update` fails after `user.create` succeeds, the token is still redeemable and the same User row blocks the email. Atomic via `$transaction`.
- **Wrapping `signIn` in a try/catch that swallows all errors:** `signIn` throws `NEXT_REDIRECT` (an internal Next.js error) on success. The pattern from `loginAction` — catch `AuthError` only, re-throw everything else — MUST be copied. [VERIFIED: src/actions/auth.ts line 31-34]
- **Storing `confirmPassword` in the DB:** Obvious but worth stating — `confirmPassword` is a form-only field that Zod `.refine()` compares against `password` and discards.
- **Using `findUnique` by `{ periodId_categoryId_userId }`-style composite for InviteToken:** InviteToken has no userId — the token IS the unique identifier. Use `findUnique({ where: { token } })`.
- **Client-side clipboard without fallback:** `navigator.clipboard.writeText` can fail (permissions, HTTP, older browsers). UI-SPEC calls for a toast on failure — implement the catch.
- **Relying on Prisma `P2002` for duplicate-user detection across the transaction:** Pre-check `existingUser` BEFORE creating — cleaner error messages and a shorter transaction. Keep the `P2002` catch as a defense-in-depth fallback.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cryptographically secure tokens | Custom CSPRNG wrapper | `randomBytes(32).toString('hex')` from `node:crypto` | Built-in, CSPRNG-backed, constant-time safe. Re-implementing adds bugs with no benefit. |
| Password hashing | Any custom hash (SHA*, scrypt wrapper) | `bcrypt.hash(pw, 12)` | Already locked in Phase 25 at cost 12; changing cost factor invalidates existing admin login |
| Email validation | Custom regex | `z.string().email()` / `z.email()` (Zod 4 shorthand) | Already used in `loginSchema`; covers RFC edge cases |
| Session token / cookie handling | Hand-rolled cookies | Auth.js `signIn('credentials')` | Sets JWT, updates cookie, triggers redirect — one call |
| Clipboard copy UX | Manual `execCommand('copy')` fallback | `navigator.clipboard.writeText(url)` + toast on rejection | Modern API is universally available in authenticated HTTPS contexts; this app is HTTPS-only in production |
| Form state machine | Reducer, useState spaghetti | `useActionState` from React 19 | Used by `LoginForm`, `CategoryForm`; the project standard |
| Status badge component | New primitive | Inline `rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[2px]` with `bg-{semantic}-subtle text-{semantic}` — matches `CategoryList`'s TYPE_DISPLAY pattern | UI-SPEC explicitly cites `CategoryList` badges as the reference pattern [CITED: 28-UI-SPEC.md] |
| Inline destructive confirmation | Modal + overlay | Two-button inline swap with 3s timeout — matches `CategoryRow` revoke pattern | UI-SPEC explicitly cites this as the phase-24 interaction pattern [CITED: 28-UI-SPEC.md] |
| Timestamp formatting | `toLocaleString` with manual options per place | A single helper `formatInviteDate(date)` in `src/lib/utils.ts` — one format for the URL panel (`DD MMM YYYY, HH:mm`), one for list sublabels (`DD MMM YYYY`) | Keeps copy consistent with UI-SPEC contract |

**Key insight:** Every primitive this phase needs already exists. The ONLY new files are wiring files (pages, forms, admin components, one helpers module). Resist the urge to build a "InviteService" class or a dedicated token lifecycle helper — the logic is short enough to live inline in the Server Actions.

## Runtime State Inventory

This phase is additive (new feature), not a rename or refactor — the inventory still matters because schema changes touch live data.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `User` table in dev and (eventually) prod Postgres — each row needs a new `isAdmin` column. Existing admin (ADMIN_EMAIL) must be updated to `isAdmin = true` post-migration. | Prisma migration adds column with `DEFAULT false`. Seed script update handles dev. Prod seed (Phase 30 DEPLOY-03) must include the same flip. |
| Live service config | None — no Docker Compose, Datadog, Tailscale, Cloudflare Tunnel, n8n, etc. referenced in this project. | None. Verified by grep for `docker-compose`, `datadog`, `tailscale` in project — none beyond `docker-compose.yml` for local Postgres. |
| OS-registered state | None — no Task Scheduler, launchd, pm2, or systemd units reference this project's entities. | None. |
| Secrets and env vars | `ADMIN_EMAIL` (used in seed to identify admin) — already exists, no rename. `DATABASE_URL` — unchanged. No new secrets needed. | None. |
| Build artifacts / installed packages | `generated/prisma/client` — will regenerate after `isAdmin` migration via `prisma generate` (already in `postinstall`). Existing JWT tokens in `session` cookies will NOT have `isAdmin` — existing users must re-login OR the sessionCallback must default `isAdmin: false` when `token.isAdmin` is absent. | `sessionCallback` already uses `typeof token.isAdmin === 'boolean'` pattern in the proposed diff — absent tokens fall through to `undefined`, which client code must defensively treat as `false`. |

**TOCTOU note on token redemption:** Between the Server Component's token lookup at `/register/page.tsx` and the Server Action's transaction, a second tab with the same URL could race. The transaction block re-reads the token inside the transaction and throws `INVITE_USED` if `usedAt !== null`. Postgres READ COMMITTED isolation (Prisma default) is sufficient because the `inviteToken.update` sets `usedAt` atomically — the second transaction reads the already-updated row. [HIGH confidence — standard Postgres semantics]

## Common Pitfalls

### Pitfall 1: signIn() Throws NEXT_REDIRECT — Do Not Swallow
**What goes wrong:** `await signIn('credentials', { redirectTo: '/' })` succeeds by throwing an internal `NEXT_REDIRECT` error. If wrapped in `try { ... } catch (e) { return error }`, the redirect is eaten and the user sees nothing or a stuck loading state.
**Why it happens:** Next.js uses thrown errors for redirect/notFound — it's how the router intercepts rendering.
**How to avoid:** Copy the exact pattern from `loginAction`: catch `AuthError` only, re-throw everything else. The existing test `src/actions/auth.test.ts` has a test case `'re-throws non-AuthError exceptions'` that should be mirrored in `registerAction` tests.
**Warning signs:** Cypress/Playwright test where the form submits, spinner spins forever, no redirect — that's almost always a swallowed redirect.

### Pitfall 2: TOCTOU Between Page Render and Form Submission
**What goes wrong:** User opens the invite URL, validates token server-side (page renders), walks away, opens the URL in a second browser, registers there first. Now the first tab submits — token is used — creates a second orphaned user or duplicate-email error.
**Why it happens:** Time gap between page render (token valid) and action submission (token used elsewhere).
**How to avoid:** Re-check the token INSIDE the transaction in `registerAction`. The pattern in Pattern 3 above does exactly this — throws `INVITE_USED`. Also catch the Prisma `P2002` on user.create for defense-in-depth (race with another user using a DIFFERENT token for the same email — unlikely but possible).
**Warning signs:** "Flaky" integration tests where a token appears valid then suddenly isn't — usually means two tests hitting the same token.

### Pitfall 3: JWT Missing `isAdmin` for Pre-Existing Sessions
**What goes wrong:** The current admin is already logged in with a JWT that predates this phase. After deploying the `isAdmin` changes, `session.user.isAdmin` is `undefined` (not `true`) until the token refreshes.
**Why it happens:** JWT callbacks only fire on sign-in or token rotation; existing tokens are passed through unchanged.
**How to avoid:** Treat `undefined` as `false` in client checks (`if (session.user.isAdmin)` works correctly for both `false` and `undefined`). Document in Phase 28 summary that the admin must sign out + sign back in once after deployment. In the sessionCallback, also fetch from DB as a fallback:
```typescript
// optional robustness: if token.isAdmin is undefined, re-query DB once
if (typeof token.isAdmin !== 'boolean' && token.userId) {
  const fresh = await prisma.user.findUnique({ where: { id: token.userId as string }, select: { isAdmin: true } })
  session.user.isAdmin = fresh?.isAdmin ?? false
} else if (typeof token.isAdmin === 'boolean') {
  session.user.isAdmin = token.isAdmin
}
```
This adds a DB read per request — acceptable for this app's scale but flag it as a tradeoff.
**Warning signs:** Admin complains "I don't see the Invitaciones section" — first fix is log out, log back in.

### Pitfall 4: `notFound()` Returns `never` but ESLint May Complain
**What goes wrong:** Developer adds `if (!token) { notFound(); return null }` — the `return null` is unreachable but ESLint sometimes flags the function as potentially returning `undefined`.
**Why it happens:** TypeScript correctly infers `notFound` as returning `never`, but the habit of adding a return statement leaks in.
**How to avoid:** Just call `notFound()` — no return needed. Docs confirm: "does not require you to use `return notFound()` due to using the TypeScript `never` type." [CITED: node_modules/next/dist/docs/01-app/03-api-reference/04-functions/not-found.md, line 33]
**Warning signs:** Unreachable-code lint warnings on the line after `notFound()`.

### Pitfall 5: Clipboard API Requires Secure Context
**What goes wrong:** `navigator.clipboard.writeText(url)` throws on HTTP pages, non-user-gesture calls, or older browsers. If the button handler doesn't catch, the user sees nothing happen.
**Why it happens:** The Clipboard API requires HTTPS + transient user activation.
**How to avoid:** Wrap in try/catch; on failure, show the sonner toast `'No pudimos copiar el enlace'` per UI-SPEC line 234. In dev over localhost, clipboard works fine (localhost is a secure context), so this is only a prod concern.
**Warning signs:** "Copy doesn't work on staging" — check HTTPS first.

### Pitfall 6: Zod `.refine()` Error Path for Password Mismatch
**What goes wrong:** `schema.refine((d) => d.password === d.confirmPassword, { message: 'no match' })` puts the error on the ROOT of the object, not on `confirmPassword`. `flatten().fieldErrors` then contains no entry for `confirmPassword` — the user gets a form-level error instead of a field-level one.
**Why it happens:** Default path is the root.
**How to avoid:** Always supply `path: ['confirmPassword']`:
```typescript
export const registerSchema = z.object({
  token: z.string().min(1),
  email: z.string().email(),
  name: z.string().min(1, { error: 'Ingresa tu nombre' }),
  password: z.string().min(8, { error: 'Usa al menos 8 caracteres' }).regex(/\d/, { error: 'Incluye al menos un numero' }),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  error: 'Las contrasenas no coinciden',
  path: ['confirmPassword'],
})
```
**Warning signs:** Tests asserting `result.error.confirmPassword` fail — the error is on `result.error._errors` instead.

### Pitfall 7: Revocation Strategy — `usedAt` vs. Dedicated Field
**What goes wrong:** D-05 lets Claude pick: set `usedAt` with a sentinel, add `revokedAt`, or delete. Each has downsides:
- **Delete:** Loses audit trail; the admin can't see "Revocada" in the list because the row is gone.
- **Dedicated `revokedAt` field:** Requires a schema migration beyond what's already planned.
- **Reuse `usedAt`:** Simplest, no migration, but conflates "used for registration" with "revoked" — the list rendering must derive "revoked vs used" from `User` row existence (if no User with this email, it was revoked not used).
**Recommendation:** Add a `revokedAt DateTime?` field to InviteToken now (one-line schema addition, ships with the same migration as User.isAdmin). Cleaner status derivation:
```typescript
function tokenStatus(t: InviteToken): 'pending' | 'used' | 'expired' | 'revoked' {
  if (t.revokedAt) return 'revoked'
  if (t.usedAt) return 'used'
  if (t.expiresAt < new Date()) return 'expired'
  return 'pending'
}
```
This is tagged `[ASSUMED]` pending planner/user confirmation.
**Warning signs:** Confusing list UX where a revoked token shows as "Usada".

### Pitfall 8: Proxy.ts Redirects Authenticated Users Away From /register
**What goes wrong:** The current `src/proxy.ts` at line 12-14 redirects authenticated users away from `/login` and `/register` to `/`. That means an admin who accidentally clicks an invite URL (while logged in) gets bounced home without seeing the error.
**Why it happens:** The matcher explicitly includes `/register` in `publicPaths` and redirects if `req.auth` is truthy.
**How to avoid:** Existing behavior is actually correct per typical UX (logged-in users shouldn't register again). But flag it: if an admin needs to test `/register` flows, they must log out first. No code change needed — just a verification note. [VERIFIED: read src/proxy.ts line 10-17]
**Warning signs:** Admin says "the invite URL doesn't work" — ask if they're logged in.

### Pitfall 9: Next.js 16 `searchParams` Is a Promise
**What goes wrong:** Using `searchParams.token` directly throws because it's wrapped in a Promise in Next.js 15+.
**Why it happens:** Next.js 15 made `params` and `searchParams` async for future streaming.
**How to avoid:** Type as `Promise<{ token?: string }>` and `await` it — pattern already in use at `src/app/(app)/page.tsx` line 20+28. [VERIFIED: read src/app/(app)/page.tsx]

## Code Examples

### Generate 32-byte hex token
```typescript
import { randomBytes } from 'node:crypto'
const token = randomBytes(32).toString('hex') // 64-char hex string
```
Source: Node.js standard library [CITED: Node.js crypto docs — randomBytes]

### Zod schemas (validators.ts additions)
```typescript
// Validates POST from InvitacionForm
export const createInviteSchema = z.object({
  email: z
    .string({ error: 'El correo es requerido' })
    .email({ error: 'Correo no valido' })
    .trim(),
})

// Validates POST from RegisterForm
export const registerSchema = z
  .object({
    token: z.string({ error: 'Token requerido' }).min(1),
    email: z.string({ error: 'El correo es requerido' }).email({ error: 'Correo no valido' }).trim(),
    name: z.string({ error: 'Ingresa tu nombre' }).min(1, { error: 'Ingresa tu nombre' }).trim(),
    password: z
      .string({ error: 'La contrasena es requerida' })
      .min(8, { error: 'Usa al menos 8 caracteres' })
      .regex(/\d/, { error: 'Incluye al menos un numero' }),
    confirmPassword: z.string({ error: 'Confirma la contrasena' }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    error: 'Las contrasenas no coinciden',
    path: ['confirmPassword'],
  })
```
Source: composed from `src/lib/validators.ts` loginSchema + Phase 28 CONTEXT D-14, D-15.

### Prisma $transaction for atomic register
```typescript
await prisma.$transaction(async (tx) => {
  const token = await tx.inviteToken.findUnique({ where: { token: parsed.data.token } })
  if (!token || token.usedAt || token.expiresAt < new Date() || token.email !== parsed.data.email) {
    throw new Error('INVITE_INVALID')
  }
  await tx.user.create({
    data: {
      email: parsed.data.email,
      name: parsed.data.name,
      hashedPassword: await bcrypt.hash(parsed.data.password, 12),
      isApproved: true,
      isAdmin: false,
    },
  })
  await tx.inviteToken.update({ where: { id: token.id }, data: { usedAt: new Date() } })
})
```
Source: Prisma docs pattern — interactive transaction with `$transaction(async (tx) => ...)` — a Prisma standard for read-then-write atomicity [CITED: Prisma docs, interactive transactions]

### Building the full registration URL server-side
```typescript
// src/lib/invite-utils.ts
export function buildInviteUrl(origin: string, token: string): string {
  return `${origin}/register?token=${token}`
}
```

In the Server Action, derive the origin from the `next/headers` `headers()` host — or (simpler, since this is a single-tenant app) from `process.env.NEXT_PUBLIC_APP_URL`. Given D-17 doesn't lock this and the app has no such env var today, using `headers()` keeps the code portable:
```typescript
import { headers } from 'next/headers'
const h = await headers()
const origin = `${h.get('x-forwarded-proto') ?? 'http'}://${h.get('host')}`
```
[ASSUMED] — project does not currently set `NEXT_PUBLIC_APP_URL`; `headers()` approach is the safer default.

### RegisterForm (client component skeleton, matches LoginForm pattern)
```tsx
'use client'
import { useActionState, useState } from 'react'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import FloatingInput from '@/components/ui/FloatingInput'
import { registerAction } from '@/actions/auth'

interface RegisterFormProps {
  email: string
  token: string
}

export default function RegisterForm({ email, token }: RegisterFormProps) {
  const [state, action, isPending] = useActionState(registerAction, undefined)
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="email" value={email} />
      <FloatingInput label="Correo electronico" type="email" name="email" value={email} onChange={() => {}} disabled />
      <FloatingInput label="Nombre" type="text" name="name" value={name} onChange={setName} autoFocus error={state?.error?.name?.[0]} />
      <div className="relative">
        <FloatingInput label="Contrasena" type={showPw ? 'text' : 'password'} name="password" value={password} onChange={setPassword} error={state?.error?.password?.[0]} />
        <button type="button" onClick={() => setShowPw((p) => !p)} className="absolute right-0 top-2 p-1 text-text-tertiary" aria-label={showPw ? 'Ocultar contrasena' : 'Mostrar contrasena'}>
          {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
        <p className="mt-1 text-[11px] text-text-tertiary">Minimo 8 caracteres, incluye al menos un numero</p>
      </div>
      <div className="relative">
        <FloatingInput label="Confirmar contrasena" type={showConfirm ? 'text' : 'password'} name="confirmPassword" value={confirm} onChange={setConfirm} error={state?.error?.confirmPassword?.[0]} />
        <button type="button" onClick={() => setShowConfirm((p) => !p)} className="absolute right-0 top-2 p-1 text-text-tertiary" aria-label={showConfirm ? 'Ocultar contrasena' : 'Mostrar contrasena'}>
          {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {state?.error?._form && <p className="text-sm text-negative">{state.error._form[0]}</p>}
      <button type="submit" disabled={isPending} className="w-full rounded-full bg-accent text-bg font-semibold py-3 transition-all duration-200 hover:bg-accent-hover disabled:opacity-50">
        {isPending ? (
          <span className="flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" />Creando cuenta...</span>
        ) : 'Crear cuenta'}
      </button>
    </form>
  )
}
```
Source: directly adapted from `src/components/auth/LoginForm.tsx` [VERIFIED: read in full]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Auth.js v4 `useSession` in layouts | Auth.js v5 `auth()` helper in Server Components | 2024 (v5 GA for Next 14, beta for Next 16) | Our code already uses the v5 pattern; reinforced in Phase 26/27 |
| Next.js 14 `searchParams` sync object | Next.js 15+ `searchParams: Promise<...>` | Next 15 (Nov 2024) | Already handled in project (e.g., `src/app/(app)/page.tsx:20`) |
| `nextAuthMiddleware` from v4 | `auth` as proxy wrapper + `proxy.ts` (Next 16 naming) | Next 16 (Mar 2025) | Already in place at `src/proxy.ts` |
| `redirect()` inside try/catch | `redirect()` + `NEXT_REDIRECT` re-throw pattern | Next 13+ | Documented in `src/actions/auth.ts` line 31-34 |
| Storing isAdmin in a separate Role table | Boolean flag on User model | — | Phase 28 D-02 picks the simpler approach — correct for a 1-2 admin app |

**Deprecated/outdated:**
- Auth.js v4 `[...nextauth].ts` catchall API route — replaced by `{ handlers } = NextAuth(...)` export + App Router route handler.
- `middleware.ts` → renamed to `proxy.ts` in Next.js 16. [VERIFIED: project file is `src/proxy.ts`]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Adding `revokedAt DateTime?` to InviteToken is cleaner than reusing `usedAt` as a sentinel. Planner should confirm or stick with reusing `usedAt`. | Pitfall #7, Schema changes | LOW — affects one field in one table; both approaches work, recommendation is for code clarity. |
| A2 | Using `headers()` to derive origin for the invite URL (no `NEXT_PUBLIC_APP_URL` env var exists yet). | Code Examples / Build URL | LOW — if planner prefers explicit env var, a new `NEXT_PUBLIC_APP_URL` can be added to `.env.example` and consumed directly. |
| A3 | The existing sessionCallback pattern (typeof-check) is sufficient for rolling out `isAdmin` without forcing existing sessions to log out. Admin with a pre-phase-28 JWT will see `session.user.isAdmin === undefined`, which client code treats as falsy. | Pitfall #3 | LOW — worst case admin logs out and back in; documented in pitfall. |
| A4 | `prisma.$transaction(async (tx) => ...)` with default READ COMMITTED isolation is sufficient to prevent double-redemption races. No need to bump to SERIALIZABLE. | Runtime State Inventory TOCTOU note + Pitfall #2 | LOW — Postgres default isolation handles this correctly because the second transaction sees the already-updated row; only risk is extreme concurrency that won't occur with admin-invited users. |
| A5 | Admin check in Server Actions is a simple `prisma.user.findUnique({ select: { isAdmin } })` call (not reading from the session). The session isAdmin is for UI rendering only. | Pattern 1 `requireAdmin()` | LOW — adds one DB read per admin action, but guarantees correctness if DB is updated outside the token refresh cycle. Alternative: trust `session.user.isAdmin` (faster, but stale until re-login). |

## Open Questions

1. **Does the revoke action need a confirmation before the inline two-button state?**
   - What we know: UI-SPEC line 177-188 says inline two-button pattern matching CategoryRow; CategoryRow itself has no pre-confirmation modal.
   - What's unclear: Nothing unclear, but worth explicitly noting — a revoke is soft (just sets a timestamp), and pending tokens that get revoked can be re-generated with a new email. No pre-confirmation modal, matching the phase-24 interaction pattern.
   - Recommendation: Match CategoryRow exactly; no extra confirmation.

2. **Should the `/register` page use `noStore()` or `connection()` to prevent caching?**
   - What we know: `connection()` is already the project pattern for `(app)` routes (e.g., `src/app/(app)/page.tsx` line 24). Its purpose is to force dynamic rendering.
   - What's unclear: `/register` is a public route with user-specific data in the token row. If Next.js cached the rendered page per URL, two different tokens would render two different cached pages (safe), but the token row data changes over time (expiresAt approaches, usedAt might flip).
   - Recommendation: Use `await connection()` at the top of `/register/page.tsx` to force dynamic rendering. Matches the project pattern and sidesteps cache questions entirely.

3. **Does Auth.js v5 beta 31 have any known issues with `redirectTo` after a user is just created?**
   - What we know: beta 31 (versioned 5.0.0-beta.31 in package.json). Phase 26 successfully uses `redirectTo: '/movimientos'` and `redirectTo: '/'`. No known issues for credentials + redirect in the phase 26 tests.
   - What's unclear: Whether the PrismaAdapter needs a tick to register the newly-created User before `signIn` can find it. In practice this is handled because `signIn('credentials', ...)` calls `authorizeUser` which queries Prisma — the user is already committed by the time $transaction resolves.
   - Recommendation: No action needed; the pattern is battle-tested in phase 26. Add an integration test that creates a user and immediately signs in to confirm.

4. **Should `createInviteToken` return the token (for immediate display) or just trigger a list re-fetch?**
   - What we know: UI-SPEC shows the generated URL appearing in a `GeneratedUrlPanel` "directly under the form" after creation (line 154).
   - What's unclear: Whether the client re-fetches the list (revalidatePath) and pulls the token from the list, or whether the action returns the token string directly.
   - Recommendation: Return `{ success: true, token: string }` from the action. The client stores this in local state to render the GeneratedUrlPanel; the revalidatePath call simultaneously refreshes the list below. Both mechanisms converge. `token` is NOT a secret from the admin — they just created it.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js 20+ (for `node:crypto.randomBytes`) | Token generation | ✓ | project targets Node 20 (Next 16 requires it) | — |
| PostgreSQL 16 (dev via docker-compose.yml) | All Prisma queries | ✓ | 16-alpine per CLAUDE.md | — |
| Prisma CLI (`prisma migrate dev`) | `isAdmin` migration | ✓ | `latest` in devDependencies | — |
| Playwright (for optional E2E) | E2E test for register+login flow | ✓ | `latest` in devDependencies | — |
| Sonner toasts root provider | Admin action toasts | ✓ | already in root layout per CLAUDE.md | — |
| HTTPS context (for Clipboard API in prod) | Copy URL button | runtime dependency | depends on deploy (Phase 30) | Show `'No pudimos copiar el enlace'` toast on failure (already in UI-SPEC) |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** Clipboard API is only available in HTTPS contexts in prod (localhost is a secure context for dev). Fallback is the sonner error toast — already in UI-SPEC line 234.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.x (`latest`) for unit + integration; Playwright (`latest`) for e2e |
| Config file | `vitest.config.ts` (unit), `vitest.integration.config.mts` (integration) |
| Quick run command | `npm run test:run` |
| Full suite command | `npm run quality` (build + lint + format:check + test:run) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| INVITE-02 | `createInviteToken` produces a 64-char hex token and persists an InviteToken row with correct email, expiresAt (7d), createdBy | unit | `npm run test:run -- src/app/(app)/configuracion/invite-actions.test.ts` | ❌ Wave 0 |
| INVITE-02 | `createInviteToken` is rejected for non-admin callers (simulate session without isAdmin) | unit | `npm run test:run -- src/app/(app)/configuracion/invite-actions.test.ts -t "rejects non-admin"` | ❌ Wave 0 |
| INVITE-02 | `createInviteToken` rejects duplicate active tokens for same email | unit | same file, describe block | ❌ Wave 0 |
| INVITE-02 | `createInviteToken` rejects emails that already belong to a User | unit | same file, describe block | ❌ Wave 0 |
| INVITE-02 | End-to-end token generation creates a row in Postgres and the row is readable by the admin | integration | `npm run test:integration -- tests/integration/invite-tokens.test.ts` | ❌ Wave 0 |
| INVITE-03 | `/register?token=<valid>` renders the form with pre-filled, locked email | unit/RTL | `npm run test:run -- src/app/(auth)/register/page.test.tsx` | ❌ Wave 0 |
| INVITE-03 | `registerAction` creates a User with `isApproved: true`, `isAdmin: false`, and hashes the password at cost 12 | unit | `npm run test:run -- src/actions/auth.test.ts -t "registerAction"` | ❌ Wave 0 (file exists, test missing) |
| INVITE-03 | `registerAction` marks `InviteToken.usedAt` to now() on success (atomic via $transaction) | integration | `npm run test:integration -- tests/integration/registration.test.ts` | ❌ Wave 0 |
| INVITE-03 | `registerAction` calls signIn('credentials') with correct redirectTo on success | unit | `npm run test:run -- src/actions/auth.test.ts -t "registerAction.*signIn"` | ❌ Wave 0 |
| INVITE-04 | `/register` without `?token=` calls `notFound()` | unit/RTL | `npm run test:run -- src/app/(auth)/register/page.test.tsx -t "no token"` | ❌ Wave 0 |
| INVITE-04 | `/register?token=doesnotexist` renders `<TokenErrorScreen state="invalid">` | unit/RTL | same file, "invalid" | ❌ Wave 0 |
| INVITE-04 | `/register?token=expired` renders `<TokenErrorScreen state="expired">` | unit/RTL | same file, "expired" | ❌ Wave 0 |
| INVITE-04 | `/register?token=used` renders `<TokenErrorScreen state="used">` | unit/RTL | same file, "used" | ❌ Wave 0 |
| (phase smoke) | Full admin-generates-token → invitee-registers-and-logs-in flow | e2e | `npm run test:e2e -- e2e/invite-registration.spec.ts` | ❌ Wave 0 (optional — high value) |

### Sampling Rate
- **Per task commit:** `npm run test:run -- <changed-file-area>` (sub-5s feedback)
- **Per wave merge:** `npm run test:run` + `npm run test:integration` (fully automated, ~30s)
- **Phase gate:** `npm run quality` green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/app/(app)/configuracion/invite-actions.test.ts` — covers INVITE-02 (admin gating, token shape, conflict errors)
- [ ] `src/app/(auth)/register/page.test.tsx` — covers INVITE-03 + INVITE-04 (token states, render branches)
- [ ] `src/actions/auth.test.ts` additions — covers INVITE-03 (registerAction success, validation errors, signIn call, NEXT_REDIRECT re-throw)
- [ ] `tests/integration/invite-tokens.test.ts` — creates a token via real Prisma, asserts row, tests duplicate-email rejection
- [ ] `tests/integration/registration.test.ts` — creates a token, invokes registerAction with mocked signIn, asserts User row + InviteToken.usedAt flip atomically
- [ ] `e2e/invite-registration.spec.ts` (optional) — click-through flow; requires a seeded admin + token in test DB
- [ ] Shared test helper: `tests/helpers.ts` (if not present) should expose `createTestAdminUser()` and `createTestInviteToken()` fixtures — check if `tests/setup.ts` already covers this; extend if needed

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Auth.js v5 Credentials provider with bcryptjs cost 12 (existing); `signIn('credentials')` after registration |
| V3 Session Management | yes | JWT session strategy (existing); `isAdmin` flows through jwtCallback + sessionCallback |
| V4 Access Control | yes | `requireAuth()` + per-action admin check (`requireAdmin()` pattern above); proxy.ts public allowance for `/register` only |
| V5 Input Validation | yes | Zod: `createInviteSchema`, `registerSchema` — server-side validation before any DB write (CLAUDE.md mandate) |
| V6 Cryptography | yes | `crypto.randomBytes(32)` (CSPRNG from Node built-in) — never hand-roll; bcryptjs 3.0.3 for password hashing |

### Known Threat Patterns for Auth.js + Next.js 16 + Postgres + Prisma

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| CVE-2025-29927: middleware bypass via direct RPC to Server Actions | Elevation of Privilege | `requireAuth()` (existing) + admin re-check in every invite action — defense-in-depth even if proxy.ts is bypassed (STATE.md confirms this is phase 27's locked decision) |
| Timing attack on token validation (`findUnique({ where: { token } })` is index-lookup constant-time-ish but `===` on returned value is short-circuited in JS) | Information disclosure | 32-byte random = 256 bits of entropy; an attacker has ~0% chance of brute-forcing. Timing comparison of the token itself is moot because the lookup is DB-side. Not a real threat for this scale. |
| Token harvesting via URL leakage (Referer header, browser history, analytics) | Information disclosure | Server-side single-use enforcement: once `usedAt` is set, the token is dead. `expiresAt` 7-day window limits exposure. Admin must share via private channel (assumed — out of scope per CONTEXT deferred). |
| IDOR on revokeInviteToken (admin A revokes admin B's token) | Tampering | Only one admin in the single-admin trust model (v3.0). If multi-admin is added later (deferred in CONTEXT), revoke must scope by `createdBy: userId`. Document as a TODO in code if code is multi-admin-ready. Recommendation for now: include `{ where: { id: tokenId } }` with optional `createdBy: userId` filter for future-proofing. |
| Email enumeration via `createInviteToken` error messages | Information disclosure | Current recommendation returns field-specific errors for both "existing user" and "active token" — this leaks that an email is registered. For a single-admin invite system this is acceptable (admin already knows their user list). Document as a deliberate choice, not an oversight. |
| Brute-force / credential stuffing on `/login` after user creation | Spoofing | TOTP-05 rate limiting is in Phase 29 (deferred). This phase inherits the existing login path — no change in threat posture. |
| XSS via admin-entered email reflected in the generated URL panel | Tampering | Email is a form input validated by `z.email()` which rejects non-email characters. React auto-escapes when rendered. Double-check: the URL displayed in `GeneratedUrlPanel` is a `text` node, not injected via `dangerouslySetInnerHTML`. |
| CSRF on Server Actions | Tampering | Next.js 16 Server Actions include built-in CSRF protection via origin checks — no additional mitigation needed [CITED: Next.js 16 security-headers docs, Server Actions origin check] |
| Password rules bypass via client-only validation | Spoofing | Zod runs server-side in `registerAction` (same pattern as all other actions — CLAUDE.md mandate). Client validation is UX only. |
| Unauthenticated enumeration of valid tokens | Information disclosure | 32-byte random = 2^256 token space. No enumeration feasible. |

## Sources

### Primary (HIGH confidence)
- `/Users/freptar0/Desktop/Projects/centik/src/auth.ts` — Auth.js v5 config (JWT, session callbacks, authorizeUser)
- `/Users/freptar0/Desktop/Projects/centik/src/lib/auth-utils.ts` — requireAuth() contract
- `/Users/freptar0/Desktop/Projects/centik/src/actions/auth.ts` — loginAction / NEXT_REDIRECT pattern
- `/Users/freptar0/Desktop/Projects/centik/src/app/(auth)/login/page.tsx` — (auth) route group layout wrapper usage
- `/Users/freptar0/Desktop/Projects/centik/src/components/auth/LoginForm.tsx` — useActionState + FloatingInput + Loader2 reference
- `/Users/freptar0/Desktop/Projects/centik/src/app/(app)/configuracion/actions.ts` + `actions.test.ts` — Server Action pattern + test harness (mocks)
- `/Users/freptar0/Desktop/Projects/centik/src/app/(app)/ingresos/actions.ts` — ActionResult shape with `findFirst` IDOR pattern
- `/Users/freptar0/Desktop/Projects/centik/src/components/categories/CategoryList.tsx` + `CategoryForm.tsx` — inline destructive confirm + form pattern
- `/Users/freptar0/Desktop/Projects/centik/prisma/schema.prisma` — InviteToken + User model
- `/Users/freptar0/Desktop/Projects/centik/prisma/seed.ts` — seedAdminUser + bcrypt cost 12
- `/Users/freptar0/Desktop/Projects/centik/src/proxy.ts` — public path rules
- `/Users/freptar0/Desktop/Projects/centik/src/types/next-auth.d.ts` — module augmentation pattern
- `/Users/freptar0/Desktop/Projects/centik/node_modules/next/dist/docs/01-app/03-api-reference/04-functions/not-found.md` — Next.js 16.2.2 notFound() docs (bundled in repo)
- `/Users/freptar0/Desktop/Projects/centik/node_modules/next-auth/index.d.ts` lines 212-263 — signIn signature and redirectTo contract
- `/Users/freptar0/Desktop/Projects/centik/.planning/phases/28-invite-only-registration/28-UI-SPEC.md` — copy, layout, status badges, timing contract
- `/Users/freptar0/Desktop/Projects/centik/.planning/phases/28-invite-only-registration/28-CONTEXT.md` — all decisions D-01 through D-20
- `/Users/freptar0/Desktop/Projects/centik/.planning/REQUIREMENTS.md` — INVITE-02/03/04 text
- `/Users/freptar0/Desktop/Projects/centik/package.json` — all dependency versions

### Secondary (MEDIUM confidence)
- Node.js `crypto.randomBytes` — behavior documented in Node stdlib, verified by common usage pattern

### Tertiary (LOW confidence)
- None — every claim in this research is verified against repo code or bundled docs.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every package + version read from `node_modules/*/package.json`
- Architecture: HIGH — patterns directly adapted from 3 existing Server Action files + 2 existing forms
- Pitfalls: HIGH — drawn from reading actual existing code (e.g., NEXT_REDIRECT re-throw in `src/actions/auth.ts:34`) and Next.js 16 bundled docs
- Security: HIGH for code-level controls; MEDIUM for future-looking threats (multi-admin IDOR) where the single-admin assumption is locked in v3.0

**Research date:** 2026-04-18
**Valid until:** 2026-05-18 (30 days — stable stack, no fast-moving components involved)
