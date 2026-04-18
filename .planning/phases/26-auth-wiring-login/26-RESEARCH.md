# Phase 26: Auth Wiring + Login - Research

**Researched:** 2026-04-18
**Domain:** Authentication (Auth.js v5 + Next.js 16 + Prisma + JWT)
**Confidence:** HIGH

## Summary

This phase wires Auth.js v5 (next-auth@beta) into the existing Next.js 16 app with Credentials provider, JWT session strategy, and Prisma adapter. The User model and related auth tables (Account, Session, VerificationToken) already exist in the Prisma schema from Phase 25. bcryptjs is already installed and used in the seed script with cost factor 12.

Next.js 16 renamed `middleware.ts` to `proxy.ts` and the exported function from `middleware` to `proxy`. Auth.js v5 (5.0.0-beta.31) supports Next.js 16 via `export { auth as proxy } from "@/auth"` in `proxy.ts`. The login page needs its own layout (route group) to bypass the root layout's sidebar/mobile nav shell.

**Primary recommendation:** Install `next-auth@beta` and `@auth/prisma-adapter`, create `auth.ts` at project root with Credentials provider + JWT + PrismaAdapter, create `src/proxy.ts` with auth-based route protection, build a minimal login page at `src/app/(auth)/login/page.tsx` with its own layout, and add a logout button to the sidebar.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Full-page minimal layout -- form floats on pure OLED black (#000000) background, no card container
- No app shell -- login page has its own layout, no sidebar or mobile nav visible
- Branding: "Centik" in Satoshi bold (chartreuse #CCFF00) with a short tagline below in text-secondary (#999999)
- Form inputs: reuse existing FloatingInput component (underline-style with animated floating labels)
- Login button: chartreuse pill button, full-width within form area
- Generic inline error: "Credenciales invalidas" below the form -- no distinction between wrong email vs wrong password (security-first)
- All user-facing messages in Spanish (es-MX)
- Loading state: button shows spinner icon + text "Iniciando sesion...", button disabled during auth
- Password field has eye/eye-off toggle (Lucide icons) for visibility
- JWT expiration: 30 days
- Post-login redirect: callbackUrl -- redirect to the page user was trying to visit before auth redirect
- Session token data: userId only -- minimal token, email fetched from DB when needed
- Logout button visible in sidebar
- Both layers: unit tests mock Auth.js internals + one integration test with real Auth.js
- Core + edge cases (~12-15 test cases)
- Proxy.ts tested both ways: mocked request/response (unit) + E2E with Playwright (real browser redirect)
- JWT session strategy, not database sessions
- bcrypt cost factor 12
- CVE-2025-29927 mitigation -- proxy.ts alone is NOT sufficient, requireAuth() mandatory in Server Actions (deferred to Phase 27)
- User model already exists with hashedPassword, isApproved, totpEnabled fields (Phase 25)

### Claude's Discretion
- Auth.js configuration details (adapter setup, callback implementation)
- Exact proxy.ts route matching logic
- Loading skeleton or transition animation on redirect
- Logout confirmation (if any) vs immediate sign-out
- Test file organization and mock strategies

### Deferred Ideas (OUT OF SCOPE)
- TOTP 2FA challenge step on login -- Phase 29
- Rate limiting on login attempts -- Phase 29 (TOTP-05)
- requireAuth() helper replacing getDefaultUserId() -- Phase 27
- Registration page -- Phase 28
- Password reset -- Out of scope (admin resets via DB/seed)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTH-02 | Auth.js v5 configured with Prisma adapter, Credentials provider (email+password), JWT session strategy, and session callbacks exposing userId | Auth.js v5 installation, PrismaAdapter setup, Credentials provider authorize callback, JWT/session callbacks documented below |
| AUTH-03 | proxy.ts protects all routes except /login and /register -- unauthenticated users redirected to /login | Next.js 16 proxy.ts convention documented, matcher config for route exclusion, `authorized` callback pattern |
| AUTH-04 | Login page with email+password form, error handling, and Glyph Finance design | Custom sign-in page pattern, FloatingInput reuse, error handling with AuthError, server action signIn pattern |
| AUTH-05 | Password hashing with bcryptjs (cost factor 12), passwords never stored in plaintext | bcryptjs already installed, bcrypt.compare in authorize callback, cost factor 12 already in seed |
| TEST-02 | New auth tests -- login flow, session validation, requireAuth() behavior, TOTP verification | Vitest mocking patterns for Auth.js, Next.js experimental testing utilities for proxy, test structure documented |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next-auth | 5.0.0-beta.31 (`@beta` tag) | Authentication framework | Official Auth.js for Next.js; v5 beta.31 supports Next.js 16 peer dependency (`^16.0.0`) |
| @auth/prisma-adapter | 2.11.2 | Database adapter for Auth.js | Official Prisma adapter from Auth.js ecosystem; connects to existing User/Account/Session models |
| bcryptjs | ^3.0.3 | Password hashing | Already installed; used in seed with cost factor 12 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| next/experimental/testing/server | built-in (16.2.2) | Proxy unit testing utilities | Testing proxy matcher config and redirect behavior |

### Already Installed (No Action Needed)
- `zod` -- for login form validation schema
- `lucide-react` -- for eye/eye-off password toggle icons, log-out icon
- `sonner` -- already in root layout (not used for login errors per decision, but available for logout toast)

### Installation
```bash
npm install next-auth@beta @auth/prisma-adapter --legacy-peer-deps
```

**Note on `--legacy-peer-deps`:** The next-auth@beta peer dependency range includes `^16.0.0`, so this flag should not be necessary with beta.31. However, if there are transitive dependency conflicts from `@auth/prisma-adapter`, the flag resolves them safely. Test without it first.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── auth.ts                          # Auth.js config (NextAuth export)
├── proxy.ts                         # Route protection (proxy.ts convention)
├── app/
│   ├── (app)/                       # Route group: app shell (sidebar + nav)
│   │   ├── layout.tsx               # Existing root layout with sidebar/nav
│   │   ├── page.tsx                 # Dashboard
│   │   ├── movimientos/
│   │   ├── deudas/
│   │   ├── presupuesto/
│   │   ├── ingresos/
│   │   └── historial/
│   ├── (auth)/                      # Route group: auth pages (no shell)
│   │   ├── layout.tsx               # Minimal layout: OLED black, no sidebar
│   │   └── login/
│   │       └── page.tsx             # Login page (server component wrapper)
│   ├── api/
│   │   └── auth/
│   │       └── [...nextauth]/
│   │           └── route.ts         # Auth.js route handler (2 lines)
│   ├── layout.tsx                   # True root layout (html/body + fonts only)
│   └── globals.css
├── components/
│   └── auth/
│       └── LoginForm.tsx            # Client component: form + state + submit
├── lib/
│   ├── auth-utils.ts                # Existing file (getDefaultUserId stays)
│   └── validators.ts                # Add loginSchema
└── actions/
    └── auth.ts                      # Server action: login (signIn wrapper)
```

### CRITICAL: Route Group Migration

The current root `layout.tsx` renders the sidebar and mobile nav. The login page must NOT render these. The solution is route groups:

1. Move current `layout.tsx` content (sidebar, MobileNav, FAB) into `(app)/layout.tsx`
2. Create `(auth)/layout.tsx` with minimal styling (just OLED black background, fonts)
3. Keep root `layout.tsx` as the true HTML root (html tag, fonts, Toaster) -- shared by both groups

This is the biggest structural change in this phase. The root `layout.tsx` must be split.

### Pattern 1: Auth.js Configuration (auth.ts)
**What:** Central auth configuration exporting `auth`, `signIn`, `signOut`, `handlers`
**When to use:** Every auth operation in the app

```typescript
// src/auth.ts
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 }, // 30 days
  pages: {
    signIn: '/login',
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
          select: { id: true, email: true, name: true, hashedPassword: true, isApproved: true },
        })

        if (!user || !user.hashedPassword) return null
        if (!user.isApproved) return null // Block unapproved users

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.hashedPassword,
        )
        if (!isValid) return null

        return { id: user.id, email: user.email, name: user.name }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // On initial sign-in, user object is available
      if (user) {
        token.userId = user.id
      }
      return token
    },
    async session({ session, token }) {
      // Expose userId in the session object
      if (token.userId) {
        session.user.id = token.userId as string
      }
      return session
    },
  },
})
```

### Pattern 2: proxy.ts Route Protection
**What:** Protect all routes except /login and /register
**When to use:** Every incoming request (automatic via Next.js)

```typescript
// src/proxy.ts
import { auth } from '@/auth'
import { NextResponse } from 'next/server'

const publicPaths = ['/login', '/register']

export const proxy = auth((req) => {
  const { pathname } = req.nextUrl

  // Allow public routes
  if (publicPaths.some((path) => pathname.startsWith(path))) {
    // If already authenticated, redirect away from login/register to home
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
    // Match all routes except static files, images, and API auth routes
    '/((?!api/auth|_next/static|_next/image|favicon.ico|fonts).*)',
  ],
}
```

### Pattern 3: Server Action for Login
**What:** Server action wrapping signIn to handle errors gracefully
**When to use:** Login form submission

```typescript
// src/actions/auth.ts
'use server'

import { signIn } from '@/auth'
import { AuthError } from 'next-auth'
import { loginSchema } from '@/lib/validators'

export async function loginAction(
  _prevState: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string }> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    return { error: 'Credenciales invalidas' }
  }

  try {
    await signIn('credentials', {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: formData.get('callbackUrl') as string || '/',
    })
    // signIn redirects on success, this line is never reached
    return {}
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: 'Credenciales invalidas' }
    }
    // Re-throw redirect errors (NEXT_REDIRECT)
    throw error
  }
}
```

### Pattern 4: Login Form Client Component
**What:** Client component with FloatingInput reuse
**When to use:** The login page

```typescript
// src/components/auth/LoginForm.tsx
'use client'

import { useActionState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { useState } from 'react'
import FloatingInput from '@/components/ui/FloatingInput'
import { loginAction } from '@/actions/auth'

export default function LoginForm() {
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/'
  const [state, action, pending] = useActionState(loginAction, undefined)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  return (
    <form action={action}>
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      <FloatingInput
        label="Correo electronico"
        value={email}
        onChange={setEmail}
        type="text"
        name="email"
      />
      {/* Password field with eye toggle */}
      <div className="relative">
        <FloatingInput
          label="Contrasena"
          value={password}
          onChange={setPassword}
          type={showPassword ? 'text' : 'password'}
          name="password"
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-0 top-2 p-1 text-text-tertiary"
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {/* Error message */}
      {state?.error && (
        <p className="text-sm text-negative">{state.error}</p>
      )}
      {/* Submit button */}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-accent text-bg font-semibold py-3 transition-all duration-200 hover:bg-accent-hover disabled:opacity-50"
      >
        {pending ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 size={16} className="animate-spin" />
            Iniciando sesion...
          </span>
        ) : (
          'Iniciar sesion'
        )}
      </button>
    </form>
  )
}
```

### Anti-Patterns to Avoid
- **Relying on proxy.ts alone for auth:** CVE-2025-29927 allows bypassing middleware/proxy headers. Always verify auth in Server Actions and data access (Phase 27 adds requireAuth()).
- **Database queries in proxy.ts:** Proxy runs on every request including prefetches. Use JWT-only checks (from the session cookie), never query the DB.
- **Fetching user email on every JWT decode:** Store only userId in the token (per decision). Fetch email from DB only when needed (e.g., profile display).
- **Using `redirect: false` with server-side signIn:** In server actions, signIn throws a NEXT_REDIRECT error on success. Catch it and re-throw -- do NOT use `redirect: false` in server actions.
- **Checking `error instanceof AuthError` without re-throwing redirects:** The catch block MUST re-throw non-AuthError errors because signIn uses Next.js redirect internally.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JWT signing/verification | Custom jose/jsonwebtoken setup | Auth.js built-in JWT handling | Auth.js manages signing, encryption, rotation automatically |
| Session cookie management | Manual cookie set/get/delete | Auth.js session cookies | Handles HttpOnly, Secure, SameSite, expiration |
| CSRF protection | Custom CSRF tokens | Auth.js built-in CSRF | Auth.js includes CSRF protection on all auth endpoints |
| Password hashing | Custom salt/hash logic | bcryptjs with cost factor 12 | Already established pattern in seed script |
| Route protection middleware | Custom NextResponse redirect logic | Auth.js `auth()` wrapper in proxy | The `auth((req) => {...})` pattern provides req.auth automatically |
| Auth route handler | Custom POST endpoints for login | Auth.js handlers `{ GET, POST }` | Two-line handler auto-manages `/api/auth/*` endpoints |

**Key insight:** Auth.js v5 manages the entire auth lifecycle. The only custom code needed is the `authorize` callback (credential validation), session/jwt callbacks (userId injection), and the UI.

## Common Pitfalls

### Pitfall 1: NEXT_REDIRECT Error in signIn Try/Catch
**What goes wrong:** signIn throws a NEXT_REDIRECT error on successful login (it's how Next.js Server Actions trigger redirects). If you catch it, the user never gets redirected.
**Why it happens:** The try/catch block catches ALL errors, including the redirect "error" which is not a real error.
**How to avoid:** Check if the error is an `AuthError` instance. If it is, return a user-facing error. If it is NOT, re-throw it (it's likely a redirect).
**Warning signs:** Login appears to succeed (no error shown) but user stays on the login page.

### Pitfall 2: FloatingInput Type Prop Limitation
**What goes wrong:** The existing FloatingInput accepts `type?: 'text' | 'number' | 'decimal' | 'date'` -- it does NOT accept `'password'` or `'email'` types.
**Why it happens:** FloatingInput was built for financial form fields, not auth forms.
**How to avoid:** Extend the FloatingInput type union to include `'password'` and `'email'`, OR use the `type="text"` with `inputMode` attribute. The cleanest solution is to add the types.
**Warning signs:** TypeScript compilation errors when passing `type="password"` to FloatingInput.

### Pitfall 3: Route Group Migration Breaking Existing Pages
**What goes wrong:** Moving existing pages into `(app)/` changes their file system path but not URL path. However, if the root layout is not properly restructured, pages may lose their sidebar/nav.
**Why it happens:** Route groups require careful layout tree restructuring.
**How to avoid:** Move content in this exact order: (1) Create the `(app)/layout.tsx` with sidebar/nav content, (2) Move existing pages into `(app)/`, (3) Strip root `layout.tsx` to just html/body/fonts/Toaster, (4) Create `(auth)/layout.tsx`, (5) Test that all existing pages still render correctly.
**Warning signs:** Sidebar disappears on existing pages, or login page shows sidebar.

### Pitfall 4: Auth.js Adapter + JWT Strategy Interaction
**What goes wrong:** When using PrismaAdapter with JWT strategy, Auth.js may try to create database sessions anyway, or the adapter may interfere with the Credentials provider flow.
**Why it happens:** The Prisma adapter is designed for database-backed sessions by default.
**How to avoid:** Explicitly set `session: { strategy: 'jwt' }`. With JWT strategy and `@prisma/client@5.9.1+`, no additional modifications are needed. The adapter handles User model lookups without creating Session rows.
**Warning signs:** Unexpected Session table entries, or "adapter is required" errors.

### Pitfall 5: Environment Variable Naming
**What goes wrong:** Auth.js v5 uses `AUTH_SECRET` (not `NEXTAUTH_SECRET`). Using the old name causes cryptic errors.
**Why it happens:** v5 renamed all env vars from `NEXTAUTH_*` to `AUTH_*`.
**How to avoid:** Generate secret with `npx auth secret` (auto-adds to .env.local) or manually add `AUTH_SECRET` to `.env`.
**Warning signs:** "Missing AUTH_SECRET" error on app start, or JWT verification failures.

### Pitfall 6: proxy.ts File Location
**What goes wrong:** proxy.ts must be at project root OR inside `src/` at the same level as `app/`. Placing it elsewhere causes it to be silently ignored.
**Why it happens:** Next.js only looks for proxy.ts in specific locations.
**How to avoid:** Since this project uses `src/`, place it at `src/proxy.ts`.
**Warning signs:** Unauthenticated users can access protected pages without redirect.

## Code Examples

### Login Schema (Zod)
```typescript
// Add to src/lib/validators.ts
/** Validates login form submission */
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

### Auth.js Route Handler
```typescript
// src/app/api/auth/[...nextauth]/route.ts
import { handlers } from '@/auth'
export const { GET, POST } = handlers
```

### Auth Type Extension
```typescript
// src/types/next-auth.d.ts
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

### Logout Server Action
```typescript
// src/actions/auth.ts (add to same file)
export async function logoutAction() {
  await signOut({ redirectTo: '/login' })
}
```

### Auth Layout (No App Shell)
```typescript
// src/app/(auth)/layout.tsx
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      {children}
    </div>
  )
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `middleware.ts` with `export { auth as middleware }` | `proxy.ts` with `export { auth as proxy }` | Next.js 16.0.0 (2025) | File convention rename; auth wrapper pattern unchanged |
| `NEXTAUTH_SECRET` env var | `AUTH_SECRET` env var | Auth.js v5 | All env vars renamed from NEXTAUTH_ to AUTH_ |
| `next-auth@4` with `[...nextauth].ts` API route | `next-auth@5` with `auth.ts` root config | Auth.js v5 | Simplified config; exports auth, signIn, signOut, handlers |
| `getServerSession(authOptions)` | `auth()` | Auth.js v5 | Single function for session in server components, actions, routes |
| `callbackUrl` in signIn options | `redirectTo` in signIn options | Auth.js v5 | Parameter renamed |
| Edge Runtime for middleware | Node.js Runtime for proxy | Next.js 16 | Proxy defaults to Node.js; Edge no longer the default |

**Deprecated/outdated:**
- `middleware.ts` file convention -- renamed to `proxy.ts` in Next.js 16
- `NEXTAUTH_SECRET` / `NEXTAUTH_URL` env vars -- replaced by `AUTH_SECRET` / `AUTH_URL` in v5
- `getServerSession()` -- replaced by `auth()` in v5
- `unstable_doesProxyMatch` naming in docs -- actual export is still `unstable_doesMiddlewareMatch` in Next.js 16.2.2

## Open Questions

1. **FloatingInput Extension**
   - What we know: Current type union is `'text' | 'number' | 'decimal' | 'date'`
   - What's unclear: Whether extending to include `'password'` and `'email'` causes any visual/behavioral issues with the floating label animation
   - Recommendation: Extend the type union; the component's behavior is input-type agnostic (only the `<input>` element respects the type attribute)

2. **Auth.js v5 Stability on Next.js 16**
   - What we know: beta.31 lists `^16.0.0` in peerDependencies; basic flow works per community reports
   - What's unclear: Whether there are edge cases with proxy.ts that differ from middleware.ts behavior
   - Recommendation: Proceed with beta.31; the proxy rename is a simple export alias change. Monitor for issues during testing.

3. **Existing API Routes Auth Protection**
   - What we know: proxy.ts matcher excludes `api/auth` routes but NOT other API routes (e.g., `/api/transactions`)
   - What's unclear: Whether existing API routes need auth protection in this phase or Phase 27
   - Recommendation: Phase 26 protects page routes only via proxy.ts. Phase 27 adds requireAuth() to Server Actions and can also protect API routes. The proxy.ts matcher should include API routes for optimistic protection even now.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (latest) + jsdom environment |
| Config file | `vitest.config.mts` |
| Quick run command | `npm run test:run -- --testPathPattern=auth` |
| Full suite command | `npm run test:run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-02 | Auth.js configured with Credentials + JWT + session callbacks | unit | `npx vitest run src/auth.test.ts -t "auth config"` | Wave 0 |
| AUTH-03 | proxy.ts redirects unauthenticated, allows /login and /register | unit | `npx vitest run src/proxy.test.ts` | Wave 0 |
| AUTH-04 | Login form submits credentials, shows errors | unit | `npx vitest run src/actions/auth.test.ts` | Wave 0 |
| AUTH-05 | Password hashing with bcrypt cost 12 | unit | `npx vitest run src/auth.test.ts -t "password"` | Wave 0 |
| TEST-02 | Login flow, session validation, proxy redirect | unit+integration | `npx vitest run --testPathPattern=auth` | Wave 0 |

### Test Strategy

**Unit tests (mocked Auth.js internals):**
1. `src/auth.test.ts` -- Test the authorize callback directly:
   - Valid credentials return user object
   - Wrong password returns null
   - Non-existent email returns null
   - Unapproved user returns null
   - Empty credentials return null
   - bcrypt.compare called with correct cost factor
   - JWT callback adds userId to token
   - Session callback exposes userId in session

2. `src/proxy.test.ts` -- Test proxy routing logic:
   - Unauthenticated request to `/` redirects to `/login`
   - Unauthenticated request to `/movimientos` redirects to `/login?callbackUrl=/movimientos`
   - Authenticated request to `/` passes through
   - Unauthenticated request to `/login` passes through
   - Unauthenticated request to `/register` passes through
   - Authenticated request to `/login` redirects to `/`
   - Static assets (`_next/static`, `_next/image`) are excluded from matcher

3. `src/actions/auth.test.ts` -- Test login server action:
   - Invalid email format returns error
   - Empty password returns error
   - AuthError caught returns generic error message
   - Non-AuthError (redirect) is re-thrown
   - callbackUrl passed through to signIn

4. `src/lib/validators.test.ts` -- Add loginSchema tests:
   - Valid email + password passes
   - Invalid email fails
   - Empty password fails

**Mocking strategy:**
- Mock `@/lib/prisma` for authorize callback tests (return fake user objects)
- Mock `bcryptjs` for password comparison tests (control return value)
- Mock `next-auth` signIn/auth for server action tests
- Use `unstable_doesMiddlewareMatch` from `next/experimental/testing/server` for proxy matcher tests
- Use `NextRequest` constructor + proxy function directly for redirect tests

### Sampling Rate
- **Per task commit:** `npm run test:run -- --testPathPattern=auth`
- **Per wave merge:** `npm run test:run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/auth.test.ts` -- covers AUTH-02, AUTH-05
- [ ] `src/proxy.test.ts` -- covers AUTH-03
- [ ] `src/actions/auth.test.ts` -- covers AUTH-04
- [ ] `src/lib/validators.test.ts` -- add loginSchema tests (file exists, add new describe block)
- [ ] `src/types/next-auth.d.ts` -- TypeScript module augmentation for session.user.id

## Sources

### Primary (HIGH confidence)
- Next.js 16.2.2 bundled docs (`node_modules/next/dist/docs/`) -- proxy.ts file convention, authentication guide, route groups
- Auth.js official docs (authjs.dev) -- installation, Prisma adapter, protecting routes, custom sign-in pages, API reference
- Project codebase -- existing FloatingInput, Sidebar, auth-utils.ts, prisma schema, seed.ts, validators.ts

### Secondary (MEDIUM confidence)
- [Auth.js v5 with Next.js 16 guide (DEV Community)](https://dev.to/huangyongshan46a11y/authjs-v5-with-nextjs-16-the-complete-authentication-guide-2026-2lg) -- complete setup patterns verified against official docs
- [GitHub Discussion #13315](https://github.com/nextauthjs/next-auth/discussions/13315) -- middleware to proxy migration confirmed approach
- [GitHub Issue #13302](https://github.com/nextauthjs/next-auth/issues/13302) -- peer dependency issue resolved in beta.31
- npm registry -- confirmed next-auth@beta (5.0.0-beta.31) supports `next@^16.0.0`

### Tertiary (LOW confidence)
- Community examples of proxy.ts + Auth.js error handling -- patterns verified against official Auth.js docs but not individually tested

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- next-auth@beta.31 peer deps verified, PrismaAdapter version confirmed, all libs available
- Architecture: HIGH -- proxy.ts convention documented in Next.js 16 bundled docs, route groups well-established pattern
- Pitfalls: HIGH -- NEXT_REDIRECT catch issue well-documented across multiple sources, CVE-2025-29927 noted in CONTEXT.md
- Testing: MEDIUM -- `unstable_doesMiddlewareMatch` confirmed exported in 16.2.2, but testing Auth.js authorize callback with mocks requires careful setup

**Research date:** 2026-04-18
**Valid until:** 2026-05-18 (30 days -- Auth.js beta may release new versions but API is stable)
