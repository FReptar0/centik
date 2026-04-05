import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getDashboardKPIs,
  getCategoryExpenses,
  getBudgetVsSpent,
  getMonthlyTrend,
  getRecentTransactions,
} from './dashboard'

const mockAggregate = vi.fn()
const mockGroupBy = vi.fn()
const mockFindMany = vi.fn()

const mockDebtAggregate = vi.fn()
const mockIncomeSourceFindMany = vi.fn()

const mockBudgetFindMany = vi.fn()

const mockMonthlySummaryFindMany = vi.fn()

const mockCategoryFindMany = vi.fn()

vi.mock('@/lib/prisma', () => ({
  default: {
    transaction: {
      aggregate: (...args: unknown[]) => mockAggregate(...args),
      groupBy: (...args: unknown[]) => mockGroupBy(...args),
      findMany: (...args: unknown[]) => mockFindMany(...args),
    },
    debt: {
      aggregate: (...args: unknown[]) => mockDebtAggregate(...args),
    },
    incomeSource: {
      findMany: (...args: unknown[]) => mockIncomeSourceFindMany(...args),
    },
    budget: {
      findMany: (...args: unknown[]) => mockBudgetFindMany(...args),
    },
    monthlySummary: {
      findMany: (...args: unknown[]) => mockMonthlySummaryFindMany(...args),
    },
    category: {
      findMany: (...args: unknown[]) => mockCategoryFindMany(...args),
    },
  },
}))

describe('getDashboardKPIs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('computes KPIs correctly with income, expenses, and debt', async () => {
    // Monthly income: QUINCENAL 2500000 * 2 = 5000000
    mockIncomeSourceFindMany.mockResolvedValue([
      { defaultAmount: BigInt(2500000), frequency: 'QUINCENAL' },
    ])
    // Expenses: 1500000
    mockAggregate
      .mockResolvedValueOnce({ _sum: { amount: BigInt(1500000) } }) // expenses
      .mockResolvedValueOnce({ _sum: { amount: BigInt(3000000) } }) // income transactions
    // Debt: 10000000
    mockDebtAggregate.mockResolvedValue({ _sum: { currentBalance: BigInt(10000000) } })

    const result = await getDashboardKPIs('period-1')

    expect(result.monthlyEstimatedIncome).toBe('5000000')
    expect(result.monthExpenses).toBe('1500000')
    // available = estimatedIncome - expenses = 5000000 - 1500000 = 3500000
    expect(result.available).toBe('3500000')
    expect(result.totalDebt).toBe('10000000')
    // savingsRate = (5000000 - 1500000) / 5000000 * 10000 = 7000
    expect(result.savingsRate).toBe(7000)
    // debtToIncomeRatio = 10000000 / 5000000 * 10000 = 20000
    expect(result.debtToIncomeRatio).toBe(20000)
  })

  it('returns zero rates when income is zero', async () => {
    mockIncomeSourceFindMany.mockResolvedValue([])
    mockAggregate
      .mockResolvedValueOnce({ _sum: { amount: null } })
      .mockResolvedValueOnce({ _sum: { amount: null } })
    mockDebtAggregate.mockResolvedValue({ _sum: { currentBalance: null } })

    const result = await getDashboardKPIs('period-1')

    expect(result.monthlyEstimatedIncome).toBe('0')
    expect(result.monthExpenses).toBe('0')
    expect(result.available).toBe('0')
    expect(result.totalDebt).toBe('0')
    expect(result.savingsRate).toBe(0)
    expect(result.debtToIncomeRatio).toBe(0)
  })

  it('handles SEMANAL frequency with x4 multiplier', async () => {
    mockIncomeSourceFindMany.mockResolvedValue([
      { defaultAmount: BigInt(625000), frequency: 'SEMANAL' },
    ])
    mockAggregate
      .mockResolvedValueOnce({ _sum: { amount: BigInt(0) } })
      .mockResolvedValueOnce({ _sum: { amount: BigInt(0) } })
    mockDebtAggregate.mockResolvedValue({ _sum: { currentBalance: BigInt(0) } })

    const result = await getDashboardKPIs('period-1')

    // SEMANAL * 4 = 625000 * 4 = 2500000
    expect(result.monthlyEstimatedIncome).toBe('2500000')
  })

  it('handles MENSUAL and VARIABLE frequency as x1 multiplier', async () => {
    mockIncomeSourceFindMany.mockResolvedValue([
      { defaultAmount: BigInt(3000000), frequency: 'MENSUAL' },
      { defaultAmount: BigInt(1000000), frequency: 'VARIABLE' },
    ])
    mockAggregate
      .mockResolvedValueOnce({ _sum: { amount: BigInt(0) } })
      .mockResolvedValueOnce({ _sum: { amount: BigInt(0) } })
    mockDebtAggregate.mockResolvedValue({ _sum: { currentBalance: BigInt(0) } })

    const result = await getDashboardKPIs('period-1')

    // MENSUAL 3000000 * 1 + VARIABLE 1000000 * 1 = 4000000
    expect(result.monthlyEstimatedIncome).toBe('4000000')
  })

  it('handles mixed frequencies correctly', async () => {
    mockIncomeSourceFindMany.mockResolvedValue([
      { defaultAmount: BigInt(2500000), frequency: 'QUINCENAL' },
      { defaultAmount: BigInt(1000000), frequency: 'MENSUAL' },
    ])
    mockAggregate
      .mockResolvedValueOnce({ _sum: { amount: BigInt(500000) } })
      .mockResolvedValueOnce({ _sum: { amount: BigInt(0) } })
    mockDebtAggregate.mockResolvedValue({ _sum: { currentBalance: BigInt(0) } })

    const result = await getDashboardKPIs('period-1')

    // QUINCENAL 2500000 * 2 + MENSUAL 1000000 * 1 = 6000000
    expect(result.monthlyEstimatedIncome).toBe('6000000')
    expect(result.available).toBe('5500000') // 6000000 - 500000
  })
})

describe('getCategoryExpenses', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns category expenses sorted by total descending', async () => {
    mockGroupBy.mockResolvedValue([
      { categoryId: 'cat-1', _sum: { amount: BigInt(500000) } },
      { categoryId: 'cat-2', _sum: { amount: BigInt(1200000) } },
    ])
    mockCategoryFindMany.mockResolvedValue([
      { id: 'cat-1', name: 'Comida', icon: 'utensils', color: '#fb923c' },
      { id: 'cat-2', name: 'Servicios', icon: 'zap', color: '#60a5fa' },
    ])

    const result = await getCategoryExpenses('period-1')

    expect(result).toHaveLength(2)
    // Sorted desc: Servicios (1200000) first, Comida (500000) second
    expect(result[0].name).toBe('Servicios')
    expect(result[0].total).toBe('1200000')
    expect(result[0].icon).toBe('zap')
    expect(result[0].color).toBe('#60a5fa')
    expect(result[1].name).toBe('Comida')
    expect(result[1].total).toBe('500000')
  })

  it('returns empty array when no expenses', async () => {
    mockGroupBy.mockResolvedValue([])

    const result = await getCategoryExpenses('period-1')

    expect(result).toEqual([])
  })
})

describe('getBudgetVsSpent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns budget vs spent with monthly budget = quincenal * 2', async () => {
    mockBudgetFindMany.mockResolvedValue([
      {
        categoryId: 'cat-1',
        quincenalAmount: BigInt(250000),
        category: { name: 'Comida', color: '#fb923c' },
      },
      {
        categoryId: 'cat-2',
        quincenalAmount: BigInt(100000),
        category: { name: 'Servicios', color: '#60a5fa' },
      },
    ])
    mockGroupBy.mockResolvedValue([
      { categoryId: 'cat-1', _sum: { amount: BigInt(300000) } },
    ])

    const result = await getBudgetVsSpent('period-1')

    expect(result).toHaveLength(2)
    expect(result[0].name).toBe('Comida')
    expect(result[0].budget).toBe('500000') // 250000 * 2
    expect(result[0].spent).toBe('300000')
    expect(result[1].name).toBe('Servicios')
    expect(result[1].budget).toBe('200000') // 100000 * 2
    expect(result[1].spent).toBe('0') // no expenses matched
  })

  it('returns empty array when no budgets', async () => {
    mockBudgetFindMany.mockResolvedValue([])
    mockGroupBy.mockResolvedValue([])

    const result = await getBudgetVsSpent('period-1')

    expect(result).toEqual([])
  })
})

describe('getMonthlyTrend', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns monthly summaries ordered chronologically with serialized amounts', async () => {
    mockMonthlySummaryFindMany.mockResolvedValue([
      {
        periodId: 'p-1',
        totalIncome: BigInt(5000000),
        totalExpenses: BigInt(3000000),
        totalSavings: BigInt(2000000),
        period: { month: 1, year: 2026 },
      },
      {
        periodId: 'p-2',
        totalIncome: BigInt(5500000),
        totalExpenses: BigInt(2800000),
        totalSavings: BigInt(2700000),
        period: { month: 2, year: 2026 },
      },
    ])

    const result = await getMonthlyTrend()

    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({
      month: 1,
      year: 2026,
      totalIncome: '5000000',
      totalExpenses: '3000000',
      totalSavings: '2000000',
    })
    expect(result[1]).toEqual({
      month: 2,
      year: 2026,
      totalIncome: '5500000',
      totalExpenses: '2800000',
      totalSavings: '2700000',
    })
  })

  it('returns empty array when no summaries exist', async () => {
    mockMonthlySummaryFindMany.mockResolvedValue([])

    const result = await getMonthlyTrend()

    expect(result).toEqual([])
  })
})

describe('getRecentTransactions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns last 8 transactions with category data serialized', async () => {
    mockFindMany.mockResolvedValue([
      {
        id: 'tx-1',
        type: 'EXPENSE',
        amount: BigInt(150075),
        description: 'Lunch',
        categoryId: 'cat-1',
        date: new Date('2026-04-05'),
        createdAt: new Date(),
        updatedAt: new Date(),
        periodId: 'period-1',
        incomeSourceId: null,
        paymentMethod: 'DEBITO',
        notes: null,
        category: { name: 'Comida', icon: 'utensils', color: '#fb923c' },
      },
    ])

    const result = await getRecentTransactions('period-1')

    expect(result).toHaveLength(1)
    expect(result[0].amount).toBe('150075')
    expect(result[0].category.name).toBe('Comida')
    expect(result[0].category.icon).toBe('utensils')
    expect(result[0].category.color).toBe('#fb923c')
  })

  it('passes correct take and orderBy to Prisma', async () => {
    mockFindMany.mockResolvedValue([])

    await getRecentTransactions('period-1')

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { periodId: 'period-1' },
        take: 8,
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      }),
    )
  })
})
