// Phase 30 Plan 30-05 (D-23) — Server-Action cross-user IDOR regression net.
// requireAuth() is mocked to return User A. Each test targets a User B row and
// asserts User B's row is byte-identical post-action. TOTP tests live in
// tests/integration/isolation-actions-totp.test.ts (file-size split).

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { prisma } from '../setup'

vi.mock('next-auth', () => ({
  default: () => ({ handlers: {}, signIn: vi.fn(), signOut: vi.fn(), auth: vi.fn() }),
}))
vi.mock('@auth/prisma-adapter', () => ({ PrismaAdapter: vi.fn() }))
vi.mock('next-auth/providers/credentials', () => ({ default: vi.fn(() => ({})) }))
vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: Object.assign(
    vi.fn().mockImplementation(() => ({
      limit: vi.fn().mockResolvedValue({
        success: true,
        limit: 5,
        remaining: 4,
        reset: Date.now() + 60000,
        pending: Promise.resolve(),
      }),
    })),
    { slidingWindow: vi.fn(), fixedWindow: vi.fn() },
  ),
}))
vi.mock('@upstash/redis', () => ({ Redis: { fromEnv: vi.fn(() => ({})) } }))
vi.mock('@/lib/auth-utils', () => ({ requireAuth: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { requireAuth } from '@/lib/auth-utils'
import { updateTransaction, deleteTransaction } from '@/app/(app)/movimientos/actions'
import { updateDebt, updateDebtBalance, deleteDebt } from '@/app/(app)/deudas/actions'
import { upsertBudgets } from '@/app/(app)/presupuesto/actions'
import { closePeriod, reopenPeriod } from '@/app/(app)/historial/actions'
import { updateIncomeSource, deleteIncomeSource } from '@/app/(app)/ingresos/actions'
import { deleteCategory } from '@/app/(app)/configuracion/actions'

const T = Date.now()
let userAId: string
let userBId: string
let userBPeriodId: string
let userBCategoryId: string
let userBTransactionId: string
let userBDebtId: string
let userBIncomeSourceId: string
let userBBudgetId: string

beforeAll(async () => {
  const a = await prisma.user.create({
    data: {
      email: `iso-action-a-${T}@test.com`,
      hashedPassword: 'x',
      isApproved: true,
      totpEnabled: false,
    },
  })
  userAId = a.id

  const b = await prisma.user.create({
    data: {
      email: `iso-action-b-${T}@test.com`,
      hashedPassword: 'x',
      isApproved: true,
      totpEnabled: false,
    },
  })
  userBId = b.id

  const period = await prisma.period.create({
    data: {
      month: 6,
      year: 2099,
      startDate: new Date('2099-06-01'),
      endDate: new Date('2099-06-30'),
      userId: userBId,
    },
  })
  userBPeriodId = period.id

  const category = await prisma.category.create({
    data: {
      name: `iso-cat-b-${T}`,
      icon: 'test',
      color: '#ABCDEF',
      type: 'EXPENSE',
      userId: userBId,
    },
  })
  userBCategoryId = category.id

  const txn = await prisma.transaction.create({
    data: {
      type: 'EXPENSE',
      amount: BigInt(500000),
      categoryId: category.id,
      date: new Date('2099-06-15'),
      periodId: period.id,
      userId: userBId,
    },
  })
  userBTransactionId = txn.id

  const debt = await prisma.debt.create({
    data: {
      name: `iso-debt-b-${T}`,
      type: 'PERSONAL_LOAN',
      currentBalance: BigInt(2000000),
      annualRate: 1800,
      userId: userBId,
    },
  })
  userBDebtId = debt.id

  const income = await prisma.incomeSource.create({
    data: {
      name: `iso-income-b-${T}`,
      defaultAmount: BigInt(3000000),
      frequency: 'QUINCENAL',
      type: 'EMPLOYMENT',
      userId: userBId,
    },
  })
  userBIncomeSourceId = income.id

  const budget = await prisma.budget.create({
    data: {
      categoryId: category.id,
      quincenalAmount: BigInt(400000),
      periodId: period.id,
      userId: userBId,
    },
  })
  userBBudgetId = budget.id
}, 30000)

afterAll(async () => {
  // FK-safe cleanup order. Any User-A rows created by upsertBudgets leakage
  // (see upsertBudgets test note) are swept by the [userAId, userBId] filter.
  await prisma.backupCode.deleteMany({ where: { userId: { in: [userAId, userBId] } } })
  await prisma.transaction.deleteMany({ where: { userId: { in: [userAId, userBId] } } })
  await prisma.monthlySummary.deleteMany({
    where: { period: { userId: { in: [userAId, userBId] } } },
  })
  await prisma.budget.deleteMany({ where: { userId: { in: [userAId, userBId] } } })
  await prisma.debt.deleteMany({ where: { userId: { in: [userAId, userBId] } } })
  await prisma.incomeSource.deleteMany({ where: { userId: { in: [userAId, userBId] } } })
  await prisma.category.deleteMany({ where: { userId: { in: [userAId, userBId] } } })
  await prisma.period.deleteMany({ where: { userId: { in: [userAId, userBId] } } })
  await prisma.user.deleteMany({ where: { id: { in: [userAId, userBId] } } })
})

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(requireAuth).mockResolvedValue({ userId: userAId })
})

// --- Transactions ---

describe('cross-user IDOR — transactions', () => {
  it('updateTransaction: User A cannot modify User B transaction', async () => {
    const result = await updateTransaction(userBTransactionId, {
      type: 'EXPENSE',
      amount: '999999',
      categoryId: userBCategoryId,
      date: '2099-06-15',
    })
    if ('success' in result) {
      throw new Error('updateTransaction should not succeed on User B row with User A session')
    }
    const after = await prisma.transaction.findUnique({ where: { id: userBTransactionId } })
    expect(after?.amount).toBe(BigInt(500000))
    expect(after?.userId).toBe(userBId)
  })

  it('deleteTransaction: User A cannot delete User B transaction', async () => {
    const result = await deleteTransaction(userBTransactionId)
    if ('success' in result) {
      throw new Error('deleteTransaction should not succeed on User B row')
    }
    const after = await prisma.transaction.findUnique({ where: { id: userBTransactionId } })
    expect(after).not.toBeNull()
    expect(after!.userId).toBe(userBId)
  })
})

// --- Debts ---

describe('cross-user IDOR — debts', () => {
  it('updateDebt: User A cannot modify User B debt', async () => {
    const result = await updateDebt(userBDebtId, {
      name: 'attacker-rename',
      type: 'PERSONAL_LOAN',
      currentBalance: '1',
      annualRate: 0,
    })
    if ('success' in result) throw new Error('updateDebt should not succeed')
    const after = await prisma.debt.findUnique({ where: { id: userBDebtId } })
    expect(after?.name).not.toBe('attacker-rename')
    expect(after?.userId).toBe(userBId)
    expect(after?.currentBalance).toBe(BigInt(2000000))
  })

  it('updateDebtBalance: User A cannot modify User B debt balance', async () => {
    const result = await updateDebtBalance(userBDebtId, { currentBalance: '1' })
    if ('success' in result) throw new Error('updateDebtBalance should not succeed')
    const after = await prisma.debt.findUnique({ where: { id: userBDebtId } })
    expect(after?.currentBalance).toBe(BigInt(2000000))
    expect(after?.userId).toBe(userBId)
  })

  it('deleteDebt: User A cannot delete User B debt', async () => {
    const result = await deleteDebt(userBDebtId)
    if ('success' in result) throw new Error('deleteDebt should not succeed')
    const after = await prisma.debt.findUnique({ where: { id: userBDebtId } })
    expect(after).not.toBeNull()
    expect(after!.userId).toBe(userBId)
  })
})

// --- Budgets ---
//
// Phase 30.1 RESOLVED the partial-IDOR originally documented here. upsertBudgets
// now runs two ownership guards before any write: (1) period.findFirst by
// { id, userId } rejects cross-user periodId, (2) batched category.findMany
// rejects any cross-user categoryId in entries[]. Both return the ambiguous
// `{ error: { _form: [...] } }` shape consistent with the rest of the action
// surface — no identity leak, no stale row creation.

describe('cross-user IDOR — budgets', () => {
  it('upsertBudgets: User A cannot overwrite User B budget row (cross-user periodId rejected)', async () => {
    const result = await upsertBudgets(userBPeriodId, {
      entries: [{ categoryId: userBCategoryId, quincenalAmount: '999' }],
    })
    // Phase 30.1: action now rejects instead of silently creating a stale row
    if ('success' in result)
      throw new Error('upsertBudgets should not succeed with cross-user periodId')
    expect(result.error._form).toContain('Periodo no encontrado')

    // Load-bearing: User B's existing budget is byte-identical to pre-action
    const after = await prisma.budget.findUnique({ where: { id: userBBudgetId } })
    expect(after?.quincenalAmount).toBe(BigInt(400000))
    expect(after?.userId).toBe(userBId)

    // Phase 30.1: confirm no stale User-A row was created against User B's period
    const staleRows = await prisma.budget.findMany({
      where: { periodId: userBPeriodId, userId: userAId },
    })
    expect(staleRows).toHaveLength(0)
  })

  it('upsertBudgets: User A cannot create budgets using User B categoryId against their own period (cross-user categoryId rejected)', async () => {
    // Seed User A period so the period guard passes; the categoryId guard must then reject.
    const userAPeriod = await prisma.period.create({
      data: {
        month: 5,
        year: 2099,
        isClosed: false,
        startDate: new Date('2099-05-01'),
        endDate: new Date('2099-05-31'),
        userId: userAId,
      },
    })

    try {
      const result = await upsertBudgets(userAPeriod.id, {
        entries: [{ categoryId: userBCategoryId, quincenalAmount: '500' }],
      })
      if ('success' in result)
        throw new Error('upsertBudgets should not succeed with cross-user categoryId')
      expect(result.error._form).toContain('Categoria no encontrada')

      // Confirm no stale row was created using User B's categoryId
      const staleRows = await prisma.budget.findMany({
        where: { categoryId: userBCategoryId, userId: userAId },
      })
      expect(staleRows).toHaveLength(0)
    } finally {
      await prisma.period.delete({ where: { id: userAPeriod.id } })
    }
  })
})

// --- Periods (history) ---

describe('cross-user IDOR — periods', () => {
  it('closePeriod: User A cannot close User B period', async () => {
    const result = await closePeriod(userBPeriodId)
    if ('success' in result) throw new Error('closePeriod should not succeed')
    const after = await prisma.period.findUnique({ where: { id: userBPeriodId } })
    expect(after?.isClosed).toBe(false)
    expect(after?.userId).toBe(userBId)
    // No MonthlySummary was created under any userId for this period
    const summary = await prisma.monthlySummary.findUnique({ where: { periodId: userBPeriodId } })
    expect(summary).toBeNull()
  })

  it('reopenPeriod: User A cannot reopen User B period', async () => {
    // Force User B's period into closed state via direct DB write
    await prisma.period.update({
      where: { id: userBPeriodId },
      data: { isClosed: true, closedAt: new Date() },
    })
    const result = await reopenPeriod(userBPeriodId)
    if ('success' in result) throw new Error('reopenPeriod should not succeed')
    const after = await prisma.period.findUnique({ where: { id: userBPeriodId } })
    expect(after?.isClosed).toBe(true) // still closed
    // Reset for downstream tests
    await prisma.period.update({
      where: { id: userBPeriodId },
      data: { isClosed: false, closedAt: null },
    })
  })
})

// --- Income sources ---

describe('cross-user IDOR — income sources', () => {
  it('updateIncomeSource: User A cannot modify User B income source', async () => {
    const result = await updateIncomeSource(userBIncomeSourceId, {
      name: `attacker-rename-${T}`,
      defaultAmount: '1',
      frequency: 'QUINCENAL',
      type: 'EMPLOYMENT',
    })
    if ('success' in result) throw new Error('updateIncomeSource should not succeed')
    const after = await prisma.incomeSource.findUnique({ where: { id: userBIncomeSourceId } })
    expect(after?.name).not.toBe(`attacker-rename-${T}`)
    expect(after?.defaultAmount).toBe(BigInt(3000000))
    expect(after?.userId).toBe(userBId)
  })

  it('deleteIncomeSource: User A cannot delete User B income source', async () => {
    const result = await deleteIncomeSource(userBIncomeSourceId)
    if ('success' in result) throw new Error('deleteIncomeSource should not succeed')
    const after = await prisma.incomeSource.findUnique({ where: { id: userBIncomeSourceId } })
    expect(after).not.toBeNull()
    expect(after!.userId).toBe(userBId)
  })
})

// --- Categories ---

describe('cross-user IDOR — categories', () => {
  it('deleteCategory: User A cannot delete User B category', async () => {
    const result = await deleteCategory(userBCategoryId)
    if ('success' in result) throw new Error('deleteCategory should not succeed')
    const after = await prisma.category.findUnique({ where: { id: userBCategoryId } })
    expect(after).not.toBeNull()
    expect(after!.isActive).toBe(true) // soft-delete flag not flipped
    expect(after!.userId).toBe(userBId)
  })
})

// --- TOTP action tests live in tests/integration/isolation-actions-totp.test.ts
// File-size split (CLAUDE.md <300 line rule + plan 30-05 Task 2 file-size guidance).
