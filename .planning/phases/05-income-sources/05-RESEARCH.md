# Phase 5: Income Sources - Research

**Researched:** 2026-04-05
**Domain:** Full-stack CRUD feature (Server Components + Server Actions + Prisma + Client Components)
**Confidence:** HIGH

## Summary

Phase 5 is the first full-stack feature in the application, implementing CRUD for Income Sources. This phase validates the entire data flow pattern that all subsequent phases will follow: Server Component page fetching data via Prisma, serializing BigInt fields before passing to Client Components, Client Components handling form interactions through Server Actions, and revalidation of affected paths after mutations.

All foundation pieces are already built and tested: the Prisma IncomeSource model, `createIncomeSourceSchema` Zod validator (with 100% test coverage), `serializeBigInts()`, `formatMoney()`, `toCents()`, `parseCents()`, the Modal component, PageHeader, and DynamicIcon. The seed data provides two default income sources (TerSoft QUINCENAL $25,000 and Freelance VARIABLE $15,000). The placeholder `page.tsx` and `loading.tsx` already exist at `src/app/ingresos/`.

**Primary recommendation:** Build Server Actions in a dedicated `src/app/ingresos/actions.ts` file with `'use server'` directive. Use controlled form state in a Client Component for the create/edit modal, calling Server Actions directly (not via `<form action>`). The page itself remains a Server Component that fetches data and passes serialized props to child Client Components.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Card-based list of income sources
- Each card: name, default amount (formatted), frequency, type badge
- For quincenal frequency: show monthly equivalent (x2)
- For variable frequency: show 3-month average (or available months if <3)
- Summary section: quincenal, monthly, semester, annual income estimates
- Create/Edit: Modal with form (name, defaultAmount, frequency selector, type selector)
- Delete: Inline confirmation (button changes to "Eliminar? Si / No", auto-reverts after 3s)
- All mutations via Server Actions, not API routes
- Zod validation with createIncomeSourceSchema (already built in Phase 3)
- Toast notifications skipped for now (Phase 11)
- Server Component page fetches via Prisma
- serializeBigInts() before passing to Client Components
- formatMoney() for display, toCents() for input conversion
- revalidatePath('/ingresos') after mutations
- Also revalidatePath('/') since Dashboard shows income KPI

### Claude's Discretion
- Card layout details (spacing, icon usage, badge styling)
- Frequency selector style (radio group vs dropdown -- UX_RULES.md suggests radio for <6 options)
- Empty state design (icon + text + CTA per UX_RULES.md)
- Whether to split into sub-components or keep page-level
- Form field ordering and optional field handling
- Loading state while mutations are in progress

### Deferred Ideas (OUT OF SCOPE)
None
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INC-01 | View list of income sources with name, amount, frequency, monthly equivalent | Server Component Prisma query + serializeBigInts + IncomeSourceCard component; frequency-to-monthly calculation logic |
| INC-02 | Create new income source with name, defaultAmount, frequency, type | Server Action using createIncomeSourceSchema validation + Prisma create + revalidatePath |
| INC-03 | Edit an existing income source | Server Action with update, same modal pre-filled; bind sourceId to action |
| INC-04 | Delete with confirmation | Inline confirmation pattern (3s auto-revert timer via useState + useEffect); Server Action with Prisma delete |
| INC-05 | Variable frequency shows 3-month average | SQL query: AVG of monthly transaction totals for incomeSourceId over last 3 periods |
| INC-06 | Summary cards: quincenal, monthly, semester, annual estimates | Server-side calculation from income sources adjusted by frequency; pure derived data |
</phase_requirements>

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| Next.js | 16.2.2 | App Router, Server Components, Server Actions | Installed |
| React | 19.2.4 | UI rendering, useActionState, useOptimistic (optional) | Installed |
| Prisma | latest (v7) | ORM, IncomeSource model already defined | Installed |
| Zod | latest (v4) | createIncomeSourceSchema already tested | Installed |
| lucide-react | latest | DynamicIcon component for category icons | Installed |
| tailwind-merge + clsx | latest | cn() utility already available | Installed |

### Supporting (Already Available)
| Library | Purpose | Location |
|---------|---------|----------|
| serializeBigInts | BigInt-to-string for JSON | `src/lib/serialize.ts` |
| formatMoney / toCents / parseCents | Money conversion | `src/lib/utils.ts` |
| createIncomeSourceSchema | Zod validation | `src/lib/validators.ts` |
| Modal | Responsive modal/sheet | `src/components/ui/Modal.tsx` |
| PageHeader | Page title + action slot | `src/components/layout/PageHeader.tsx` |
| DynamicIcon | Lucide icon by string name | `src/components/ui/DynamicIcon.tsx` |
| FREQUENCY_DISPLAY | Spanish frequency labels | `src/lib/constants.ts` |
| INCOME_SOURCE_TYPES | Valid type values | `src/lib/constants.ts` |
| Frequency enum | Runtime enum values | `@/types` (re-exported from Prisma) |

### No New Dependencies Needed
This phase uses exclusively what is already installed. No npm installs required.

## Architecture Patterns

### Recommended File Structure
```
src/
  app/
    ingresos/
      page.tsx           # Server Component - data fetching + layout
      loading.tsx         # Skeleton (update existing)
      actions.ts          # 'use server' - create, update, delete actions
  components/
    income/
      IncomeSourceList.tsx     # Client Component - list + empty state
      IncomeSourceCard.tsx     # Client Component - individual card with delete
      IncomeSourceForm.tsx     # Client Component - create/edit form in modal
      IncomeSummaryCards.tsx   # Server Component - summary cards (pure display)
```

### Pattern 1: Server Component Page with Data Fetching
**What:** The page.tsx is an async Server Component that queries Prisma directly, serializes BigInt fields, and passes data to child components.
**When to use:** Every page that displays DB data.
**Example:**
```typescript
// src/app/ingresos/page.tsx (Server Component)
import prisma from '@/lib/prisma'
import { serializeBigInts } from '@/lib/serialize'

export default async function IngresosPage() {
  const incomeSources = await prisma.incomeSource.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' },
  })

  const serialized = serializeBigInts(incomeSources)
  // Pass serialized data to Client Components
  return (
    <div>
      <PageHeader title="Ingresos" action={...} />
      <IncomeSummaryCards sources={serialized} />
      <IncomeSourceList sources={serialized} />
    </div>
  )
}
```

### Pattern 2: Server Actions in Dedicated File
**What:** A file with `'use server'` at the top containing all mutation functions for this feature. Each action validates with Zod, performs Prisma mutation, and calls revalidatePath.
**When to use:** All mutations in the app.
**Example:**
```typescript
// src/app/ingresos/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import prisma from '@/lib/prisma'
import { createIncomeSourceSchema } from '@/lib/validators'

export async function createIncomeSource(data: {
  name: string
  defaultAmount: string
  frequency: string
  type: string
}) {
  const parsed = createIncomeSourceSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  try {
    await prisma.incomeSource.create({
      data: {
        name: parsed.data.name,
        defaultAmount: BigInt(parsed.data.defaultAmount),
        frequency: parsed.data.frequency,
        type: parsed.data.type,
      },
    })
    revalidatePath('/ingresos')
    revalidatePath('/')
    return { success: true }
  } catch (err) {
    // Handle unique constraint on name
    return { error: { name: ['Ya existe una fuente con ese nombre'] } }
  }
}
```

### Pattern 3: Client Component Form with Direct Action Calls
**What:** Instead of `<form action={serverAction}>`, use controlled state with an `onClick`/`onSubmit` handler that calls the Server Action directly. This gives more control over form state, validation display, and modal close behavior.
**When to use:** When you need controlled forms with modals (not progressive enhancement).
**Rationale:** The CONTEXT.md specifies modal-based forms. Using `useActionState` with `<form action>` would require wrapping the form, and the modal needs to close on success. A controlled pattern with `async onClick` calling the Server Action directly is simpler for this use case.
**Example:**
```typescript
// Client Component
async function handleSubmit() {
  setIsSubmitting(true)
  const result = await createIncomeSource({
    name,
    defaultAmount: toCents(amount),
    frequency,
    type,
  })
  setIsSubmitting(false)
  if (result.error) {
    setErrors(result.error)
    return
  }
  onClose() // Close modal
}
```

### Pattern 4: Inline Delete Confirmation (3-second auto-revert)
**What:** The delete button transforms to "Eliminar? Si / No" and auto-reverts after 3 seconds.
**When to use:** All list item deletions per UX_RULES.md.
**Example:**
```typescript
const [confirmingDelete, setConfirmingDelete] = useState(false)

useEffect(() => {
  if (!confirmingDelete) return
  const timer = setTimeout(() => setConfirmingDelete(false), 3000)
  return () => clearTimeout(timer)
}, [confirmingDelete])
```

### Pattern 5: Frequency-to-Monthly Calculation
**What:** Converting income source amounts to monthly equivalents based on frequency.
**When to use:** Summary cards and individual card display.
**Logic:**
```typescript
function getMonthlyAmount(defaultAmount: string, frequency: string): string {
  const cents = BigInt(defaultAmount)
  switch (frequency) {
    case 'QUINCENAL': return (cents * 2n).toString()
    case 'SEMANAL': return (cents * 4n).toString()  // ~4 weeks/month
    case 'MENSUAL': return cents.toString()
    case 'VARIABLE': return '0' // Handled separately via 3-month average
    default: return cents.toString()
  }
}
```
Note: This calculation uses BigInt arithmetic on the server side. For the client side (summary cards), operate on the serialized string values.

### Anti-Patterns to Avoid
- **Fetching data in Client Components:** Never. The page Server Component fetches and passes serialized data as props.
- **Passing raw Prisma results to Client Components:** Always run through `serializeBigInts()` first.
- **Using `JSON.stringify` directly on BigInt objects:** Will throw. Always use `serializeBigInts()`.
- **Float math for money:** Never convert centavo strings to floats for arithmetic. Use BigInt on server, string display on client.
- **`useActionState` for this use case:** While valid React 19, it adds complexity with modal close logic. Direct async calls to Server Actions are simpler here.
- **API routes for mutations:** CONTEXT.md explicitly chose Server Actions.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| BigInt serialization | Custom JSON replacer | `serializeBigInts()` from `@/lib/serialize` | Already built and tested in Phase 3 |
| Money formatting | Manual string formatting | `formatMoney()` from `@/lib/utils` | Handles Intl.NumberFormat('es-MX') correctly |
| User input to cents | Float multiplication | `toCents()` from `@/lib/utils` | String-split parsing, no float contamination |
| Input validation | Manual field checks | `createIncomeSourceSchema` from `@/lib/validators` | Zod v4 with Spanish messages, already tested |
| Responsive modal | Custom dialog | `Modal` from `@/components/ui/Modal` | CSS responsive, handles Escape, backdrop click |
| Icon rendering | Dynamic imports | `DynamicIcon` from `@/components/ui/DynamicIcon` | Static map for tree-shaking |
| Class merging | String concatenation | `cn()` from `@/lib/utils` | clsx + tailwind-merge for dedup |
| Frequency labels | Inline mappings | `FREQUENCY_DISPLAY` from `@/lib/constants` | Already defined with Spanish labels |

**Key insight:** Phase 3 built a comprehensive foundation. Phase 5 should be almost entirely wiring existing pieces together, not creating new utilities.

## Common Pitfalls

### Pitfall 1: BigInt Serialization Boundary Mismatch
**What goes wrong:** Passing Prisma results (with BigInt `defaultAmount`) directly to a Client Component causes a serialization error at the Server/Client boundary.
**Why it happens:** BigInt is not serializable by React's serialization mechanism for Server-to-Client props.
**How to avoid:** Always call `serializeBigInts()` on Prisma results before passing as props. The `SerializedIncomeSource` type from `@/types` has `defaultAmount: string`.
**Warning signs:** Runtime error "BigInt value can't be serialized in JSON" or similar.

### Pitfall 2: Unique Constraint on IncomeSource.name
**What goes wrong:** Creating/updating an income source with a duplicate name throws a Prisma unique constraint error (P2002).
**Why it happens:** The schema has `@unique` on `IncomeSource.name` (added for seed upsert idempotency per Phase 2 decision).
**How to avoid:** Catch the Prisma error in the Server Action and return a user-friendly Spanish error message. Check for error code P2002 specifically.
**Warning signs:** Unhandled promise rejection on form submit.

### Pitfall 3: Frequency Enum vs String for Type
**What goes wrong:** Using Prisma `Frequency` enum for `type` field, or vice versa.
**Why it happens:** `frequency` is a Prisma `Frequency` enum, but `type` is a plain `String` (not an enum) per Phase 2 decision. The Zod schema validates `type` as `z.string()` (not `z.enum()`).
**How to avoid:** Use `Frequency` enum values for frequency field. Use `INCOME_SOURCE_TYPES` constant for type field. The validator already handles this correctly.
**Warning signs:** TypeScript errors about incompatible types.

### Pitfall 4: Stale Data After Mutation
**What goes wrong:** After creating/editing/deleting an income source, the list or dashboard shows old data.
**Why it happens:** Missing `revalidatePath()` calls after mutation.
**How to avoid:** Every Server Action must call `revalidatePath('/ingresos')` AND `revalidatePath('/')` (Dashboard depends on income data for KPI).
**Warning signs:** UI not updating after successful mutation until manual page refresh.

### Pitfall 5: Variable Frequency Average Query Complexity
**What goes wrong:** The 3-month average for variable income requires querying transactions, which may not exist yet (no transactions feature in Phase 5).
**Why it happens:** INC-05 requires showing average based on transaction history, but transactions are built in Phase 6/7.
**How to avoid:** For MVP of Phase 5, show `defaultAmount` for variable sources with a note like "Estimado" since no transactions exist yet. The average calculation can be wired up when transactions exist. Alternatively, query transactions if they exist and fall back to defaultAmount.
**Warning signs:** Empty/zero averages that confuse the user.

### Pitfall 6: toCents() Takes String, Not Number
**What goes wrong:** Calling `toCents(150.75)` with a number instead of a string.
**Why it happens:** CLAUDE.md shows `toCents(pesos: number)` but Phase 3 decision changed signature to `toCents(input: string)` to avoid float contamination.
**How to avoid:** Always pass the raw input string from the form field: `toCents(amountInputValue)`. Never convert to number first.
**Warning signs:** TypeScript error or incorrect cent values.

### Pitfall 7: Prisma Import Path
**What goes wrong:** Importing from `@prisma/client` instead of the generated output location.
**Why it happens:** Standard Prisma tutorials use `@prisma/client`, but this project outputs to `../../generated/prisma/client`.
**How to avoid:** Import the Prisma singleton from `@/lib/prisma` (which handles the correct path). Import types from `@/types` (which re-exports from generated).
**Warning signs:** Module not found errors.

## Code Examples

### Income Source Data Fetching (Server Component)
```typescript
// Source: Project patterns established in Phases 1-4
import prisma from '@/lib/prisma'
import { serializeBigInts } from '@/lib/serialize'
import type { SerializedIncomeSource } from '@/types'

async function getIncomeSources(): Promise<SerializedIncomeSource[]> {
  const sources = await prisma.incomeSource.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' },
  })
  return serializeBigInts(sources)
}
```

### Summary Calculation (Server-side)
```typescript
// Calculate income totals from serialized sources
function calculateIncomeSummary(sources: SerializedIncomeSource[]) {
  let quincenalTotal = 0n
  for (const source of sources) {
    const amount = BigInt(source.defaultAmount)
    switch (source.frequency) {
      case 'QUINCENAL':
        quincenalTotal += amount
        break
      case 'MENSUAL':
        // Divide by 2 for quincenal equivalent
        quincenalTotal += amount / 2n
        break
      case 'SEMANAL':
        // ~2 weeks per quincena
        quincenalTotal += amount * 2n
        break
      case 'VARIABLE':
        // Use defaultAmount as estimate, divided by 2 for quincenal
        quincenalTotal += amount / 2n
        break
    }
  }
  return {
    quincenal: quincenalTotal.toString(),
    monthly: (quincenalTotal * 2n).toString(),
    semester: (quincenalTotal * 12n).toString(),
    annual: (quincenalTotal * 24n).toString(),
  }
}
```

### Server Action Return Shape
```typescript
// Consistent return type for all Server Actions
type ActionResult =
  | { success: true }
  | { error: Record<string, string[]> }

// Usage in Server Action
export async function createIncomeSource(data: unknown): Promise<ActionResult> {
  const parsed = createIncomeSourceSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }
  // ... Prisma create ...
  return { success: true }
}
```

### Inline Delete Confirmation Pattern
```typescript
// Source: UX_RULES.md section 4.3 + 8.2
// Button states: normal -> confirming (3s timer) -> normal
function DeleteButton({ onDelete }: { onDelete: () => Promise<void> }) {
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!confirming) return
    const timer = setTimeout(() => setConfirming(false), 3000)
    return () => clearTimeout(timer)
  }, [confirming])

  if (confirming) {
    return (
      <span className="text-sm">
        Eliminar?{' '}
        <button onClick={async () => { setDeleting(true); await onDelete() }} disabled={deleting}>
          Si
        </button>
        {' / '}
        <button onClick={() => setConfirming(false)}>No</button>
      </span>
    )
  }
  return <button onClick={() => setConfirming(true)}>Eliminar</button>
}
```

### Badge Component for Type/Frequency
```typescript
// Inline badge styling following STYLE_GUIDE.md section 8.6
<span className="inline-flex items-center rounded-sm px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase bg-accent/15 text-accent">
  {FREQUENCY_DISPLAY[source.frequency]}
</span>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| API routes for all mutations | Server Actions (`'use server'`) | React 19 / Next.js 14+ | Simpler mutation flow, no fetch() needed |
| `useFormState` from `react-dom` | `useActionState` from `react` | React 19 | New hook name, accepts async action directly |
| Prisma `@prisma/client` import | Custom output path `generated/prisma/client` | Phase 1 (Prisma 7 + Turbopack) | Must use `@/lib/prisma` singleton, `@/types` for types |
| Tailwind config `tailwind.config.ts` | CSS-based `@theme` in `globals.css` | Tailwind v4 | Design tokens via `@theme` block, not JS config |
| pnpm package manager | npm | Project decision | Use `npm` for all commands (not `pnpm`) |

**Important version notes:**
- Next.js 16 and Prisma 7 have breaking changes from standard tutorials. Use existing project patterns, not generic docs.
- Zod v4 uses `{ error: '...' }` syntax, NOT v3 `{ message: '...' }` (Phase 3 decision).
- Tailwind v4 uses `@theme` CSS blocks, not `tailwind.config.ts`.

## Open Questions

1. **Variable Frequency Average (INC-05)**
   - What we know: DFR.md says show 3-month average for variable sources based on transaction history. DATA_FLOW.md has the SQL query.
   - What's unclear: No transactions exist yet (built in Phase 6/7). The query requires `Transaction` records linked to `IncomeSource`.
   - Recommendation: Show `defaultAmount` for variable sources with frequency label "Variable" and a note "(estimado)" or similar. The actual average calculation should be a placeholder function that returns defaultAmount when no transactions exist, and can be updated to query real data when transactions are implemented. This is the pragmatic approach since the seed data includes a default amount for the Freelance source.

2. **Toast Notifications**
   - What we know: CONTEXT.md says skip toasts for now (Phase 11/UX-01).
   - What's unclear: Whether to show any feedback at all after mutations.
   - Recommendation: Rely on modal closing + list updating as implicit success feedback. No toast library needed in this phase.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (latest) + @testing-library/react |
| Config file | `vitest.config.mts` (unit), `vitest.integration.config.mts` (integration) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npm run quality` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INC-01 | Income sources list renders with formatted data | unit | `npx vitest run src/components/income/IncomeSourceCard.test.tsx -x` | No - Wave 0 |
| INC-02 | Create income source validates and saves | unit | `npx vitest run src/app/ingresos/actions.test.ts -x` | No - Wave 0 |
| INC-03 | Edit income source pre-fills and updates | unit | `npx vitest run src/app/ingresos/actions.test.ts -x` | No - Wave 0 |
| INC-04 | Delete with inline confirmation | unit | `npx vitest run src/components/income/IncomeSourceCard.test.tsx -x` | No - Wave 0 |
| INC-05 | Variable frequency shows estimate/average | unit | `npx vitest run src/app/ingresos/actions.test.ts -x` | No - Wave 0 |
| INC-06 | Summary cards calculate correct totals | unit | `npx vitest run src/components/income/IncomeSummaryCards.test.tsx -x` | No - Wave 0 |

### What to Test (per CLAUDE.md rules)

**Server Actions (90%+ coverage required):**
- `createIncomeSource`: valid input creates record (mock Prisma), invalid input returns Zod errors, duplicate name returns friendly error
- `updateIncomeSource`: valid update succeeds, non-existent ID returns error
- `deleteIncomeSource`: successful deletion, non-existent ID returns error

**Utility logic (100% coverage):**
- Frequency-to-monthly calculation function (all 4 frequency types)
- Summary calculation function (quincenal, monthly, semester, annual)

**Components (interactive logic only):**
- IncomeSourceCard: delete confirmation toggle, 3-second auto-revert
- IncomeSourceForm: validation error display, submit calls action with correct data
- IncomeSourceList: empty state renders when no sources

**NOT testing (pure display/styling):**
- Exact CSS classes or Tailwind tokens
- Badge colors
- Card layout

### Testing Server Actions
Server Actions that call Prisma and revalidatePath need mocking. Standard approach:
```typescript
// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  default: {
    incomeSource: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))
```

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npm run quality`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/app/ingresos/actions.test.ts` -- covers INC-02, INC-03, INC-04, INC-05
- [ ] `src/components/income/IncomeSourceCard.test.tsx` -- covers INC-01, INC-04
- [ ] `src/components/income/IncomeSourceForm.test.tsx` -- covers INC-02, INC-03
- [ ] `src/components/income/IncomeSummaryCards.test.tsx` -- covers INC-06

## Sources

### Primary (HIGH confidence)
- `prisma/schema.prisma` -- IncomeSource model definition, Frequency enum, @unique on name
- `src/lib/validators.ts` -- createIncomeSourceSchema Zod v4 definition
- `src/lib/utils.ts` -- formatMoney, toCents (string input), parseCents, cn
- `src/lib/serialize.ts` -- serializeBigInts implementation
- `src/lib/constants.ts` -- FREQUENCY_DISPLAY, INCOME_SOURCE_TYPES
- `src/types/index.ts` -- SerializedIncomeSource type definition
- `src/components/ui/Modal.tsx` -- Modal component with CSS responsive pattern
- `src/components/layout/PageHeader.tsx` -- PageHeader with action slot
- `node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-server.md` -- Server Actions API
- `node_modules/next/dist/docs/01-app/02-guides/forms.md` -- Form patterns with Server Actions
- `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/revalidatePath.md` -- revalidatePath API

### Secondary (MEDIUM confidence)
- `DFR.md` section 3.5 -- Income Sources module spec
- `DATA_FLOW.md` sections 3.5, 4.8 -- Income Sources queries and mutation revalidation
- `UX_RULES.md` sections 4.2, 4.3, 5.1 -- Modal editing, inline delete confirmation, empty states
- `STYLE_GUIDE.md` sections 8.1-8.6 -- Button, input, card, badge component specs

### Tertiary (LOW confidence)
- INC-05 variable average behavior when no transactions exist -- educated inference based on DFR.md description + pragmatic constraints

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed, all utilities already built and tested
- Architecture: HIGH -- patterns verified against existing codebase (Phases 1-4) and Next.js 16 official docs
- Pitfalls: HIGH -- derived from actual codebase inspection (unique constraints, import paths, type signatures)
- INC-05 implementation: MEDIUM -- variable average needs pragmatic fallback since transactions don't exist yet

**Research date:** 2026-04-05
**Valid until:** 2026-05-05 (30 days -- stack is stable, all dependencies locked)
