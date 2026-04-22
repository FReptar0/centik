import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { prisma } from '../setup'

// Mock next-auth to prevent next/server import chain.
vi.mock('next-auth', () => ({
  default: () => ({
    handlers: {},
    signIn: vi.fn(),
    signOut: vi.fn(),
    auth: vi.fn(),
  }),
}))

vi.mock('@auth/prisma-adapter', () => ({
  PrismaAdapter: vi.fn(),
}))

vi.mock('next-auth/providers/credentials', () => ({
  default: vi.fn(() => ({})),
}))

let userAId: string
let userBId: string

describe('Cross-user data isolation', () => {
  beforeAll(async () => {
    // Create User A (approved, with data)
    const userA = await prisma.user.create({
      data: {
        email: 'isolation-user-a@test.com',
        hashedPassword: 'not-a-real-hash',
        isApproved: true,
        totpEnabled: false,
      },
    })
    userAId = userA.id

    // Create User B (approved, no data)
    const userB = await prisma.user.create({
      data: {
        email: 'isolation-user-b@test.com',
        hashedPassword: 'not-a-real-hash',
        isApproved: true,
        totpEnabled: false,
      },
    })
    userBId = userB.id

    // Create test data for User A

    // Period (far future to avoid collision with seed data)
    const period = await prisma.period.create({
      data: {
        month: 1,
        year: 2099,
        startDate: new Date('2099-01-01'),
        endDate: new Date('2099-01-31'),
        userId: userAId,
      },
    })

    // Categories
    const expenseCategory = await prisma.category.create({
      data: {
        name: 'Isolation Test Expense',
        icon: 'test',
        color: '#FF0000',
        type: 'EXPENSE',
        userId: userAId,
      },
    })

    const incomeCategory = await prisma.category.create({
      data: {
        name: 'Isolation Test Income',
        icon: 'test',
        color: '#00FF00',
        type: 'INCOME',
        userId: userAId,
      },
    })

    // IncomeSource
    await prisma.incomeSource.create({
      data: {
        name: 'Isolation Test Source',
        defaultAmount: BigInt(5000000),
        frequency: 'QUINCENAL',
        type: 'EMPLOYMENT',
        userId: userAId,
      },
    })

    // Transactions (one INCOME, one EXPENSE)
    await prisma.transaction.createMany({
      data: [
        {
          type: 'INCOME',
          amount: BigInt(5000000),
          categoryId: incomeCategory.id,
          date: new Date('2099-01-15'),
          periodId: period.id,
          userId: userAId,
        },
        {
          type: 'EXPENSE',
          amount: BigInt(100000),
          categoryId: expenseCategory.id,
          date: new Date('2099-01-20'),
          periodId: period.id,
          userId: userAId,
        },
      ],
    })

    // Debt (PERSONAL_LOAN)
    await prisma.debt.create({
      data: {
        name: 'Isolation Test Loan',
        type: 'PERSONAL_LOAN',
        currentBalance: BigInt(1000000),
        annualRate: 1500,
        userId: userAId,
      },
    })

    // Budget entry
    await prisma.budget.create({
      data: {
        categoryId: expenseCategory.id,
        quincenalAmount: BigInt(200000),
        periodId: period.id,
        userId: userAId,
      },
    })

    // --- Phase 30 D-22 extensions: seed extra entities owned by User A ---

    // MonthlySummary (1:1 with Period)
    await prisma.monthlySummary.create({
      data: {
        periodId: period.id,
        totalIncome: BigInt(5000000),
        totalExpenses: BigInt(100000),
        totalSavings: BigInt(4900000),
        savingsRate: 9800, // 98.00% in basis points
        debtAtClose: BigInt(1000000),
        debtPayments: BigInt(0),
        userId: userAId,
      },
    })

    // ValueUnit (userId-scoped per schema; unique code keeps test DB idempotent)
    const valueUnit = await prisma.valueUnit.create({
      data: {
        code: `ISO-A-${Date.now()}`,
        name: 'Isolation Test Unit',
        precision: 2,
        isActive: true,
        userId: userAId,
      },
    })

    // UnitRate for that ValueUnit
    await prisma.unitRate.create({
      data: {
        unitId: valueUnit.id,
        date: new Date('2099-01-15'),
        rateToMxnCents: BigInt(100),
        rateRaw: '1.00',
        source: 'isolation-test',
        userId: userAId,
      },
    })

    // Asset linked to the ValueUnit
    await prisma.asset.create({
      data: {
        name: 'Isolation Test Asset',
        unitId: valueUnit.id,
        amount: BigInt(100000),
        category: 'SAVINGS',
        isActive: true,
        userId: userAId,
      },
    })

    // BackupCode — direct insert simulates a post-2FA-enable state
    await prisma.backupCode.create({
      data: {
        userId: userAId,
        codeHash: '$2a$12$fake.hash.for.isolation.test',
      },
    })
  }, 30000)

  afterAll(async () => {
    // Delete test data in correct FK order
    await prisma.transaction.deleteMany({
      where: { userId: { in: [userAId, userBId] } },
    })
    await prisma.budget.deleteMany({
      where: { userId: { in: [userAId, userBId] } },
    })
    await prisma.monthlySummary.deleteMany({
      where: { period: { userId: { in: [userAId, userBId] } } },
    })
    // --- Phase 30 D-22 cleanup: Asset/UnitRate reference ValueUnit,
    // so ValueUnit must be deleted last of these four. BackupCode has no
    // outgoing FKs besides User so order is flexible but placed first for clarity.
    await prisma.backupCode.deleteMany({ where: { userId: { in: [userAId, userBId] } } })
    await prisma.asset.deleteMany({ where: { userId: { in: [userAId, userBId] } } })
    await prisma.unitRate.deleteMany({ where: { userId: { in: [userAId, userBId] } } })
    await prisma.valueUnit.deleteMany({ where: { userId: { in: [userAId, userBId] } } })
    await prisma.debt.deleteMany({
      where: { userId: { in: [userAId, userBId] } },
    })
    await prisma.incomeSource.deleteMany({
      where: { userId: { in: [userAId, userBId] } },
    })
    await prisma.category.deleteMany({
      where: { userId: { in: [userAId, userBId] } },
    })
    await prisma.period.deleteMany({
      where: { userId: { in: [userAId, userBId] } },
    })
    await prisma.user.deleteMany({
      where: { id: { in: [userAId, userBId] } },
    })
  })

  it('User B sees zero transactions', async () => {
    const transactions = await prisma.transaction.findMany({
      where: { userId: userBId },
    })
    expect(transactions).toHaveLength(0)
  })

  it('User B sees zero categories', async () => {
    const categories = await prisma.category.findMany({
      where: { userId: userBId },
    })
    expect(categories).toHaveLength(0)
  })

  it('User B sees zero income sources', async () => {
    const sources = await prisma.incomeSource.findMany({
      where: { userId: userBId },
    })
    expect(sources).toHaveLength(0)
  })

  it('User B sees zero debts', async () => {
    const debts = await prisma.debt.findMany({
      where: { userId: userBId },
    })
    expect(debts).toHaveLength(0)
  })

  it('User B sees zero budgets', async () => {
    const budgets = await prisma.budget.findMany({
      where: { userId: userBId },
    })
    expect(budgets).toHaveLength(0)
  })

  it('User B sees zero periods', async () => {
    const periods = await prisma.period.findMany({
      where: { userId: userBId },
    })
    expect(periods).toHaveLength(0)
  })

  it('User A sees their own transactions', async () => {
    const transactions = await prisma.transaction.findMany({
      where: { userId: userAId },
    })
    expect(transactions).toHaveLength(2)
  })

  // --- Phase 30 D-22 new entity isolation tests ---

  it('User B sees zero monthly summaries', async () => {
    const summaries = await prisma.monthlySummary.findMany({
      where: { userId: userBId },
    })
    expect(summaries).toHaveLength(0)
  })

  it('User B sees zero assets', async () => {
    const assets = await prisma.asset.findMany({ where: { userId: userBId } })
    expect(assets).toHaveLength(0)
  })

  it('User B sees zero value units', async () => {
    const units = await prisma.valueUnit.findMany({ where: { userId: userBId } })
    expect(units).toHaveLength(0)
  })

  it('User B sees zero unit rates', async () => {
    const rates = await prisma.unitRate.findMany({ where: { userId: userBId } })
    expect(rates).toHaveLength(0)
  })

  it('User B sees zero backup codes', async () => {
    const codes = await prisma.backupCode.findMany({ where: { userId: userBId } })
    expect(codes).toHaveLength(0)
  })
})
