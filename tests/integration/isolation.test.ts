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
})
