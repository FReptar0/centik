# Phase 28: Invite-Only Registration - Context

**Gathered:** 2026-04-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Admin generates invite tokens via UI-backed Server Action. Tokens produce unique URLs. Users register only via a valid, unused, non-expired invite token URL. Email is strictly bound to the token. Users hitting /register without a valid token see a 404.

Requirements: INVITE-02, INVITE-03, INVITE-04

</domain>

<decisions>
## Implementation Decisions

### Admin Token Generation UX
- **D-01:** Admin UX lives in existing `/configuracion` page as a new "Invitaciones" section (no new route)
- **D-02:** Admin role is determined by an `isAdmin: Boolean` field added to the User model (schema migration required)
- **D-03:** Seed script marks the initial admin user (ADMIN_EMAIL) with `isAdmin: true`
- **D-04:** After generating a token, admin sees:
  - The full registration URL with a copy button (Lucide `copy` icon)
  - A table/list of recent invite tokens showing: email, expiration, status (pending/used/expired), actions
- **D-05:** Unused tokens have a "Revocar" button — marks the token as unusable (implementation: set `usedAt` to current time with a sentinel marker OR delete; Claude decides)
- **D-06:** The "Invitaciones" section is only rendered when `session.user.isAdmin === true` — non-admin users see their normal configuracion page without it

### Token URL + Expiration
- **D-07:** URL format: `/register?token=<hex>` — query parameter, single `/register` route handles all cases
- **D-08:** Token value: 32-byte random hex (from `crypto.randomBytes(32).toString('hex')`) — per INVITE-02
- **D-09:** Expiration: 7 days from creation time
- **D-10:** Email is strictly bound to the token — admin enters invitee email when creating, that email is the ONLY email that can register with this token
- **D-11:** Email field on registration form is pre-filled from the token AND read-only (locked)

### Registration Form Design
- **D-12:** Visual design matches login page conventions (OLED black, "Centik" branding, FloatingInput, chartreuse pill button, eye toggle on password fields) — Claude decides the exact subtitle/heading treatment to differentiate from login
- **D-13:** Form fields (in order): email (locked, pre-filled from token) → name → password → confirm password
- **D-14:** Password rules: minimum 8 characters AND at least 1 digit (enforced via Zod in validators.ts)
- **D-15:** Confirm password field must exactly match password
- **D-16:** Both password fields have eye/eye-off toggle (Lucide icons) for visibility — consistent with login

### Post-Registration Flow
- **D-17:** On successful registration: create User with `isApproved: true` (and `isAdmin: false`), mark `InviteToken.usedAt` to NOW, auto-login via Auth.js `signIn('credentials')`, redirect to `/` (dashboard)
- **D-18:** Token errors use differentiated Spanish messages:
  - "Enlace inválido" — token doesn't exist
  - "Enlace expirado" — token exists but `expiresAt < now()`
  - "Enlace ya usado" — token has `usedAt` set
- **D-19:** `/register` with no token parameter → Next.js 404 page (not redirect, not error banner)
- **D-20:** Registration form validation uses Zod on the server; errors display inline in Spanish, consistent with login error UX

### Claude's Discretion
- Exact visual treatment of the Invitaciones section in /configuracion (card, inline, etc.)
- How the "Revocar" action technically marks a token unusable (set usedAt vs dedicated revokedAt vs delete — Claude picks)
- Error UI for the registration page (inline vs toast; probably inline to match login)
- Exact copy for "Crear cuenta"-style headings if used
- Table layout for recent tokens list (compact vs detailed)
- Loading state design during registration submission (likely spinner + "Creando cuenta..." like login's "Iniciando sesión...")

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Specs
- `.planning/REQUIREMENTS.md` — INVITE-02, INVITE-03, INVITE-04 (the 3 requirements this phase delivers)
- `.planning/ROADMAP.md` §Phase 28 — goal and success criteria

### Prior Phase Decisions (carry-forward)
- `.planning/phases/25-schema-migration/25-CONTEXT.md` — User and InviteToken model fields, bcrypt cost factor 12, isApproved semantics
- `.planning/phases/26-auth-wiring-login/26-CONTEXT.md` — Auth.js config, login page design pattern, (auth) route group, Spanish error UX, FloatingInput usage, JWT session data
- `.planning/phases/27-per-user-data-isolation/27-CONTEXT.md` — requireAuth() helper pattern, auth() usage in pages, connection() placement

### Codebase
- `src/auth.ts` — Auth.js v5 config (needed for signIn() auto-login)
- `src/lib/auth-utils.ts` — requireAuth() (used in admin server actions)
- `src/lib/validators.ts` — existing Zod schemas; register/invite schemas added here
- `prisma/schema.prisma` — User model (adds isAdmin), InviteToken model (already exists)
- `src/components/ui/FloatingInput.tsx` — reused for form fields
- `src/components/auth/LoginForm.tsx` — pattern reference for RegisterForm
- `src/app/(auth)/login/page.tsx` — pattern reference for /register page
- `src/app/(app)/configuracion/page.tsx` — where Invitaciones section lives

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `FloatingInput`: Already supports `email`, `password`, `text` types — used directly in registration form
- `LoginForm` component: Pattern reference for RegisterForm (useActionState + server action + loading state)
- `requireAuth()`: Used in admin server actions (generate/revoke invite tokens)
- `auth()` + `session.user.id`: Used in /configuracion page to check admin status
- `bcryptjs`: Already installed (Phase 25) — hash new user's password
- `signIn('credentials')` from Auth.js: Used to auto-login after registration
- `(auth)` route group layout: Minimal centered OLED black layout — wraps /register just like /login
- Sonner toast setup: Available but registration errors should be inline (consistent with login)

### Established Patterns
- Server Actions: Return `{ success: true } | { error: Record<string, string[]> }` shape (see `src/app/(app)/ingresos/actions.ts`)
- requireAuth() placement: BEFORE try/catch (CVE-2025-29927 mitigation)
- Zod validation: Runs server-side in every action before DB operations
- IDOR protection: New admin actions use `findFirst({ where: { id, userId } })` pattern for user-scoped queries (not relevant for InviteToken writes, but relevant for User queries)
- Spanish user-facing text consistent with app locale

### Integration Points
- `prisma/schema.prisma`: Add `isAdmin Boolean @default(false)` to User model → migration
- `prisma/seed.ts`: Mark initial admin user with `isAdmin: true`
- `src/app/(auth)/register/page.tsx`: New Server Component — reads `token` from searchParams, validates, renders form or error
- `src/components/auth/RegisterForm.tsx`: New client component (analogous to LoginForm)
- `src/actions/auth.ts`: Add `registerAction` (creates User + marks token used + signIn)
- `src/app/(app)/configuracion/actions.ts` OR new `src/app/(app)/configuracion/invite-actions.ts`: Admin actions `createInviteToken(email)`, `revokeInviteToken(tokenId)`, `listInviteTokens()`
- `src/app/(app)/configuracion/ConfiguracionClientWrapper.tsx`: Renders Invitaciones section when session.user.isAdmin
- `src/lib/validators.ts`: Add `registerSchema` (email, name, password, confirmPassword matching, password min 8 + 1 digit) and `createInviteSchema` (email)
- Seed admin user: `ADMIN_EMAIL` env var user gets `isAdmin: true`

</code_context>

<specifics>
## Specific Ideas

- Consistency with login page is a priority — user expects the registration experience to feel like a natural extension of the login page (same typography, same form patterns, same Spanish error style)
- Admin experience should be frictionless: paste email, click "Generar invitación", copy URL, send via whatever channel (Discord, iMessage, etc.) — this is v3.0 for a single known admin

</specifics>

<deferred>
## Deferred Ideas

- Multi-admin management (promote/demote admins via UI) — out of scope for v3.0
- Email delivery of invite links (SMTP/Resend/etc.) — out of scope for MVP, admin sends URL manually
- Audit log of token creation/revocation events — nice-to-have, not in v3.0
- Rate limiting on invite creation — single-admin trust model, defer
- Invite link analytics (how many times clicked) — out of scope
- Password reset flow via email — explicitly out of scope per PROJECT.md (admin resets via DB/seed)
- Resending an invite (regenerate token for same email) — can be approximated by revoking + creating new; no dedicated UX this phase

</deferred>

---

*Phase: 28-invite-only-registration*
*Context gathered: 2026-04-18*
