---
phase: 28
slug: invite-only-registration
status: draft
shadcn_initialized: false
preset: none
created: 2026-04-18
---

# Phase 28 — UI Design Contract

> Visual and interaction contract for the invite-only registration phase. Covers the public `/register` page and the admin "Invitaciones" section inside `/configuracion`. Pre-populated from `28-CONTEXT.md`; tokens match the existing Glyph Finance system defined in `src/app/globals.css`.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none (manual Tailwind v4 + CSS tokens via `@theme`) |
| Preset | not applicable |
| Component library | none (in-house primitives: `FloatingInput`, `Modal`, `PageHeader`, `DynamicIcon`) |
| Icon library | `lucide-react` (icons used this phase: `Copy`, `Check`, `X`, `Trash2`, `Loader2`, `Eye`, `EyeOff`, `Mail`, `Ticket`, `Plus`) |
| Font | `Satoshi` (sans, via `next/font/local` → `--font-sans`) for body + UI text; `IBM Plex Mono` (`--font-mono`) for the token, registration URL, and token expiration timestamps only |

**Reuse mandate:** `FloatingInput` for every form field. `PageHeader` for `/configuracion`. No new primitives are introduced this phase.

---

## Spacing Scale

All values are multiples of 4 and draw from the Tailwind default scale already used across the app.

| Token | Value | Usage in this phase |
|-------|-------|---------------------|
| xs | 4px (`gap-1`) | Inline icon + label gaps in pill buttons and copy button feedback |
| sm | 8px (`gap-2`, `p-2`) | Icon button padding, badge internal padding, confirm/cancel button gaps |
| md | 16px (`p-4`, `space-y-4`) | Invite row internal padding, divider spacing between tokens in list |
| lg | 24px (`p-5`, `space-y-6`) | Form vertical rhythm between fields (matches login: `space-y-6`); section padding inside elevated surfaces |
| xl | 32px (`mb-8`, `mt-8`) | Vertical gap between "Categorias" and "Invitaciones" sections on `/configuracion` |
| 2xl | 48px (`mb-10`) | Gap between page heading and form on `/register` (matches login's `mb-10`) |
| 3xl | 64px (not used this phase) | — |

**Touch targets:** All interactive elements (copy button, revoke button, eye toggle, submit button) are at least 44×44px (per Phase 24 decision). Icon-only buttons use `p-2` (16px) around a 16–18px icon → ~34px bounding box; they render inside a 44px row to meet the gesture target without visual bloat.

**Exceptions:** None. Float label top offset (`top-[-8px]`) and micro-label size (`11px`) are carried over from `FloatingInput` and are not re-specified here.

---

## Typography

Sizes declared for this phase: 4. Weights declared: 2 (400 regular, 600 semibold). Mono is used exclusively for tokens, URLs, and timestamps.

| Role | Size | Weight | Line Height | Used for |
|------|------|--------|-------------|----------|
| Body | 14px (`text-sm`) | 400 | 1.5 | Form input text, error messages (`text-sm`), badge labels, confirm/cancel inline copy |
| Label | 11px (`text-[11px]`) | 600 | 1.4 | Floating micro-label (existing `FloatingInput` behavior), status badges (`uppercase tracking-[2px]`), inline field errors |
| Heading | 18–20px (`text-lg`/`text-xl`) | 600 | 1.3 | `<h1>` on `/configuracion` (PageHeader: `text-xl font-semibold`), `<h2>` "Invitaciones" section title (`text-lg font-semibold`), `/register` subtitle row |
| Display | 36px (`text-4xl`) | 700 (bold) | 1.1 | "Centik" wordmark at the top of `/register` (matches login exactly: `text-4xl font-bold text-accent`) |

**Mono usage (tabular alignment):** `font-mono tabular-nums` on (a) the full registration URL in the copy row, (b) the token expiration date (`DD MMM YYYY, HH:mm`), (c) any partial token hex shown in the admin list. Never mono on Spanish prose.

**Casing:** Badge labels and micro-labels are UPPERCASE with `tracking-[2px]`. Body copy and headings use sentence case in Spanish (es-MX). No emojis anywhere.

---

## Color

60/30/10 distribution maps to the existing tokens in `src/app/globals.css`:

| Role | Value | Token | Usage |
|------|-------|-------|-------|
| Dominant (60%) | `#000000` | `bg-bg` | Page background on `/register` and behind `/configuracion` content |
| Secondary (30%) | `#141414` | `bg-surface-elevated` | Invite row cards in the Invitaciones list, elevated container around the generated URL |
| Accent (10%) | `#CCFF00` | `bg-accent` / `text-accent` | Reserved list below — never applied to decorative elements, dividers, or passive text |
| Destructive | `#FF3333` | `text-negative`, `bg-negative-subtle` | Revoke confirmation, form field errors, "Enlace invalido/expirado/usado" messages |

**Accent reserved for (explicit, exhaustive list for this phase):**
1. "Centik" wordmark at the top of `/register` (`text-accent`)
2. Primary submit button "Crear cuenta" on `/register` (`bg-accent text-bg`)
3. Primary admin button "Generar invitacion" in the Invitaciones section (`bg-accent text-bg`)
4. Focused input underline on `FloatingInput` (`border-accent`, inherited from existing component)
5. Success tick animation after successful copy (`text-accent` on the swapped `Check` icon, 1600ms duration)
6. Focus ring (global `:focus-visible` — unchanged)

**Accent is never applied to:** the "Revocar" button, the "Copy" icon in its idle state, status badges, status dots, text links, dividers, or token hex values.

**Semantic / status colors (additional, not "accent"):**

| Semantic | Token | Usage this phase |
|---------|-------|------------------|
| Positive | `#00E676` (`bg-positive-subtle` `text-positive`) | "Pendiente" badge on unused, non-expired tokens; success toast after token creation |
| Negative | `#FF3333` (`text-negative`, `bg-negative-subtle`, `bg-negative/10` on hover of revoke) | Revoke hover state, field validation errors, token error messages ("Enlace invalido", "Enlace expirado", "Enlace ya usado"), "Revocar" button text |
| Warning | `#FF9100` (`bg-warning-subtle` `text-warning`) | "Expirado" status badge on tokens past `expiresAt` |
| Info | `#448AFF` (`bg-info-subtle` `text-info`) | "Usada" status badge on tokens with `usedAt` set; sub-banner on `/register` indicating "Invitacion para {email}" once token validates |
| Text tertiary | `#666666` (`text-text-tertiary`) | Idle state of copy button, revoke button, password eye toggle |

**Status badge shape:** `rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[2px]` (identical to the category type badge in `CategoryList`).

---

## Copywriting Contract

All copy is Spanish (es-MX), sentence case, no emojis, no exclamation marks. Inline (not toast) for form errors, matching login UX.

### `/register` page

| Element | Copy |
|---------|------|
| Wordmark (top) | `Centik` |
| Subtitle | `Crea tu cuenta para empezar` |
| Validated-token info row (under subtitle, before form) | `Invitacion para {email}` (with `Mail` icon, `text-text-secondary`, 12px/mono for email) |
| Email field label | `Correo electronico` (locked, pre-filled from token, `disabled` visual) |
| Name field label | `Nombre` |
| Password field label | `Contrasena` |
| Confirm password field label | `Confirmar contrasena` |
| Primary CTA (idle) | `Crear cuenta` |
| Primary CTA (submitting) | `Creando cuenta...` (with `Loader2` spinner, matches login pattern) |
| Password help text (inline, `text-[11px] text-text-tertiary`, below the password field) | `Minimo 8 caracteres, incluye al menos un numero` |
| Field error: email | (never shown — email is locked; if somehow tampered, `Correo no valido`) |
| Field error: name required | `Ingresa tu nombre` |
| Field error: password too short | `Usa al menos 8 caracteres` |
| Field error: password missing digit | `Incluye al menos un numero` |
| Field error: confirm mismatch | `Las contrasenas no coinciden` |
| Form-level error (server failure) | `No pudimos crear tu cuenta. Intenta de nuevo.` |

### `/register` token-state error screens (replaces the form entirely; same centered layout as the form)

| State | Heading | Body |
|-------|---------|------|
| No token param → 404 | (Next.js default 404 — not rendered by us, per D-19) | (default) |
| Token doesn't exist | `Enlace invalido` | `Este enlace de invitacion no es valido. Pide uno nuevo al administrador.` |
| Token expired | `Enlace expirado` | `Esta invitacion expiro. Pide una nueva al administrador.` |
| Token already used | `Enlace ya usado` | `Esta invitacion ya fue utilizada. Si necesitas acceso, pide una nueva.` |

Error-screen icon: `Ticket` at 32px, `text-text-tertiary`, centered above heading. Heading: `text-lg font-semibold text-text-primary`. Body: `text-sm text-text-secondary`. No retry button — the user must obtain a new invite out-of-band.

### `/configuracion` — Invitaciones section (admin only)

| Element | Copy |
|---------|------|
| Section heading | `Invitaciones` |
| Section subheading (below h2, `text-sm text-text-secondary`) | `Genera un enlace de invitacion para dar acceso a un nuevo usuario.` |
| Email input label | `Correo del invitado` |
| Primary CTA (idle) | `Generar invitacion` |
| Primary CTA (submitting) | `Generando...` (with `Loader2` spinner) |
| Success toast | `Invitacion generada` (sonner, duration 4000ms) |
| Server error toast | `No pudimos generar la invitacion` (sonner, duration 5000ms) |
| Field error: email invalid | `Correo no valido` |
| Field error: email already has active token | `Ya existe una invitacion activa para este correo` |
| Field error: email belongs to existing user | `Este usuario ya tiene una cuenta` |

### Generated URL panel (shown immediately after successful generation, directly under the form)

| Element | Copy |
|---------|------|
| Panel label (above URL, uppercase micro-label style) | `Enlace de invitacion` |
| URL expiration line (below URL, `text-xs text-text-secondary`) | `Expira el {DD MMM YYYY, HH:mm}` |
| Copy button (idle) | icon `Copy`, `aria-label="Copiar enlace"` |
| Copy button (success, 1600ms swap) | icon `Check`, `text-accent`, `aria-label="Copiado"` — optional inline "Copiado" text (`text-xs text-accent`) |

### Recent invitations list (below the generated-URL panel)

| Element | Copy |
|---------|------|
| List heading (`text-sm font-semibold text-text-secondary uppercase tracking-[2px] mb-3`) | `Invitaciones recientes` |
| Empty state heading | `Aun no hay invitaciones` |
| Empty state body | `Cuando generes una invitacion la veras aqui.` |
| Empty state icon | `Ticket` at 32px, `text-text-tertiary` (matches `CategoryList` empty-state layout) |
| Status badge: pending (unused, not expired) | `Pendiente` (`bg-positive-subtle text-positive`) |
| Status badge: used | `Usada` (`bg-info-subtle text-info`) |
| Status badge: expired (not used, past `expiresAt`) | `Expirada` (`bg-warning-subtle text-warning`) |
| Status badge: revoked | `Revocada` (`bg-negative-subtle text-negative`) |
| Expiration sublabel | `Expira {DD MMM YYYY}` (on pending rows) / `Usada {DD MMM YYYY}` / `Expiro {DD MMM YYYY}` / `Revocada {DD MMM YYYY}` |

### Destructive action: Revocar

Matches the existing two-step inline confirmation pattern from `CategoryList` and `IncomeSourceCard` (no modal). Revoke is only available on rows with `Pendiente` status.

| State | Copy |
|-------|------|
| Idle | `Trash2` icon (16px), `text-text-tertiary`, `aria-label="Revocar invitacion"` |
| Confirming (inline, replaces icon) | `Revocar?` (`text-text-secondary text-sm`) • `Si` (`text-negative font-semibold`) • `No` (`text-text-secondary font-semibold`) |
| Auto-cancel | 3000ms timeout (matches existing pattern) |
| Success toast | `Invitacion revocada` |
| Server error toast | `No pudimos revocar la invitacion` |

**Destructive confirmation contract:** `Revocar invitacion` — "Revocar?" inline two-button confirm, 3s timeout, toast on completion. No modal dialog (consistent with other destructive actions in the app per Phase 24 interaction patterns).

### Primary CTA canonical entries (summary row required by template)

| Element | Copy |
|---------|------|
| Primary CTA (registration page) | `Crear cuenta` |
| Primary CTA (admin Invitaciones) | `Generar invitacion` |
| Empty state heading (recent list) | `Aun no hay invitaciones` |
| Empty state body (recent list) | `Cuando generes una invitacion la veras aqui.` |
| Error state (token error) | `Enlace invalido` / `Enlace expirado` / `Enlace ya usado` — each with solution path sentence ("Pide uno nuevo al administrador.") |
| Destructive confirmation | `Revocar invitacion`: inline two-button "Revocar? Si / No", 3s timeout, toast on completion |

---

## Interaction States (reference for executor + checker)

### `/register` — registration form states

1. **Idle:** Form rendered inside `(auth)` layout centered at `max-w-sm`. Email input is disabled (pre-filled from token, `opacity-50 cursor-not-allowed` via `FloatingInput`'s `disabled` prop). Other fields empty.
2. **Focus:** Focused field underline turns `border-accent` (existing `FloatingInput` behavior).
3. **Typing (password):** Password help text stays visible until the first validation error appears for that field on blur; on successful meet-rule it stays muted `text-text-tertiary`.
4. **Validation error:** Field underline `border-negative`, error text `text-[11px] text-negative` below the field.
5. **Submitting:** Button shows `Loader2` spinner + `Creando cuenta...`, `disabled:opacity-50`.
6. **Success:** Auto-redirect to `/` via `signIn('credentials')` — no success screen.
7. **Server error (form-level):** Render `<p className="text-sm text-negative">` above the submit button (identical position and styling to login's `state?.error` block).

### `/register` — token-invalid states

Renders an error card in place of the form:

```
[Ticket icon 32px, text-text-tertiary, centered]
{Heading}       ← text-lg font-semibold text-text-primary
{Body copy}     ← text-sm text-text-secondary, max-w-sm
```

No retry button, no link to /login (users are already on a public route and can navigate manually).

### Copy button states (admin generated-URL panel)

| State | Visual | Duration |
|-------|--------|----------|
| Idle | `Copy` icon 16px, `text-text-tertiary` on `bg-surface-elevated`, `rounded-full p-2`, hover `text-text-primary bg-surface-hover` | — |
| Active (pressed) | `active:scale-[0.98]` (existing pattern) | immediate |
| Success | Icon swaps to `Check` 16px, `text-accent`; optional inline `Copiado` label in `text-xs text-accent` | 1600ms, auto-revert to idle |
| Error (clipboard API failure) | Toast `No pudimos copiar el enlace` (sonner) — icon returns to idle immediately | — |

Respect `prefers-reduced-motion`: skip the scale transition, keep the icon swap.

### Generated-URL panel layout

```
┌───────────────────────────────────────────────────────┐  ← rounded-2xl bg-surface-elevated p-5
│ ENLACE DE INVITACION                                  │  ← 11px uppercase tracking-[2px] text-text-secondary mb-2
│ ┌────────────────────────────────────┬────────────┐   │
│ │ font-mono tabular-nums text-sm     │ [Copy btn] │   │  ← URL truncated with overflow-x-auto, whole row 44px
│ │ https://centik.app/register?...    │            │   │
│ └────────────────────────────────────┴────────────┘   │
│ Expira el 25 abr 2026, 14:30                          │  ← text-xs text-text-secondary mt-2
└───────────────────────────────────────────────────────┘
```

The URL itself sits in an inner `rounded-xl bg-surface p-3` container for contrast against the panel (dark-on-darker depth shift per Glyph Finance elevation rules).

### Invitation row layout (inside `Invitaciones recientes` list)

Matches `CategoryList` row geometry: `rounded-2xl bg-surface-elevated p-4`, flex row with three regions (icon slot · email+sublabel · actions slot).

```
┌──────────────────────────────────────────────────────────────────┐
│ [◯ Ticket icon]  usuario@ejemplo.com             [Pendiente] [🗑] │
│                  Expira 25 abr 2026                               │
└──────────────────────────────────────────────────────────────────┘
```

- Icon container: 36×36 `rounded-xl` with `bg-surface` (no per-row color coding).
- Email: `text-sm font-medium text-text-primary truncate`.
- Sublabel: `text-xs text-text-secondary font-mono tabular-nums` for the date portion.
- Status badge: pill (see badge shape above).
- Revoke button: only rendered when status = `Pendiente`. Matches `CategoryRow` revoke geometry exactly.

### Invitaciones section conditional rendering

- Admin check happens server-side in `/configuracion/page.tsx` via `session.user.isAdmin`.
- Non-admins: section is not rendered at all. No placeholder, no "access denied" — the section simply doesn't exist in the DOM.
- Admin with zero tokens: form shown, empty-state card shown below, no generated-URL panel.
- Admin after first generation: form + generated-URL panel + recent list (which now includes the just-created token at the top).

---

## Accessibility

- Every `FloatingInput` already supports `aria-invalid` and `aria-describedby` for errors — reuse.
- Password eye toggle `aria-label` switches between `Mostrar contrasena` and `Ocultar contrasena` (identical to login).
- Copy button `aria-label` toggles between `Copiar enlace` and `Copiado` for 1600ms.
- Revoke button `aria-label="Revocar invitacion"`; inline confirmation is keyboard-accessible (Tab moves between `Si` and `No`, Enter commits).
- Error screens on `/register` use `role="alert"` on the heading container so screen readers announce the token state immediately.
- Focus order on the generated-URL panel: URL field (`tabIndex=0` so the user can read it via keyboard) → Copy button → next invite row.
- Respect `prefers-reduced-motion` via the existing global rule (already in `globals.css`).

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | none | not applicable — project does not use shadcn |
| third-party registries | none | not applicable |

No external component registries or blocks are introduced in this phase. Every visual element is built from existing in-house primitives (`FloatingInput`, `PageHeader`, `Modal` not required this phase, `DynamicIcon`) and raw Tailwind + `lucide-react` icons.

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
