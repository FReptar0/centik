# Phase 27: Per-User Data Isolation - Context

**Gathered:** 2026-04-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace the temporary getDefaultUserId() helper with real session-based auth. Every Server Action calls requireAuth() before any DB operation. Every page Server Component calls auth() and passes userId to data-fetching functions. Add noStore() to prevent cross-user cache leakage. Verify isolation with a basic cross-user test.

Requirements: ISOL-01, ISOL-02, ISOL-03, ISOL-04, DEPLOY-05

</domain>

<decisions>
## Implementation Decisions

### requireAuth() Helper (ISOL-01)
- Returns `{ userId }` only — minimal shape, email fetched from DB when needed
- Lives in `src/lib/auth-utils.ts` — replaces getDefaultUserId() in the same file
- On no session: redirects to `/login?callbackUrl=<current-path>` (matches proxy.ts behavior from Phase 26)
- Used in Server Actions only — pages use auth() directly from src/auth.ts

### Page Auth Pattern (ISOL-04)
- Pages call `auth()` directly from src/auth.ts, extract `session.user.id` as userId
- Pages do NOT use requireAuth() — proxy.ts already handles page-level redirects for unauthenticated users
- requireAuth() is defense-in-depth for Server Actions specifically (CVE-2025-29927 mitigation)

### noStore() Placement (DEPLOY-05)
- Both pages and Server Actions call noStore() — belt and suspenders
- Claude decides whether to place at layout level or per-page (whichever is cleanest for Next.js 16)

### Migration Strategy
- All at once in one clean break — replace all 13 getDefaultUserId() callsites, then delete the helper
- No incremental approach — lib functions already accept userId (Phase 25), this is just changing the source of userId

### Test Updates
- Mock requireAuth() to return `{ userId: 'test-user-id' }` — matches existing getDefaultUserId() mock pattern
- All 6 action test files update their auth-utils mock from getDefaultUserId to requireAuth
- Add one basic cross-user isolation integration test: create User A data, authenticate as User B, assert B sees zero of A's records

### Carried Forward (from prior phases)
- CVE-2025-29927: requireAuth() in every Server Action is non-negotiable (v3.0 roadmap)
- JWT session exposes userId only (Phase 26)
- auth() exported from src/auth.ts (Phase 26)
- All lib functions already accept userId parameter (Phase 25)
- userId required (NOT NULL) on all 10 data models (Phase 25)

### Claude's Discretion
- noStore() import path (next/cache or unstable_noStore — depends on Next.js 16 API)
- Whether to add a requireAuth.test.ts or test it via existing action tests
- Exact cross-user test structure (which entities to test, how to create test users)
- Order of file updates within the "all at once" migration

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/auth-utils.ts`: Currently has getDefaultUserId() — will be replaced with requireAuth()
- `src/auth.ts`: Exports auth(), signIn, signOut, handlers — pages will import auth() directly
- All action test files already mock `@/lib/auth-utils` with `getDefaultUserId: vi.fn().mockResolvedValue('test-user-id')` — pattern transfers directly to requireAuth mock

### Established Patterns
- 6 Server Action files: deudas, presupuesto, historial, ingresos, configuracion, movimientos
- 7 page Server Components: dashboard (page.tsx), deudas, historial, ingresos, movimientos, presupuesto, configuracion
- All lib functions (budget.ts, dashboard.ts, debt.ts, history.ts, income.ts, period.ts) already accept userId parameter
- Action files call `getDefaultUserId()` then pass userId to lib functions — requireAuth() is a drop-in replacement

### Integration Points
- `src/lib/auth-utils.ts` — requireAuth() replaces getDefaultUserId()
- All 6 `actions.ts` files — update import and call
- All 7 `page.tsx` files — switch from getDefaultUserId() to auth()
- All 6 `actions.test.ts` files — update mock from getDefaultUserId to requireAuth
- `tests/integration/` — add cross-user isolation test

</code_context>

<specifics>
## Specific Ideas

No specific requirements — this is a mechanical refactoring guided by the requirements. The key constraint is that getDefaultUserId() is completely removed, not left as a fallback.

</specifics>

<deferred>
## Deferred Ideas

- Cross-user integration test suite (ISOL-05, comprehensive) — Phase 30
- requireAuth() rate limiting — Phase 29 (TOTP-05)
- Admin panel for user management — Out of scope

</deferred>

---

*Phase: 27-per-user-data-isolation*
*Context gathered: 2026-04-18*
