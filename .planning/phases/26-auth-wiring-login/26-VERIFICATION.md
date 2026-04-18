---
phase: 26-auth-wiring-login
verified: 2026-04-18T00:00:00Z
status: verified
score: 9/9 must-haves verified
gaps: []
---

# Phase 26: Auth Wiring + Login Verification Report

**Phase Goal:** Users can authenticate with email and password, and unauthenticated visitors are redirected to the login page
**Verified:** 2026-04-18
**Status:** verified
**Re-verification:** Yes -- corrected false positive from initial verification

---

## Correction Note

The initial verification (2026-04-17) incorrectly flagged 2 truths as FAILED and 1 as UNCERTAIN based on the middleware manifest showing `"middleware": {}`. This was a false positive.

**Root cause of misdiagnosis:** The verifier assumed Next.js 16 requires `middleware.ts` to activate route protection. In reality, Next.js 16 renamed the file convention from `middleware.ts` to `proxy.ts` (see `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`). The `proxy.ts` file IS the correct convention and IS recognized by Next.js 16. The middleware manifest being empty is an internal naming artifact that does not reflect runtime behavior.

**Evidence the proxy IS active:**
1. `npm run build` output shows `f Proxy (Middleware)` confirming detection
2. Compiled proxy exists at `.next/server/middleware.js` (Next.js internally compiles proxy.ts to middleware.js)
3. Runtime curl tests confirm behavior:
   - `curl http://localhost:3000/` returns 307 redirect to `/login?callbackUrl=%2F`
   - `curl http://localhost:3000/movimientos` returns 307 redirect to `/login?callbackUrl=%2Fmovimientos`
   - `curl http://localhost:3000/login` returns 200 (allowed through)
   - `curl http://localhost:3000/register` returns 404 (allowed through, page doesn't exist yet)
4. All 525 unit tests pass including 20 auth-specific tests

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Auth.js v5 configured with Credentials provider, JWT (30-day), and PrismaAdapter | VERIFIED | src/auth.ts -- NextAuth({adapter: PrismaAdapter(prisma), session:{strategy:'jwt', maxAge:30*24*60*60}, providers:[Credentials({authorize: authorizeUser})], ..., trustHost:true}) |
| 2 | proxy.ts redirects unauthenticated users to /login with callbackUrl | VERIFIED | Runtime test: `curl http://localhost:3000/` returns 307 to `/login?callbackUrl=%2F`; build output shows `f Proxy (Middleware)` |
| 3 | proxy.ts allows /login, /register, /api/auth/*, static assets without auth | VERIFIED | Runtime test: `curl http://localhost:3000/login` returns 200; `/register` returns 404 (page doesn't exist, but proxy allows it through) |
| 4 | Authenticated users visiting /login are redirected to / | VERIFIED | Logic in proxy.ts lines 12-14; E2E test in e2e/auth.spec.ts covers full login flow; proxy is active at runtime |
| 5 | Passwords verified with bcryptjs in authorize callback | VERIFIED | src/auth.ts line 31: bcrypt.compare(password, user.hashedPassword); seed.ts uses bcrypt.hash(password, 12) |
| 6 | Session JWT contains userId; session.user.id is exposed | VERIFIED | src/auth.ts jwtCallback sets token.userId = user.id; sessionCallback sets session.user.id = token.userId; TypeScript augmentation in src/types/next-auth.d.ts |
| 7 | User can see a login page at /login with Glyph Finance design | VERIFIED | src/app/(auth)/login/page.tsx renders LoginForm inside (auth) layout; page uses OLED black background via bg-bg; Centik branding in h1 with text-accent |
| 8 | User can submit credentials and see error feedback | VERIFIED | LoginForm.tsx: useActionState(loginAction), error rendered as <p class="text-sm text-negative">, loading state shows Loader2 spinner + "Iniciando sesion..." |
| 9 | Logout button in sidebar signs user out and redirects to /login | VERIFIED | Sidebar.tsx imports logoutAction from @/actions/auth; form action={logoutAction}; logoutAction calls signOut({redirectTo:'/login'}) |

**Score:** 9/9 truths verified

---

## Required Artifacts

### Plan 00 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/auth.test.ts` | Test stubs for authorize/JWT/session callbacks | VERIFIED | 150 lines, 9 substantive test cases (not todo -- Plan 03 replaced stubs with real tests) |
| `src/proxy.test.ts` | Test stubs for proxy route protection | VERIFIED | 103 lines, 6 substantive test cases |
| `src/actions/auth.test.ts` | Test stubs for login server action | VERIFIED | 87 lines, 5 substantive test cases |

### Plan 01 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/auth.ts` | Auth.js config with Credentials + JWT + PrismaAdapter; exports auth, signIn, signOut, handlers, authorizeUser, jwtCallback, sessionCallback | VERIFIED | 73 lines; all 7 named exports present; PrismaAdapter, bcrypt.compare, 30-day JWT all implemented |
| `src/proxy.ts` | Route protection redirecting unauthenticated to /login | VERIFIED | 33 lines; logic correct AND active at runtime -- Next.js 16 uses proxy.ts convention natively |
| `src/types/next-auth.d.ts` | TypeScript augmentation for Session.user.id and JWT.userId | VERIFIED | 15 lines; augments both next-auth and next-auth/jwt modules correctly |
| `src/app/api/auth/[...nextauth]/route.ts` | Auth.js route handler (GET, POST) | VERIFIED | 2 lines; imports handlers from @/auth; exports {GET, POST} |
| `src/lib/validators.ts` (loginSchema) | loginSchema Zod validation | VERIFIED | loginSchema present at line 150; validates email format + non-empty password with Spanish error messages |

### Plan 02 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/app/(app)/layout.tsx` | App shell with Sidebar, MobileNav, FAB | VERIFIED | 20 lines; imports and renders all three components; flex layout with main content area |
| `src/app/(auth)/layout.tsx` | Minimal auth layout (OLED black, centered) | VERIFIED | 7 lines; min-h-screen bg-bg flex items-center justify-center |
| `src/app/layout.tsx` | Root layout with html/body, fonts, Toaster only | VERIFIED | 57 lines; no Sidebar/MobileNav/FAB; only fonts, html/body, Toaster |

### Plan 03 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/app/(auth)/login/page.tsx` | Login page server component | VERIFIED | 25 lines (meets min 10); Centik h1 in text-accent; tagline; LoginForm wrapped in Suspense |
| `src/components/auth/LoginForm.tsx` | Login form with FloatingInput, password toggle, error, loading | VERIFIED | 70 lines (meets min 50); useActionState, email+password FloatingInputs, Eye/EyeOff toggle, error paragraph, chartreuse pill button |
| `src/actions/auth.ts` | loginAction and logoutAction server actions | VERIFIED | 39 lines; 'use server'; both actions exported; signIn/signOut called; AuthError caught; non-AuthError re-thrown |
| `src/components/layout/Sidebar.tsx` | Sidebar with logout button wired to logoutAction | VERIFIED | imports logoutAction; form action={logoutAction}; LogOut icon; desktop "Cerrar sesion" text; tablet tooltip |
| `src/auth.test.ts` | Unit tests for authorize callback, JWT/session callbacks (min 80 lines) | VERIFIED | 150 lines, 9 test cases covering valid creds, wrong password, non-existent email, unapproved, empty creds, null hashedPassword, JWT/session callbacks |
| `src/proxy.test.ts` | Unit tests for proxy route protection (min 40 lines) | VERIFIED | 103 lines, 6 test cases covering all routing scenarios |
| `src/actions/auth.test.ts` | Unit tests for loginAction (min 40 lines) | VERIFIED | 87 lines, 5 test cases covering validation, AuthError, re-throw, valid signIn call |
| `tests/integration/auth.test.ts` | Integration test with real Auth.js authorize (min 30 lines) | VERIFIED | 104 lines, 4 test cases; uses real authorizeUser + real bcrypt; mocks only NextAuth init; creates/destroys test user |
| `e2e/auth.spec.ts` | Playwright E2E test for proxy redirect (min 20 lines) | VERIFIED | 48 lines, 3 test cases (redirect with callbackUrl, login page branding, full login flow) |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/proxy.ts` | `src/auth.ts` | `import { auth } from '@/auth'` | VERIFIED | Import exists; proxy is active at runtime (Next.js 16 proxy.ts convention) |
| `src/auth.ts` | `@/lib/prisma` | `PrismaAdapter(prisma)` | VERIFIED | PrismaAdapter import and usage at lines 6, 54 |
| `src/auth.ts` | `bcryptjs` | `bcrypt.compare` in authorize callback | VERIFIED | bcrypt import at line 7; bcrypt.compare at line 31 |
| `src/components/auth/LoginForm.tsx` | `src/actions/auth.ts` | `useActionState(loginAction, undefined)` | VERIFIED | Pattern `useActionState.*loginAction` found at line 14 |
| `src/actions/auth.ts` | `src/auth.ts` | `import { signIn, signOut } from '@/auth'` | VERIFIED | Pattern `signIn(` found at line 21 |
| `src/components/layout/Sidebar.tsx` | `src/actions/auth.ts` | `import { logoutAction }` | VERIFIED | logoutAction imported and used in form action |
| `src/components/auth/LoginForm.tsx` | `src/components/ui/FloatingInput` | FloatingInput with type='email' and type='password' | VERIFIED | Two FloatingInput usages with type="email" and type={showPassword?'text':'password'} |
| `tests/integration/auth.test.ts` | `src/auth.ts` | `import { authorizeUser } from '@/auth'` | VERIFIED | Pattern `authorizeUser` imported at line 25 |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| AUTH-02 | 26-01 | Auth.js v5 with Prisma adapter, Credentials provider, JWT strategy, session callbacks exposing userId | SATISFIED | src/auth.ts -- complete implementation with all required features |
| AUTH-03 | 26-02 | proxy.ts protects all routes except /login and /register | SATISFIED | proxy.ts is active at runtime; curl tests confirm redirect behavior; Next.js 16 uses proxy.ts convention |
| AUTH-04 | 26-03 | Login page with email+password form, error handling, Glyph Finance design | SATISFIED | /login page, LoginForm, loginAction all substantively implemented |
| AUTH-05 | 26-01 | Password hashing with bcryptjs (cost factor 12), passwords never stored in plaintext | SATISFIED | bcrypt.compare in auth.ts; bcrypt.hash(password, 12) in prisma/seed.ts |
| TEST-02 | 26-00, 26-03 | New auth tests -- login flow, session validation, proxy behavior | SATISFIED | 9 unit tests (auth), 6 unit tests (proxy), 5 unit tests (loginAction), 4 loginSchema tests, 4 integration tests, 3 E2E tests |

**Orphaned requirements:** None -- all Phase 26 requirements (AUTH-02, AUTH-03, AUTH-04, AUTH-05, TEST-02) appear in plan frontmatter.

---

## Anti-Patterns Found

None.

---

## Human Verification Required

### 1. Authenticated redirect from /login

**Test:** Log in successfully, then navigate to /login manually
**Expected:** Browser redirects to /
**Why human:** Full browser flow with active session required

### 2. callbackUrl round-trip after login

**Test:** Navigate to /movimientos while unauthenticated, fill login form, submit valid credentials
**Expected:** After successful login, browser lands on /movimientos (not /)
**Why human:** Full flow requires running server + real DB with approved user; Playwright E2E test partially covers this but depends on seeded admin user

### 3. Password visibility toggle behavior

**Test:** On /login page, click the eye icon, type in password field
**Expected:** Eye-off icon shows; characters are visible; clicking again re-hides them
**Why human:** Visual/interaction behavior; not covered by unit tests

---

## Gaps Summary

**No gaps found.** All 9 truths verified, all 5 requirements satisfied.

The initial verification incorrectly concluded that `src/middleware.ts` was required to activate the proxy. In Next.js 16, `middleware.ts` is deprecated and replaced by `proxy.ts`. The existing `src/proxy.ts` is the correct file convention and is active at runtime, confirmed by both build output (`f Proxy (Middleware)`) and runtime curl tests showing 307 redirects for unauthenticated requests.

---

_Initially verified: 2026-04-17 (gaps_found -- false positive)_
_Re-verified: 2026-04-18 (verified -- gaps were false positives)_
_Verifier: Claude (gsd-planner, gap closure investigation)_
