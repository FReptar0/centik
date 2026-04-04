# Feature Landscape

**Domain:** Personal finance tracking (Mexican quincenal cycle)
**Researched:** 2026-04-04

---

## Table Stakes

Features users expect from a personal finance tracker. Missing = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Transaction CRUD | Core action. Without it, nothing works. | Medium | Quick-add (<30s) is the differentiator. Needs category selector, amount, date, description. |
| Category-based expense tracking | Mental model for budgeting. Everyone thinks in categories. | Low | 6 predefined expense + 2 income categories. Custom creation. |
| Monthly budget with progress | Users need to know "am I on track?" | Medium | Quincenal input is unique but the progress bar concept is universal. |
| Dashboard with KPIs | At-a-glance financial health. First thing users see. | High | 6 KPIs + 3 charts. Server-side aggregation queries. |
| Debt tracking | Anyone managing finances has debts (credit cards, loans). | Medium | Credit card utilization, loan progress, manual balance updates. |
| Income source management | Need to know how much comes in to budget properly. | Low | Simplest CRUD entity. 2 defaults + configurable. |
| Period management | Monthly cycle is fundamental to personal finance. | Medium | Auto-create, close with snapshot, read-only for closed periods. |
| Dark mode UI | Finance apps universally use dark themes. Reduces eye strain. | Low | Single theme, no toggle needed. |
| Responsive layout | Users check finances on mobile. | Medium | Sidebar desktop, bottom tabs mobile, floating "+" button. |

## Differentiators

Features that set Centik apart. Not expected by default, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Quincenal-native budgeting | Mexican pay cycle alignment. No other finance app does this well. | Low | Input in quincenal, auto-calculate monthly/semester/annual. Simple multiplication but huge UX value. |
| 30-second transaction entry | Speed kills adoption barriers. Most apps are too slow. | Medium | Floating "+" button, smart defaults, minimal required fields (4 taps/clicks). |
| Period close as atomic transaction | Data integrity guarantee. Snapshot totals, create next period, copy budgets -- all or nothing. | High | Prisma `$transaction`. Most important integration test in the app. |
| Budget traffic light system | Instant visual feedback on spending. Green/orange/red. | Low | Pure presentation logic: <80% green, 80-100% orange, >100% red. |
| Annual history pivot table | Year-over-year financial narrative. Rare in simple finance apps. | Medium | 12-column table from MonthlySummary data. Requires several months of usage. |
| Debt-to-income ratio | Financial health metric. Meaningful for Mexican context (high credit card rates). | Low | Calculated from existing data. Display-only. |

## Anti-Features

Features to explicitly NOT build. These are traps.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Bank API connections | Mexican bank APIs are unreliable, poorly documented, and often require institutional agreements. Building and maintaining scraping/API integrations is a bottomless pit. | Manual entry with fast UX (<30s). The speed of entry matters more than automation. |
| CSV/PDF import | Parsing bank statements is brittle (format changes, encoding issues, different banks). Huge effort for marginal value. | Manual entry. Consider for v2+ if demand is validated. |
| AI categorization | Requires training data, introduces unpredictability, and the single user already knows their categories. Over-engineering. | Pre-selected category defaults. Quick category selection via icon grid. |
| Multi-currency | Adds complexity to every monetary calculation. MXN is the only currency needed for MVP. | v2 has ValueUnit/UnitRate system for UDI, UMA, USD tracking. |
| Light mode toggle | Doubles the styling work. Finance apps look better dark. Single user's preference. | Dark-only. Consistent, focused implementation. |
| Real-time notifications | Single user, no shared data, no urgency. Push notifications add mobile/PWA complexity. | Passive display of dates (cut-off, payment due) on debt cards. |
| Investment tracking | Complex domain (prices, dividends, rebalancing). Distracts from core personal finance. | v2 planned with Asset/ValueUnit entities. Keep schema extensible but don't build yet. |
| User authentication | Single user app. Auth adds session management, login flows, password reset. Unnecessary complexity. | No auth in MVP. Architecture supports future multi-tenant if needed. |

## Feature Dependencies

```
Categories (seed) --> Transactions (requires categoryId)
Categories (seed) --> Budgets (requires categoryId)
Periods (auto-create) --> Transactions (requires periodId)
Periods (auto-create) --> Budgets (requires periodId)
Income Sources --> Transactions (optional incomeSourceId for INCOME type)
Transactions --> Dashboard KPIs (aggregation queries)
Transactions + Budgets --> Budget Progress (spent vs budgeted)
Transactions + Budgets + Debts --> Dashboard Charts
MonthlySummary --> History Table (populated by period close)
Period Close --> MonthlySummary (creates snapshot)
Period Close --> Next Period (creates if not exists)
Period Close --> Budget Copy (copies to next period)
```

## MVP Recommendation

**Prioritize (in dependency order):**
1. Schema + Seed (categories, periods, income sources, debts, budgets) -- foundation for everything
2. Utilities + Validators -- `formatMoney`, `toCents`, `serializeBigInts`, Zod schemas. Shared by all features.
3. Layout + Navigation -- sidebar, mobile nav, floating "+" button. Shell for all pages.
4. Income Sources CRUD -- simplest full-stack roundtrip. Validates the entire pattern (API route, Zod, Prisma, BigInt serialization, Server Components).
5. Categories + Transactions -- core loop. Most-used feature. The entire app exists to record transactions.
6. Dashboard -- read-only aggregation. Depends on having transactions data.
7. Debts management -- independent entity but references dashboard KPIs.
8. Budget config + progress -- requires transaction data to show progress bars.
9. History + period close -- requires MonthlySummary, needs transactions to snapshot. Most complex feature.
10. Polish + accessibility -- final QA pass.

**Defer to v2:**
- ValueUnit/UnitRate/Asset entities: Schema can include them but no UI/API in v1
- Authentication: Not needed for single user
- CSV/PDF import: Validate demand first
- PWA/offline: Low priority for web-first personal tool
