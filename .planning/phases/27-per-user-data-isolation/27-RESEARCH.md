# Phase 27: Per-User Data Isolation - Research

**Researched:** 2026-04-18
**Domain:** Authentication-gated data isolation, Server Component/Action auth patterns, Next.js 16 caching
**Confidence:** HIGH

## Summary

Phase 27 is a mechanical refactoring phase. All lib data functions already accept a `userId` parameter (Phase 25). All data models have a required `userId` column (Phase 25). Auth.js v5 is configured with JWT sessions exposing `userId` (Phase 26). The work is replacing 13 `getDefaultUserId()` import sites with real session-based auth: `requireAuth()` in Server Actions (defense-in-depth against CVE-2025-29927 middleware bypass), `auth()` in page Server Components.

A critical security finding: 11 Prisma operations across 4 action files use `where: { id }` without userId scoping. This creates IDOR (Insecure Direct Object Reference) vulnerabilities where any authenticated user could modify another user's records by guessing a CUID. These MUST be fixed as part of ISOL-02.

**Primary recommendation:** Replace all `getDefaultUserId()` calls with session-based auth, fix all IDOR-vulnerable queries to include userId in where clauses, use `connection()` from `next/server` for cache prevention (replaces deprecated `unstable_noStore`), and delete the `getDefaultUserId` helper entirely.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- requireAuth() returns `{ userId }` only -- minimal shape, email fetched from DB when needed
- Lives in `src/lib/auth-utils.ts` -- replaces getDefaultUserId() in the same file
- On no session: redirects to `/login?callbackUrl=<current-path>` (matches proxy.ts behavior from Phase 26)
- Used in Server Actions only -- pages use auth() directly from src/auth.ts
- Pages call `auth()` directly from src/auth.ts, extract `session.user.id` as userId
- Pages do NOT use requireAuth() -- proxy.ts already handles page-level redirects for unauthenticated users
- requireAuth() is defense-in-depth for Server Actions specifically (CVE-2025-29927 mitigation)
- Both pages and Server Actions call noStore() -- belt and suspenders
- Claude decides whether to place at layout level or per-page (whichever is cleanest for Next.js 16)
- All at once in one clean break -- replace all 13 getDefaultUserId() callsites, then delete the helper
- No incremental approach -- lib functions already accept userId (Phase 25), this is just changing the source of userId
- Mock requireAuth() to return `{ userId: 'test-user-id' }` -- matches existing getDefaultUserId() mock pattern
- All 6 action test files update their auth-utils mock from getDefaultUserId to requireAuth
- Add one basic cross-user isolation integration test: create User A data, authenticate as User B, assert B sees zero of A's records

### Claude's Discretion
- noStore() import path (next/cache or unstable_noStore -- depends on Next.js 16 API)
- Whether to add a requireAuth.test.ts or test it via existing action tests
- Exact cross-user test structure (which entities to test, how to create test users)
- Order of file updates within the "all at once" migration

### Deferred Ideas (OUT OF SCOPE)
- Cross-user integration test suite (ISOL-05, comprehensive) -- Phase 30
- requireAuth() rate limiting -- Phase 29 (TOTP-05)
- Admin panel for user management -- Out of scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ISOL-01 | requireAuth() helper that calls auth(), redirects if no session, returns { userId } | auth() from src/auth.ts, redirect from next/navigation, design pattern documented below |
| ISOL-02 | All Prisma queries across all 7 lib files scoped with userId filter | Lib files already accept userId and scope queries -- VERIFIED. But 11 action-level queries lack userId -- IDOR fix needed |
| ISOL-03 | All 6 Server Action files call requireAuth() before any database operation | Drop-in replacement for getDefaultUserId() in 6 action files (9 total call sites) |
| ISOL-04 | All page Server Components call auth() and pass userId to data-fetching functions | 7 pages currently use getDefaultUserId() -- switch to auth() import from src/auth.ts |
| DEPLOY-05 | noStore() on all Server Components fetching user-specific data | Use `connection()` from next/server (NOT deprecated unstable_noStore). See Architecture Patterns for placement strategy |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next-auth | 5.0.0-beta.31 | Session management via auth() | Already configured in Phase 26, JWT strategy with userId in session |
| next | 16.2.2 | Framework -- connection() for dynamic opt-in, redirect for auth redirects | Project framework |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| next/server | (bundled) | `connection()` function for cache prevention | Pages and Server Actions fetching user-specific data |
| next/navigation | (bundled) | `redirect()` function for unauthenticated users | requireAuth() helper |

### No New Dependencies

This phase requires zero new npm packages. Everything needed is already installed:
- `auth()` from `src/auth.ts` (configured in Phase 26)
- `redirect()` from `next/navigation`
- `connection()` from `next/server`

## Architecture Patterns

### requireAuth() Helper Design

```typescript
// Source: Next.js 16 docs (redirect.md, connection.md) + Auth.js v5 (src/auth.ts)
// File: src/lib/auth-utils.ts

import { redirect } from 'next/navigation'
import { auth } from '@/auth'

/**
 * Defense-in-depth auth guard for Server Actions.
 * Calls auth() to get session, redirects if unauthenticated.
 * Returns { userId } for Prisma query scoping.
 *
 * CRITICAL: Call BEFORE any try/catch block in Server Actions.
 * redirect() throws internally -- if caught, the redirect is swallowed.
 */
export async function requireAuth(): Promise<{ userId: string }> {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login')
  }

  return { userId: session.user.id }
}
```

**PITFALL -- redirect() inside try/catch:** `redirect()` works by throwing a special Next.js error. If `requireAuth()` is called inside a try/catch block, the redirect throw will be caught and the action will return an error response instead of redirecting. Every Server Action MUST call `requireAuth()` BEFORE its try/catch block.

### Page Auth Pattern

```typescript
// Source: Next.js 16 docs + Auth.js v5
// File: src/app/(app)/[route]/page.tsx

import { connection } from 'next/server'
import { auth } from '@/auth'

export default async function SomePage() {
  await connection()
  const session = await auth()
  // proxy.ts handles redirect for unauthenticated users
  // auth() is defense-in-depth -- session should always exist here
  const userId = session!.user!.id

  // ... pass userId to data-fetching functions
}
```

### Server Action Auth Pattern

```typescript
// Source: Existing action patterns + requireAuth() design
// File: src/app/(app)/[route]/actions.ts

'use server'

import { requireAuth } from '@/lib/auth-utils'

export async function createSomething(data: unknown): Promise<ActionResult> {
  // MUST be BEFORE try/catch -- redirect() throws
  const { userId } = await requireAuth()

  const parsed = someSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  try {
    // ... use userId in Prisma queries
  } catch {
    return { error: { _form: ['Error de servidor'] } }
  }
}
```

### connection() Placement Strategy (Claude's Discretion)

**Recommendation: Per-page, not layout-level.**

Rationale:
1. `auth()` from next-auth already calls `headers()` internally, which is a Request-time API. This ALREADY opts the component into dynamic rendering. Calling `connection()` is technically redundant when `auth()` is present.
2. However, DEPLOY-05 requires explicit opt-out of caching as belt-and-suspenders.
3. Layout-level placement would affect ALL routes including the login page (which is in a different route group `(auth)`, so actually layout-level in `(app)/layout.tsx` would work). But per-page is more explicit and self-documenting.
4. `connection()` is the modern replacement for deprecated `unstable_noStore`. Both achieve the same goal: opting out of prerendering/caching.

**Place `await connection()` as the first line of every `(app)` page Server Component.** This ensures:
- No prerendering of user-specific data
- No cross-user cache leakage
- Clear intent in code review

For Server Actions: `connection()` is unnecessary. Server Actions are inherently dynamic (they respond to POST requests). `requireAuth()` calling `auth()` (which calls `headers()`) already ensures dynamic context.

### IDOR Fix Pattern

11 Prisma operations in action files use `where: { id }` without userId, creating IDOR vulnerabilities:

| File | Operation | Vulnerable Query |
|------|-----------|-----------------|
| movimientos/actions.ts | updateTransaction | `findUnique({ where: { id } })` |
| movimientos/actions.ts | updateTransaction | `update({ where: { id } })` |
| movimientos/actions.ts | deleteTransaction | `findUnique({ where: { id } })` |
| movimientos/actions.ts | deleteTransaction | `delete({ where: { id } })` |
| deudas/actions.ts | updateDebt | `update({ where: { id } })` |
| deudas/actions.ts | updateDebtBalance | `update({ where: { id } })` |
| deudas/actions.ts | deleteDebt | `delete({ where: { id } })` |
| ingresos/actions.ts | updateIncomeSource | `update({ where: { id } })` |
| ingresos/actions.ts | deleteIncomeSource | `delete({ where: { id } })` |
| configuracion/actions.ts | deleteCategory | `findUnique({ where: { id } })` |
| configuracion/actions.ts | deleteCategory | `update({ where: { id } })` |

**Fix strategy:** Replace `findUnique({ where: { id } })` with `findFirst({ where: { id, userId } })`. For `update`/`delete` with `where: { id }`, first verify ownership with `findFirst({ where: { id, userId } })`, then proceed. Prisma's `update`/`delete` only accept unique fields in `where`, so we cannot add `userId` directly to those where clauses -- we must verify ownership first.

```typescript
// BEFORE (IDOR vulnerable):
const existing = await prisma.transaction.findUnique({
  where: { id },
  include: { period: true },
})

// AFTER (ownership verified):
const existing = await prisma.transaction.findFirst({
  where: { id, userId },
  include: { period: true },
})
if (!existing) {
  return { error: { _form: ['Transaccion no encontrada'] } }
}
```

Also for historial/actions.ts: `closePeriod` and `reopenPeriod` use `findUnique({ where: { id: periodId } })` without userId. These need the same fix.

### Anti-Patterns to Avoid

- **redirect() inside try/catch:** `redirect()` throws a special error that Next.js catches to perform the redirect. If it's inside a try/catch, the catch block will swallow the redirect and return an error instead. ALWAYS call requireAuth() before the try block.
- **Using unstable_noStore:** Deprecated since Next.js 15. Use `connection()` from `next/server` instead.
- **findUnique with non-unique compound:** Cannot use `findUnique({ where: { id, userId } })` because `id` alone is the unique field. Use `findFirst` instead.
- **Non-null assertion without guard:** `session!.user!.id` is acceptable in pages because proxy.ts guarantees a session, but MUST be accompanied by a comment explaining why.
- **Calling connection() in Server Actions:** Server Actions are already dynamic. `connection()` is only for Server Components.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session reading | Custom JWT parsing | `auth()` from src/auth.ts | Auth.js handles token validation, expiry, session shape |
| Auth redirect | Manual Response with Location header | `redirect()` from next/navigation | Next.js handles streaming context, proper status codes |
| Cache opt-out | `export const dynamic = 'force-dynamic'` | `connection()` per-component | More granular, component-level control |
| IDOR prevention | Post-query userId check | userId in Prisma where clause | DB-level filtering is more secure than application-level check-after-fetch |

## Common Pitfalls

### Pitfall 1: redirect() Swallowed by try/catch
**What goes wrong:** requireAuth() calls redirect() inside a Server Action's try/catch block. The redirect throw is caught, and the action returns a generic error instead of redirecting.
**Why it happens:** `redirect()` works by throwing a NEXT_REDIRECT error that Next.js intercepts. try/catch catches all errors.
**How to avoid:** Call `requireAuth()` (and therefore `redirect()`) BEFORE the try/catch block in every Server Action.
**Warning signs:** Unauthenticated users see "Error de servidor" toast instead of being redirected to /login.

### Pitfall 2: IDOR in Update/Delete Operations
**What goes wrong:** An authenticated user modifies another user's transaction by POSTing a known ID.
**Why it happens:** `prisma.transaction.update({ where: { id } })` operates on any record regardless of ownership.
**How to avoid:** Every query that operates on an ID must include userId in the where clause. Use `findFirst({ where: { id, userId } })` instead of `findUnique({ where: { id } })`.
**Warning signs:** No 404 when accessing another user's resource by ID.

### Pitfall 3: Forgetting connection() in Pages
**What goes wrong:** A page that uses `auth()` appears to work correctly because `auth()` calls `headers()` internally, making it dynamic. But if Next.js ever optimizes the internal path, pages without explicit `connection()` could be prerendered.
**Why it happens:** Relying on implementation details of auth() rather than explicitly declaring dynamic intent.
**How to avoid:** Add `await connection()` as the first line of every page, regardless of whether auth() is called.
**Warning signs:** Cross-user data leakage in production under aggressive caching.

### Pitfall 4: Test Mock Name Mismatch
**What goes wrong:** Tests still mock `getDefaultUserId` but the import is now `requireAuth`. Tests pass because mock module matches, but the mock function name doesn't match the actual function name -- causing the mock to not be applied.
**Why it happens:** Vitest mocks are module-level. If the mock object keys don't match the actual exports, the real function runs.
**How to avoid:** Update mock from `{ getDefaultUserId: vi.fn()... }` to `{ requireAuth: vi.fn()... }`. The return shape changes from a plain string to `{ userId: string }`.
**Warning signs:** Tests fail with "No approved user found" or database connection errors.

### Pitfall 5: session.user.id Type Narrowing
**What goes wrong:** TypeScript complains that `session.user.id` might be undefined.
**Why it happens:** Auth.js types have `session.user.id` as `string | undefined` by default.
**How to avoid:** In requireAuth(), the null check + redirect guarantees session.user.id exists. In pages, use non-null assertion with comment explaining proxy.ts guarantees. Phase 26 already configured session callback to set `session.user.id = token.userId`.
**Warning signs:** TypeScript compilation errors on session.user.id access.

## Code Examples

### requireAuth() Implementation

```typescript
// Source: Next.js 16 redirect docs + Auth.js v5 session API
// File: src/lib/auth-utils.ts

import { redirect } from 'next/navigation'
import { auth } from '@/auth'

export async function requireAuth(): Promise<{ userId: string }> {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login')
  }

  return { userId: session.user.id }
}
```

### Server Action Migration (movimientos example)

```typescript
// BEFORE:
import { getDefaultUserId } from '@/lib/auth-utils'

export async function createTransaction(data: unknown): Promise<ActionResult> {
  const parsed = createTransactionSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  try {
    const userId = await getDefaultUserId()
    // ...
  } catch {
    return { error: { _form: ['Error de servidor'] } }
  }
}

// AFTER:
import { requireAuth } from '@/lib/auth-utils'

export async function createTransaction(data: unknown): Promise<ActionResult> {
  const { userId } = await requireAuth()  // BEFORE try/catch

  const parsed = createTransactionSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  try {
    // userId used in queries, no longer fetched inside try
    // ...
  } catch {
    return { error: { _form: ['Error de servidor'] } }
  }
}
```

### Page Migration (dashboard example)

```typescript
// BEFORE:
import { getDefaultUserId } from '@/lib/auth-utils'

export default async function HomePage({ searchParams }: PageProps) {
  const params = await searchParams
  const userId = await getDefaultUserId()
  // ...
}

// AFTER:
import { connection } from 'next/server'
import { auth } from '@/auth'

export default async function HomePage({ searchParams }: PageProps) {
  await connection()
  const session = await auth()
  const userId = session!.user!.id  // proxy.ts guarantees session
  const params = await searchParams
  // ...
}
```

### Test Mock Migration

```typescript
// BEFORE:
vi.mock('@/lib/auth-utils', () => ({
  getDefaultUserId: vi.fn().mockResolvedValue('test-user-id'),
}))

// AFTER:
vi.mock('@/lib/auth-utils', () => ({
  requireAuth: vi.fn().mockResolvedValue({ userId: 'test-user-id' }),
}))
```

### IDOR Fix (updateTransaction example)

```typescript
// BEFORE (IDOR vulnerable):
export async function updateTransaction(id: string, data: unknown): Promise<ActionResult> {
  // ...
  try {
    const existing = await prisma.transaction.findUnique({
      where: { id },
      include: { period: true },
    })
    // ...
    await prisma.transaction.update({
      where: { id },
      data: { /* ... */ },
    })
  }
}

// AFTER (ownership verified):
export async function updateTransaction(id: string, data: unknown): Promise<ActionResult> {
  const { userId } = await requireAuth()
  // ...
  try {
    const existing = await prisma.transaction.findFirst({
      where: { id, userId },
      include: { period: true },
    })
    if (!existing) {
      return { error: { _form: ['Transaccion no encontrada'] } }
    }
    // update still uses where: { id } -- ownership already verified above
    await prisma.transaction.update({
      where: { id },
      data: { /* ... */ },
    })
  }
}
```

### Cross-User Isolation Test

```typescript
// Source: Existing integration test patterns (tests/integration/auth.test.ts)
// File: tests/integration/isolation.test.ts

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { prisma } from '../setup'

// Mock next-auth (same pattern as auth.test.ts)
vi.mock('next-auth', () => ({ /* ... */ }))
vi.mock('@auth/prisma-adapter', () => ({ PrismaAdapter: vi.fn() }))
vi.mock('next-auth/providers/credentials', () => ({ default: vi.fn(() => ({})) }))

describe('Cross-user data isolation', () => {
  let userAId: string
  let userBId: string

  beforeAll(async () => {
    // Create two test users
    const userA = await prisma.user.create({
      data: { email: 'user-a@test.com', name: 'User A', isApproved: true },
    })
    const userB = await prisma.user.create({
      data: { email: 'user-b@test.com', name: 'User B', isApproved: true },
    })
    userAId = userA.id
    userBId = userB.id

    // Create data for User A (categories, period, transactions, etc.)
  })

  afterAll(async () => {
    // Cleanup test data
  })

  it('User B sees zero of User A transactions', async () => {
    const transactions = await prisma.transaction.findMany({
      where: { userId: userBId },
    })
    expect(transactions).toHaveLength(0)
  })

  // ... similar tests for other entities
})
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `unstable_noStore` from `next/cache` | `connection()` from `next/server` | Next.js 15.0.0 | unstable_noStore deprecated; connection() is the stable API |
| `getDefaultUserId()` (DB query) | `requireAuth()` (session-based) | Phase 27 (this phase) | Eliminates DB round-trip per auth check |
| `findUnique({ where: { id } })` | `findFirst({ where: { id, userId } })` | Phase 27 (this phase) | Fixes IDOR vulnerabilities |

**Deprecated/outdated:**
- `unstable_noStore` from `next/cache`: Deprecated since Next.js 15. Use `connection()` from `next/server`
- `getDefaultUserId()`: Temporary helper that queries DB. To be deleted in this phase

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.x |
| Config file | vitest.config.mts (unit), vitest.integration.config.mts (integration) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npm test && npm run test:integration` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ISOL-01 | requireAuth() returns userId from session, redirects when no session | unit | `npx vitest run src/lib/auth-utils.test.ts -x` | No -- Wave 0 |
| ISOL-02 | All lib queries scoped with userId | unit | `npx vitest run src/lib/*.test.ts -x` | Yes -- existing tests already verify userId param |
| ISOL-03 | All 6 action files call requireAuth() | unit | `npx vitest run src/app/**/actions.test.ts -x` | Yes -- existing (need mock update) |
| ISOL-04 | Pages call auth() and pass userId | manual-only | Manual: verify page renders for authenticated user | N/A -- pages are Server Components |
| DEPLOY-05 | connection() prevents caching | manual-only | Manual: verify no prerendering | N/A -- runtime behavior |
| ISOL (cross-user) | User B cannot see User A data | integration | `npx vitest run tests/integration/isolation.test.ts --config vitest.integration.config.mts -x` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npm test && npm run test:integration`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/auth-utils.test.ts` -- covers ISOL-01 (requireAuth unit tests)
- [ ] `tests/integration/isolation.test.ts` -- covers cross-user isolation (ISOL basic)
- [ ] All 6 `actions.test.ts` files need mock updates from `getDefaultUserId` to `requireAuth`

## Open Questions

1. **connection() in Server Actions -- needed or not?**
   - What we know: Server Actions are inherently dynamic (POST requests). `requireAuth()` calls `auth()` which calls `headers()`. Adding `connection()` is triple-redundant.
   - What's unclear: Whether DEPLOY-05's "belt and suspenders" intent requires connection() in Server Actions despite being unnecessary.
   - Recommendation: Skip `connection()` in Server Actions. Reserve it for page Server Components only. DEPLOY-05 says "Server Components fetching user-specific data" -- Server Actions are not Server Components.

2. **Should requireAuth() have its own test file?**
   - What we know: The function is 6 lines. It's tested indirectly through every action test.
   - What's unclear: Whether a dedicated unit test adds value vs testing through action tests.
   - Recommendation: Create `src/lib/auth-utils.test.ts` with focused unit tests for requireAuth(). It's the security boundary -- it deserves direct tests verifying redirect behavior and return shape.

## Sources

### Primary (HIGH confidence)
- `/Users/freptar0/Desktop/Projects/centik/node_modules/next/dist/docs/01-app/03-api-reference/04-functions/connection.md` -- connection() API, replaces unstable_noStore
- `/Users/freptar0/Desktop/Projects/centik/node_modules/next/dist/docs/01-app/03-api-reference/04-functions/unstable_noStore.md` -- deprecation notice, version history
- `/Users/freptar0/Desktop/Projects/centik/node_modules/next/dist/docs/01-app/03-api-reference/04-functions/redirect.md` -- redirect behavior, try/catch warning
- `/Users/freptar0/Desktop/Projects/centik/src/auth.ts` -- auth() export, session callback
- `/Users/freptar0/Desktop/Projects/centik/node_modules/next-auth/lib/index.js` -- auth() calls headers() internally, confirming dynamic rendering

### Secondary (MEDIUM confidence)
- Codebase analysis of all 6 action files and 7 page files for getDefaultUserId() usage
- Codebase analysis of 11 IDOR-vulnerable queries across action files

### Tertiary (LOW confidence)
- None -- all findings verified against source code and official docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, all APIs verified in node_modules docs
- Architecture: HIGH -- patterns verified against Next.js 16 docs and existing codebase
- Pitfalls: HIGH -- redirect() try/catch pitfall documented in official Next.js docs; IDOR vulnerabilities verified by code inspection
- noStore replacement: HIGH -- connection() confirmed available in Next.js 16, unstable_noStore confirmed deprecated

**Research date:** 2026-04-18
**Valid until:** 2026-05-18 (stable -- no moving parts)

---

## Inventory of Changes

### Files to Modify

**Auth utility (1 file):**
- `src/lib/auth-utils.ts` -- replace getDefaultUserId() with requireAuth()

**Server Action files (6 files, 9 call sites):**
- `src/app/(app)/movimientos/actions.ts` -- 3 calls (getTransactionFormData, createTransaction, updateTransaction) + IDOR fixes for update/delete
- `src/app/(app)/deudas/actions.ts` -- 1 call (createDebt) + IDOR fixes for update/updateBalance/delete
- `src/app/(app)/presupuesto/actions.ts` -- 1 call (upsertBudgets)
- `src/app/(app)/historial/actions.ts` -- 2 calls (closePeriod, getClosePeriodPreviewAction) + IDOR fixes for closePeriod/reopenPeriod
- `src/app/(app)/ingresos/actions.ts` -- 1 call (createIncomeSource) + IDOR fixes for update/delete
- `src/app/(app)/configuracion/actions.ts` -- 1 call (createCategory) + IDOR fix for deleteCategory

**Page Server Components (7 files):**
- `src/app/(app)/page.tsx` -- dashboard
- `src/app/(app)/deudas/page.tsx`
- `src/app/(app)/historial/page.tsx`
- `src/app/(app)/ingresos/page.tsx`
- `src/app/(app)/movimientos/page.tsx`
- `src/app/(app)/presupuesto/page.tsx`
- `src/app/(app)/configuracion/page.tsx`

**Test files (6 unit + 1 integration):**
- `src/app/(app)/movimientos/actions.test.ts` -- mock update
- `src/app/(app)/deudas/actions.test.ts` -- mock update
- `src/app/(app)/presupuesto/actions.test.ts` -- mock update
- `src/app/(app)/historial/actions.test.ts` -- mock update
- `src/app/(app)/ingresos/actions.test.ts` -- mock update
- `src/app/(app)/configuracion/actions.test.ts` -- mock update
- `tests/integration/isolation.test.ts` -- NEW

**New test file:**
- `src/lib/auth-utils.test.ts` -- NEW (requireAuth unit tests)

**Total: 21 files modified, 2 files created**
