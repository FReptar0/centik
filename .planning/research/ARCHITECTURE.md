# Architecture Research

**Domain:** Auth + Cloud Deploy — NextAuth v5 into existing Next.js 16 App Router / Prisma 7 app
**Researched:** 2026-04-15
**Confidence:** HIGH (official Auth.js docs, Prisma docs, codebase read, multiple current sources)

---

## System Overview

### Before (single-user, no auth)

```
┌────────────────────────────────────────────────────────────────┐
│  Browser                                                        │
│  Any URL → App loads directly → Data unscoped (global)         │
└───────────────────────────────────┬────────────────────────────┘
                                    │ HTTP
┌───────────────────────────────────▼────────────────────────────┐
│  Next.js 16 App Router                                          │
│  ┌─────────────────┐  ┌──────────────────────────────────────┐ │
│  │  Server Pages   │  │  Server Actions ('use server')       │ │
│  │  (data queries) │  │  (mutations, revalidatePath)         │ │
│  └────────┬────────┘  └─────────────┬────────────────────────┘ │
│           │                         │                           │
│  ┌────────▼─────────────────────────▼────────────────────────┐ │
│  │  src/lib/{dashboard,income,debt,history,period,budget}.ts  │ │
│  │  Direct Prisma queries — no userId filter                  │ │
│  └────────────────────────┬───────────────────────────────────┘ │
└───────────────────────────┼─────────────────────────────────────┘
                            │ Prisma 7 + PrismaPg adapter
┌───────────────────────────▼─────────────────────────────────────┐
│  PostgreSQL (Docker dev)                                         │
│  10 models — no User model                                       │
└──────────────────────────────────────────────────────────────────┘
```

### After (multi-user auth, per-user isolation, Vercel + Prisma Postgres)

```
┌────────────────────────────────────────────────────────────────┐
│  Browser                                                        │
│  Unauthenticated → /login redirect via proxy.ts                │
│  Authenticated → session cookie (JWT, httpOnly)                │
└───────────────────────────────────┬────────────────────────────┘
                                    │ HTTPS
┌───────────────────────────────────▼────────────────────────────┐
│  Next.js 16 proxy.ts (formerly middleware.ts)                   │
│  export { auth as proxy } from "@/lib/auth"                     │
│  Matcher: all routes except /login, /api/auth/*, static assets  │
│  → Redirects unauthenticated users to /login                    │
│  → Refreshes session cookie on every request                    │
└───────────────────────────────────┬────────────────────────────┘
                                    │ (passes through only authenticated)
┌───────────────────────────────────▼────────────────────────────┐
│  Next.js 16 App Router                                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  src/app/login/page.tsx  (public, NOT in proxy matcher)  │  │
│  │  src/app/api/auth/[...nextauth]/route.ts  (Auth.js)      │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Protected pages (all existing routes)                    │  │
│  │  Each Server Component calls:                             │  │
│  │    const session = await auth()                           │  │
│  │    if (!session) redirect('/login')  ← defense in depth  │  │
│  └────────────────────────┬─────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Server Actions — ALL must call auth() and verify        │  │
│  │  session before touching DB (proxy does NOT cover them)  │  │
│  └────────────────────────┬─────────────────────────────────┘  │
└───────────────────────────┼─────────────────────────────────────┘
                            │ userId injected into every Prisma query
┌───────────────────────────▼─────────────────────────────────────┐
│  src/lib/{dashboard,income,debt,history,period,budget}.ts        │
│  All query functions accept userId param → WHERE userId = ?      │
└───────────────────────────┬──────────────────────────────────────┘
                            │ Prisma 7 + PrismaPg adapter
┌───────────────────────────▼──────────────────────────────────────┐
│  Prisma Postgres (Vercel)  — production                           │
│  PostgreSQL (Docker)       — dev / test (unchanged)               │
│  +User model, all 10 existing models get userId FK               │
└───────────────────────────────────────────────────────────────────┘
```

---

## Component Responsibilities

| Component | Responsibility | Notes |
|-----------|---------------|-------|
| `proxy.ts` | Redirect unauthenticated users to `/login`, refresh session cookie | Next.js 16 renamed middleware.ts to proxy.ts; export auth from Auth.js as proxy |
| `src/lib/auth.ts` | NextAuth v5 configuration: credentials provider, callbacks, Prisma adapter, session strategy | Single source of truth for auth config; exports `auth`, `handlers`, `signIn`, `signOut` |
| `src/app/api/auth/[...nextauth]/route.ts` | Auth.js catch-all route handler | Two lines: import `{ handlers }` from `@/lib/auth`, export `{ GET, POST } = handlers` |
| `src/app/login/page.tsx` | Login form (email + password, TOTP step) | Client component; calls Server Action to sign in |
| `src/app/login/actions.ts` | `signInAction()` Server Action — calls Auth.js `signIn()` | Must be `'use server'`; handles credential validation + TOTP check |
| `src/lib/auth-utils.ts` | `requireAuth()` helper — calls `auth()`, throws/redirects if no session | Used at top of every Server Component page and Server Action |
| `src/lib/{dashboard,income,etc}.ts` | All data-fetch functions — add `userId: string` param, inject into all WHERE clauses | Pure additive change to function signatures |
| `src/app/**/actions.ts` | All Server Actions — call `requireAuth()` at top, pass userId to lib functions | Security-critical: proxy does NOT protect Server Actions |
| Prisma schema | Add `User` model + `userId` FK on all 10 existing models | Schema migration is the highest-risk change |

---

## New Files vs Modified Files

### New Files (create from scratch)

| File | Purpose |
|------|---------|
| `src/lib/auth.ts` | NextAuth v5 config — credentials provider, TOTP check, callbacks, Prisma adapter |
| `src/lib/auth-utils.ts` | `requireAuth()` helper + typed session accessor used across all pages/actions |
| `proxy.ts` | Export `{ auth as proxy }` from `@/lib/auth` + matcher config (root-level file, not in src/) |
| `src/app/api/auth/[...nextauth]/route.ts` | Auth.js catch-all handler (2 lines) |
| `src/app/login/page.tsx` | Login page — email/password form, then TOTP step |
| `src/app/login/actions.ts` | `signInAction()` Server Action |
| `prisma/migrations/[timestamp]_add_auth_models/` | Migration adding User, Account, Session, VerificationToken, Authenticator, plus userId FKs |

### Modified Files (existing files that change)

| File | What Changes |
|------|-------------|
| `prisma/schema.prisma` | Add User/Account/Session/VerificationToken models; add `userId String` + relation to all 10 existing models |
| `src/lib/prisma.ts` | No change to singleton — but datasource URL changes for production (Prisma Postgres URL format) |
| `src/app/layout.tsx` | Add session provider (NOT needed with Auth.js v5 JWT strategy — auth() works server-side without a context provider) |
| `src/lib/dashboard.ts` | All exported functions get `userId: string` param, injected into every query `where:` clause |
| `src/lib/income.ts` | Same — `userId` param + WHERE scoping |
| `src/lib/debt.ts` | Same |
| `src/lib/history.ts` | Same |
| `src/lib/period.ts` | Same |
| `src/lib/budget.ts` | Same |
| `src/lib/budget-shared.ts` | Same |
| `src/app/**/page.tsx` (all 7) | Call `requireAuth()` at top, pass `userId` to lib functions |
| `src/app/**/actions.ts` (all 6) | Call `requireAuth()` at top, pass `userId` to lib functions |
| `prisma/seed.ts` | Add seed user so dev DB is immediately usable; seed data becomes user-scoped |
| `next.config.ts` | Add security headers (CSP, HSTS, X-Frame-Options, etc.) |
| `package.json` | Add `postinstall: "prisma generate"` for Vercel build |
| `.env.example` | Add `AUTH_SECRET`, `AUTH_TOTP_ENCRYPTION_KEY`, `DATABASE_URL` format note |

---

## Architectural Patterns

### Pattern 1: Auth.js v5 Single-Config Export

**What:** Everything in one `src/lib/auth.ts`. The file exports four things: `auth` (session accessor, works server-side everywhere), `handlers` (GET/POST for the catch-all route), `signIn`, `signOut`. Nothing else needs to import NextAuth directly.

**When to use:** Always. This is the Auth.js v5 canonical pattern.

**Trade-offs:** One config file becomes important — keep it under 100 lines by extracting TOTP logic to a helper.

```typescript
// src/lib/auth.ts
import NextAuth from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import Credentials from 'next-auth/providers/credentials'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { verifyTOTP } from '@/lib/totp'  // extracted helper

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },  // JWT required — database sessions can't run at edge
  providers: [
    Credentials({
      credentials: {
        email: { type: 'email' },
        password: { type: 'password' },
        totpCode: { type: 'text' },  // empty string if 2FA not yet set up
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        })
        if (!user || !user.passwordHash) return null
        const valid = await bcrypt.compare(credentials.password as string, user.passwordHash)
        if (!valid) return null
        // Invite-only: user must be in DB (seeded or admin-created) and isApproved
        if (!user.isApproved) return null
        // TOTP check — if user has 2FA enabled, code is required
        if (user.twoFactorEnabled) {
          if (!verifyTOTP(credentials.totpCode as string, user.twoFactorSecret!)) return null
        }
        return { id: user.id, email: user.email, name: user.name }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.id = user.id  // persist userId into JWT on sign-in
      return token
    },
    session({ session, token }) {
      session.user.id = token.id as string  // expose userId on session object
      return session
    },
  },
})
```

### Pattern 2: `requireAuth()` — Defense in Depth for Server Actions

**What:** Proxy only protects page navigation. Server Actions can be called directly from any client (including curl). Every Server Action must independently verify auth. Centralizing this in one helper prevents forgetting.

**When to use:** First line of every Server Action and Server Component page that reads/writes user data.

**Trade-offs:** Two layers of auth checking (proxy + per-action). The duplication is intentional and correct — the proxy is for UX (redirect), requireAuth is for security.

```typescript
// src/lib/auth-utils.ts
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export interface AuthSession {
  userId: string
  email: string
  name: string | null
}

/**
 * Call at the top of every Server Component and Server Action.
 * Returns the session with userId guaranteed non-null.
 * Redirects to /login if unauthenticated (pages) or throws (actions).
 */
export async function requireAuth(): Promise<AuthSession> {
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/login')
  }
  return {
    userId: session.user.id,
    email: session.user.email ?? '',
    name: session.user.name ?? null,
  }
}
```

Usage in a Server Action:
```typescript
// src/app/movimientos/actions.ts
'use server'

export async function createTransaction(data: unknown): Promise<ActionResult> {
  const { userId } = await requireAuth()  // ← line 1 of every action
  
  const parsed = createTransactionSchema.safeParse(data)
  if (!parsed.success) return { error: formatZodErrors(parsed.error) }
  
  const period = await getPeriodForDate(parsed.data.date, userId)
  await prisma.transaction.create({
    data: { ...parsed.data, userId, periodId: period.id }
  })
  revalidatePath('/')
  return { success: true }
}
```

Usage in a Server Component page:
```typescript
// src/app/page.tsx (dashboard)
export default async function HomePage({ searchParams }) {
  const { userId } = await requireAuth()  // ← line 1 of every page
  
  const params = await searchParams
  const period = await getCurrentPeriod(userId)
  const kpis = await getDashboardKPIs(period.id, userId)
  // ...
}
```

### Pattern 3: userId Scoping Pattern for All Lib Functions

**What:** Every function in `src/lib/*.ts` that reads or writes data adds `userId: string` as its first parameter. All Prisma queries add `where: { ..., userId }` or rely on relations that already scope to the user. This makes it structurally impossible to fetch another user's data by accident.

**When to use:** Every lib function that touches any of the 10 existing models.

**Trade-offs:** All call sites need updating. Function signatures become slightly more verbose. The alternative (implicit userId via closure or context) is more complex and testability suffers.

```typescript
// BEFORE (no auth)
export async function getDashboardKPIs(periodId: string): Promise<DashboardKPIs> {
  const totals = await prisma.transaction.aggregate({
    where: { periodId },
    // ...
  })
}

// AFTER (userId-scoped)
export async function getDashboardKPIs(periodId: string, userId: string): Promise<DashboardKPIs> {
  const totals = await prisma.transaction.aggregate({
    where: { periodId, userId },  // userId added
    // ...
  })
}
```

### Pattern 4: Invite-Only via `isApproved` Field on User

**What:** Auth.js v5 has no built-in invite-only support. The implementation is: User model has `isApproved Boolean @default(false)`. Only users with `isApproved: true` can pass `authorize()`. The admin creates users directly (seeded or via a thin admin action), sets `isApproved: true`. There is no self-registration form.

**When to use:** This is the correct pattern for personal finance apps where you control who can access.

**Trade-offs:** No invite email flow in v3.0 scope. Admin must create user records manually (acceptable for personal use and small beta). Could add email invitation flow later.

```typescript
// Seeding an approved user in prisma/seed.ts
await prisma.user.upsert({
  where: { email: 'owner@example.com' },
  update: {},
  create: {
    email: 'owner@example.com',
    name: 'Owner',
    passwordHash: await bcrypt.hash(process.env.SEED_USER_PASSWORD!, 12),
    isApproved: true,
    twoFactorEnabled: false,
  },
})
```

### Pattern 5: TOTP 2FA as a User-Level Toggle

**What:** TOTP is not enforced at the config level — it is enforced per-user in `authorize()`. A user with `twoFactorEnabled: false` logs in with just email+password. A user with `twoFactorEnabled: true` must supply a valid TOTP code. The login form handles both cases: it shows the TOTP field only after password verification passes (two-step UI, single form submission).

**When to use:** This approach avoids the complexity of two separate sessions/states during login.

**Trade-offs:** The login form needs a two-phase UI (step 1: email+password; step 2: TOTP code). Both submits are Server Actions. TOTP secrets must be encrypted at rest — never store raw TOTP secrets in the DB.

**Libraries:** `speakeasy` or `otpauth` for TOTP generation/verification. `qrcode` for QR code display during 2FA setup.

```typescript
// src/lib/totp.ts
import * as OTPAuth from 'otpauth'
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ENCRYPTION_KEY = process.env.AUTH_TOTP_ENCRYPTION_KEY!  // 32-byte hex string

export function generateTOTPSecret(): string {
  const totp = new OTPAuth.TOTP({ issuer: 'Centik', algorithm: 'SHA1', digits: 6, period: 30 })
  const secret = new OTPAuth.Secret({ size: 20 })
  return encryptSecret(secret.base32)
}

export function verifyTOTP(token: string, encryptedSecret: string): boolean {
  const secret = decryptSecret(encryptedSecret)
  const totp = new OTPAuth.TOTP({ algorithm: 'SHA1', digits: 6, period: 30, secret })
  const delta = totp.validate({ token, window: 1 })
  return delta !== null
}
```

---

## Prisma Schema Changes

### New Models (required by @auth/prisma-adapter)

```prisma
model User {
  id               String    @id @default(cuid())
  name             String?
  email            String    @unique
  emailVerified    DateTime?
  image            String?
  passwordHash     String?        // bcrypt hash — null for OAuth users
  isApproved       Boolean   @default(false)
  twoFactorEnabled Boolean   @default(false)
  twoFactorSecret  String?        // AES-encrypted TOTP secret
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  // Auth.js adapter relations
  accounts         Account[]
  sessions         Session[]
  authenticators   Authenticator[]

  // App data relations (owned data)
  transactions     Transaction[]
  incomeSources    IncomeSource[]
  categories       Category[]
  debts            Debt[]
  budgets          Budget[]
  periods          Period[]
  assets           Asset[]
  valueUnits       ValueUnit[]
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

model Authenticator {
  credentialID         String  @unique
  userId               String
  providerAccountId    String
  credentialPublicKey  String
  counter              Int
  credentialDeviceType String
  credentialBackedUp   Boolean
  transports           String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@id([userId, credentialID])
}
```

### Changes to All 10 Existing Models

Add `userId String` field and `user User` relation to every model. Add `@@index([userId])` where missing.

Example (Transaction, same pattern for all 10):
```prisma
model Transaction {
  // ... all existing fields unchanged ...
  userId    String         // NEW

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)  // NEW

  @@index([periodId, date])
  @@index([categoryId])
  @@index([userId])        // NEW
}
```

**Models that need userId:** Transaction, IncomeSource, Category, Debt, Budget, Period, MonthlySummary, ValueUnit, UnitRate, Asset.

Note on migration strategy: existing rows in dev DB have no userId. The migration must either drop+reseed (acceptable for dev) or provide a default userId. For production (Vercel first deploy), this is a new database so no migration of existing data is needed.

---

## Data Flow

### Authentication Flow

```
User visits any protected URL
  ↓
proxy.ts intercepts (runs at edge in Next.js 16)
  ↓ no valid session cookie?
Redirect → /login
  ↓ user submits email + password
signInAction() Server Action
  ↓ calls Auth.js signIn('credentials', {...})
  ↓ Auth.js calls authorize() in auth.ts
  ↓ bcrypt.compare(password, user.passwordHash)
  ↓ if user.twoFactorEnabled → verifyTOTP(totpCode, user.twoFactorSecret)
  ↓ returns { id, email, name }
  ↓ jwt() callback: token.id = user.id
  ↓ session JWT written to httpOnly cookie
Redirect → / (dashboard)
  ↓
proxy.ts sees valid session cookie → passes through
  ↓
Dashboard Server Component calls requireAuth()
  ↓ auth() reads JWT from cookie → returns session
  ↓ returns { userId: session.user.id, ... }
  ↓
getDashboardKPIs(periodId, userId) — Prisma WHERE userId
  ↓
User only sees their own data
```

### Per-Request Data Access Flow (post-auth)

```
Client request (page navigation or Server Action call)
  ↓
proxy.ts: validate JWT session cookie → refresh cookie expiry
  ↓
Server Component / Server Action
  ↓ await requireAuth() → { userId }
  ↓
src/lib/*.ts function(args, userId)
  ↓
prisma.model.findMany({ where: { userId, ...otherFilters } })
  ↓
PostgreSQL: indexed scan on userId column
  ↓
Results returned → serialized → rendered / returned to client
```

---

## Recommended Project Structure Changes

```
/ (root)
├── proxy.ts               NEW — export { auth as proxy } from "@/lib/auth"
│
src/
├── lib/
│   ├── auth.ts            NEW — NextAuth v5 config (credentials, TOTP, callbacks, adapter)
│   ├── auth-utils.ts      NEW — requireAuth() helper, AuthSession type
│   ├── totp.ts            NEW — generateTOTPSecret(), verifyTOTP(), encrypt/decrypt helpers
│   ├── prisma.ts          UNCHANGED (Prisma Postgres uses same DATABASE_URL env var)
│   ├── dashboard.ts       MODIFIED — all functions get userId param
│   ├── income.ts          MODIFIED
│   ├── debt.ts            MODIFIED
│   ├── history.ts         MODIFIED
│   ├── period.ts          MODIFIED
│   ├── budget.ts          MODIFIED
│   └── budget-shared.ts   MODIFIED
├── app/
│   ├── api/
│   │   └── auth/
│   │       └── [...nextauth]/
│   │           └── route.ts   NEW — 2-line handler
│   ├── login/
│   │   ├── page.tsx       NEW — login form (2-step: email+password, then TOTP)
│   │   └── actions.ts     NEW — signInAction() Server Action
│   ├── page.tsx           MODIFIED — requireAuth() at top
│   ├── movimientos/
│   │   └── actions.ts     MODIFIED — requireAuth() at top of every action
│   ├── deudas/
│   │   └── actions.ts     MODIFIED
│   ├── ingresos/
│   │   └── actions.ts     MODIFIED
│   ├── presupuesto/
│   │   └── actions.ts     MODIFIED
│   ├── historial/
│   │   └── actions.ts     MODIFIED
│   └── configuracion/
│       └── actions.ts     MODIFIED
│
prisma/
│   ├── schema.prisma      MODIFIED — User + auth models + userId on all 10 models
│   └── seed.ts            MODIFIED — seed approved User, scope all seed data to userId
│
next.config.ts             MODIFIED — add security headers
package.json               MODIFIED — postinstall: "prisma generate"
.env.example               MODIFIED — AUTH_SECRET, AUTH_TOTP_ENCRYPTION_KEY
```

---

## Security Headers Configuration

Add to `next.config.ts`. These are required for production (financial app, personal data).

```typescript
const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Content-Security-Policy',
            // Tailwind v4 uses inline styles via @theme — nonce-based CSP is needed
            // For v3.0, start with a permissive but safe CSP and tighten post-launch
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline'",  // tighten to nonce in v4.0
              "style-src 'self' 'unsafe-inline'",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data:",
              "connect-src 'self'",
              "frame-ancestors 'none'",
            ].join('; '),
          },
        ],
      },
    ]
  },
}
```

---

## Rate Limiting Architecture

For auth endpoints on Vercel (serverless), in-memory rate limiting is useless — each function instance is stateless. The correct approach for v3.0:

**Option A (recommended for v3.0): Upstash Redis + @upstash/ratelimit**
- Serverless-native, pay-per-use, no separate infrastructure
- Rate limit `POST /api/auth/callback/credentials` to 5 attempts per 15 minutes per IP
- Implemented in `proxy.ts` alongside auth redirect logic
- Confidence: HIGH — Vercel's own templates use this pattern

**Option B (simpler, acceptable for personal use): Skip external rate limiting, rely on strong passwords + TOTP**
- TOTP 2FA already dramatically reduces brute-force risk
- Acceptable for a personal app with invite-only access
- Avoids adding Upstash dependency in v3.0

**Recommendation:** Start with Option B (TOTP is the real protection). Add Upstash rate limiting in v3.1 if needed.

---

## Vercel + Prisma Postgres Deployment

### Connection Strategy

Prisma Postgres (Vercel's managed Postgres with Prisma Accelerate) uses a different connection string format:
```
# Dev (Docker — unchanged)
DATABASE_URL="postgresql://misfinanzas:misfinanzas_dev@localhost:5432/misfinanzas"

# Production (Prisma Postgres via Vercel)
DATABASE_URL="prisma+postgres://accelerate.prisma-data.net/?api_key=..."
```

The `src/lib/prisma.ts` singleton already uses `PrismaPg` adapter from `@prisma/adapter-pg`. Prisma Postgres requires switching to `@prisma/adapter-pg` or using Accelerate directly. The Vercel Marketplace integration auto-configures `DATABASE_URL`. No code change needed in `prisma.ts` as long as the env var is set correctly.

### Deployment Checklist

```
package.json:
  "postinstall": "prisma generate"   ← ensures client is generated at build time

Vercel environment variables to set:
  DATABASE_URL         = (set automatically by Prisma Postgres integration)
  AUTH_SECRET          = (generate with: openssl rand -base64 32)
  AUTH_TOTP_ENCRYPTION_KEY = (generate with: openssl rand -hex 32)
  NODE_ENV             = production

CI/CD (Vercel auto-deploy):
  - Push to main → Vercel builds
  - "Build command": next build (default)
  - "Install command": npm install (user preference)
  - Run migrations before first deploy: prisma migrate deploy
```

### Migration Strategy for First Deploy

1. Provision Prisma Postgres via Vercel Marketplace
2. Set `DATABASE_URL` in Vercel env vars
3. Run `npx prisma migrate deploy` locally against the production DATABASE_URL to initialize schema
4. Run `npx prisma db seed` to create the initial approved user
5. Deploy — subsequent pushes auto-deploy; schema changes require `prisma migrate deploy` in CI

---

## Build Order: Recommended Phase Sequence

Dependencies determine order. Auth is the foundation — nothing else in v3.0 can be tested without it.

```
Phase 1: Schema + Auth Foundation (highest risk, do first)
  - Add User + auth models to prisma/schema.prisma
  - Add userId FK to all 10 existing models
  - Run migration against dev DB (expect dev data loss → reseed)
  - Update seed.ts to create approved User + scope all seed data to that userId
  - Install: next-auth@beta @auth/prisma-adapter bcryptjs otpauth qrcode
  - Create src/lib/auth.ts (credentials provider, no TOTP yet — add after)
  - Create src/app/api/auth/[...nextauth]/route.ts (2 lines)
  - Create proxy.ts (auth redirect)
  - Test: unauthenticated request to / → /login redirect
  Unblocks: everything

Phase 2: requireAuth() + userId scoping in all lib functions
  - Create src/lib/auth-utils.ts (requireAuth helper)
  - Update all 7 functions in src/lib/*.ts to accept userId param
  - Update all 7 page.tsx files to call requireAuth()
  - Update all 6 actions.ts files to call requireAuth()
  - Test: all pages still render with valid session, data is scoped
  Unblocks: correct data isolation before wiring TOTP

Phase 3: Login UI
  - Create src/app/login/page.tsx (step 1: email+password)
  - Create src/app/login/actions.ts (signInAction)
  - Integrate with Auth.js signIn('credentials', ...)
  - Test: full login flow works
  Unblocks: TOTP UI

Phase 4: TOTP 2FA
  - Create src/lib/totp.ts (generate, verify, encrypt/decrypt)
  - Add 2FA setup page/modal (show QR code, verify first code, save encrypted secret)
  - Update login form step 2: TOTP input
  - Update authorize() in auth.ts to check TOTP
  - Test: login with 2FA enabled requires valid TOTP code
  Unblocks: security hardening

Phase 5: Security Headers + Deployment
  - Update next.config.ts with security headers
  - Add postinstall script to package.json
  - Provision Prisma Postgres via Vercel
  - Run migration deploy + seed on production DB
  - Deploy to Vercel, verify all routes protected
  - Smoke test: login, dashboard KPIs, create transaction, close period
```

---

## Integration Points

### External Services

| Service | Integration Pattern | Confidence |
|---------|---------------------|------------|
| Auth.js v5 (`next-auth@beta`) | `@/lib/auth.ts` — single config, export `{ auth, handlers, signIn, signOut }` | HIGH — canonical v5 pattern, matches Next.js 16 proxy.ts rename |
| `@auth/prisma-adapter` | Passed as `adapter:` to NextAuth config. Manages User/Account/Session automatically | HIGH — official adapter, documented schema |
| Prisma Postgres (Vercel) | Same `DATABASE_URL` env var, different URL format (`prisma+postgres://...`). `postinstall: prisma generate` | HIGH — Vercel Marketplace integration handles setup |
| Upstash Redis (optional) | `@upstash/ratelimit` in `proxy.ts` for brute-force protection on auth route | MEDIUM — optional for v3.0, recommended for v3.1 |
| `bcryptjs` | Password hashing in `authorize()` and user creation. `bcrypt.hash(password, 12)` for create, `bcrypt.compare()` for verify | HIGH — standard, no native deps |
| `otpauth` or `speakeasy` | TOTP generation + verification. AES-256-CBC encryption of secrets before DB storage | MEDIUM — prefer `otpauth` (actively maintained, no native deps) |

### Internal Boundaries

| Boundary | Communication | Security Note |
|----------|---------------|---------------|
| `proxy.ts` ↔ `src/lib/auth.ts` | `export { auth as proxy }` — proxy reads JWT from cookie, redirects if invalid | Proxy is UX-only. Not sufficient for security alone |
| Server Actions ↔ `src/lib/auth-utils.ts` | `requireAuth()` called at top of every action | This is the security boundary. Every action must call it independently |
| `src/lib/*.ts` ↔ Prisma | All queries now include `userId` in `where:` clause | Structural guarantee — impossible to fetch unscoped data if pattern is followed |
| `src/lib/auth.ts` ↔ Prisma | Auth.js adapter uses the same Prisma singleton from `@/lib/prisma` | One client, one pool — correct |
| Login page ↔ Auth.js | Login form submits to Server Action which calls `signIn('credentials', {...})` from `next-auth` — not a direct API call | Server Action has built-in CSRF protection. Do not use client-side fetch to `/api/auth/callback/credentials` directly |

---

## Anti-Patterns

### Anti-Pattern 1: Relying Only on proxy.ts for Security

**What people do:** Add proxy.ts to redirect unauthenticated users and assume all protected routes are secure.

**Why it's wrong:** Server Actions can be called directly by any HTTP client regardless of the proxy. A POST to `/movimientos/actions.ts` bypasses proxy entirely. Financial mutations (create transaction, close period, update debt) would be callable without authentication.

**Do this instead:** Call `requireAuth()` as the first line of every Server Action. The proxy is for redirecting users in the browser — security lives in the action itself.

### Anti-Pattern 2: Adding `userId` Only to Transaction Queries

**What people do:** Add `userId` to Transaction and Period queries, miss the rest.

**Why it's wrong:** Debts, income sources, budgets, and categories are also user data. An attacker who discovers another user's IDs could read their financial profile through any unscoped model.

**Do this instead:** Add `userId` FK to all 10 models as a batch in one migration. Update ALL lib functions in Phase 2. Use a grep for `prisma.` after Phase 2 to verify no unscoped queries remain.

### Anti-Pattern 3: Storing TOTP Secrets in Plaintext

**What people do:** Store the TOTP secret directly in `user.twoFactorSecret` as a base32 string.

**Why it's wrong:** If the database is compromised (leaked backup, SQL injection), an attacker gets both the password hash AND the TOTP secrets — meaning 2FA provides zero additional protection.

**Do this instead:** Encrypt TOTP secrets with AES-256 before storage. The encryption key lives only in `AUTH_TOTP_ENCRYPTION_KEY` env var, never in the DB. Compromise of the DB alone is insufficient to recover secrets.

### Anti-Pattern 4: Database Session Strategy in proxy.ts

**What people do:** Configure `session: { strategy: 'database' }` and export `auth` as proxy.

**Why it's wrong:** Database sessions require a DB call to validate each session. Next.js proxy.ts runs at the edge runtime — it cannot make direct PostgreSQL connections. The result is a runtime error or fallback to no session validation.

**Do this instead:** Use `session: { strategy: 'jwt' }`. JWT sessions are validated by signature verification (no DB call needed), which is compatible with edge runtime. The userId is embedded in the JWT via the `jwt()` callback.

### Anti-Pattern 5: Modifying Existing Queries Before Schema Migration

**What people do:** Update `src/lib/dashboard.ts` to add `userId` to WHERE clauses before running the schema migration that adds the `userId` column.

**Why it's wrong:** Prisma client will fail to generate (or generate without the new field), and TypeScript will have type errors. The schema is the source of truth.

**Do this instead:** Phase 1 is schema-first. Run `prisma migrate dev`, regenerate client (`prisma generate`), then update lib functions. TypeScript will guide you — the new `userId` field will appear in the Prisma types.

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 1-10 users (current goal) | JWT sessions, no rate limiting needed if TOTP is enforced, Docker dev + Prisma Postgres prod |
| 10-100 users | Add Upstash rate limiting on auth endpoints, monitor Prisma Postgres connection pool |
| 100-1000 users | Consider Prisma Accelerate connection pooling (already built into Prisma Postgres), add Redis session invalidation if needed |
| 1000+ users | Separate auth service or add session revocation, consider read replicas for dashboard queries |

---

## Sources

- [Auth.js Getting Started — Protecting Routes](https://authjs.dev/getting-started/session-management/protecting) — proxy.ts export pattern, matcher config (HIGH confidence)
- [Auth.js Prisma Adapter](https://authjs.dev/getting-started/adapters/prisma) — required schema models, User/Account/Session/VerificationToken definitions (HIGH confidence)
- [Prisma Docs — Auth.js + Next.js guide](https://www.prisma.io/docs/guides/authentication/authjs/nextjs) — Prisma Postgres + adapter integration (HIGH confidence)
- [Deploy to Vercel — Prisma Docs](https://www.prisma.io/docs/orm/prisma-client/deployment/serverless/deploy-to-vercel) — postinstall script, environment variable setup (HIGH confidence)
- [Auth.js — Extending the Session](https://authjs.dev/guides/extending-the-session) — jwt/session callbacks for custom userId (HIGH confidence)
- [Auth.js v5 with Next.js 16: Complete Guide (DEV Community)](https://dev.to/huangyongshan46a11y/authjs-v5-with-nextjs-16-the-complete-authentication-guide-2026-2lg) — proxy.ts rename confirmation, credentials pattern (MEDIUM confidence — community source)
- [Next.js 16 proxy.ts Auth Migration Guide (Medium)](https://medium.com/@securestartkit/next-js-proxy-ts-auth-migration-guide-ff7489ec8735) — Next.js 16 middleware→proxy rename (MEDIUM confidence)
- [NextAuth Discussion #4106 — Invite-only auth](https://github.com/nextauthjs/next-auth/discussions/4106) — No built-in invite-only; custom `isApproved` pattern is correct approach (HIGH confidence)
- [Upstash Rate Limiting with Vercel Edge](https://upstash.com/blog/edge-rate-limiting) — serverless rate limiting pattern (MEDIUM confidence)
- Codebase inspection: `prisma/schema.prisma`, `src/lib/prisma.ts`, `src/app/*/actions.ts`, `src/lib/dashboard.ts`, `src/app/layout.tsx` (HIGH confidence — direct source read)

---

*Architecture research for: Auth + Cloud Deploy integration into Centik (Next.js 16 + Prisma 7)*
*Researched: 2026-04-15*
