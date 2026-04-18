# Phase 28: Invite-Only Registration - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-18
**Phase:** 28-invite-only-registration
**Areas discussed:** Admin token generation UX, Token URL + expiration, Registration form design, Post-registration flow

---

## Admin Token Generation UX

### Location of admin UI

| Option | Description | Selected |
|--------|-------------|----------|
| Section in /configuracion page | Add 'Invitaciones' section to existing settings. Only visible for admin. | ✓ |
| New /admin route | Dedicated admin area with own nav. Overkill for single-admin. | |
| CLI/seed script only | npm run invite -- <email>, no UI at all. | |
| Server Action only (no UI) | Action exists but no UI surface. | |

**User's choice:** Section in /configuracion page
**Notes:** Leverages existing auth + layout; fits single-admin v3.0 scope

### Admin role determination

| Option | Description | Selected |
|--------|-------------|----------|
| Admin role via ADMIN_EMAIL env var | Check session.user.email matches env var. Simple, no schema change. | |
| First approved user is admin | Earliest createdAt + isApproved. No env var, DB query required. | |
| Add isAdmin boolean to User model | Schema migration. Most flexible for future multi-admin. | ✓ |

**User's choice:** Add isAdmin boolean to User model
**Notes:** Requires migration but is most explicit and future-proof

### Token display after generation

| Option | Description | Selected |
|--------|-------------|----------|
| Full URL + copy button | Show URL with copy icon. Admin shares manually. | |
| URL + list of recent tokens | URL + table of recent invites (email, expires, used). | ✓ |
| You decide | Claude picks cleanest pattern | |

**User's choice:** URL + list of recent tokens
**Notes:** Gives admin visibility into history

### Revoke unused tokens

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, revoke button on each row | Unused tokens have 'Revocar' button (set usedAt to sentinel or delete). | ✓ |
| No revoke in this phase | Tokens just expire. Generate new if wrong URL sent. | |

**User's choice:** Yes, revoke button on each row

---

## Token URL + Expiration

### URL format

| Option | Description | Selected |
|--------|-------------|----------|
| /register?token=xxx | Query parameter. Simpler routing. | ✓ |
| /register/xxx | Path parameter. Route group /register/[token]. | |

**User's choice:** /register?token=xxx
**Notes:** Single route handles both no-token and with-token cases

### Expiration period

| Option | Description | Selected |
|--------|-------------|----------|
| 7 days | One week. Reasonable default. | ✓ |
| 30 days | One month. More forgiving. | |
| Configurable per-token | Admin picks (7/30/never). Maximum flexibility. | |

**User's choice:** 7 days

### Email binding

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, strict match | InviteToken.email is only email that can register. Pre-fill + lock. More secure. | ✓ |
| Loose — suggestion only | Pre-fill but allow override. | |
| No email on token | InviteToken.email unused. Magic URL for anyone. | |

**User's choice:** Yes, strict match
**Notes:** Prevents token forwarding to unintended recipients

---

## Registration Form Design

### Form fields

| Option | Description | Selected |
|--------|-------------|----------|
| Email (locked) + password + confirm | Email pre-filled + read-only. Two password fields. Name nullable. | |
| Email (locked) + password only | Single password field. Toggle already on password. | |
| Email + name + password + confirm | Collect name for display. Adds a field. | ✓ |

**User's choice:** Email + name + password + confirm
**Notes:** Name enables personalized display in sidebar/profile

### Password strength

| Option | Description | Selected |
|--------|-------------|----------|
| Minimum 12 characters | Length-only (NIST 2024). | |
| Minimum 8 chars + at least 1 number | Slightly stricter, familiar rules. | ✓ |
| Minimum 12 chars + zxcvbn strength meter | Length + strength meter. +400KB. | |
| You decide | Claude picks based on NIST 2024 | |

**User's choice:** Minimum 8 chars + at least 1 number

### Visual design

| Option | Description | Selected |
|--------|-------------|----------|
| Match login page exactly | Full-page minimal OLED, Centik branding, FloatingInput, pill button. | |
| Match login + 'Crear cuenta' subtitle | Same layout + 'Crear cuenta' heading to differentiate. | |
| You decide | Claude picks based on login consistency | ✓ |

**User's choice:** You decide

---

## Post-Registration Flow

### After successful registration

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-login + redirect to / | Create user (isApproved=true), mark token used, signIn(), redirect to dashboard. | ✓ |
| Redirect to /login with success message | Create user, mark token used, redirect to /login?registered=1. | |
| You decide | Claude picks | |

**User's choice:** Auto-login + redirect to /
**Notes:** Zero-friction onboarding

### Token error display

| Option | Description | Selected |
|--------|-------------|----------|
| Differentiated messages in Spanish | 'Enlace inválido' / 'Enlace expirado' / 'Enlace ya usado'. | ✓ |
| Generic 'Enlace inválido o expirado' | Single message for all failures. | |

**User's choice:** Differentiated messages in Spanish
**Notes:** Better UX for invitees — tells them to ask admin for new link

### /register without token

| Option | Description | Selected |
|--------|-------------|----------|
| Error page: 'Necesitas invitación' | Friendly error explaining invite-only. | |
| Redirect to /login | Silent bounce. Cleaner but less informative. | |
| 404 | Not-found. Most secretive — hides registration exists. | ✓ |

**User's choice:** 404

---

## Claude's Discretion

- Exact visual treatment of Invitaciones section in /configuracion
- Technical implementation of revoke (set usedAt vs revokedAt vs delete)
- Registration page heading/subtitle copy
- Table layout for recent tokens list
- Loading state design for registration submission

## Deferred Ideas

- Multi-admin management UI
- Email delivery of invite links (SMTP/Resend)
- Audit log of token events
- Rate limiting on invite creation
- Invite link click analytics
- Password reset flow (out of scope per PROJECT.md)
- Resending an invite (approximated by revoke + new)
