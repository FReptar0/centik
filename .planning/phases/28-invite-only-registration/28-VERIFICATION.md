---
phase: 28-invite-only-registration
verified: 2026-04-18T18:30:00Z
status: human_needed
score: 10/10 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Log in as the admin user (ADMIN_EMAIL). Navigate to /configuracion. Confirm the Invitaciones section is visible with the form and explanatory copy."
    expected: "Invitaciones section is present below the Categorias section with the 'Generar invitacion' form."
    why_human: "Conditional rendering gated on isAdmin cannot be confirmed without a real session in a browser."
  - test: "Log in as a non-admin user. Navigate to /configuracion. Confirm the Invitaciones section is absent."
    expected: "Invitaciones section does not appear; only the Categorias section is shown."
    why_human: "Requires a second user account with isAdmin=false and a real browser session."
  - test: "As admin, enter an email in the Invitaciones form and click 'Generar invitacion'. Confirm the generated URL panel appears below the form with a copy button."
    expected: "URL panel renders the registration URL (/register?token=<64-char-hex>), clicking the copy button swaps the Copy icon to Check for ~1.6s, and the token appears in the recent-invites list with 'Pendiente' badge."
    why_human: "Clipboard API behavior and animated icon swap require a real browser; 1.6s timer cannot be verified programmatically."
  - test: "With a Pendiente token in the list, click the revoke button. Confirm the two-button confirm appears ('Revocar?'), click 'Si', and confirm the badge changes to 'Revocada'."
    expected: "Two-button confirm appears, clicking 'Si' calls revokeInviteToken, list refreshes and badge reads 'Revocada'."
    why_human: "Inline two-button confirm pattern and its 3s auto-cancel require real user interaction in a browser."
  - test: "Open the generated /register?token=<valid> URL in an incognito window. Confirm the email field is pre-filled and locked (disabled), complete registration, and confirm redirect to /."
    expected: "Form shows locked email, name and password fields are editable, submitting creates account and redirects to / with the user logged in."
    why_human: "End-to-end registration flow requires a real browser session + real NextAuth signIn redirect."
  - test: "Re-open the same /register URL (now used). Confirm the 'Enlace ya usado' error screen appears."
    expected: "TokenErrorScreen renders with heading 'Enlace ya usado' and the appropriate body copy."
    why_human: "Requires the real DB row to have usedAt populated from the prior step."
  - test: "Visit /register without a ?token query param. Confirm a 404 page is returned."
    expected: "Next.js 404 page is displayed (notFound() was called)."
    why_human: "Requires a real browser request to confirm the 404 response and page rendering."
---

# Phase 28: Invite-Only Registration Verification Report

**Phase Goal:** New users can only register via an admin-generated invite link -- no self-registration
**Verified:** 2026-04-18T18:30:00Z
**Status:** human_needed
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User.isAdmin column exists in schema and DB with default false | VERIFIED | `prisma/schema.prisma` line 63: `isAdmin Boolean @default(false)` in User model; migration `20260418040000` has `ALTER TABLE "User" ADD COLUMN "isAdmin" BOOLEAN NOT NULL DEFAULT false` |
| 2 | InviteToken.revokedAt column exists in schema and DB as nullable DateTime | VERIFIED | `prisma/schema.prisma` line 130: `revokedAt DateTime?` in InviteToken model; migration has `ALTER TABLE "InviteToken" ADD COLUMN "revokedAt" TIMESTAMP(3)` |
| 3 | Seeded admin user (ADMIN_EMAIL) has isAdmin = true after running seed | VERIFIED | `prisma/seed.ts` lines 30+36: `isAdmin: true` on both `update` and `create` paths in `seedAdminUser` upsert |
| 4 | session.user.isAdmin is populated from JWT in sessionCallback | VERIFIED | `src/auth.ts` lines 52-56: `if (typeof token.isAdmin === 'boolean') { session.user.isAdmin = token.isAdmin } else { session.user.isAdmin = false }` |
| 5 | JWT carries isAdmin from authorize through jwtCallback | VERIFIED | `src/auth.ts` lines 25+35+42: SELECT includes `isAdmin: true`, return includes `isAdmin: user.isAdmin`, jwtCallback sets `token.isAdmin = (user as User).isAdmin ?? false` |
| 6 | registerSchema and createInviteSchema exist in src/lib/validators.ts | VERIFIED | `src/lib/validators.ts` lines 161+169: both schemas exported; `createInviteSchema` validates email; `registerSchema` validates token+email+name+password+confirmPassword with `.refine()` at `path: ['confirmPassword']` |
| 7 | Admin can generate invite token via Server Action producing 64-char hex token persisted with 7d expiry | VERIFIED | `src/app/(app)/configuracion/invite-actions.ts`: `createInviteToken` calls `generateInviteToken()` (which wraps `randomBytes(32).toString('hex')`), sets `expiresAt = new Date(Date.now() + INVITE_TTL_MS)` (7 days), persists via `prisma.inviteToken.create` |
| 8 | createInviteToken and revokeInviteToken reject non-admin callers even via direct RPC | VERIFIED | Both actions call `requireAdmin()` which chains `requireAuth()` then a fresh `prisma.user.findUnique({ isAdmin: true })` DB check; returns `{ error: { _form: ['No autorizado'] } }` if not admin; 17 unit tests all pass |
| 9 | /register?token=<valid> renders the registration form with email pre-filled and locked; /register without token calls notFound(); invalid/expired/used states render TokenErrorScreen | VERIFIED | `src/app/(auth)/register/page.tsx`: `if (!token) notFound()`, `prisma.inviteToken.findUnique`, four conditional branches returning `<TokenErrorScreen state="invalid/used/expired">` or `<RegisterForm email={row.email} token={row.token} />`; 6/6 page unit tests pass |
| 10 | registerAction creates User (isApproved:true, isAdmin:false, bcrypt cost 12) and marks InviteToken.usedAt atomically in $transaction; re-throws NEXT_REDIRECT | VERIFIED | `src/actions/auth.ts`: `prisma.$transaction` re-checks all five token conditions inside the transaction (TOCTOU defense), `tx.user.create` with `isApproved: true, isAdmin: false`, `bcrypt.hash(parsed.data.password, 12)`, `tx.inviteToken.update({ data: { usedAt: new Date() } })`, `throw error` re-throws NEXT_REDIRECT; 19/19 auth unit tests pass |

**Score:** 10/10 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `prisma/schema.prisma` | User.isAdmin + InviteToken.revokedAt fields | VERIFIED | Both fields present with correct types and defaults |
| `prisma/migrations/20260418040000_.../migration.sql` | ALTER TABLE statements for both fields | VERIFIED | File exists with both ALTER TABLE statements |
| `prisma/seed.ts` | Admin user upsert with isAdmin: true | VERIFIED | isAdmin: true on both create and update paths (2 occurrences) |
| `src/auth.ts` | isAdmin through authorize -> JWT -> session | VERIFIED | All three callbacks wired; module exports authorizeUser, jwtCallback, sessionCallback |
| `src/types/next-auth.d.ts` | Module augmentation for Session.user.isAdmin + JWT.isAdmin | VERIFIED | Session.user has `isAdmin: boolean`; User has `isAdmin?: boolean`; JWT has `isAdmin?: boolean` |
| `src/lib/validators.ts` | registerSchema + createInviteSchema | VERIFIED | Both schemas exported with correct fields and validation |
| `src/lib/invite-utils.ts` | generateInviteToken, computeInviteStatus, buildInviteUrl, formatInviteDate | VERIFIED | 48 lines; all four helpers exported; uses `randomBytes(32).toString('hex')` |
| `src/app/(app)/configuracion/invite-actions.ts` | createInviteToken, revokeInviteToken, listInviteTokens with requireAdmin | VERIFIED | All three actions exported; requireAdmin called in all three; IDOR scope via createdBy |
| `src/app/(app)/configuracion/invite-actions.test.ts` | Unit tests covering admin gating, token shape, conflict errors, revoke IDOR | VERIFIED | 305 lines, 17 tests all passing |
| `tests/integration/invite-tokens.test.ts` | Integration tests for real Prisma persistence | VERIFIED | 136 lines, covers happy path, duplicate rejection, revoke round-trip |
| `src/components/configuracion/InvitacionesSection.tsx` | Client shell composing form + URL panel + list | VERIFIED | Exists; imports and composes InvitacionForm + GeneratedUrlPanel + InvitacionesList |
| `src/components/configuracion/InvitacionForm.tsx` | Email input + Generar invitacion submit | VERIFIED | useActionState wired to createInviteToken, Loader2 pending state, "Generar invitacion" label |
| `src/components/configuracion/GeneratedUrlPanel.tsx` | URL display with Copy/Check icon swap | VERIFIED | navigator.clipboard.writeText, Copy/Check lucide icons imported, 1600ms timeout |
| `src/components/configuracion/InvitacionesList.tsx` | List rows with status badges + inline revoke | VERIFIED | STATUS_DISPLAY table, computeInviteStatus, revokeInviteToken wired, "Revocar?" confirm pattern |
| `src/actions/auth.ts` | registerAction added alongside loginAction/logoutAction | VERIFIED | registerAction exported, $transaction, bcrypt cost 12, NEXT_REDIRECT re-thrown |
| `src/actions/auth.test.ts` | Unit tests for registerAction | VERIFIED | 307 lines; describe('registerAction') at line 113; 19 total tests all pass |
| `src/components/auth/RegisterForm.tsx` | Client form: email locked, name, password, confirm, eye toggles | VERIFIED | 113 lines; hidden token+email inputs, disabled email display, showPassword+showConfirm independent toggles, "Crear cuenta" / "Creando cuenta..." labels |
| `src/components/configuracion/TokenErrorScreen.tsx` | Pure display for invalid/expired/used states | VERIFIED | COPY record with all three states; `role="alert"`; three differentiated Spanish messages |
| `src/app/(auth)/register/page.tsx` | Server Component: validates token, renders form OR error screen, notFound() on missing | VERIFIED | notFound() on missing token, inviteToken.findUnique, four conditional branches for error states |
| `src/app/(auth)/register/page.test.tsx` | Unit tests for page.tsx render branches | VERIFIED | 164 lines; 6 tests all passing |
| `tests/integration/registration.test.ts` | Real-prisma integration test for registerAction $transaction atomicity | VERIFIED | 247 lines; covers happy path, rollback on conflict, email mismatch, expired token, used token |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/auth.ts` | `prisma.user.findUnique` | `select { isAdmin: true }` in authorizeUser | WIRED | Line 25: `isAdmin: true` in SELECT block |
| `src/auth.ts` | `session.user.isAdmin` | sessionCallback writes from token.isAdmin | WIRED | Lines 52-56: typed boolean write with defensive fallback |
| `src/types/next-auth.d.ts` | `next-auth` | declare module augmentation | WIRED | Session, User, and JWT interfaces all augmented |
| `src/app/(app)/configuracion/invite-actions.ts` | `node:crypto` | `generateInviteToken()` wraps `randomBytes(32)` | WIRED | invite-utils.ts line 1: `import { randomBytes } from 'node:crypto'`; actions imports generateInviteToken |
| `src/app/(app)/configuracion/invite-actions.ts` | `src/lib/auth-utils.ts` | `requireAuth()` inside `requireAdmin()` | WIRED | Line 7: import; line 23: `const { userId } = await requireAuth()` |
| `src/app/(app)/configuracion/invite-actions.ts` | `prisma.inviteToken` | create / findFirst / findMany / update | WIRED | Lines 54, 70, 99, 107, 126: all four operations used |
| `src/app/(app)/configuracion/page.tsx` | `session.user.isAdmin` | auth() session check before loading invite tokens | WIRED | Line 12: `const isAdmin = session!.user!.isAdmin === true` |
| `src/components/configuracion/InvitacionesSection.tsx` | `invite-actions.ts` | via InvitacionForm (useActionState) + InvitacionesList (revokeInviteToken) | WIRED | InvitacionForm imports createInviteToken; InvitacionesList imports revokeInviteToken |
| `src/app/(auth)/register/page.tsx` | `next/navigation` | notFound() when ?token is missing | WIRED | Line 1: import; line 26: `if (!token) notFound()` |
| `src/app/(auth)/register/page.tsx` | `prisma.inviteToken.findUnique` | lookup by token query param | WIRED | Line 28: `prisma.inviteToken.findUnique({ where: { token } })` |
| `src/actions/auth.ts` | `prisma.$transaction` | atomic create User + mark token used | WIRED | Line 72: `await prisma.$transaction(async (tx) => { ... })` |
| `src/actions/auth.ts` | `@/auth signIn` | signIn('credentials', { redirectTo: '/' }) | WIRED | Lines 116-120: `await signIn('credentials', { email, password, redirectTo: '/' })` |
| `src/actions/auth.ts` | `bcryptjs` | bcrypt.hash(password, 12) | WIRED | Line 69: `const hashedPassword = await bcrypt.hash(parsed.data.password, 12)` |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| `InvitacionesList.tsx` | `tokens: InviteToken[]` | `prisma.inviteToken.findMany` in page.tsx | Yes — real DB query, results passed as prop via ConfiguracionClientWrapper | FLOWING |
| `configuracion/page.tsx` | `inviteTokens` | `prisma.inviteToken.findMany({ where: { createdBy: userId }, ... })` | Yes — conditional on isAdmin, real query | FLOWING |
| `register/page.tsx` | `row` (InviteToken) | `prisma.inviteToken.findUnique({ where: { token } })` | Yes — real DB lookup by token | FLOWING |
| `RegisterForm.tsx` | `email`, `token` | props from page.tsx (from DB row) | Yes — sourced from `row.email` and `row.token` | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| invite-actions unit tests (17 tests) | `npm run test:run -- src/app/(app)/configuracion/invite-actions.test.ts` | 17 passed | PASS |
| auth.ts unit tests including registerAction (19 tests) | `npm run test:run -- src/actions/auth.test.ts` | 19 passed | PASS |
| register page unit tests (6 tests) | `npm run test:run -- 'src/app/(auth)/register/page.test.tsx'` | 6 passed | PASS |
| Next.js build | `npm run build` | 0 errors, /register route appears in output | PASS |
| /register in publicPaths (no auth required) | `grep 'register' src/proxy.ts` | `/register` in `publicPaths` array at line 4 | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| INVITE-02 | 28-01, 28-02 | Admin Server Action to generate invite tokens (crypto.randomBytes(32)) | SATISFIED | `createInviteToken` in invite-actions.ts calls `generateInviteToken()` which wraps `randomBytes(32).toString('hex')`; 7-day expiry; requireAdmin() double-gate; REQUIREMENTS.md checkbox appears stale (unchecked) but implementation is complete |
| INVITE-03 | 28-01, 28-03 | Registration page -- only accessible with valid invite token URL, creates user with isApproved=true | SATISFIED | `/register` page validates token server-side; `registerAction` creates user with `isApproved: true` inside `$transaction`; `isAdmin: false` on creation |
| INVITE-04 | 28-03 | No self-registration -- /register without valid token shows error | SATISFIED | `if (!token) notFound()` in page; invalid/revoked/used/expired tokens render TokenErrorScreen; middleware `publicPaths` allows unauthenticated access but page enforces token requirement |

**Note:** `INVITE-02` is marked `[ ]` (unchecked) in REQUIREMENTS.md but the implementation is complete. The checkbox was not updated after plan execution. This is a documentation tracking issue, not a code gap.

### Anti-Patterns Found

No blocking anti-patterns found in phase 28 files.

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/app/(app)/movimientos/actions.ts` | 86, 141, 173 | `'_error' is defined but never used` | Info (pre-existing) | Pre-dates phase 28; in movimientos, not invite/register code; zero impact on phase 28 goal |

### Human Verification Required

#### 1. Admin Sees Invitaciones Section in /configuracion

**Test:** Log in as the admin user (email matching `ADMIN_EMAIL` / `fmemije00@gmail.com`). Navigate to `/configuracion`. Scroll below the Categorias section.
**Expected:** An "Invitaciones" heading and "Genera un enlace de invitacion" description text appear, along with the email input form and "Generar invitacion" button.
**Why human:** Conditional rendering on `isAdmin` from a real session cannot be confirmed programmatically without spinning up the app.

#### 2. Non-Admin Cannot See Invitaciones Section

**Test:** Log in as any non-admin user. Navigate to `/configuracion`.
**Expected:** Only the Categorias section is visible; no "Invitaciones" heading or invite form appears.
**Why human:** Requires a second real account with `isAdmin=false`.

#### 3. Generate Invite Token -- URL Panel and Copy Button

**Test:** As admin, enter a fresh email in the Invitaciones form and click "Generar invitacion".
**Expected:** A URL panel appears below the form showing `https://...host.../register?token=<64-char-hex>`. Clicking the copy button swaps the icon from Copy to Check for ~1.6 seconds. The recent-invites list gains a new row with "Pendiente" badge.
**Why human:** `navigator.clipboard.writeText` and the icon-swap animation require a real browser environment.

#### 4. Inline Revoke Confirm Pattern

**Test:** With a "Pendiente" token visible in the recent-invites list, click the revoke icon. Confirm the two-button "Revocar? / Si / No" controls appear. Click "Si".
**Expected:** The row's badge changes from "Pendiente" to "Revocada". A success toast appears. After 3 seconds without clicking, the "Si/No" buttons would auto-cancel (test within 3s).
**Why human:** Two-button confirm with auto-cancel timeout and sonner toast require real browser interaction.

#### 5. End-to-End Registration Flow

**Test:** After generating a valid invite token, open the registration URL in an incognito browser window. Complete the form (email is pre-filled and locked, enter name + password matching the rules).
**Expected:** After clicking "Crear cuenta", a redirect to `/` occurs and the new user is logged in with their email visible in the UI.
**Why human:** Full NextAuth signIn + NEXT_REDIRECT flow requires a real browser session; cannot be simulated by curl.

#### 6. "Enlace ya usado" on Re-visit

**Test:** After completing step 5, open the same registration URL again.
**Expected:** The `TokenErrorScreen` renders with heading "Enlace ya usado" and appropriate body copy.
**Why human:** Depends on usedAt being set by the prior registration (real DB state required).

#### 7. 404 on /register Without Token

**Test:** Visit `/register` (no query string) in the browser.
**Expected:** The Next.js 404 page is rendered. No registration form or error screen appears.
**Why human:** Requires a real HTTP request to confirm notFound() produces a proper 404 response.

### Gaps Summary

No programmatically-verifiable gaps found. All 10 must-have truths are verified, all 21 required artifacts exist and are substantive, all 13 key links are wired, and data flows from real DB queries through to rendered components. The 7 human verification items above are the only remaining validation needed -- they require a running application and real browser interaction to confirm the visual behaviors, clipboard API, and end-to-end session lifecycle.

The unchecked `INVITE-02` checkbox in `REQUIREMENTS.md` is a tracking inconsistency: the implementation fully satisfies the requirement. A follow-up task to check that box (or run a requirements reconciliation) would be appropriate but is not a code gap.

---

_Verified: 2026-04-18T18:30:00Z_
_Verifier: Claude (gsd-verifier)_
