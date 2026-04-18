# Phase 26: Auth Wiring + Login - Context

**Gathered:** 2026-04-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Configure Auth.js v5 with Credentials provider (email+password), JWT session strategy, and Prisma adapter. Create proxy.ts to protect all routes except /login and /register. Build a Glyph Finance-styled login page. Write auth tests covering login flow, session callbacks, and proxy redirect behavior.

Requirements: AUTH-02, AUTH-03, AUTH-04, AUTH-05, TEST-02

</domain>

<decisions>
## Implementation Decisions

### Login Page Design
- Full-page minimal layout — form floats on pure OLED black (#000000) background, no card container
- No app shell — login page has its own layout, no sidebar or mobile nav visible
- Branding: "Centik" in Satoshi bold (chartreuse #CCFF00) with a short tagline below in text-secondary (#999999)
- Form inputs: reuse existing FloatingInput component (underline-style with animated floating labels)
- Login button: chartreuse pill button, full-width within form area

### Error & Feedback UX
- Generic inline error: "Credenciales inválidas" below the form — no distinction between wrong email vs wrong password (security-first)
- All user-facing messages in Spanish (es-MX) — consistent with app locale
- Loading state: button shows spinner icon + text "Iniciando sesión...", button disabled during auth
- Password field has eye/eye-off toggle (Lucide icons) for visibility

### Session Lifecycle
- JWT expiration: 30 days — maximum convenience for single-user personal app
- Post-login redirect: callbackUrl — redirect to the page user was trying to visit before auth redirect
- Session token data: userId only — minimal token, email fetched from DB when needed
- Logout button visible in sidebar — allows manual sign-out, needed for testing multi-user in later phases

### Auth Test Scope
- Both layers: unit tests mock Auth.js internals (fast feedback) + one integration test with real Auth.js (catches config bugs)
- Core + edge cases (~12-15 test cases): login success, login failure (wrong password), empty fields, non-existent email, unapproved user blocked, password hash verification, session callback includes userId, proxy.ts redirects unauthenticated
- Proxy.ts tested both ways: mocked request/response (unit) + E2E with Playwright (real browser redirect)

### Carried Forward (from prior phases)
- JWT session strategy, not database sessions — for proxy.ts compatibility (v3.0 roadmap decision)
- bcrypt cost factor 12 for password hashing (Phase 25 decision)
- CVE-2025-29927 mitigation — proxy.ts alone is NOT sufficient, requireAuth() mandatory in Server Actions (deferred to Phase 27)
- User model already exists with hashedPassword, isApproved, totpEnabled fields (Phase 25)

### Claude's Discretion
- Auth.js configuration details (adapter setup, callback implementation)
- Exact proxy.ts route matching logic
- Loading skeleton or transition animation on redirect
- Logout confirmation (if any) vs immediate sign-out
- Test file organization and mock strategies

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- FloatingInput component (`src/components/ui/FloatingInput.tsx`): underline-style inputs with animated floating labels — use for email and password fields
- Sonner toast setup in root layout: available for success notifications but not used for auth errors (inline instead)
- Glyph Finance design tokens in `globals.css`: full @theme palette available
- Lucide icons: eye, eye-off for password toggle; log-out for sidebar logout button

### Established Patterns
- All pages use Server Components by default; client interactivity via "use client"
- Root layout (`src/app/layout.tsx`) renders sidebar + mobile nav — login page needs its own layout to bypass this
- `getDefaultUserId()` in `src/lib/auth-utils.ts` — temporary helper that will be replaced by requireAuth() in Phase 27
- IBM Plex Mono for financial numbers, Satoshi for body/headings

### Integration Points
- `src/app/layout.tsx` — login/register pages need a separate layout (no sidebar)
- `src/lib/auth-utils.ts` — auth config and helpers will live here or adjacent
- Prisma schema — User, Account, Session, VerificationToken models already exist
- Sidebar component — needs logout button added at bottom
- bcryptjs already installed as dependency

</code_context>

<specifics>
## Specific Ideas

- Login page should feel ultra-minimal — just the essentials floating on black, Nothing OS-inspired
- Tagline in Spanish, something like "Tus finanzas, simplificadas" or similar — Claude can pick the exact text

</specifics>

<deferred>
## Deferred Ideas

- TOTP 2FA challenge step on login — Phase 29
- Rate limiting on login attempts — Phase 29 (TOTP-05)
- requireAuth() helper replacing getDefaultUserId() — Phase 27
- Registration page — Phase 28
- Password reset — Out of scope (admin resets via DB/seed)

</deferred>

---

*Phase: 26-auth-wiring-login*
*Context gathered: 2026-04-17*
