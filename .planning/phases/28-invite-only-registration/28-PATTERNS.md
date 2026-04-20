# Phase 28: Invite-Only Registration - Pattern Map

**Mapped:** 2026-04-18
**Files analyzed:** 16 new/modified (plus 5 new test files)
**Analogs found:** 16 / 16 (100% coverage — every new file has a direct in-repo analog)

---

## File Classification

### New files

| New File | Role | Data Flow | Closest Analog | Match Quality |
|----------|------|-----------|----------------|---------------|
| `src/app/(auth)/register/page.tsx` | page (server component, route entry) | request-response (server render with token lookup) | `src/app/(auth)/login/page.tsx` + `src/app/(app)/configuracion/page.tsx` | exact role, combined |
| `src/components/auth/RegisterForm.tsx` | component (client form) | request-response (useActionState) | `src/components/auth/LoginForm.tsx` | exact |
| `src/components/configuracion/TokenErrorScreen.tsx` | component (pure display) | none (props only) | `CategoryList` empty-state block (lines 23-42) | role-match |
| `src/components/configuracion/InvitacionesSection.tsx` | component (client shell) | request-response (composes form + list) | `src/app/(app)/configuracion/ConfiguracionClientWrapper.tsx` (section wrapper pattern) | role-match |
| `src/components/configuracion/InvitacionForm.tsx` | component (client form) | request-response (useActionState for createInviteToken) | `src/components/auth/LoginForm.tsx` (useActionState + FloatingInput) | role-match |
| `src/components/configuracion/GeneratedUrlPanel.tsx` | component (client display + clipboard) | event-driven (clipboard API) | No direct analog — copy button pattern is new; use `CategoryRow` button geometry | partial |
| `src/components/configuracion/InvitacionesList.tsx` | component (client list + inline revoke) | CRUD (delete via revoke action) | `src/components/categories/CategoryList.tsx` (entire file including CategoryRow) | exact |
| `src/app/(app)/configuracion/invite-actions.ts` | service (Server Actions) | CRUD (create/revoke/list) | `src/app/(app)/configuracion/actions.ts` | exact |
| `src/lib/invite-utils.ts` | utility (pure helpers) | transform | `src/lib/utils.ts` (formatMoney, formatRate pattern) | role-match |
| `prisma/migrations/YYYYMMDDHHMMSS_add_user_isadmin_and_invite_revokedat/migration.sql` | migration (schema change) | schema | existing `prisma/migrations/*` (ALTER TABLE pattern) | role-match |
| `src/app/(app)/configuracion/invite-actions.test.ts` | test (unit, mocked prisma) | test | `src/app/(app)/configuracion/actions.test.ts` | exact |
| `src/app/(auth)/register/page.test.tsx` | test (unit/RTL for server component) | test | `src/actions/auth.test.ts` (mock pattern) + RTL convention | partial |
| `tests/integration/invite-tokens.test.ts` | test (integration, real prisma) | test | `tests/integration/auth.test.ts` | exact |
| `tests/integration/registration.test.ts` | test (integration, real prisma) | test | `tests/integration/auth.test.ts` | exact |

### Modified files

| Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---------------|------|-----------|----------------|---------------|
| `prisma/schema.prisma` | schema | schema | itself (`User` model + `InviteToken` model already present) | self-reference |
| `prisma/seed.ts` | seed | batch | `prisma/seed.ts#seedAdminUser` (lines 23-41) | self-reference |
| `src/auth.ts` | config (Auth.js) | request-response | itself — extend `authorizeUser`, `jwtCallback`, `sessionCallback` with `isAdmin` | self-reference |
| `src/types/next-auth.d.ts` | type augmentation | none | itself (existing `userId` augmentation pattern) | self-reference |
| `src/lib/validators.ts` | validator (Zod schemas) | none | existing schemas in same file (`loginSchema`, `createCategorySchema`) | exact |
| `src/actions/auth.ts` | service (Server Actions) | request-response | `loginAction` (same file, lines 7-35) | exact |
| `src/app/(app)/configuracion/page.tsx` | page (server component) | request-response | itself — add `session.user.isAdmin` read + `inviteToken.findMany` | self-reference |
| `src/app/(app)/configuracion/ConfiguracionClientWrapper.tsx` | component (client shell) | event-driven | itself — add conditional `<InvitacionesSection>` section | self-reference |
| `src/actions/auth.test.ts` | test | test | itself — add `registerAction` describe block matching `loginAction` pattern | self-reference |

---

## Pattern Assignments

### 1. `src/actions/auth.ts` — ADD `registerAction` (service, request-response)

**Analog:** `src/actions/auth.ts` (existing `loginAction`, lines 7-35)

**Imports pattern to extend** (existing file, lines 1-5):
```typescript
'use server'

import { signIn, signOut } from '@/auth'
import { AuthError } from 'next-auth'
import { loginSchema } from '@/lib/validators'
```

**Add these imports:**
```typescript
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'
import { registerSchema } from '@/lib/validators'
```

**Core pattern — NEXT_REDIRECT discipline** (copy exactly from lines 20-34):
```typescript
try {
  await signIn('credentials', {
    email: parsed.data.email,
    password: parsed.data.password,
    redirectTo: (formData.get('callbackUrl') as string) || '/',
  })
  // signIn redirects on success -- this line is never reached
  return {}
} catch (error) {
  if (error instanceof AuthError) {
    return { error: 'Credenciales invalidas' }
  }
  // CRITICAL: Re-throw non-AuthError (NEXT_REDIRECT) -- see research Pitfall #1
  throw error
}
```

**Return shape contract** — `loginAction` uses `{ error?: string }`; `registerAction` needs field-level errors, so adopt the `configuracion/actions.ts` `ActionResult` shape instead:
```typescript
type RegisterResult = { error?: Record<string, string[]> } | undefined
```

**Atomic transaction pattern** — combine with `prisma.$transaction(async (tx) => ...)` block from RESEARCH.md Pattern 3; no existing analog in the repo does $transaction yet for user creation, so this is net-new logic inside the `loginAction`-style outer shell.

---

### 2. `src/components/auth/RegisterForm.tsx` — NEW (component, request-response)

**Analog:** `src/components/auth/LoginForm.tsx` (entire file, 70 lines)

**Imports** (lines 1-7):
```typescript
'use client'

import { useActionState, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import FloatingInput from '@/components/ui/FloatingInput'
import { loginAction } from '@/actions/auth'
```

**Drop `useSearchParams` import** (RegisterForm receives `token`/`email` as props, not from URL in client).

**useActionState wiring** (lines 14-17):
```typescript
const [state, action, isPending] = useActionState(loginAction, undefined)
const [email, setEmail] = useState('')
const [password, setPassword] = useState('')
const [showPassword, setShowPassword] = useState(false)
```

**Form layout with hidden inputs + FloatingInput** (lines 19-48):
```typescript
<form action={action} className="space-y-6">
  <input type="hidden" name="callbackUrl" value={callbackUrl} />

  <FloatingInput
    label="Correo electronico"
    type="email"
    name="email"
    value={email}
    onChange={setEmail}
    autoFocus
  />

  <div className="relative">
    <FloatingInput
      label="Contrasena"
      type={showPassword ? 'text' : 'password'}
      name="password"
      value={password}
      onChange={setPassword}
    />
    <button
      type="button"
      onClick={() => setShowPassword((prev) => !prev)}
      className="absolute right-0 top-2 p-1 text-text-tertiary hover:text-text-secondary transition-all duration-200"
      aria-label={showPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'}
    >
      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
    </button>
  </div>
```

**For RegisterForm: add a SECOND password field** identical to the password block, wired to `confirm` state and `showConfirm`, and a hidden input for the token:
```typescript
<input type="hidden" name="token" value={token} />
<input type="hidden" name="email" value={email} />
<FloatingInput ... disabled />  {/* email locked per D-11 */}
```

**Loader button pattern** (lines 54-67):
```typescript
<button
  type="submit"
  disabled={isPending}
  className="w-full rounded-full bg-accent text-bg font-semibold py-3 transition-all duration-200 hover:bg-accent-hover disabled:opacity-50"
>
  {isPending ? (
    <span className="flex items-center justify-center gap-2">
      <Loader2 size={16} className="animate-spin" />
      Iniciando sesion...
    </span>
  ) : (
    'Iniciar sesion'
  )}
</button>
```

Replace Spanish strings `'Iniciando sesion...'` → `'Creando cuenta...'` and `'Iniciar sesion'` → `'Crear cuenta'` per UI-SPEC.

**Field error display** (lines 50-52):
```typescript
{state?.error && (
  <p className="text-sm text-negative">{state.error}</p>
)}
```

For per-field errors, pass `error={state?.error?.password?.[0]}` into `FloatingInput` (prop already supported, `FloatingInput.tsx` lines 13, 108-113).

---

### 3. `src/app/(auth)/register/page.tsx` — NEW (page, request-response)

**Analog:** `src/app/(auth)/login/page.tsx` (shell) + `src/app/(app)/configuracion/page.tsx` (async server component with prisma)

**Shell layout — from login page** (lines 5-25):
```typescript
export default function LoginPage() {
  return (
    <div className="max-w-sm w-full px-6">
      <h1 className="text-4xl font-bold text-accent mb-2">Centik</h1>
      <p className="text-text-secondary text-sm mb-10">
        Tus finanzas, simplificadas
      </p>
      <Suspense fallback={...}>
        <LoginForm />
      </Suspense>
    </div>
  )
}
```

**Adjust:** subtitle → `'Crea tu cuenta para empezar'` (UI-SPEC line 110); per UI-SPEC typography row, heading weight changes from `font-bold` to `font-semibold` to honor the 2-weight contract.

**Server-component async + connection() pattern — from configuracion/page.tsx** (lines 6-8):
```typescript
export default async function ConfiguracionPage() {
  await connection()
  const session = await auth()
```

**Adapted for register:**
```typescript
export default async function RegisterPage({ searchParams }: {
  searchParams: Promise<{ token?: string }>
}) {
  await connection()
  const { token } = await searchParams
  if (!token) notFound()

  const row = await prisma.inviteToken.findUnique({ where: { token } })
  if (!row) return <TokenErrorScreen state="invalid" />
  if (row.usedAt !== null) return <TokenErrorScreen state="used" />
  if (row.expiresAt.getTime() < Date.now()) return <TokenErrorScreen state="expired" />

  return (/* shell + <RegisterForm email={row.email} token={row.token} /> */)
}
```

`notFound()` returns `never` — no return stmt needed after (Pitfall #4).

---

### 4. `src/components/configuracion/InvitacionesList.tsx` — NEW (component, CRUD)

**Analog:** `src/components/categories/CategoryList.tsx` (entire file; especially `CategoryRow`, lines 54-168)

**List empty state** (lines 22-43):
```typescript
if (categories.length === 0) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <DynamicIcon
        name="tag"
        size={32}
        className="text-text-tertiary mb-3"
        aria-hidden="true"
      />
      <p className="text-text-secondary text-lg mb-4">
        No hay categorias configuradas
      </p>
      <button onClick={onAdd} ...>Agregar categoria</button>
    </div>
  )
}
```

Change `name="tag"` → `name="ticket"`, copy → `'Aun no hay invitaciones'` / `'Cuando generes una invitacion la veras aqui.'`, remove action button (UI-SPEC empty state has no CTA — form lives above).

**Row layout + status badge pattern** (lines 95-134):
```typescript
<div className={cn('flex items-center gap-4 rounded-2xl bg-surface-elevated p-4', 'transition-all duration-200')}>
  {/* Icon container */}
  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${category.color}1F` }}>
    <DynamicIcon name={category.icon} size={18} style={{ color: category.color }} />
  </div>

  {/* Name + type badge */}
  <div className="flex-1 min-w-0">
    <div className="flex items-center gap-2">
      <span className="inline-block h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: category.color }} />
      <p className="font-medium text-text-primary truncate">{category.name}</p>
    </div>
    <span className={cn(
      'text-[11px] font-semibold uppercase tracking-[2px]',
      'px-2 py-0.5 rounded-full inline-block mt-0.5',
      typeInfo.className,
    )}>
      {typeInfo.label}
    </span>
  </div>
```

**Status badge lookup table** — copy the `TYPE_DISPLAY` pattern (lines 16-20) exactly, mapping token status → label + className:
```typescript
const STATUS_DISPLAY: Record<'pending' | 'used' | 'expired' | 'revoked', { label: string; className: string }> = {
  pending: { label: 'Pendiente', className: 'bg-positive-subtle text-positive' },
  used: { label: 'Usada', className: 'bg-info-subtle text-info' },
  expired: { label: 'Expirada', className: 'bg-warning-subtle text-warning' },
  revoked: { label: 'Revocada', className: 'bg-negative-subtle text-negative' },
}
```

**Inline two-button revoke confirmation** (lines 58-93, 136-166):
```typescript
const [confirmingDelete, setConfirmingDelete] = useState(false)
const [deleting, setDeleting] = useState(false)

useEffect(() => {
  if (!confirmingDelete) return
  const timer = setTimeout(() => setConfirmingDelete(false), 3000)
  return () => clearTimeout(timer)
}, [confirmingDelete])

const handleDelete = useCallback(async () => {
  setDeleting(true)
  try {
    const result = await deleteCategory(category.id)
    if (result && 'error' in result) {
      const messages = Object.values(result.error).flat()
      toast.error(messages[0] ?? 'Error al eliminar', { duration: 5000 })
    } else {
      toast.success('Categoria eliminada')
    }
  } catch {
    toast.error('Error al eliminar', { duration: 5000 })
  }
  setDeleting(false)
  setConfirmingDelete(false)
}, [category.id])

// Render (lines 136-166):
{confirmingDelete ? (
  <div className="flex items-center gap-2 text-sm">
    <span className="text-text-secondary">Eliminar?</span>
    <button onClick={handleDelete} disabled={deleting} className="text-negative font-semibold hover:text-negative/80 transition-colors duration-200">Si</button>
    <button onClick={handleCancel} className="text-text-secondary font-semibold hover:text-text-primary transition-colors duration-200">No</button>
  </div>
) : (
  <button onClick={() => setConfirmingDelete(true)} className="rounded-full p-2 text-text-tertiary transition-all duration-200 hover:text-negative hover:bg-negative/10 active:scale-[0.98]" aria-label="Eliminar">
    <Trash2 size={16} />
  </button>
)}
```

Replace `'Eliminar?'` → `'Revocar?'`, `'Categoria eliminada'` → `'Invitacion revocada'`, `deleteCategory` → `revokeInviteToken`, aria-label `"Eliminar"` → `"Revocar invitacion"`. Only render revoke button when status === 'pending'.

---

### 5. `src/app/(app)/configuracion/invite-actions.ts` — NEW (service, CRUD)

**Analog:** `src/app/(app)/configuracion/actions.ts` (entire file, 103 lines) and `src/app/(app)/ingresos/actions.ts`

**Imports + ActionResult type + prisma-code helper + revalidator** (actions.ts lines 1-22):
```typescript
'use server'

import { revalidatePath } from 'next/cache'
import prisma from '@/lib/prisma'
import { createCategorySchema } from '@/lib/validators'
import { requireAuth } from '@/lib/auth-utils'

type ActionResult = { success: true } | { error: Record<string, string[]> }

function getPrismaErrorCode(error: unknown): string | null {
  if (error && typeof error === 'object' && 'code' in error) {
    return (error as { code: string }).code
  }
  return null
}

function revalidateCategoryPaths(): void {
  revalidatePath('/configuracion')
  revalidatePath('/movimientos')
}
```

**Action shape — requireAuth BEFORE try/catch** (actions.ts lines 29-68):
```typescript
export async function createCategory(data: unknown): Promise<ActionResult> {
  const parsed = createCategorySchema.safeParse(data)

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  const { userId } = await requireAuth()

  try {
    // ... prisma operations
    revalidateCategoryPaths()
    return { success: true }
  } catch (error: unknown) {
    const code = getPrismaErrorCode(error)
    if (code === 'P2002') {
      return { error: { name: ['Ya existe una categoria con ese nombre'] } }
    }
    return { error: { _form: ['Error de servidor'] } }
  }
}
```

**IDOR-safe soft delete pattern** (actions.ts lines 75-102):
```typescript
export async function deleteCategory(id: string): Promise<ActionResult> {
  const { userId } = await requireAuth()

  try {
    const category = await prisma.category.findFirst({
      where: { id, userId },
      select: { isDefault: true },
    })

    if (!category) {
      return { error: { _form: ['Categoria no encontrada'] } }
    }
    // ... guard + soft delete
  }
}
```

**Additions for invite-actions.ts:**
- Add `requireAdmin()` helper that calls `requireAuth()` then `prisma.user.findUnique({ where: { id: userId }, select: { isAdmin: true } })`. Returns `null` on non-admin (caller returns `{ error: { _form: ['No autorizado'] } }`). See RESEARCH.md Pattern 1.
- `createInviteToken` returns `{ success: true; token: string } | { error: ... }` (extra `token` field per RESEARCH Open Q4).
- For revoke IDOR: use `findFirst({ where: { id: tokenId, createdBy: userId } })` per research (future-proof for multi-admin).

---

### 6. `src/app/(app)/configuracion/invite-actions.test.ts` — NEW (test)

**Analog:** `src/app/(app)/configuracion/actions.test.ts` (entire file) and `src/actions/auth.test.ts`

**Mock setup pattern** (actions.test.ts lines 1-28):
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createCategory, deleteCategory } from './actions'

const mockCreate = vi.fn()
const mockFindFirst = vi.fn()
const mockUpdate = vi.fn()
const mockAggregate = vi.fn()

vi.mock('@/lib/prisma', () => ({
  default: {
    category: {
      create: (...args: unknown[]) => mockCreate(...args),
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
      aggregate: (...args: unknown[]) => mockAggregate(...args),
    },
  },
}))

const mockRevalidatePath = vi.fn()
vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}))

const TEST_USER_ID = 'test-user-id'
vi.mock('@/lib/auth-utils', () => ({
  requireAuth: vi.fn().mockResolvedValue({ userId: 'test-user-id' }),
}))
```

**For invite-actions test:**
- Add `inviteToken` key to the prisma mock with `create`, `findFirst`, `findMany`, `update`, `findUnique` methods.
- Add `user.findUnique` mock (for `requireAdmin` check) returning `{ isAdmin: true }` by default, `{ isAdmin: false }` in "rejects non-admin" tests.
- Validate shape of persisted row (token length 64 hex, expiresAt ~7d in future, email matches input, createdBy = userId).

---

### 7. `src/lib/validators.ts` — ADD `registerSchema` + `createInviteSchema`

**Analog:** Existing file — `loginSchema` (lines 150-158) and `createDebtSchema` `.refine()` with `path:` (lines 62-65)

**Pattern — login-style top-level schema** (lines 149-158):
```typescript
export const loginSchema = z.object({
  email: z
    .string({ error: 'El correo es requerido' })
    .email({ error: 'Correo electronico no valido' })
    .trim(),
  password: z
    .string({ error: 'La contrasena es requerida' })
    .min(1, { error: 'La contrasena es requerida' }),
})
```

**Pattern — `.refine()` with `path:` for cross-field validation** (lines 62-65):
```typescript
.refine((data) => data.type !== 'CREDIT_CARD' || data.creditLimit !== undefined, {
  error: 'El limite de credito es requerido para tarjetas de credito',
  path: ['creditLimit'],
})
```

Use this pattern for confirm-password matching — `path: ['confirmPassword']` per RESEARCH Pitfall #6.

**Note on Spanish locale:** Line 12 already sets `z.config(z.locales.es())` — no change needed.

---

### 8. `src/auth.ts` — ADD `isAdmin` through JWT pipeline

**Analog:** `src/auth.ts` itself (lines 11-51) — existing `userId` flow

**Current authorizeUser select** (lines 17-26):
```typescript
const user = await prisma.user.findUnique({
  where: { email },
  select: {
    id: true,
    email: true,
    name: true,
    hashedPassword: true,
    isApproved: true,
  },
})
```

**Add `isAdmin: true` to select, include in returned object** (line 34):
```typescript
return { id: user.id, email: user.email, name: user.name, isAdmin: user.isAdmin }
```

**Current jwtCallback** (lines 38-43):
```typescript
export async function jwtCallback({ token, user }: { token: JWT; user?: User | AdapterUser }) {
  if (user) {
    token.userId = user.id
  }
  return token
}
```

**Add inside `if (user)` block:**
```typescript
token.isAdmin = (user as User).isAdmin ?? false
```

**Current sessionCallback** (lines 46-51):
```typescript
export async function sessionCallback({ session, token }: { session: Session; token: JWT }) {
  if (token.userId) {
    session.user.id = token.userId as string
  }
  return session
}
```

**Add defensive admin copy** (matches existing `typeof` guard style):
```typescript
if (typeof token.isAdmin === 'boolean') {
  session.user.isAdmin = token.isAdmin
}
```

---

### 9. `src/types/next-auth.d.ts` — ADD `isAdmin` to Session + JWT

**Analog:** Same file (all 16 lines) — existing `userId` augmentation

**Current pattern** (lines 1-15):
```typescript
import { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
    } & DefaultSession['user']
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId?: string
  }
}
```

**Add:**
- `isAdmin: boolean` inside `Session.user`
- `interface User { isAdmin?: boolean }` in `next-auth` module (for `authorizeUser` return type compat)
- `isAdmin?: boolean` in `JWT` interface

---

### 10. `prisma/schema.prisma` — ADD `isAdmin` + `revokedAt`

**Analog:** Same file — `User` model (lines 54-81), `InviteToken` model (lines 123-133)

**Current User model** has fields through line 66: `isApproved Boolean @default(false)`, `totpSecret`, `totpEnabled`, timestamps. Model pattern is simple Prisma `@default(false)`.

**Add to User model:**
```prisma
isAdmin        Boolean   @default(false)
```

**Current InviteToken model** (lines 123-133) — includes `usedAt DateTime?`.

**Add to InviteToken model** (per RESEARCH Pitfall #7 recommendation, decision deferred to planner):
```prisma
revokedAt  DateTime?
```

Single migration adds both columns atomically.

---

### 11. `prisma/seed.ts` — Mark admin with `isAdmin: true`

**Analog:** `prisma/seed.ts#seedAdminUser` (lines 23-41)

**Current create block** (lines 28-37):
```typescript
const user = await prisma.user.upsert({
  where: { email },
  update: {},
  create: {
    email,
    hashedPassword,
    isApproved: true,
    totpEnabled: false,
  },
})
```

**Add `isAdmin: true` to both `update` (for existing dev DBs) and `create`** per D-03:
```typescript
update: { isAdmin: true },
create: { ..., isAdmin: true },
```

---

### 12. `src/app/(app)/configuracion/page.tsx` — Load tokens + admin flag

**Analog:** Same file (17 lines)

**Current** (lines 6-17):
```typescript
export default async function ConfiguracionPage() {
  await connection()
  const session = await auth()
  const userId = session!.user!.id
  const categories = await prisma.category.findMany({
    where: { isActive: true, userId },
    orderBy: { sortOrder: 'asc' },
  })

  return <ConfiguracionClientWrapper categories={categories} />
}
```

**Add:**
```typescript
const isAdmin = session!.user!.isAdmin === true
const inviteTokens = isAdmin
  ? await prisma.inviteToken.findMany({
      where: { createdBy: userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })
  : []

return <ConfiguracionClientWrapper categories={categories} inviteTokens={inviteTokens} isAdmin={isAdmin} />
```

---

### 13. `src/app/(app)/configuracion/ConfiguracionClientWrapper.tsx` — Render Invitaciones section

**Analog:** Same file (48 lines)

**Current section pattern** (lines 40-43):
```tsx
<section>
  <h2 className="text-lg font-semibold text-text-primary mb-4">Categorias</h2>
  <CategoryList categories={categories} onAdd={handleAdd} />
</section>
```

**Add a second `<section>` below** (UI-SPEC: `mb-8 mt-8` vertical gap), rendered only when `isAdmin === true`:
```tsx
{isAdmin && (
  <section className="mt-8">
    <h2 className="text-lg font-semibold text-text-primary mb-2">Invitaciones</h2>
    <p className="text-sm text-text-secondary mb-4">
      Genera un enlace de invitacion para dar acceso a un nuevo usuario.
    </p>
    <InvitacionesSection inviteTokens={inviteTokens} />
  </section>
)}
```

---

### 14. `src/components/configuracion/InvitacionForm.tsx` — NEW (component, request-response)

**Analog:** `src/components/auth/LoginForm.tsx` — useActionState + single-field form

Re-use identical `useActionState` + submit-button-with-Loader2 pattern. Single FloatingInput (email) + primary chartreuse button. On successful result, local state tracks the returned `token` string and renders `<GeneratedUrlPanel>` below the form (per RESEARCH Open Q4).

**For toast success/error** (admin actions use sonner toast per UI-SPEC, not inline like registration) — reuse `CategoryRow` toast pattern:
```typescript
import { toast } from 'sonner'

if (result && 'error' in result) {
  const messages = Object.values(result.error).flat()
  toast.error(messages[0] ?? 'No pudimos generar la invitacion', { duration: 5000 })
} else {
  toast.success('Invitacion generada')
}
```
Source: `src/components/categories/CategoryList.tsx` lines 77-86

---

### 15. `src/components/configuracion/GeneratedUrlPanel.tsx` — NEW (component, event-driven)

**Analog:** No direct repo analog for clipboard. Button geometry from `CategoryRow` delete button (lines 156-163).

**Button styling to copy:**
```typescript
className="rounded-full p-2 text-text-tertiary transition-all duration-200 hover:text-negative hover:bg-negative/10 active:scale-[0.98]"
```

Swap `hover:text-negative hover:bg-negative/10` → `hover:text-text-primary hover:bg-surface-hover`. The 1600ms `Copy` → `Check` swap with `text-accent` is net-new per UI-SPEC line 233. Wrap `navigator.clipboard.writeText(url)` in try/catch; on failure toast `'No pudimos copiar el enlace'` (UI-SPEC line 234; RESEARCH Pitfall #5).

---

### 16. `src/components/configuracion/TokenErrorScreen.tsx` — NEW (component, display)

**Analog:** `CategoryList` empty-state block (lines 22-43)

**Pattern:**
```typescript
<div className="flex flex-col items-center justify-center py-20 text-center">
  <DynamicIcon name="tag" size={32} className="text-text-tertiary mb-3" aria-hidden="true" />
  <p className="text-text-secondary text-lg mb-4">No hay categorias configuradas</p>
</div>
```

Replace `DynamicIcon name="tag"` with `Ticket` (lucide-react direct import — consistent with `LoginForm`'s direct `Eye`/`EyeOff` import). Add `role="alert"` on heading container per UI-SPEC accessibility line 285. Text content comes from `state` prop → UI-SPEC lines 128-134 copy table.

---

### 17. Integration tests (`tests/integration/invite-tokens.test.ts`, `registration.test.ts`)

**Analog:** `tests/integration/auth.test.ts` (60+ lines read; pattern is real prisma + next-auth module mock)

**Module mocks to copy** (lines 7-22):
```typescript
vi.mock('next-auth', () => ({
  default: () => ({ handlers: {}, signIn: vi.fn(), signOut: vi.fn(), auth: vi.fn() }),
}))
vi.mock('@auth/prisma-adapter', () => ({ PrismaAdapter: vi.fn() }))
vi.mock('next-auth/providers/credentials', () => ({ default: vi.fn(() => ({})) }))
```

**Real prisma import** (line 3):
```typescript
import { prisma } from '../setup'
```

**Fixture creation + cleanup** (lines 35-59 pattern):
```typescript
beforeAll(async () => {
  const hashedPassword = await bcrypt.hash(TEST_PASSWORD, 12)
  const user = await prisma.user.create({
    data: { email: TEST_EMAIL, hashedPassword, isApproved: true, totpEnabled: false },
  })
  testUserId = user.id
}, 30000)
```

Same shape applies to invite-token fixtures — create admin via `prisma.user.create({ data: { ..., isAdmin: true } })` then invoke the real action.

---

## Shared Patterns

### Server Action Guard (applies to all new actions)

**Source:** `src/app/(app)/configuracion/actions.ts` lines 29-37 + `src/lib/auth-utils.ts` lines 14-22

```typescript
const parsed = schema.safeParse(data)
if (!parsed.success) {
  return { error: parsed.error.flatten().fieldErrors }
}

const { userId } = await requireAuth()

try {
  // ... DB operations
  revalidatePath('/path')
  return { success: true }
} catch (error: unknown) {
  // Prisma error codes or generic fallback
}
```

**Apply to:**
- `src/actions/auth.ts#registerAction` (but `registerAction` does NOT call `requireAuth()` — it runs for unauthenticated users; the token IS the auth)
- `src/app/(app)/configuracion/invite-actions.ts#createInviteToken`, `revokeInviteToken`, `listInviteTokens`

### Zod Field-Error Shape (applies to all admin + register actions)

**Source:** `src/app/(app)/configuracion/actions.ts` line 8

```typescript
type ActionResult = { success: true } | { error: Record<string, string[]> }
```

All new actions return this shape. `createInviteToken` extends with optional `token` field: `{ success: true; token: string }`.

### AuthError Discipline (applies to any action calling `signIn`)

**Source:** `src/actions/auth.ts` lines 28-34

```typescript
try {
  await signIn('credentials', { email, password, redirectTo: '/' })
  return {}
} catch (error) {
  if (error instanceof AuthError) {
    return { error: 'Credenciales invalidas' }
  }
  throw error  // CRITICAL: NEXT_REDIRECT must propagate
}
```

**Apply to:** `registerAction` after the `$transaction` succeeds.

### Inline Destructive Confirmation (applies to revoke button)

**Source:** `src/components/categories/CategoryList.tsx` lines 58-93, 136-166

- `useState<boolean>(false)` for `confirming`, separate `useState` for `inFlight`
- `useEffect` with 3000ms `setTimeout` auto-cancel
- Render two buttons `Si` / `No` when confirming, icon-only button when idle
- On action result: `toast.error` with fallback message and `{ duration: 5000 }` OR `toast.success` with short message
- `aria-label` on trigger button

**Apply to:** `InvitacionesList` revoke button (only on `status === 'pending'` rows).

### Client-Form useActionState Wiring (applies to both forms)

**Source:** `src/components/auth/LoginForm.tsx` lines 1-69

```typescript
'use client'
import { useActionState, useState } from 'react'
// ... icon + FloatingInput imports

const [state, action, isPending] = useActionState(action, undefined)
// ... individual field useState

<form action={action} className="space-y-6">
  <FloatingInput ... error={state?.error?.field?.[0]} />
  {state?.error?._form && <p className="text-sm text-negative">{state.error._form[0]}</p>}
  <button type="submit" disabled={isPending} className="w-full rounded-full bg-accent text-bg font-semibold py-3 ...">
    {isPending ? <span className="flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" />Label...</span> : 'Idle label'}
  </button>
</form>
```

**Apply to:** `RegisterForm`, `InvitacionForm`.

### Password Visibility Toggle (applies to both password fields on `/register`)

**Source:** `src/components/auth/LoginForm.tsx` lines 32-48

```typescript
<div className="relative">
  <FloatingInput type={showPassword ? 'text' : 'password'} ... />
  <button
    type="button"
    onClick={() => setShowPassword((prev) => !prev)}
    className="absolute right-0 top-2 p-1 text-text-tertiary hover:text-text-secondary transition-all duration-200"
    aria-label={showPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'}
  >
    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
  </button>
</div>
```

**Apply to:** both password fields in `RegisterForm` (two independent `showPw` / `showConfirm` state vars).

### Server-Component `connection()` Placement (applies to `/register` page)

**Source:** `src/app/(app)/configuracion/page.tsx` lines 6-8

```typescript
export default async function Page() {
  await connection()
  // ... async data fetch
}
```

**Apply to:** `src/app/(auth)/register/page.tsx` — per RESEARCH Open Q2, `connection()` is the project pattern and sidesteps caching concerns.

### Prisma Error Code Detection (applies to all admin + register actions)

**Source:** `src/app/(app)/configuracion/actions.ts` lines 10-16

```typescript
function getPrismaErrorCode(error: unknown): string | null {
  if (error && typeof error === 'object' && 'code' in error) {
    return (error as { code: string }).code
  }
  return null
}
```

**Apply to:** `invite-actions.ts` (local copy — keeps each action file self-contained per existing convention) and `registerAction` (for `P2002` duplicate-user fallback).

### IDOR-Safe User-Scoped Query (applies to revoke)

**Source:** `src/app/(app)/ingresos/actions.ts` lines 75, 112 + `src/app/(app)/configuracion/actions.ts` line 80

```typescript
const existing = await prisma.someModel.findFirst({ where: { id, userId } })
if (!existing) return { error: { _form: ['Not found'] } }
```

**Apply to:** `revokeInviteToken` — `findFirst({ where: { id: tokenId, createdBy: userId } })` to scope to creator (future-proofs for multi-admin per RESEARCH security section).

### Test Mock Skeleton (applies to unit tests)

**Source:** `src/app/(app)/configuracion/actions.test.ts` lines 1-28 + `src/actions/auth.test.ts` lines 1-29

Always mock:
- `@/lib/prisma` — per-model object with `vi.fn()` for each method used
- `next/cache` — `revalidatePath`
- `@/lib/auth-utils` — `requireAuth` resolves to `{ userId: 'test-user-id' }`
- `next-auth` (for actions using `signIn`) — `AuthError` stub class
- `@/auth` — `signIn` mock

Use `createFormData(fields: Record<string, string>): FormData` helper from `src/actions/auth.test.ts` lines 23-29 for action tests.

---

## No Analog Found

| File | Role | Data Flow | Reason | Fallback |
|------|------|-----------|--------|----------|
| `src/lib/invite-utils.ts` (`generateToken`, `computeStatus`, `buildInviteUrl`, `formatInviteDate`) | utility | pure transform | No existing utility for crypto or date-range-status derivation; `src/lib/utils.ts` covers money and classname utilities | Follow RESEARCH.md Code Examples: `randomBytes(32).toString('hex')` + `Intl.DateTimeFormat('es-MX', ...)` pattern |
| Migration SQL | schema | schema | Existing migrations aren't directly readable in this pattern scan, but `prisma migrate dev` auto-generates | Let Prisma CLI generate; manually inspect for `ALTER TABLE "User" ADD COLUMN "isAdmin" BOOLEAN NOT NULL DEFAULT false;` + `ALTER TABLE "InviteToken" ADD COLUMN "revokedAt" TIMESTAMP(3);` |
| `GeneratedUrlPanel` clipboard interaction | component | event-driven | No `navigator.clipboard.writeText` call exists anywhere in src/ today | Follow RESEARCH.md: try/catch wrap + sonner toast on failure + 1600ms icon swap via `useState<boolean>` + `setTimeout` |

---

## Metadata

**Analog search scope:**
- `src/actions/` — auth.ts + auth.test.ts
- `src/app/(app)/configuracion/` — page, wrapper, actions, actions.test
- `src/app/(app)/ingresos/actions.ts` — for `findFirst({ id, userId })` pattern
- `src/app/(auth)/` — layout, login page
- `src/auth.ts` — Auth.js v5 pipeline
- `src/components/auth/LoginForm.tsx` — form pattern reference
- `src/components/categories/CategoryList.tsx` + `CategoryForm.tsx` — list + inline-confirm reference
- `src/components/ui/FloatingInput.tsx` — input primitive contract
- `src/lib/auth-utils.ts` — requireAuth contract
- `src/lib/utils.ts` — utility idiom
- `src/lib/validators.ts` — Zod schema conventions
- `src/proxy.ts` — public path rules
- `src/types/index.ts` — type re-export conventions
- `src/types/next-auth.d.ts` — module augmentation
- `prisma/schema.prisma` + `prisma/seed.ts` — schema + seed idioms
- `tests/integration/auth.test.ts` — integration test pattern

**Files scanned:** 18 source files read; 16 new/modified files mapped.

**Pattern extraction date:** 2026-04-18
