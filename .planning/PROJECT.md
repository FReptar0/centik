# Centik

## What This Is

Centik is an open-source personal finance tracking web app designed for the Mexican quincenal (biweekly) pay cycle. It combines debt tracking, variable income management (employment + freelance), category-based budgeting, and annual history visualization in a single dark-themed interface. Manual entry with smart UX — no bank connections, no scraping.

## Core Value

A single user can register a financial transaction in under 30 seconds and immediately see how it impacts their budget, debt ratio, and savings rate across all views.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Dashboard with 6 KPIs (monthly income, expenses, available, total debt, savings rate, debt-to-income ratio)
- [ ] Dashboard charts: budget vs spent bar chart, 6-month trend area chart, expense distribution donut chart
- [ ] Dashboard recent transactions (last 8 movements)
- [ ] Quick transaction registration (<30 seconds, 4 taps/clicks)
- [ ] Transaction CRUD with filterable list (category, type, date range, payment method)
- [ ] Credit card debt tracking (utilization, cut-off/payment dates, estimated monthly interest)
- [ ] Personal loan tracking (% paid, remaining months, total remaining)
- [ ] Manual debt balance updates
- [ ] Quincenal budget input with auto-calculated monthly/semester/annual views
- [ ] Budget progress bars with traffic light system (green <80%, orange 80-100%, red >100%)
- [ ] Income source management with frequency (quincenal, monthly, weekly, variable)
- [ ] Automatic monthly equivalent calculation for all income frequencies
- [ ] Annual history pivot table (12 months: income, expenses, savings, savings rate, debt at close, debt payments)
- [ ] Period close as atomic transaction (snapshot MonthlySummary, create next period, copy budgets)
- [ ] Read-only mode for closed periods with reopen option
- [ ] Auto-create current period on app load
- [ ] Predefined expense categories with Lucide icons (Comida, Servicios, Entretenimiento, Suscripciones, Transporte, Otros)
- [ ] Predefined income categories (Empleo, Freelance)
- [ ] Custom category creation
- [ ] Dark mode UI with cyan accent (#22d3ee)
- [ ] Responsive layout: sidebar (desktop) / bottom tab bar (mobile)
- [ ] Floating "+" button for quick transaction entry (always visible)

### Out of Scope

- Bank API connections — manual entry only, bank APIs in Mexico are unreliable
- Multi-user authentication — single user in MVP, architecture supports future multi-tenant
- AI/ML features — no predictions, recommendations, or automated categorization
- Statement scraping — no PDF/CSV import in v1
- Complex investments (options, futures) — simple asset tracking in v2 only
- Real-time chat or notifications — not needed for single-user finance app
- SSG/ISR — all pages are dynamic (personal data)
- Client-side state management (Redux, Zustand) — React state + server components suffice

## Context

- **Target market:** Mexican personal finance, quincenal pay cycle is the standard
- **Monetization:** None — open source project, code quality and documentation are priorities
- **Existing documentation:** DFR.md (entities, API routes, business rules), STYLE_GUIDE.md (design system), UX_RULES.md (interaction patterns), DATA_FLOW.md (queries, mutations, revalidation)
- **v2 planned modules:** ValueUnit/UnitRate/Asset entities for investment tracking (UDI, UMA, USD); authentication via NextAuth/Clerk; PWA offline support
- **All monetary values stored as BigInt centavos** — critical architectural decision to eliminate floating point errors
- **Interest rates stored as Int basis points** (4500 = 45.00%)
- **Existing codebase:** Next.js project scaffolded via Create Next App, no application code yet

## Constraints

- **Tech stack:** Next.js 14+ App Router, TypeScript strict, PostgreSQL/Docker, Prisma, Tailwind CSS, Recharts, Zod, Vitest+Playwright, pnpm — all decided, non-negotiable
- **Quality:** Zero `any` in TypeScript, zero skipped tests, every endpoint Zod-validated, full Quality Loop (build→lint→format→test) before every commit
- **Monetary:** All money as BigInt centavos, never float. Conversion only at presentation layer
- **Iconography:** Lucide React exclusively, no emojis anywhere in UI
- **Serialization:** BigInt→String via serializeBigInts() for all JSON responses
- **Security:** Zod validation on every endpoint, Prisma parameterized queries only, no secrets in code
- **Open source:** Code must be readable, well-documented, contributor-friendly. Files <300 lines, functions <50 lines

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| BigInt centavos for all money | Eliminates floating point errors entirely; integer arithmetic only | — Pending |
| Basis points for interest rates | 4500 = 45.00%, two decimal precision without floats | — Pending |
| No auth in MVP | Single user app, complexity not justified for personal use | — Pending |
| Dark mode only (no light toggle) | Finance apps benefit from calm, dark aesthetic; reduces scope | — Pending |
| Manual debt balance updates | No bank connections; user updates saldo manually | — Pending |
| Quincenal as budget input unit | Matches Mexican pay cycle; auto-calculate monthly/annual | — Pending |
| Period = calendar month | Simple, universal; first day to last day of month | — Pending |
| Server Components by default | Data-heavy app; minimize client JS; charts are Client Components | — Pending |
| Server Actions over API routes | Preferred for mutations; API routes only when Actions don't fit | — Pending |
| Lucide React, no emojis | Professional look for open source; dynamic icon rendering by name from DB | — Pending |

---
*Last updated: 2026-04-04 after initialization*
