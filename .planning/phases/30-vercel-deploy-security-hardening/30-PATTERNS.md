# Phase 30: Vercel Deploy + Security Hardening - Pattern Map

**Mapped:** 2026-04-20
**Files analyzed:** 14 (4 NEW + 10 MODIFIED)
**Analogs found:** 13/14 (only `30-VERIFICATION.md` has no internal analog — prior phase verification docs exist but are not in scope of this mapping)

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/lib/env.ts` (NEW) | config/utility | request-response (boot singleton) | `src/lib/totp-crypto.ts` L1-19 (load-at-import validator) + `src/lib/rate-limit.ts` L5-24 (module-level singleton) | exact (two analogs combined) |
| `src/lib/env.test.ts` (NEW) | test | request-response | `src/lib/totp-crypto.test.ts` L1-113 (dynamic re-import + stubEnv pattern) | exact |
| `prisma/seed.prod.ts` (NEW) | config/migration | batch/one-shot | `prisma/seed.ts` L1-42 (`seedAdminUser` — bcrypt12 + upsert) | exact |
| `tests/integration/isolation-actions.test.ts` (NEW) | test | request-response (mutation) | `tests/integration/isolation.test.ts` L1-214 (two-user setup) + `tests/integration/totp.test.ts` L1-80 (mock boilerplate) | exact (two analogs combined) |
| `src/proxy.ts` (MODIFY) | middleware | request-response | self (extend in place) | n/a |
| `next.config.ts` (MODIFY) | config | static config | self (stub; new `async headers()`) | n/a |
| `prisma.config.ts` (MODIFY) | config | static config | self (swap env var) | n/a |
| `src/lib/prisma.ts` (MODIFY) | service/data-access | request-response | self (minimal swap to `env.DATABASE_URL`) | n/a |
| `src/lib/totp-crypto.ts` (MODIFY) | utility/crypto | transform | self (L7-19 → consume `env.AUTH_TOTP_ENCRYPTION_KEY`) | n/a |
| `src/lib/rate-limit.ts` (MODIFY) | middleware/guard | event-driven | self (L5-24 → consume `env.*` vars) | n/a |
| `src/auth.ts` (MODIFY) | config | request-response | self (add top-level `import '@/lib/env'` side-effect only) | n/a |
| `tests/integration/isolation.test.ts` (MODIFY) | test | request-response | self (extend `beforeAll` + add `it()` blocks) | n/a |
| `package.json` (MODIFY) | config | static config | self (add `db:seed:prod` script) | n/a |
| `.env.example` (MODIFY) | config | static config | self (append `DIRECT_URL` + comments) | n/a |

---

## Pattern Assignments

### `src/lib/env.ts` (NEW — config/utility, boot singleton)

**Analog 1:** `src/lib/totp-crypto.ts` — load-at-import validator
**Analog 2:** `src/lib/rate-limit.ts` — module-level singleton guard

**Load-at-import-throw pattern** (`src/lib/totp-crypto.ts` L7-19):
```typescript
/** Valida AUTH_TOTP_ENCRYPTION_KEY al importar. Falla rapido con mensaje accionable. D-07 */
function loadKey(): Buffer {
  const hex = process.env.AUTH_TOTP_ENCRYPTION_KEY
  if (!hex || hex.length !== KEY_HEX_LENGTH || !/^[0-9a-fA-F]+$/.test(hex)) {
    throw new Error(
      'AUTH_TOTP_ENCRYPTION_KEY must be a 64-character hex string (32 bytes). ' +
        'Generate one with: openssl rand -hex 32',
    )
  }
  return Buffer.from(hex, 'hex')
}

const KEY = loadKey() // Validates on first import — fail fast at boot (Pitfall 3)
```

**Module-level singleton guard pattern** (`src/lib/rate-limit.ts` L5-8):
```typescript
/** True cuando se debe bypass (dev/test o flag explicito). D-26 */
function isBypassed(): boolean {
  return process.env.NODE_ENV !== 'production' || process.env.RATE_LIMIT_DISABLED === 'true'
}
```

**What to replicate:** Top-level `const env = parsed.data` with `schema.safeParse(process.env)` at module scope; throw on `!parsed.success` with actionable Zod-joined message. Mirror the action-oriented throw text (include "Generate: openssl rand -hex 32"). Export `env` (typed) and optionally `type Env = typeof env`.
**What differs:** Uses Zod (not hand-rolled regex) per D-19; covers 9+ vars instead of 1; has `.superRefine()` production-only guard per D-20.

---

### `src/lib/env.test.ts` (NEW — test, request-response)

**Analog:** `src/lib/totp-crypto.test.ts` L1-113

**Dynamic re-import + stubEnv pattern** (L1-25):
```typescript
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const VALID_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'

/** Dynamically re-import the module under test after env stubs so loadKey() re-runs. */
async function importFreshWithKey(key: string | undefined) {
  vi.resetModules()
  if (key === undefined) {
    vi.stubEnv('AUTH_TOTP_ENCRYPTION_KEY', '')
  } else {
    vi.stubEnv('AUTH_TOTP_ENCRYPTION_KEY', key)
  }
  return await import('./totp-crypto')
}

describe('totp-crypto (Phase 29 — Wave 1)', () => {
  beforeEach(() => { vi.stubEnv('AUTH_TOTP_ENCRYPTION_KEY', VALID_KEY) })
  afterEach(() => { vi.unstubAllEnvs(); vi.resetModules() })
```

**Module-import-throw assertion pattern** (L89-112):
```typescript
it('throws at module import when AUTH_TOTP_ENCRYPTION_KEY is unset', async () => {
  vi.resetModules()
  vi.stubEnv('AUTH_TOTP_ENCRYPTION_KEY', '')
  await expect(import('./totp-crypto')).rejects.toThrow(/AUTH_TOTP_ENCRYPTION_KEY/)
})
```

**What to replicate:** The `vi.resetModules()` + `vi.stubEnv()` before `await import()` recipe — REQUIRED because `env.ts` throws at module load, so each negative test must re-import fresh. Use `.rejects.toThrow(/regex/)` for error-shape assertions.
**What differs:** Must stub multiple env vars per test (DATABASE_URL, AUTH_SECRET, AUTH_TOTP_ENCRYPTION_KEY, NODE_ENV, UPSTASH_*); add a NODE_ENV=production + RATE_LIMIT_DISABLED=true case (D-20). Cover happy path + each required-var-missing case + production-only guard + RATE_LIMIT_DISABLED-in-prod guard.

---

### `prisma/seed.prod.ts` (NEW — config/migration, batch)

**Analog:** `prisma/seed.ts` L1-42 — `seedAdminUser`

**Full analog excerpt** (the gold-standard pattern, L1-42):
```typescript
import 'dotenv/config'
import { PrismaClient } from '../generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'
// [imports for CATEGORIES/BUDGETS/etc. DROP in seed.prod.ts]

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
})
const prisma = new PrismaClient({ adapter })

async function seedAdminUser(): Promise<string> {
  const email = process.env.ADMIN_EMAIL || 'fmemije00@gmail.com'
  const password = process.env.ADMIN_PASSWORD || 'centik-dev-2026'
  const hashedPassword = await bcrypt.hash(password, 12)

  const user = await prisma.user.upsert({
    where: { email },
    update: { isAdmin: true },
    create: {
      email,
      hashedPassword,
      isApproved: true,
      totpEnabled: false,
      isAdmin: true,
    },
  })

  console.log(`Seeded admin user: ${email}`)
  return user.id
}
```

**What to replicate:** (1) The adapter + PrismaClient bootstrapping (L16-19). (2) The bcrypt cost-12 hash. (3) The `upsert({ where: { email }, update: {...}, create: {...} })` idempotent shape.
**What differs per D-09/D-10/D-12:** (1) NO default fallback values — `throw` if ADMIN_EMAIL missing, throw if ADMIN_PASSWORD missing OR <12 chars. (2) `update: {}` MUST be empty re: password (D-10 — DO NOT rotate password on re-run; only verify flags `{ isAdmin: true, isApproved: true }`). (3) NO calls to `seedCategories`, `seedDebts`, `seedTransactions`, `seedIncomeSources` — admin-only per D-12. (4) `main()` wrapper + `.catch(err => { console.error; process.exit(1) })` + `prisma.$disconnect()` at end (see RESEARCH §Code Excerpts L722-732). (5) No `isDefault: true` categories are pre-created.

---

### `tests/integration/isolation-actions.test.ts` (NEW — test, mutation request-response)

**Analog 1:** `tests/integration/isolation.test.ts` L1-50 — two-user beforeAll
**Analog 2:** `tests/integration/totp.test.ts` L1-45 — next-auth + Upstash mock boilerplate

**Mock boilerplate to copy verbatim** (`tests/integration/totp.test.ts` L5-45):
```typescript
vi.mock('next-auth', () => ({
  default: () => ({
    handlers: {},
    signIn: vi.fn(),
    signOut: vi.fn(),
    auth: vi.fn(),
  }),
}))

vi.mock('@auth/prisma-adapter', () => ({ PrismaAdapter: vi.fn() }))
vi.mock('next-auth/providers/credentials', () => ({ default: vi.fn(() => ({})) }))

vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: Object.assign(
    vi.fn().mockImplementation(() => ({
      limit: vi.fn().mockResolvedValue({
        success: true, limit: 5, remaining: 4,
        reset: Date.now() + 60000, pending: Promise.resolve(),
      }),
    })),
    { slidingWindow: vi.fn(), fixedWindow: vi.fn() },
  ),
}))
vi.mock('@upstash/redis', () => ({ Redis: { fromEnv: vi.fn(() => ({})) } }))
```

**Two-user beforeAll pattern** (`tests/integration/isolation.test.ts` L22-47):
```typescript
let userAId: string
let userBId: string

beforeAll(async () => {
  const userA = await prisma.user.create({
    data: { email: 'isolation-user-a@test.com', hashedPassword: 'not-a-real-hash',
      isApproved: true, totpEnabled: false },
  })
  userAId = userA.id
  const userB = await prisma.user.create({
    data: { email: 'isolation-user-b@test.com', hashedPassword: 'not-a-real-hash',
      isApproved: true, totpEnabled: false },
  })
  userBId = userB.id
  // ... seed entities owned by userA (or userB per the NEW file's inverse setup)
}, 30000)
```

**What to replicate:** Same mock block, same two-user setup, same `afterAll` FK-ordered `deleteMany` chain.
**What differs per D-23:** (1) **Seed rows owned by User B** (inverse of existing file: existing test owns by A, new test owns by B so User A can "attack"). (2) Add `const mockRequireAuth = vi.fn(); vi.mock('@/lib/auth-utils', () => ({ requireAuth: () => mockRequireAuth() }))` at top — mockable per test. (3) Each `it()` block: `mockRequireAuth.mockResolvedValue({ userId: userAId })`, then call action with User B's row ID in FormData, then `expect` DB state for User B's row is UNCHANGED post-action. (4) ≥10 `it()` blocks covering every mutation Server Action (create/update/delete × Transaction/Debt/Budget/IncomeSource/Category/Period + `disableTotpAction` + `regenerateBackupCodesAction`). (5) `afterAll` must also clean BackupCodes.

---

### `src/proxy.ts` (MODIFY — middleware, request-response)

**Analog:** self (extend in place; preserve ordering per CONTEXT D-05).

**Full current file** (L1-34):
```typescript
import { auth } from '@/auth'
import { NextResponse } from 'next/server'

const publicPaths = ['/login', '/register']

export const proxy = auth((req) => {
  const { pathname } = req.nextUrl

  // Allow public routes
  if (publicPaths.some((path) => pathname.startsWith(path))) {
    if (req.auth) {
      return NextResponse.redirect(new URL('/', req.nextUrl.origin))
    }
    return NextResponse.next()
  }

  // Redirect unauthenticated users to /login with callbackUrl
  if (!req.auth) {
    const loginUrl = new URL('/login', req.nextUrl.origin)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    '/((?!api/auth|_next/static|_next/image|favicon.ico|fonts).*)',
  ],
}
```

**What to replicate:** All existing redirect logic stays exactly as-is; only APPEND CSP nonce injection AFTER the redirect branches (per CONTEXT D-05). The `matcher` is unchanged.
**What differs per D-05/D-06:** (1) Hoist the three `NextResponse.next()` / `redirect()` returns into a single `response` variable (see RESEARCH §Code Excerpts L607-626 — `src/proxy.ts`). (2) After the branch, early-return if `response.status` is 3xx (don't CSP-tag redirects). (3) Generate `const nonce = Buffer.from(crypto.randomUUID()).toString('base64')`. (4) Build CSP string per D-06 (include `connect-src 'self' https://*.upstash.io`). (5) `requestHeaders.set('x-nonce', nonce)` then `NextResponse.next({ request: { headers: requestHeaders } })` + copy over any existing headers + `responseWithNonce.headers.set('Content-Security-Policy', csp)`. Use `crypto.randomUUID()` from `node:crypto` or the globally-available `crypto` (Node 20.9+ exposes it globally per `next/docs/.../version-16.md`).

---

### `next.config.ts` (MODIFY — config, static)

**Current file** (L1-7) — stub:
```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  /* config options here */
}

export default nextConfig
```

**What to replicate:** The existing `NextConfig` import + `export default nextConfig` shape.
**What differs per D-05/D-07:** Add `async headers()` returning `[{ source: '/(.*)', headers: staticSecurityHeaders }]`. Build the `staticSecurityHeaders` array as a module-scope `const` (5 always-on headers + HSTS gated behind `const isProduction = process.env.NODE_ENV === 'production'` ternary — see RESEARCH §Code Excerpts L558-594). HSTS value: `max-age=63072000; includeSubDomains; preload`. Permissions-Policy: `camera=(), microphone=(), geolocation=(), browsing-topics=()`.

---

### `prisma.config.ts` (MODIFY — config, static)

**Current file** (L1-13):
```typescript
import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'npx tsx prisma/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
})
```

**What differs per RESEARCH correction (CONTEXT D-03 is corrected):** Change L11 `url: env('DATABASE_URL')` → `url: env('DIRECT_URL')`. Prisma 7 removed `datasource.directUrl` from `schema.prisma`; `prisma.config.ts` is the canonical place. CLI (migrate deploy, seed) routes through direct connection; runtime `PrismaPg` adapter in `src/lib/prisma.ts` keeps pooled `DATABASE_URL`. Add a comment explaining WHY (pgbouncer transaction mode is DDL-incompatible).

---

### `src/lib/prisma.ts` (MODIFY — service/data-access)

**Current file** (L1-19):
```typescript
import { PrismaClient } from '../../generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required')
  }
  const adapter = new PrismaPg({ connectionString })
  return new PrismaClient({ adapter })
}

const prisma = globalForPrisma.prisma || createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma
```

**What differs per D-21:** Replace `process.env.DATABASE_URL` (L7) with `env.DATABASE_URL` and `process.env.NODE_ENV` (L17) with `env.NODE_ENV`. Add `import { env } from './env'` at top. Delete the redundant `if (!connectionString) throw` check (env.ts guarantees presence). Shrinks to ~12 lines.

---

### `src/lib/totp-crypto.ts` (MODIFY — utility/crypto)

**Current key-load section** (L5-19):
```typescript
const KEY_HEX_LENGTH = 64 // 32 bytes × 2 hex chars

/** Valida AUTH_TOTP_ENCRYPTION_KEY al importar. Falla rapido con mensaje accionable. D-07 */
function loadKey(): Buffer {
  const hex = process.env.AUTH_TOTP_ENCRYPTION_KEY
  if (!hex || hex.length !== KEY_HEX_LENGTH || !/^[0-9a-fA-F]+$/.test(hex)) {
    throw new Error(
      'AUTH_TOTP_ENCRYPTION_KEY must be a 64-character hex string (32 bytes). ' +
        'Generate one with: openssl rand -hex 32',
    )
  }
  return Buffer.from(hex, 'hex')
}

const KEY = loadKey() // Validates on first import — fail fast at boot (Pitfall 3)
```

**What differs per D-21:** Replace L5-19 with `import { env } from './env'` + `const KEY = Buffer.from(env.AUTH_TOTP_ENCRYPTION_KEY, 'hex')`. Delete `loadKey()`, `KEY_HEX_LENGTH` — env.ts Zod regex `/^[0-9a-fA-F]{64}$/` already enforces format. Keep `const ALGO` / `IV_LENGTH` constants and the `encryptSecret` / `decryptSecret` exports unchanged. **CAUTION for test impact:** `totp-crypto.test.ts` currently stubs `AUTH_TOTP_ENCRYPTION_KEY` and re-imports; after refactor, tests must stub the env vars env.ts reads AND re-import `./env` first. Plan 30-02 must update both files together.

---

### `src/lib/rate-limit.ts` (MODIFY — middleware/guard)

**Current bypass + limiter setup** (L5-24):
```typescript
/** True cuando se debe bypass (dev/test o flag explicito). D-26 */
function isBypassed(): boolean {
  return process.env.NODE_ENV !== 'production' || process.env.RATE_LIMIT_DISABLED === 'true'
}

/** Construye un Ratelimit nuevo con ventana deslizante 5/60s. Solo se llama en produccion. D-24, D-25 */
function buildLimiter(): Ratelimit {
  return new Ratelimit({
    redis: Redis.fromEnv(), // UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
    limiter: Ratelimit.slidingWindow(5, '60 s'),
    analytics: false,
    prefix: '@centik/ratelimit',
  })
}

export const loginLimiter: Ratelimit | null = isBypassed() ? null : buildLimiter()
export const totpLimiter: Ratelimit | null = isBypassed() ? null : buildLimiter()
```

**What differs per D-21:** (1) Replace `process.env.NODE_ENV` / `process.env.RATE_LIMIT_DISABLED` in `isBypassed()` with `env.NODE_ENV` / `env.RATE_LIMIT_DISABLED`. (2) `Redis.fromEnv()` — KEEP (it reads `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` from process.env directly; env.ts has already validated them by the time this module loads because `env.ts` imports run first via the import chain). Document this in a comment so future readers don't "fix" it. (3) Add `import { env } from './env'` at top.

---

### `src/auth.ts` (MODIFY — config)

**Current top of file** (L1-12):
```typescript
import NextAuth from 'next-auth'
import type { User, Session } from 'next-auth'
import type { AdapterUser } from 'next-auth/adapters'
import type { JWT } from 'next-auth/jwt'
import Credentials from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'
import { verifyChallenge } from '@/lib/challenge'
import { decryptSecret } from '@/lib/totp-crypto'
import { verifyTotp } from '@/lib/totp'
import { consumeBackupCode } from '@/lib/backup-codes'
```

**What differs per D-21:** Add `import '@/lib/env'` (side-effect only) at the TOP of the imports block — surfaces env validation failure on module load. No other changes needed; Auth.js v5 reads AUTH_SECRET internally via `@auth/core`. Because `src/auth.ts` transitively imports `@/lib/prisma` → `@/lib/env`, validation already runs, but an explicit top-level import makes the dependency self-documenting.

---

### `tests/integration/isolation.test.ts` (MODIFY — test)

**Existing two-user seed** (L26-136) — EXTEND in place.

**Existing afterAll FK-ordered cleanup** (L138-164):
```typescript
afterAll(async () => {
  await prisma.transaction.deleteMany({ where: { userId: { in: [userAId, userBId] } } })
  await prisma.budget.deleteMany({ where: { userId: { in: [userAId, userBId] } } })
  await prisma.monthlySummary.deleteMany({ where: { period: { userId: { in: [userAId, userBId] } } } })
  await prisma.debt.deleteMany({ where: { userId: { in: [userAId, userBId] } } })
  await prisma.incomeSource.deleteMany({ where: { userId: { in: [userAId, userBId] } } })
  await prisma.category.deleteMany({ where: { userId: { in: [userAId, userBId] } } })
  await prisma.period.deleteMany({ where: { userId: { in: [userAId, userBId] } } })
  await prisma.user.deleteMany({ where: { id: { in: [userAId, userBId] } } })
})
```

**What to replicate:** Exact pattern — extend `beforeAll` to also seed 1 `MonthlySummary` (must own its parent Period by userA), 1 `Asset` + 1 `ValueUnit` + 1 `UnitRate` (Asset has `userId`, ValueUnit/UnitRate do NOT have `userId` in current schema per RESEARCH Assumption A10 — only `Asset` is per-user; treat ValueUnit/UnitRate as globally visible; the test should confirm they ARE globally visible but Asset is NOT — carefully per the existing schema).
**What to add per D-22:** (1) 1 `BackupCode` row for User A (requires User A `totpEnabled: true` + totpSecret — can mock via direct prisma.backupCode.create). (2) Three new `it()` blocks: `User B sees zero monthly summaries` (filter via `period: { userId: userBId }`), `User B sees zero assets`, `User B sees zero backup codes`. (3) Extend afterAll to `deleteMany` `asset`, `backupCode`, and verify the existing `monthlySummary` cleanup path handles the new row.
**Verify before writing:** Re-check `prisma/schema.prisma` for which models have `userId` (Asset yes; ValueUnit/UnitRate no per RESEARCH); only test isolation on userId-scoped models.

---

### `package.json` (MODIFY — config)

**Current scripts block** (L5-20):
```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint .",
  "lint:fix": "eslint . --fix",
  "format:check": "prettier --check .",
  "format": "prettier --write .",
  "test": "vitest",
  "test:run": "vitest run",
  "test:coverage": "vitest run --coverage",
  "test:integration": "vitest run --config vitest.integration.config.mts",
  "test:e2e": "playwright test",
  "quality": "npm run build && npm run lint && npm run format:check && npm run test:run",
  "postinstall": "prisma generate"
}
```

**What differs per D-11:** Insert one line: `"db:seed:prod": "tsx prisma/seed.prod.ts"` — place it alphabetically or right after `"test:e2e"`. Do NOT modify `"build"` (Vercel build command is set in the Vercel UI per D-15, not here). Do NOT add it to `"quality"` chain (seed is a manual one-shot per D-11).

---

### `.env.example` (MODIFY — config docs)

**Current contents** (L1-16):
```bash
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"
AUTH_SECRET=your-auth-secret-here
AUTH_TOTP_ENCRYPTION_KEY=your-64-hex-character-totp-encryption-key-here
ADMIN_EMAIL=your-admin-email@example.com
ADMIN_PASSWORD=your-admin-password-here
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
RATE_LIMIT_DISABLED=true
```

**What differs per D-13 + RESEARCH Open Q #1:** (1) Add a `--- Database ---` section header comment. (2) Add `DIRECT_URL=""` with comment: `# Vercel Marketplace Prisma Postgres: DATABASE_URL auto-injected (pooled);` + `# DIRECT_URL copied manually from Prisma Console (direct connection for migrations + seed).` + `# Locally, set DIRECT_URL to the same value as DATABASE_URL — Docker Postgres has no pooler.` (3) Under Auth section, add explicit "Min 32 chars. Generate: openssl rand -hex 32" for AUTH_SECRET. (4) Under ADMIN section, add "Min password length: 12 chars. Used ONLY by prisma/seed.prod.ts via `npm run db:seed:prod`." (5) At bottom, add `# DEBUG must NOT be set in production (D-30).` + `# DEBUG=`. See RESEARCH §Code Excerpts L842-877 for the full example.

---

## Shared Patterns

### Fail-Fast at Module Load
**Source:** `src/lib/totp-crypto.ts` L8-19 (`loadKey()` throws)
**Apply to:** `src/lib/env.ts` (NEW). Any required var missing → immediate throw with actionable message. No console.log per D-31.
**Rationale:** Prevents "shipped to prod with empty AUTH_SECRET" class of bug.

### Module-Level Singleton (cached build)
**Source:** `src/lib/rate-limit.ts` L20-21 (`loginLimiter`, `totpLimiter` built once at module scope)
**Apply to:** `src/lib/env.ts` — `env` is parsed once, memoized via module cache.
**Rationale:** Zero per-request cost; one parse at cold start.

### Idempotent Upsert-by-Unique-Key
**Source:** `prisma/seed.ts` L28-38 — `prisma.user.upsert({ where: { email }, update: {...}, create: {...} })`
**Apply to:** `prisma/seed.prod.ts` with `update: { isAdmin: true, isApproved: true }` (NO password rotation per D-10).
**Rationale:** Re-running the seed is a safe no-op; an existing admin's password is NEVER overwritten.

### Two-User beforeAll + FK-Ordered afterAll
**Source:** `tests/integration/isolation.test.ts` L22-164
**Apply to:** `tests/integration/isolation-actions.test.ts` (NEW) AND the extended `isolation.test.ts`.
**Rationale:** Test DB doesn't need global truncation per-test; FK-ordered deleteMany by `userId` is reliable and fast.

### Mock next-auth + Upstash in Integration Tests
**Source:** `tests/integration/totp.test.ts` L10-42 (next-auth + @auth/prisma-adapter + next-auth/providers/credentials + @upstash/ratelimit + @upstash/redis — verbatim copy)
**Apply to:** `tests/integration/isolation-actions.test.ts` (NEW).
**Rationale:** Prevents ESM import chain of `next/server` pulling in edge-runtime conflicts; Upstash mock means tests don't need real Redis.

### Consume `env` (not `process.env`) in Production Modules
**Source:** NEW — this phase introduces it.
**Apply to:** `src/lib/prisma.ts`, `src/lib/rate-limit.ts` (NODE_ENV + RATE_LIMIT_DISABLED only — `Redis.fromEnv()` stays), `src/lib/totp-crypto.ts`, `src/auth.ts` (side-effect import only).
**Exception:** `Redis.fromEnv()` reads `process.env.UPSTASH_REDIS_REST_URL` / `_TOKEN` directly — this is an unavoidable Upstash SDK convention. env.ts still validates the vars; Upstash reads them after validation succeeds. Document this in a comment.
**Verify gate per 30-VALIDATION.md Task 30-02-03:** `! grep -rn "process\.env\.AUTH_SECRET\|process\.env\.AUTH_TOTP_ENCRYPTION_KEY\|process\.env\.UPSTASH_" src/ --include="*.ts" | grep -v "src/lib/env.ts"` must return zero matches.

---

## No Analog Found

None. Every new file has at least one strong analog in the existing codebase. The one artifact without a same-repo analog is `30-VERIFICATION.md` (NEW — Plan 30-06), which is a prose operator runbook; `.planning/phases/28-*/28-VERIFICATION.md` and `.planning/phases/27-*/27-VERIFICATION.md` exist as structural references but are outside the scope of this mapping (they're phase-documentation artifacts, not source files).

---

## Metadata

**Analog search scope:** `src/lib/`, `src/`, `prisma/`, `tests/integration/`, `next.config.ts`, `prisma.config.ts`, `.env.example`, `package.json`
**Files scanned:** 13 (all under the specific-files list; no ambient search needed)
**Pattern extraction date:** 2026-04-20
**Prisma 7 correction acknowledged:** Yes — `prisma.config.ts` (not `prisma/schema.prisma datasource.directUrl`) is the canonical place per RESEARCH.
**Vercel Marketplace env-var correction acknowledged:** Yes — only `DATABASE_URL` is auto-injected; `DIRECT_URL` is manually copied per RESEARCH.

---

## PATTERN MAPPING COMPLETE
