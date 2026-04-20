# Phase 29: TOTP Two-Factor Authentication - Pattern Map

**Mapped:** 2026-04-20
**Files analyzed:** 22 (14 NEW + 8 MODIFIED + 2 test files)
**Analogs found:** 20 / 22 (2 "no direct analog — cite docs")

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/lib/totp-crypto.ts` (NEW) | utility (pure crypto) | transform | `src/lib/invite-utils.ts` + `src/lib/serialize.ts` | role-match |
| `src/lib/totp.ts` (NEW) | utility (wrapper) | transform | `src/lib/invite-utils.ts` | role-match |
| `src/lib/backup-codes.ts` (NEW) | utility + DB | CRUD (partial) | `src/lib/invite-utils.ts` (gen) + `src/actions/auth.ts` (bcrypt) | role-match |
| `src/lib/challenge.ts` (NEW) | utility (HMAC) | transform | `src/lib/invite-utils.ts` (shape only) — no direct HMAC analog | partial |
| `src/lib/rate-limit.ts` (NEW) | utility (singleton) | request-response | `src/lib/prisma.ts` (singleton shape) | partial |
| `src/app/(app)/configuracion/totp-actions.ts` (NEW) | Server Action | CRUD | `src/app/(app)/configuracion/invite-actions.ts` | exact |
| `src/components/configuracion/SeguridadSection.tsx` (NEW) | component (section) | request-response | `src/components/configuracion/InvitacionesSection.tsx` | exact |
| `src/components/configuracion/Activar2faModal.tsx` (NEW) | component (modal) | request-response | `src/components/categories/CategoryForm.tsx` (Modal wrapper) | exact |
| `src/components/configuracion/Desactivar2faModal.tsx` (NEW) | component (modal) | request-response | `src/components/categories/CategoryForm.tsx` | exact |
| `src/components/configuracion/BackupCodesScreen.tsx` (NEW) | component (display) | transform | `src/components/configuracion/GeneratedUrlPanel.tsx` (copy/display pattern) | role-match |
| `src/components/auth/TotpStep.tsx` (NEW) | component (form) | request-response | `src/components/auth/LoginForm.tsx` | exact |
| `tests/integration/totp.test.ts` (NEW) | test | CRUD | `tests/integration/auth.test.ts` + `tests/integration/isolation.test.ts` | exact |
| `e2e/totp.spec.ts` (NEW) | test | E2E | `e2e/auth.spec.ts` | exact |
| `src/auth.ts` (MODIFY) | config | — | self (extend `authorizeUser` in place) | — |
| `src/actions/auth.ts` (MODIFY) | Server Action | — | self (split `loginAction`, add `verifyTotpAction`) | — |
| `src/lib/validators.ts` (MODIFY) | schema | — | self (append 4 schemas — `loginSchema`/`registerSchema` pattern) | — |
| `src/app/(app)/configuracion/page.tsx` (MODIFY) | page | — | self (fetch `totpEnabled`) | — |
| `src/app/(app)/configuracion/ConfiguracionClientWrapper.tsx` (MODIFY) | component wrapper | — | self (render `<SeguridadSection />`) | — |
| `prisma/schema.prisma` (MODIFY) | schema | — | self (append `BackupCode` model + reverse relation) | — |
| `.env.example` (MODIFY) | config | — | self | — |
| `package.json` (MODIFY) | config | — | self | — |
| `src/components/auth/LoginForm.tsx` (MODIFY) | component (form) | — | self (branch on `requiresTotp`) | — |

---

## Pattern Assignments — NEW Files

### `src/lib/totp-crypto.ts` (utility, pure transform)

**Analog:** `src/lib/invite-utils.ts` (module shape + `node:crypto` use)
**Excerpt** (`src/lib/invite-utils.ts` lines 1-10):
```typescript
import { randomBytes } from 'node:crypto'

/** 7 days in milliseconds — invite expiration window per D-09 */
export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000

/** Generates a 64-character hex token using crypto.randomBytes(32). Per INVITE-02. */
export function generateInviteToken(): string {
  return randomBytes(32).toString('hex')
}
```
**What to replicate:** `import { ... } from 'node:crypto'`; named exports (no default); Spanish JSDoc with requirement ID; module-level constants in UPPER_SNAKE_CASE.
**What differs:** Add a module-level `loadKey()` call that throws on invalid `AUTH_TOTP_ENCRYPTION_KEY` (RESEARCH Pattern 1, lines 336-378) — no analog; this is the boot-fail-fast contract per D-07.

---

### `src/lib/totp.ts` (utility, pure transform)

**Analog:** `src/lib/invite-utils.ts` (same as above — pure module of named helpers)
**What to replicate:** Named exports only; each function has Spanish JSDoc referencing the requirement (`D-01`, `D-04`); no `default` export.
**What differs:** Wraps `otplib` v13 flat exports (`generateSecret`, `generate`, `verify`, `generateURI`). `verify()` returns `{ valid, delta }` — must read `.valid` (RESEARCH Summary §1). Expose three functions: `createTotpSecret()`, `buildOtpauthUri(secret, email)`, `verifyTotp(secret, code): boolean`.

---

### `src/lib/backup-codes.ts` (utility + DB, CRUD partial)

**Analog 1 (generation):** `src/lib/invite-utils.ts` lines 7-9 (`crypto.randomBytes` idiom above).
**Analog 2 (bcrypt cost + hash-before-tx):** `src/actions/auth.ts` lines 68-72:
```typescript
// Hash BEFORE the transaction (bcrypt is slow; do not hold a DB transaction open during it)
const hashedPassword = await bcrypt.hash(parsed.data.password, 12)

try {
  await prisma.$transaction(async (tx) => {
    const token = await tx.inviteToken.findUnique({
      where: { token: parsed.data.token },
    })
```
**Analog 3 (bcrypt compare):** `src/auth.ts` line 32:
```typescript
const isValid = await bcrypt.compare(password, user.hashedPassword)
```
**What to replicate:** `bcrypt` (not `bcryptjs.default`) import as `import bcrypt from 'bcryptjs'`; cost factor **12** everywhere; hash array of codes BEFORE opening `$transaction` (Phase 28 P03 rule).
**What differs:** `consumeBackupCode(userId, code)` uses atomic `updateMany({ where: { id, usedAt: null }, data: { usedAt: new Date() } })` and checks `count === 1` — no existing analog for the atomic single-use pattern (RESEARCH Pattern describes it; novel for this phase).

---

### `src/lib/challenge.ts` (utility, HMAC transform)

**Analog:** No direct analog in codebase — cite `node:crypto` docs. Module **shape** follows `src/lib/invite-utils.ts` (named exports, Spanish JSDoc, requirement IDs).
**What to replicate:** Same module structure as `invite-utils.ts`. Use `process.env.AUTH_SECRET` (already exists per Phase 26) validated at module boot. Compare signatures with `crypto.timingSafeEqual(Buffer, Buffer)` — never `===` (RESEARCH Pattern cites this; D-16 requires constant-time).
**Required exports:** `signChallenge(userId: string, email: string): string` (HMAC-SHA256 over `userId|email|exp`, 5-min TTL) and `verifyChallenge(token: string): { userId, email } | null` (expired or tampered → null).

---

### `src/lib/rate-limit.ts` (utility, singleton instance)

**Analog:** `src/lib/prisma.ts` (create-once-export singleton shape)
**Excerpt** (`src/lib/prisma.ts` lines 1-19):
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
**What to replicate:** Env-var validation at module boot (throw fast); factory function named `create<Thing>()`; singleton stored on `globalForPrisma` equivalent to avoid re-instantiation during HMR.
**What differs:** Two named exports (not default): `loginLimiter` and `totpLimiter`, each a `new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, '60 s') })`. Plus a `getClientIp(headers)` helper and a bypass-aware wrapper `checkRateLimit(limiter, key)` that short-circuits when `NODE_ENV !== 'production' || RATE_LIMIT_DISABLED === 'true'` (D-26).

---

### `src/app/(app)/configuracion/totp-actions.ts` (Server Action, CRUD — **GOLD STANDARD**)

**Analog:** `src/app/(app)/configuracion/invite-actions.ts` (exact match on Server Action shape)
**Excerpt** (`invite-actions.ts` lines 1-75, `createInviteToken` — the gold-standard pattern):
```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { createInviteSchema } from '@/lib/validators'
import { requireAuth } from '@/lib/auth-utils'
import { generateInviteToken, INVITE_TTL_MS } from '@/lib/invite-utils'

type ActionResult = { success: true } | { error: Record<string, string[]> }
type CreateInviteResult = { success: true; token: string } | { error: Record<string, string[]> }

/** Detect Prisma error codes from both real errors and test mocks */
function getPrismaErrorCode(error: unknown): string | null {
  if (error && typeof error === 'object' && 'code' in error) {
    return (error as { code: string }).code
  }
  return null
}

/** Double-gate: requireAuth() then DB-backed admin check. Returns null on non-admin. */
async function requireAdmin(): Promise<{ userId: string } | null> {
  const { userId } = await requireAuth()
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true },
  })
  if (!user?.isAdmin) return null
  return { userId }
}

export async function createInviteToken(formData: FormData): Promise<CreateInviteResult> {
  const parsed = createInviteSchema.safeParse({ email: formData.get('email') })
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  const admin = await requireAdmin()
  if (!admin) return { error: { _form: ['No autorizado'] } }

  try {
    // ... IDOR checks, then:
    const token = generateInviteToken()
    const expiresAt = new Date(Date.now() + INVITE_TTL_MS)

    await prisma.inviteToken.create({
      data: { token, email: parsed.data.email, expiresAt, createdBy: admin.userId },
    })

    revalidatePath('/configuracion')
    return { success: true, token }
  } catch (error: unknown) {
    const code = getPrismaErrorCode(error)
    if (code === 'P2002') { /* handled */ }
    return { error: { _form: ['No pudimos generar la invitacion'] } }
  }
}
```
**What to replicate (copy verbatim):** `'use server'` header; `ActionResult` type alias with `{ success } | { error: Record<string, string[]> }` shape (Phase 28 D-20); `requireAuth()` first line of every action; Zod `.safeParse().flatten().fieldErrors`; IDOR-scoped queries (`where: { id, userId }`); `revalidatePath('/configuracion')` after mutation; `_form` bucket for generic errors; Spanish messages.
**What differs:** No `requireAdmin()` — 2FA is per-user, not admin-gated (D-19). Actions needed: `prepareTotpSecretAction()` (returns `{ secret, qrDataUrl }`), `enableTotpAction(secret, code)` (hash 10 backup codes BEFORE `$transaction`, then atomic update User + createMany BackupCode — see RESEARCH Pattern 3 diagram), `disableTotpAction(code)`, `regenerateBackupCodesAction(code)`. ALL writes that touch >1 row use `prisma.$transaction`.

---

### `src/components/configuracion/SeguridadSection.tsx` (component, section)

**Analog:** `src/components/configuracion/InvitacionesSection.tsx` (exact shell pattern)
**Excerpt** (`InvitacionesSection.tsx` lines 1-44):
```tsx
'use client'

import { useState } from 'react'
import InvitacionForm from './InvitacionForm'
import GeneratedUrlPanel from './GeneratedUrlPanel'
import InvitacionesList from './InvitacionesList'
import { buildInviteUrl, INVITE_TTL_MS } from '@/lib/invite-utils'
import type { InviteToken } from '@/types'

interface InvitacionesSectionProps {
  inviteTokens: InviteToken[]
  origin: string
}

export default function InvitacionesSection({ inviteTokens, origin }: InvitacionesSectionProps) {
  const [generated, setGenerated] = useState<{ token: string; expiresAt: Date } | null>(null)

  return (
    <div className="space-y-4">
      <InvitacionForm onTokenGenerated={handleTokenGenerated} />
      {generated && <GeneratedUrlPanel url={buildInviteUrl(origin, generated.token)} expiresAt={generated.expiresAt} />}
      <InvitacionesList tokens={inviteTokens} />
    </div>
  )
}
```
**What to replicate:** `'use client'` header; PascalCase name matches file name; typed Props interface same file; `space-y-4` outer container; one-state-per-concern pattern; post-action transient UI (like `GeneratedUrlPanel`) surfaces alongside the persistent list.
**What differs:** Props are `{ totpEnabled: boolean }` (no origin, no list). Body is a status header (`StatusDot` green when enabled, neutral when off) + CTAs: "Activar 2FA" button when off, "Regenerar codigos" + "Desactivar" buttons when on. Opens the three new modals via `useState<'activate' | 'deactivate' | 'regenerate' | null>`.

---

### `src/components/configuracion/Activar2faModal.tsx` (component, modal)

**Analog:** `src/components/categories/CategoryForm.tsx` (Modal primitive wrapper — exact)
**Excerpt** (`CategoryForm.tsx` lines 51-72):
```tsx
interface CategoryFormProps {
  isOpen: boolean
  onClose: () => void
}

export default function CategoryForm({ isOpen, onClose }: CategoryFormProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nueva categoria">
      {isOpen && (
        <CategoryFormContent key="new-category" onClose={onClose} />
      )}
    </Modal>
  )
}

function CategoryFormContent({ onClose }: FormContentProps) {
  const [name, setName] = useState('')
  // ...state, fetch, handleSubmit calling Server Action, toast on success, onClose()
}
```
**What to replicate:** Split into `<Modal>` wrapper + `<Content>` inner that remounts via `key={...}` when opening (clean state); `interface {Name}Props` same-file; `isOpen && <Content/>` guard so inner hooks only mount when visible; `toast.success(...)` + `onClose()` on success (also see `InvitacionForm.tsx` lines 41-52).
**What differs:** 3-step wizard inside the inner content — `useState<'scan' | 'verify' | 'codes'>('scan')`. Step 1 calls `prepareTotpSecretAction()` on mount (client stashes `{secret, qrDataUrl}` in React state until step 2). Step 2 submits via `useActionState(enableTotpAction, undefined)`. Step 3 renders `<BackupCodesScreen>`. Use `maxWidth="max-w-[520px]"` — slightly wider for QR.

---

### `src/components/configuracion/Desactivar2faModal.tsx` (component, modal)

**Analog:** `src/components/categories/CategoryForm.tsx` (same as Activar2faModal above — Modal wrapper + inner Content + `useActionState`).
**What to replicate:** Same wrapper/inner/remount pattern. Single-step: `<FloatingInput>` for TOTP code + submit button. `useActionState(disableTotpAction, undefined)`. Toast on success + `onClose()`.
**What differs:** Confirmation text per Claude's discretion (CONTEXT §Claude's Discretion): "¿Seguro que quieres desactivar 2FA? Tu cuenta quedara protegida solo por contrasena." Destructive CTA — red ghost button, chartreuse cancel. Accepts either 6-digit TOTP or 8-hex backup code — same `disableTotpAction` auto-detects shape (D-18).

---

### `src/components/configuracion/BackupCodesScreen.tsx` (component, display)

**Analog (copy pattern):** `src/components/configuracion/GeneratedUrlPanel.tsx` lines 18-56
**Excerpt:**
```tsx
export default function GeneratedUrlPanel({ url, expiresAt }: GeneratedUrlPanelProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      toast.error('No pudimos copiar el enlace', { duration: 5000 })
    }
  }
  return (
    <div className="rounded-2xl bg-surface-elevated p-5 mt-4">
      <div className="rounded-xl bg-surface p-3 flex items-center gap-3">
        <span className="font-mono tabular-nums text-sm text-text-primary flex-1 truncate">{url}</span>
        <button onClick={handleCopy} aria-label={copied ? 'Copiado' : 'Copiar'}>
          {copied ? <Check size={16} className="text-accent" /> : <Copy size={16} className="text-text-tertiary" />}
        </button>
      </div>
    </div>
  )
}
```
**Analog (monospace block):** `src/components/ui/MoneyAmount.tsx` line 43 — `font-mono tabular-nums` Tailwind classes render IBM Plex Mono (global `@next/font` setup).
**What to replicate:** `navigator.clipboard.writeText`; 1600ms Copy↔Check swap; Lucide `Copy`, `Check`; `font-mono tabular-nums` classes for displayed codes; `toast.error` fallback for clipboard failure; card wrapper `rounded-2xl bg-surface-elevated p-5`.
**What differs:** Render **10** codes as a 2-column grid (each `XXXX-XXXX` on its own line). Add `Download` Lucide icon button → `<a download="centik-codigos-respaldo.txt">` with Blob URL (Claude's discretion — `<a download>` chosen). Add mandatory checkbox `<input type="checkbox">` with label `He guardado mis codigos de respaldo` that gates the `Listo` button (disabled until checked, per D-12).

---

### `src/components/auth/TotpStep.tsx` (component, form)

**Analog:** `src/components/auth/LoginForm.tsx` (useActionState + Server Action + Loader2 — exact)
**Excerpt** (`LoginForm.tsx` lines 1-70, the **entire form**):
```tsx
'use client'

import { useActionState, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import FloatingInput from '@/components/ui/FloatingInput'
import { loginAction } from '@/actions/auth'

export default function LoginForm() {
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') ?? '/'
  const [state, action, isPending] = useActionState(loginAction, undefined)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      <FloatingInput label="Correo electronico" type="email" name="email"
        value={email} onChange={setEmail} autoFocus />
      <div className="relative">
        <FloatingInput label="Contrasena" type={showPassword ? 'text' : 'password'}
          name="password" value={password} onChange={setPassword} />
        <button type="button" onClick={() => setShowPassword((p) => !p)}
          className="absolute right-0 top-2 p-1 text-text-tertiary hover:text-text-secondary transition-all duration-200"
          aria-label={showPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'}>
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {state?.error && <p className="text-sm text-negative">{state.error}</p>}
      <button type="submit" disabled={isPending}
        className="w-full rounded-full bg-accent text-bg font-semibold py-3 transition-all duration-200 hover:bg-accent-hover disabled:opacity-50">
        {isPending ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 size={16} className="animate-spin" />
            Iniciando sesion...
          </span>
        ) : ('Iniciar sesion')}
      </button>
    </form>
  )
}
```
**What to replicate verbatim:** `'use client'`; `useActionState` with `undefined` initial; hidden `callbackUrl` input; `FloatingInput` for the code; chartreuse pill button with `Loader2` spinner pattern; `space-y-6` form spacing; generic error shown via `text-negative`; `aria-label` on icon buttons.
**What differs:** Props are `{ email: string; challenge: string; callbackUrl: string }` (all from step-1 result). Action binding: `useActionState(verifyTotpAction, undefined)`. Hidden inputs: `email`, `challenge`, `callbackUrl`. Single visible `FloatingInput` for code + a toggle button "Usar codigo de respaldo" that swaps placeholder (`123456` ↔ `XXXX-XXXX`) and `inputMode` (`numeric` ↔ `text`). Submits to the SAME action regardless of toggle (D-18).

---

### `tests/integration/totp.test.ts` (integration test)

**Analog:** `tests/integration/auth.test.ts` (setup boilerplate + real bcrypt + mocked NextAuth init)
**Excerpt** (`auth.test.ts` lines 1-30, boilerplate to **copy verbatim**):
```typescript
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import bcrypt from 'bcryptjs'
import { prisma } from '../setup'

// Mock next-auth to prevent next/server import chain.
// We only need authorizeUser which uses prisma + bcrypt directly.
vi.mock('next-auth', () => ({
  default: () => ({
    handlers: {},
    signIn: vi.fn(),
    signOut: vi.fn(),
    auth: vi.fn(),
  }),
}))

vi.mock('@auth/prisma-adapter', () => ({
  PrismaAdapter: vi.fn(),
}))

vi.mock('next-auth/providers/credentials', () => ({
  default: vi.fn(() => ({})),
}))

// Import the REAL authorizeUser function -- only next-auth init is mocked
import { authorizeUser } from '@/auth'
```
**Analog for cross-user isolation:** `tests/integration/isolation.test.ts` lines 25-48 — two users A and B created in `beforeAll`, data seeded for A, assert B cannot access.
**What to replicate:** Same 3 `vi.mock()` blocks (keep exact strings — they defeat the `next/server` import chain that breaks integration tests). Real `bcrypt` (not mocked). Unique email prefix (`totp-int-`) to avoid collision with other integration suites. `beforeAll` creates users, `afterAll` cascades deletes (User `onDelete: Cascade` to BackupCode per D-09).
**What differs:** Additional `vi.mock('@upstash/ratelimit')` per D-35 — real Upstash is NEVER called from tests. `totp-crypto` is NOT mocked (pure, fast — D-35). Create User A with real `encryptSecret()` + real `bcrypt.hash` backup codes, then invoke real `authorizeUser` with `totpCode + challenge` to assert round-trip. Cross-user test: User A's backup code hash in BackupCode row → User B calls `consumeBackupCode(userBId, plaintextA)` → returns false, row unchanged.

---

### `e2e/totp.spec.ts` (E2E test)

**Analog:** `e2e/auth.spec.ts` (Playwright `test.describe` + `page.locator` patterns)
**Excerpt** (`e2e/auth.spec.ts` lines 30-48):
```typescript
test.describe('Full login flow', () => {
  test('logs in with seeded admin credentials and redirects back', async ({ page }) => {
    await page.goto('/movimientos')
    await expect(page).toHaveURL(/\/login/)

    await page.locator('input[name="email"]').fill('fmemije00@gmail.com')
    await page.locator('input[name="password"]').fill('centik-dev-2026')
    await page.getByRole('button', { name: /Iniciar sesion/i }).click()

    await expect(page).toHaveURL(/\/movimientos/, { timeout: 10000 })
  })
})
```
**What to replicate:** `test.describe` blocks; `page.locator('input[name="..."]').fill()` convention; `page.getByRole('button', { name: /.../ }).click()` with Spanish regex; `expect(page).toHaveURL(..., { timeout: 10000 })`.
**What differs:** D-34 requires TOTP to be deterministic — inject a fixed `Date.now()` shim in a Playwright fixture (per-test bootstrap) so `otplib.generate(secret)` is predictable. Or generate the expected code in the test using the SAME `createTotpSecret` + `generate` from the seeded secret. Only ONE happy-path test per D-34: enable → logout → login-with-code → logout → login-with-backup.

---

## Pattern Assignments — MODIFIED Files (edit in place, cite current state)

### `src/auth.ts` — extend `authorizeUser` (D-14)

**Current code to edit** (`src/auth.ts` lines 10-36, quoted **verbatim** so executor edits in place):
```typescript
export async function authorizeUser(credentials: Partial<Record<'email' | 'password', unknown>>) {
  const email = credentials?.email
  const password = credentials?.password
  if (typeof email !== 'string' || typeof password !== 'string') return null
  if (!email || !password) return null

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      hashedPassword: true,
      isApproved: true,
      isAdmin: true,
    },
  })

  if (!user || !user.hashedPassword) return null
  if (!user.isApproved) return null

  const isValid = await bcrypt.compare(password, user.hashedPassword)
  if (!isValid) return null

  return { id: user.id, email: user.email, name: user.name, isAdmin: user.isAdmin }
}
```
**Edits required:**
1. Widen the credentials type: `Partial<Record<'email' | 'password' | 'totpCode' | 'challenge', unknown>>`.
2. Extend `select` with `totpSecret: true, totpEnabled: true`.
3. After password check passes: if `!user.totpEnabled` → return user (current behavior). If `user.totpEnabled` → require both `totpCode` and `challenge` to be strings; call `verifyChallenge(challenge)` and assert `{ userId, email }` match; decrypt secret via `decryptSecret(user.totpSecret!)`; detect 6-digit vs 8-hex and call either `verifyTotp(secret, code)` or `consumeBackupCode(user.id, code)`; on any failure return `null`.
4. Never log the plaintext secret (D-08).

---

### `src/actions/auth.ts` — split `loginAction` + add `verifyTotpAction` (D-15)

**Current code to edit** (`src/actions/auth.ts` lines 9-37, full `loginAction`):
```typescript
export async function loginAction(
  _prevState: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string }> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) return { error: 'Credenciales invalidas' }

  try {
    await signIn('credentials', {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: (formData.get('callbackUrl') as string) || '/',
    })
    return {}
  } catch (error) {
    if (error instanceof AuthError) return { error: 'Credenciales invalidas' }
    // CRITICAL: Re-throw non-AuthError (NEXT_REDIRECT) -- see research Pitfall #1
    throw error
  }
}
```
**Edits required:**
1. Before `signIn`: call `checkRateLimit(loginLimiter, \`${email}:${ip}\`)` — on failure return `{ error: 'Credenciales invalidas' }` (no oracle per D-25).
2. Lookup `{ id, totpEnabled, hashedPassword }`; if `!totpEnabled` the current `signIn` path runs; if `totpEnabled` → bcrypt-compare password; on match return `{ requiresTotp: true, challenge: signChallenge(userId, email), callbackUrl }` WITHOUT calling `signIn`.
3. Update return type: `Promise<{ error?: string; requiresTotp?: true; challenge?: string; callbackUrl?: string }>`.
4. Add new `verifyTotpAction(prev, formData)` BELOW `loginAction`: parse `verifyTotpSchema`, rate-limit keyed by `userId:ip`, call `signIn('credentials', { email, challenge, totpCode: code, redirectTo })`, same `AuthError`-catch/NEXT_REDIRECT-rethrow pattern as `registerAction` (lines 115-127 already show the idiom).

---

### `src/lib/validators.ts` — append 4 schemas (D-30)

**Analog in same file** (`validators.ts` lines 150-158, `loginSchema`):
```typescript
export const loginSchema = z.object({
  email: z.string({ error: 'El correo es requerido' }).email({ error: 'Correo electronico no valido' }).trim(),
  password: z.string({ error: 'La contrasena es requerida' }).min(1, { error: 'La contrasena es requerida' }),
})
```
**What to replicate:** `z.object({...})`; Spanish error strings; `.trim()` on emails; named `export const xxxSchema`.
**Schemas to add (per D-30):**
- `loginPasswordSchema` — identical to current `loginSchema` (rename or re-export).
- `verifyTotpSchema` — `challenge: z.string().min(1)`, `code: z.string().trim().regex(/^(\d{6}|[0-9a-fA-F]{4}-?[0-9a-fA-F]{4})$/, { error: 'Ingresa un codigo valido' })`.
- `enableTotpSchema` — `code: z.string().trim().regex(/^\d{6}$/, { error: 'Ingresa un codigo de 6 digitos' })`.
- `disableTotpSchema` — same shape as `verifyTotpSchema.code` (string 6-9 chars).

---

### `src/app/(app)/configuracion/page.tsx` — fetch `totpEnabled`

**Current code** (`page.tsx` lines 7-27):
```typescript
export default async function ConfiguracionPage() {
  await connection()
  const session = await auth()
  const userId = session!.user!.id
  const isAdmin = session!.user!.isAdmin === true

  const [categories, inviteTokens] = await Promise.all([
    prisma.category.findMany({ where: { isActive: true, userId }, orderBy: { sortOrder: 'asc' } }),
    isAdmin
      ? prisma.inviteToken.findMany({ where: { createdBy: userId }, orderBy: { createdAt: 'desc' }, take: 20 })
      : Promise.resolve([]),
  ])
```
**Edits:** Add `prisma.user.findUnique({ where: { id: userId }, select: { totpEnabled: true } })` into the `Promise.all` (or separate — either fine, small query). Pass `totpEnabled={...}` prop into `<ConfiguracionClientWrapper>`. Keep `await connection()` first — required per Phase 27.

---

### `src/app/(app)/configuracion/ConfiguracionClientWrapper.tsx` — render `<SeguridadSection />`

**Current code** (`ConfiguracionClientWrapper.tsx` lines 53-62 — the `{isAdmin && <section>...}` block is the template):
```tsx
{isAdmin && (
  <section className="mt-8">
    <h2 className="text-lg font-semibold text-text-primary mb-2">Invitaciones</h2>
    <p className="text-sm text-text-secondary mb-4">
      Genera un enlace de invitacion para dar acceso a un nuevo usuario.
    </p>
    <InvitacionesSection inviteTokens={inviteTokens} origin={origin} />
  </section>
)}
```
**Edits:** Add a new `<section className="mt-8">` with `<h2>Seguridad</h2>`, a short description, and `<SeguridadSection totpEnabled={totpEnabled} />`. **No `isAdmin` gate** (D-19). Extend `ConfiguracionClientWrapperProps` with `totpEnabled: boolean`.

---

### `prisma/schema.prisma` — add `BackupCode` model + reverse relation (D-09, D-28)

**Current `User` model** (`schema.prisma` lines 55-82):
```prisma
model User {
  id             String    @id @default(cuid())
  // ...
  totpSecret     String?
  totpEnabled    Boolean   @default(false)
  // ...
  inviteTokens     InviteToken[]
}
```
**Edits:**
1. Add `backupCodes BackupCode[]` inside `User` (alongside `inviteTokens`).
2. Append new model at end of file:
```prisma
/// Single-use backup codes for 2FA recovery (v3.0 TOTP)
model BackupCode {
  id        String    @id @default(cuid())
  userId    String
  codeHash  String
  usedAt    DateTime?
  createdAt DateTime  @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}
```
3. Run `npx prisma migrate dev --name add_backup_code_model` (VALIDATION Wave 0 task 29-01-03 — BLOCKING).

---

### `.env.example` — document new env vars

**Current entries likely already include** `AUTH_SECRET` and `AUTH_TOTP_ENCRYPTION_KEY`.
**Add:**
```
# Upstash Redis REST (rate-limit for login + TOTP verify — Phase 29/30)
UPSTASH_REDIS_REST_URL=https://your-db.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token-here

# Dev/test bypass for rate limiting (never true in production)
RATE_LIMIT_DISABLED=false

# AES-256-GCM key for TOTP secrets (32 bytes = 64 hex chars)
# Generate: openssl rand -hex 32
AUTH_TOTP_ENCRYPTION_KEY=0000000000000000000000000000000000000000000000000000000000000000
```

---

### `package.json` — add deps

**Add** (per RESEARCH Standard Stack, verified 2026-04-20):
```bash
npm install otplib@^13.4.0 qrcode@^1.5.4 @upstash/ratelimit@^2.0.8 @upstash/redis@^1.37.0
npm install -D @types/qrcode@^1.5.6
```

---

### `src/components/auth/LoginForm.tsx` — branch on `requiresTotp` (D-17)

**Current code** (`LoginForm.tsx` lines 14, 20 — the binding + `<form>`):
```tsx
const [state, action, isPending] = useActionState(loginAction, undefined)
// ...
return <form action={action} className="space-y-6">...</form>
```
**Edits:** After `state` resolves, check `state?.requiresTotp`. If true and `state.challenge` present, swap render to `<TotpStep email={email} challenge={state.challenge} callbackUrl={callbackUrl} />` instead of the password form. No new route (D-17). Browser back/refresh resets to step 1 — challenge expires in 5 min, no harm (D-17).

---

## Shared Patterns (apply across files)

### Authentication Guard
**Source:** `src/lib/auth-utils.ts` lines 14-22
**Apply to:** Every Server Action in `totp-actions.ts`
```typescript
export async function requireAuth(): Promise<{ userId: string }> {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  return { userId: session.user.id }
}
```
**Usage:** first line of EVERY Server Action — CVE-2025-29927 defense (Phase 27). Even though middleware gates `/configuracion`, the Server Action MUST also guard.

---

### Hash-Before-Transaction
**Source:** `src/actions/auth.ts` lines 68-72 (cited above in `backup-codes.ts` section).
**Apply to:** `enableTotpAction` and `regenerateBackupCodesAction` — hash all 10 backup codes with `bcrypt.hash(code, 12)` in `Promise.all` BEFORE `prisma.$transaction(...)` opens. Never hold a DB connection during bcrypt cost-12 (Phase 28 P03).

---

### Ambiguous Error Messages
**Source:** `src/actions/auth.ts` line 32 (`return { error: 'Credenciales invalidas' }` — same for invalid Zod AND invalid credentials AND rate-limit AND unapproved).
**Apply to:** `loginAction`, `verifyTotpAction`, `disableTotpAction`. NEVER leak "wrong password" vs "wrong TOTP" vs "rate-limited" vs "expired challenge" (D-25, Phase 26 D-Error).

---

### IDOR Scoping
**Source:** `src/app/(app)/configuracion/invite-actions.ts` lines 99-101
```typescript
const token = await prisma.inviteToken.findFirst({
  where: { id: data, createdBy: admin.userId },
  select: { id: true, usedAt: true, revokedAt: true },
})
```
**Apply to:** All 2FA actions — always filter by `userId` from `requireAuth()`; never trust an ID from the form body. BackupCode consume: `updateMany({ where: { id, userId, usedAt: null } })`.

---

### NEXT_REDIRECT Re-throw Discipline
**Source:** `src/actions/auth.ts` lines 30-36 and lines 122-127
```typescript
} catch (error) {
  if (error instanceof AuthError) return { error: 'Credenciales invalidas' }
  throw error  // CRITICAL: Re-throw non-AuthError (NEXT_REDIRECT)
}
```
**Apply to:** `verifyTotpAction` (the only new action that calls `signIn`). Catch `AuthError` only; re-throw everything else.

---

### Modal Wrapper + Inner Content + `key` Remount
**Source:** `src/components/categories/CategoryForm.tsx` lines 51-72 (cited above)
**Apply to:** All three new modal files (`Activar2faModal`, `Desactivar2faModal`, and any `RegenerarCodigosModal` planner chooses to add). Keeps state clean on reopen.

---

### Sonner Toast on Success
**Source:** `src/components/configuracion/InvitacionForm.tsx` lines 44-50
```tsx
if ('success' in state && state.success) {
  toast.success('Invitacion generada', { duration: 4000 })
}
```
**Apply to:** Activar (`toast.success('2FA activado')`) and Desactivar (`toast.success('2FA desactivado')`). `<Toaster />` is already mounted in root `src/app/layout.tsx` (RESEARCH line 163).

---

## No Analog Found

| File | Role | Reason |
|------|------|--------|
| `src/lib/challenge.ts` | utility (HMAC) | No existing HMAC-signed-token helper in codebase. Cite Node crypto docs; follow `invite-utils.ts` **module shape** (named exports, requirement-ID JSDoc) only. |
| `src/lib/totp-crypto.ts` (AES-GCM part) | utility (crypto) | No existing AES-GCM helper. RESEARCH Pattern 1 (lines 336-378) is the authoritative template — planner should copy the research snippet **verbatim** and add Spanish JSDoc. |

Both are covered by the RESEARCH.md Pattern snippets (lines 336-378 for crypto; RESEARCH also enumerates HMAC steps) — planner falls back to those.

---

## Metadata

**Analog search scope:** `src/lib/**`, `src/actions/**`, `src/components/**`, `src/app/(app)/configuracion/**`, `src/auth.ts`, `tests/integration/**`, `e2e/**`, `prisma/schema.prisma`, `src/lib/validators.ts`
**Files scanned:** 30+ (via Read/Grep)
**Pattern extraction date:** 2026-04-20

## PATTERN MAPPING COMPLETE
