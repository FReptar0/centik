import { execSync } from 'child_process'
import { describe, it, expect, beforeAll } from 'vitest'
import { prisma } from '../setup'

const TEST_DB_URL = process.env.DATABASE_URL!

const execEnv = {
  ...process.env,
  DATABASE_URL: TEST_DB_URL,
  PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION: 'Integration test seed reset',
}

describe('Seed data correctness', () => {
  beforeAll(() => {
    execSync('npx prisma migrate reset --force', {
      env: execEnv,
      stdio: 'pipe',
    })
    execSync('npx prisma db seed', {
      env: execEnv,
      stdio: 'pipe',
    })
  }, 60000)

  it('seeds 8 categories (6 expense, 2 income)', async () => {
    const categories = await prisma.category.findMany()
    expect(categories).toHaveLength(8)

    const expenseCategories = categories.filter((c) => c.type === 'EXPENSE')
    const incomeCategories = categories.filter((c) => c.type === 'INCOME')
    expect(expenseCategories).toHaveLength(6)
    expect(incomeCategories).toHaveLength(2)

    const expectedNames = [
      'Comida',
      'Servicios',
      'Entretenimiento',
      'Suscripciones',
      'Transporte',
      'Otros',
      'Empleo',
      'Freelance',
    ]
    const actualNames = categories.map((c) => c.name).sort()
    expect(actualNames).toEqual(expectedNames.sort())
  })

  it('seeds categories with correct Lucide icon names', async () => {
    const categories = await prisma.category.findMany({
      orderBy: { sortOrder: 'asc' },
    })

    const expectedIcons = [
      'utensils',
      'zap',
      'clapperboard',
      'smartphone',
      'car',
      'package',
      'briefcase',
      'laptop',
    ]
    const actualIcons = categories.map((c) => c.icon)
    expect(actualIcons).toEqual(expectedIcons)
  })

  it('seeds 2 periods (previous closed, current open)', async () => {
    const periods = await prisma.period.findMany({
      orderBy: { month: 'asc' },
    })
    expect(periods).toHaveLength(2)

    const march = periods[0]
    expect(march.month).toBe(3)
    expect(march.year).toBe(2026)
    expect(march.isClosed).toBe(true)

    const april = periods[1]
    expect(april.month).toBe(4)
    expect(april.year).toBe(2026)
    expect(april.isClosed).toBe(false)
  })

  it('seeds 2 income sources with non-zero amounts', async () => {
    const sources = await prisma.incomeSource.findMany()
    expect(sources).toHaveLength(2)

    const tersoft = sources.find((s) => s.name === 'TerSoft (Empleo)')
    expect(tersoft).toBeDefined()
    expect(tersoft!.defaultAmount).toBeGreaterThan(BigInt(0))

    const freelance = sources.find((s) => s.name === 'Freelance')
    expect(freelance).toBeDefined()
    expect(freelance!.defaultAmount).toBeGreaterThan(BigInt(0))
  })

  it('seeds 2 debts with non-zero balances', async () => {
    const debts = await prisma.debt.findMany()
    expect(debts).toHaveLength(2)

    const creditCard = debts.find((d) => d.name === 'Tarjeta Nu')
    expect(creditCard).toBeDefined()
    expect(creditCard!.type).toBe('CREDIT_CARD')
    expect(creditCard!.currentBalance).toBeGreaterThan(BigInt(0))

    const loan = debts.find((d) => d.name === 'Prestamo Personal')
    expect(loan).toBeDefined()
    expect(loan!.type).toBe('PERSONAL_LOAN')
    expect(loan!.currentBalance).toBeGreaterThan(BigInt(0))
  })

  it('seeds budget entries for current period', async () => {
    const currentPeriod = await prisma.period.findFirst({
      where: { month: 4, year: 2026 },
    })
    expect(currentPeriod).toBeDefined()

    const budgets = await prisma.budget.findMany({
      where: { periodId: currentPeriod!.id },
    })
    expect(budgets).toHaveLength(6)

    for (const budget of budgets) {
      expect(budget.quincenalAmount).toBeGreaterThan(BigInt(0))
    }
  })

  it('seeds sample transactions for both periods', async () => {
    const currentPeriod = await prisma.period.findFirst({
      where: { month: 4, year: 2026 },
    })
    const previousPeriod = await prisma.period.findFirst({
      where: { month: 3, year: 2026 },
    })

    const currentTxns = await prisma.transaction.count({
      where: { periodId: currentPeriod!.id },
    })
    expect(currentTxns).toBeGreaterThan(0)
    expect(currentTxns).toBeGreaterThanOrEqual(12)

    const previousTxns = await prisma.transaction.count({
      where: { periodId: previousPeriod!.id },
    })
    expect(previousTxns).toBeGreaterThan(0)
    expect(previousTxns).toBeGreaterThanOrEqual(8)
  })

  it('seeds MonthlySummary for closed period', async () => {
    const previousPeriod = await prisma.period.findFirst({
      where: { month: 3, year: 2026 },
    })
    expect(previousPeriod).toBeDefined()

    const summary = await prisma.monthlySummary.findUnique({
      where: { periodId: previousPeriod!.id },
    })
    expect(summary).toBeDefined()
    expect(summary!.totalIncome).toBeGreaterThan(BigInt(0))
    expect(summary!.totalExpenses).toBeGreaterThan(BigInt(0))
  })

  it('seeds 3 value units (MXN, UDI, UMA)', async () => {
    const units = await prisma.valueUnit.findMany()
    expect(units).toHaveLength(3)

    const codes = units.map((u) => u.code).sort()
    expect(codes).toEqual(['MXN', 'UDI', 'UMA'])
  })

  it('seeds unit rates for UDI and UMA', async () => {
    const rates = await prisma.unitRate.findMany()
    expect(rates).toHaveLength(2)

    for (const rate of rates) {
      expect(rate.rateToMxnCents).toBeGreaterThan(BigInt(0))
    }
  })

  it('seeds admin user with isApproved=true', async () => {
    const users = await prisma.user.findMany()
    expect(users.length).toBeGreaterThanOrEqual(1)

    const admin = users.find((u) => u.isApproved)
    expect(admin).toBeDefined()
    expect(admin!.email).toBeDefined()
  })

  it('marks the admin user with isAdmin: true', async () => {
    const admin = await prisma.user.findUnique({
      where: { email: process.env.ADMIN_EMAIL || 'fmemije00@gmail.com' },
      select: { isAdmin: true },
    })
    expect(admin?.isAdmin).toBe(true)
  })

  it('all records have non-null userId', async () => {
    const categories = await prisma.category.findMany()
    for (const cat of categories) {
      expect(cat.userId).not.toBeNull()
    }

    const transactions = await prisma.transaction.findMany()
    for (const txn of transactions) {
      expect(txn.userId).not.toBeNull()
    }

    const periods = await prisma.period.findMany()
    for (const period of periods) {
      expect(period.userId).not.toBeNull()
    }

    const debts = await prisma.debt.findMany()
    for (const debt of debts) {
      expect(debt.userId).not.toBeNull()
    }

    const budgets = await prisma.budget.findMany()
    for (const budget of budgets) {
      expect(budget.userId).not.toBeNull()
    }
  })

  it('all monetary fields are BigInt', async () => {
    const debt = await prisma.debt.findFirst()
    expect(debt).toBeDefined()
    expect(typeof debt!.currentBalance).toBe('bigint')

    const transaction = await prisma.transaction.findFirst()
    expect(transaction).toBeDefined()
    expect(typeof transaction!.amount).toBe('bigint')

    const budget = await prisma.budget.findFirst()
    expect(budget).toBeDefined()
    expect(typeof budget!.quincenalAmount).toBe('bigint')

    const summary = await prisma.monthlySummary.findFirst()
    expect(summary).toBeDefined()
    expect(typeof summary!.totalIncome).toBe('bigint')
  })
})

describe('Seed idempotency', () => {
  it('running seed twice produces no errors', () => {
    expect(() => {
      execSync('npx prisma db seed', {
        env: execEnv,
        stdio: 'pipe',
      })
    }).not.toThrow()
  }, 30000)

  it('running seed twice produces no duplicate categories', async () => {
    const count = await prisma.category.count()
    expect(count).toBe(8)
  })

  it('running seed twice produces no duplicate periods', async () => {
    const count = await prisma.period.count()
    expect(count).toBe(2)
  })

  it('running seed twice produces no duplicate transactions', async () => {
    const currentPeriod = await prisma.period.findFirst({
      where: { month: 4, year: 2026 },
    })
    const previousPeriod = await prisma.period.findFirst({
      where: { month: 3, year: 2026 },
    })

    const currentTxns = await prisma.transaction.count({
      where: { periodId: currentPeriod!.id },
    })
    expect(currentTxns).toBe(13)

    const previousTxns = await prisma.transaction.count({
      where: { periodId: previousPeriod!.id },
    })
    expect(previousTxns).toBe(9)
  })
})
