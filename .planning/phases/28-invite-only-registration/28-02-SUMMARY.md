---
phase: 28-invite-only-registration
plan: 02
subsystem: auth
tags: [server-actions, invite, admin, prisma, zod, useActionState, clipboard, react19]

# Dependency graph
requires:
  - phase: 28-invite-only-registration (Plan 01)
    provides: "User.isAdmin + InviteToken.revokedAt schema, session.user.isAdmin typed + populated, createInviteSchema Zod validator"
provides:
  - "Three admin Server Actions: createInviteToken, revokeInviteToken, listInviteTokens (requireAdmin() double-gate)"
  - "Pure helpers: generateInviteToken (randomBytes(32) hex), computeInviteStatus, buildInviteUrl, formatInviteDate, INVITE_TTL_MS"
  - "Admin-only Invitaciones section in /configuracion with form + generated-URL panel + recent-tokens list + inline revoke"
  - "InviteToken type re-exported from src/types"
affects: [28-03, admin-ui-patterns, clipboard-pattern, inline-revoke-pattern]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - requireAdmin-double-gate
    - zod-cuid-before-session-lookup
    - idor-scope-via-createdBy-findFirst
    - key-based-status-derivation
    - effect-side-effects-no-setState-react19

key-files:
  created:
    - src/lib/invite-utils.ts
    - src/app/(app)/configuracion/invite-actions.ts
    - src/app/(app)/configuracion/invite-actions.test.ts
    - tests/integration/invite-tokens.test.ts
    - src/components/configuracion/InvitacionesSection.tsx
    - src/components/configuracion/InvitacionForm.tsx
    - src/components/configuracion/GeneratedUrlPanel.tsx
    - src/components/configuracion/InvitacionesList.tsx
  modified:
    - src/app/(app)/configuracion/page.tsx
    - src/app/(app)/configuracion/ConfiguracionClientWrapper.tsx
    - src/types/index.ts

key-decisions:
  - "requireAdmin() performs a fresh DB lookup on every call (not just trusting session.user.isAdmin) -- defense-in-depth against stale JWTs where isAdmin was flipped off after issuance"
  - "z.string().cuid() validation on revokeInviteToken runs BEFORE requireAdmin() -- rejects invalid IDs without touching the DB, and the unit test asserts user.findUnique was not called"
  - "IDOR scope uses findFirst with createdBy filter (not findUnique + post-check) -- forward-compatible with multi-admin and closes the 'admin B can revoke admin A's tokens' gap before it appears"
  - "Origin derived server-side via next/headers in page.tsx and passed as prop -- avoids window.location.origin in client components which would break SSR"
  - "InvitacionForm does NOT clear the email input on success -- calling setState inside useEffect violates React 19's react-hooks/set-state-in-effect rule; toast + URL panel provide ample success confirmation, and typing overwrites the field"

patterns-established:
  - "requireAdmin() helper: requireAuth() -> prisma.user.findUnique({isAdmin:true}) -> return {userId} or null. Returning null (not throwing redirect) so callers can return typed ActionResult"
  - "CreateInviteResult union type: { success: true; token: string } | { error: ... } returns raw token so UI can render it ONCE (per D-04). After revalidation the list query does not leak the token value"
  - "Client form pattern for single-result Server Actions: useActionState with a ref-based lastHandledStateRef guard to fire side effects exactly once per state transition"
  - "List-row inline revoke: copy CategoryRow geometry + 3s auto-cancel timer, swap strings and success/error toasts, gate on status==='pending'"

requirements-completed: [INVITE-02]

# Metrics
duration: 10min
completed: 2026-04-18
---

# Phase 28 Plan 02: Admin Invite Generation Summary

**Admin-facing /configuracion gains an Invitaciones section with three Server Actions (createInviteToken, revokeInviteToken, listInviteTokens) and four composed client components (section shell, form, copy-URL panel, revoke-capable recent-tokens list) gated by a DB-backed requireAdmin() double-check.**

## Performance

- **Duration:** 10 min
- **Started:** 2026-04-18T17:06:04Z
- **Completed:** 2026-04-18T17:16:06Z
- **Tasks:** 2
- **Files created/modified:** 11

## Accomplishments
- Pure helpers module `src/lib/invite-utils.ts`: `generateInviteToken()` via `crypto.randomBytes(32).toString('hex')`, `INVITE_TTL_MS = 7*24*60*60*1000`, `computeInviteStatus()` (revoked > used > expired > pending), `buildInviteUrl()`, `formatInviteDate()` (es-MX, 'date' | 'datetime' variants)
- Three Server Actions in `src/app/(app)/configuracion/invite-actions.ts`: `createInviteToken` (FormData -> { success: true; token } | { error }), `revokeInviteToken` (cuid-validated, IDOR-scoped), `listInviteTokens` (20 most recent for calling admin). All three gated by a `requireAdmin()` helper that chains `requireAuth()` + a fresh `prisma.user.findUnique({ isAdmin: true })` lookup
- 17 unit tests covering admin gating, token shape/expiry, duplicate rejection paths, Zod field errors, IDOR rejection on revoke, already-used / already-revoked refusals, and revalidatePath calls
- 3 integration tests hitting the real test DB: 64-char hex persistence with 7d expiry, duplicate-active rejection, and revoke round-trip setting `revokedAt`
- Page `/configuracion`: loads InviteTokens only for admins, derives origin server-side via `next/headers`, passes to wrapper
- Wrapper conditionally renders `<InvitacionesSection>` only when `isAdmin`
- Four new client components composed per D-04: `InvitacionesSection` (shell), `InvitacionForm` (useActionState + FloatingInput + chartreuse pill button), `GeneratedUrlPanel` (navigator.clipboard + Copy<->Check 1600ms swap + sonner fallback toast), `InvitacionesList` (status-badge list with pending/used/expired/revoked and inline Revocar? Si/No 3s-auto-cancel confirm mirroring CategoryRow)
- `InviteToken` type re-exported from `src/types/index.ts`

## Task Commits

Each task was committed atomically:

1. **Task 1: Pure helpers + Server Actions + unit tests + integration test** - `6dc73a2` (feat)
2. **Task 2: Wire Invitaciones UI into /configuracion (admin-only) with all four client components** - `9e37014` (feat)

## Files Created/Modified
- `src/lib/invite-utils.ts` - Pure helpers: generateInviteToken, computeInviteStatus, buildInviteUrl, formatInviteDate, INVITE_TTL_MS (created)
- `src/app/(app)/configuracion/invite-actions.ts` - createInviteToken, revokeInviteToken, listInviteTokens Server Actions + requireAdmin helper (created)
- `src/app/(app)/configuracion/invite-actions.test.ts` - 17 unit tests (created)
- `tests/integration/invite-tokens.test.ts` - 3 integration tests hitting real Postgres (created)
- `src/app/(app)/configuracion/page.tsx` - Added isAdmin branch, conditional inviteTokens load, origin derivation via next/headers (modified)
- `src/app/(app)/configuracion/ConfiguracionClientWrapper.tsx` - Extended props; conditionally renders Invitaciones section when isAdmin (modified)
- `src/types/index.ts` - Re-export InviteToken from Prisma client (modified)
- `src/components/configuracion/InvitacionesSection.tsx` - Shell composing form + URL panel + list (created)
- `src/components/configuracion/InvitacionForm.tsx` - useActionState form with FloatingInput + pill button + toast side-effects (created)
- `src/components/configuracion/GeneratedUrlPanel.tsx` - Copy button with 1600ms Check swap (created)
- `src/components/configuracion/InvitacionesList.tsx` - Status-badge list + inline two-button revoke confirm (created)

## Decisions Made
- `requireAdmin()` always does a fresh DB lookup (not trusting `session.user.isAdmin` alone) -- defense-in-depth against stale JWTs where an admin's flag was revoked after issuance
- `z.string().cuid()` validation in `revokeInviteToken` runs BEFORE `requireAdmin()` so invalid-shape token IDs never touch the session or DB -- the unit test explicitly asserts `user.findUnique` was NOT called
- IDOR scope uses `findFirst({ where: { id, createdBy: admin.userId }})` instead of `findUnique + post-check` -- forward-compatible with multi-admin scenarios
- `origin` derived server-side via `next/headers` in page.tsx and passed as a prop -- avoids `window.location.origin` in a client component (SSR mismatch risk) per UI-SPEC guidance
- `InvitacionForm` does NOT clear the email input after success. React 19's `react-hooks/set-state-in-effect` rule forbids calling `setState` inside `useEffect`. The sonner success toast + the freshly-rendered `GeneratedUrlPanel` provide ample confirmation, and any follow-up invite overwrites the field by typing.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] InvitacionForm initial implementation called setEmail('') inside useEffect -- triggered eslint react-hooks/set-state-in-effect error**
- **Found during:** Task 2 (npm run lint)
- **Issue:** First implementation cleared the email input via `setEmail('')` inside the success branch of a `useEffect`. ESLint rule `react-hooks/set-state-in-effect` (React 19 compiler rule) flagged this as an error, not a warning -- `pnpm lint` exited 1 and blocked the commit.
- **Fix:** Removed the `setEmail('')` call entirely. The sonner success toast and the freshly-rendered GeneratedUrlPanel provide ample confirmation of success, and any follow-up invite overwrites the field by typing. A `lastHandledStateRef` (useRef, not useState) still guards against the effect firing side-effects more than once per state transition -- that pattern is side-effect synchronization, not setState, so it satisfies the rule.
- **Files modified:** src/components/configuracion/InvitacionForm.tsx
- **Verification:** `npm run lint` exits 0; `npm run build` passes; `npm run test:run` and `npm run test:integration` still green.
- **Committed in:** 9e37014 (Task 2 commit -- rolled into the same UI commit since the form is the task's deliverable)

---

**Total deviations:** 1 auto-fixed (1 Rule 1 - Bug)
**Impact on plan:** Zero scope creep. The deviation removed a minor UX behavior (auto-clear input) rather than adding any; it keeps the form strictly compliant with React 19's concurrent-render rules while preserving the intended success feedback (toast + URL panel).

## Issues Encountered
- A leftover `next build` process from an earlier invocation held the `.next/lock` file, causing the first `npm run build` to bail with "Another next build process is already running". Killed the stale PID and removed the stale lock file; build succeeded on retry. This did not affect any code -- strictly an environmental issue from a prior session.
- Pre-existing lint warnings in `src/app/(app)/movimientos/actions.ts` (3x `'_error' is defined but never used`) remain OUT OF SCOPE per SCOPE BOUNDARY rule. Same three warnings noted in 28-01-SUMMARY.md. Not introduced by this plan; file was not modified.

## User Setup Required
None -- no external services, no env vars, no manual configuration. Admin user already seeded in Plan 28-01.

## Next Phase Readiness
- **Plan 28-03 (registration flow):** can consume the tokens created by this plan. The `/register` page and `registerAction` already exist (committed as `baa10e7` + `d7b2fca`) and are wired to mark `usedAt` after successful account creation, which this plan's `computeInviteStatus` renders as the "Usada" badge automatically.
- Admins can now generate invite URLs via UI and share them out-of-band. Invitees visiting `/register?token=...` will see the existing TokenErrorScreen for invalid/expired/used tokens and the existing RegisterForm for valid ones.
- The copy button UX is covered; clipboard-API failure gracefully falls back to a sonner error toast.

## Overall Verification Results
- `npm run build` -- zero errors, zero warnings (Turbopack compile + TypeScript + 12 static/dynamic pages OK, including /configuracion and /register)
- `npm run lint` -- zero errors (3 warnings in unrelated `movimientos/actions.ts`, pre-existing, out of scope)
- `npm run test:run -- src/app/(app)/configuracion/invite-actions.test.ts` -- 17/17 pass
- `npm run test:integration -- tests/integration/invite-tokens.test.ts` -- 3/3 pass
- All Task 1 + Task 2 acceptance-criteria greps green (generateInviteToken, randomBytes(32), INVITE_TTL_MS constant, three Server Action exports, requireAdmin in 4 places, createdBy IDOR scope, cuid zod, all four new component files, navigator.clipboard.writeText, Copy + Check icons, STATUS_DISPLAY, computeInviteStatus, revokeInviteToken imported in list, "Revocar?" copy, useActionState, Loader2, "Generar invitacion" copy, InviteToken type export)

## Self-Check: PASSED

- [x] src/lib/invite-utils.ts contains `export function generateInviteToken` using `randomBytes(32).toString('hex')`
- [x] src/lib/invite-utils.ts contains `INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000`
- [x] src/app/(app)/configuracion/invite-actions.ts contains `export async function createInviteToken`, `revokeInviteToken`, `listInviteTokens`
- [x] src/app/(app)/configuracion/invite-actions.ts contains `requireAdmin` (def + 3 call sites = 4 occurrences)
- [x] src/app/(app)/configuracion/invite-actions.ts contains `createdBy: admin.userId` (IDOR scope on both create and revoke)
- [x] src/app/(app)/configuracion/invite-actions.ts contains `z.string().cuid()` (revoke tokenId validation)
- [x] src/app/(app)/configuracion/invite-actions.ts contains `ID de invitacion invalido` error message
- [x] src/app/(app)/configuracion/page.tsx contains `session!.user!.isAdmin` and `prisma.inviteToken.findMany` and `headers()`
- [x] src/app/(app)/configuracion/ConfiguracionClientWrapper.tsx contains `InvitacionesSection` import and `isAdmin &&` conditional
- [x] src/components/configuracion/InvitacionesSection.tsx exists
- [x] src/components/configuracion/InvitacionForm.tsx exists and contains `useActionState`, `Loader2`, `Generar invitacion`
- [x] src/components/configuracion/GeneratedUrlPanel.tsx exists and contains `navigator.clipboard.writeText`, `Copy`, `Check`
- [x] src/components/configuracion/InvitacionesList.tsx exists and contains `STATUS_DISPLAY`, `computeInviteStatus`, `revokeInviteToken`, `Revocar?`
- [x] src/types/index.ts contains `export type { InviteToken }`
- [x] Commit 6dc73a2 exists in git log (Task 1)
- [x] Commit 9e37014 exists in git log (Task 2)
- [x] `npm run build` exits 0 with zero warnings on this plan's files
- [x] `npm run lint` exits 0 (3 pre-existing warnings in unrelated movimientos/actions.ts out of scope)
- [x] `npm run test:run -- src/app/(app)/configuracion/invite-actions.test.ts` passes 17/17
- [x] `npm run test:integration -- tests/integration/invite-tokens.test.ts` passes 3/3

---
*Phase: 28-invite-only-registration*
*Completed: 2026-04-18*
