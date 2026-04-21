import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getMonthlySummariesForYear, getAvailableYears, getClosePeriodPreview } from './history'

const TEST_USER_ID = 'test-user-id'

const mockMonthlySummaryFindMany = vi.fn()
const mockPeriodFindMany = vi.fn()
const mockTransactionAggregate = vi.fn()
const mockDebtAggregate = vi.fn()

vi.mock('@/lib/prisma', () => ({
  default: {
    monthlySummary: {
      findMany: (...args: unknown[]) => mockMonthlySummaryFindMany(...args),
    },
    period: {
      findMany: (...args: unknown[]) => mockPeriodFindMany(...args),
    },
    transaction: {
      aggregate: (...args: unknown[]) => mockTransactionAggregate(...args),
    },
    debt: {
      aggregate: (...args: unknown[]) => mockDebtAggregate(...args),
    },
  },
}))

describe('getMonthlySummariesForYear', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 12-slot array with correct serialized data for months with summaries', async () => {
    mockMonthlySummaryFindMany.mockResolvedValue([
      {
        id: 'ms-1',
        periodId: 'p-1',
        totalIncome: BigInt(500000),
        totalExpenses: BigInt(300000),
        totalSavings: BigInt(200000),
        savingsRate: 4000,
        debtAtClose: BigInt(1000000),
        debtPayments: BigInt(0),
        notes: null,
        userId: TEST_USER_ID,
        createdAt: new Date('2026-03-31'),
        period: { month: 3, year: 2026 },
      },
    ])

    const result = await getMonthlySummariesForYear(2026, TEST_USER_ID)

    expect(result).toHaveLength(12)

    // March (index 2) should have data
    expect(result[2].month).toBe(3)
    expect(result[2].year).toBe(2026)
    expect(result[2].data).not.toBeNull()
    expect(result[2].data!.totalIncome).toBe('500000')
    expect(result[2].data!.totalExpenses).toBe('300000')
    expect(result[2].data!.totalSavings).toBe('200000')
    expect(result[2].data!.savingsRate).toBe(4000)
    expect(result[2].data!.debtAtClose).toBe('1000000')
    expect(result[2].data!.debtPayments).toBe('0')

    // January (index 0) should be null
    expect(result[0].month).toBe(1)
    expect(result[0].year).toBe(2026)
    expect(result[0].data).toBeNull()
  })

  it('returns all null data when no summaries exist for the year', async () => {
    mockMonthlySummaryFindMany.mockResolvedValue([])

    const result = await getMonthlySummariesForYear(2025, TEST_USER_ID)

    expect(result).toHaveLength(12)
    for (let i = 0; i < 12; i++) {
      expect(result[i].month).toBe(i + 1)
      expect(result[i].year).toBe(2025)
      expect(result[i].data).toBeNull()
    }
  })

  it('handles partial year data correctly', async () => {
    mockMonthlySummaryFindMany.mockResolvedValue([
      {
        id: 'ms-1',
        periodId: 'p-1',
        totalIncome: BigInt(100000),
        totalExpenses: BigInt(50000),
        totalSavings: BigInt(50000),
        savingsRate: 5000,
        debtAtClose: BigInt(0),
        debtPayments: BigInt(0),
        notes: null,
        userId: TEST_USER_ID,
        createdAt: new Date('2026-01-31'),
        period: { month: 1, year: 2026 },
      },
      {
        id: 'ms-6',
        periodId: 'p-6',
        totalIncome: BigInt(600000),
        totalExpenses: BigInt(400000),
        totalSavings: BigInt(200000),
        savingsRate: 3333,
        debtAtClose: BigInt(500000),
        debtPayments: BigInt(0),
        notes: 'Buen mes',
        userId: TEST_USER_ID,
        createdAt: new Date('2026-06-30'),
        period: { month: 6, year: 2026 },
      },
    ])

    const result = await getMonthlySummariesForYear(2026, TEST_USER_ID)

    expect(result).toHaveLength(12)
    expect(result[0].data).not.toBeNull()
    expect(result[0].data!.totalIncome).toBe('100000')
    expect(result[5].data).not.toBeNull()
    expect(result[5].data!.notes).toBe('Buen mes')

    // Months without summaries should be null
    expect(result[1].data).toBeNull()
    expect(result[2].data).toBeNull()
    expect(result[11].data).toBeNull()
  })
})

describe('getAvailableYears', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns sorted distinct years from periods', async () => {
    mockPeriodFindMany.mockResolvedValue([{ year: 2025 }, { year: 2026 }])

    const result = await getAvailableYears(TEST_USER_ID)

    expect(result).toEqual([2025, 2026])
  })

  it('returns empty array when no periods exist', async () => {
    mockPeriodFindMany.mockResolvedValue([])

    const result = await getAvailableYears(TEST_USER_ID)

    expect(result).toEqual([])
  })

  it('returns single year when only one period exists', async () => {
    mockPeriodFindMany.mockResolvedValue([{ year: 2026 }])

    const result = await getAvailableYears(TEST_USER_ID)

    expect(result).toEqual([2026])
  })
})

describe('getClosePeriodPreview', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('computes correct totals with BigInt arithmetic', async () => {
    mockTransactionAggregate
      .mockResolvedValueOnce({ _sum: { amount: BigInt(500000) } }) // income
      .mockResolvedValueOnce({ _sum: { amount: BigInt(300000) } }) // expenses

    mockDebtAggregate.mockResolvedValue({
      _sum: { currentBalance: BigInt(1000000) },
    })

    const result = await getClosePeriodPreview('period-1', TEST_USER_ID)

    expect(result.totalIncome).toBe('500000')
    expect(result.totalExpenses).toBe('300000')
    expect(result.totalSavings).toBe('200000')
    // savingsRate = (200000 * 10000) / 500000 = 4000 basis points = 40%
    expect(result.savingsRate).toBe(4000)
    expect(result.debtAtClose).toBe('1000000')
    expect(result.debtPayments).toBe('0')
  })

  it('handles zero income without division by zero', async () => {
    mockTransactionAggregate
      .mockResolvedValueOnce({ _sum: { amount: null } }) // no income
      .mockResolvedValueOnce({ _sum: { amount: BigInt(50000) } }) // expenses

    mockDebtAggregate.mockResolvedValue({
      _sum: { currentBalance: null },
    })

    const result = await getClosePeriodPreview('period-empty', TEST_USER_ID)

    expect(result.totalIncome).toBe('0')
    expect(result.totalExpenses).toBe('50000')
    expect(result.totalSavings).toBe('-50000')
    expect(result.savingsRate).toBe(0)
    expect(result.debtAtClose).toBe('0')
    expect(result.debtPayments).toBe('0')
  })

  it('handles no transactions and no debts', async () => {
    mockTransactionAggregate
      .mockResolvedValueOnce({ _sum: { amount: null } }) // no income
      .mockResolvedValueOnce({ _sum: { amount: null } }) // no expenses

    mockDebtAggregate.mockResolvedValue({
      _sum: { currentBalance: null },
    })

    const result = await getClosePeriodPreview('period-new', TEST_USER_ID)

    expect(result.totalIncome).toBe('0')
    expect(result.totalExpenses).toBe('0')
    expect(result.totalSavings).toBe('0')
    expect(result.savingsRate).toBe(0)
    expect(result.debtAtClose).toBe('0')
    expect(result.debtPayments).toBe('0')
  })

  it('handles negative savings (expenses > income)', async () => {
    mockTransactionAggregate
      .mockResolvedValueOnce({ _sum: { amount: BigInt(100000) } }) // income
      .mockResolvedValueOnce({ _sum: { amount: BigInt(300000) } }) // expenses

    mockDebtAggregate.mockResolvedValue({
      _sum: { currentBalance: BigInt(500000) },
    })

    const result = await getClosePeriodPreview('period-neg', TEST_USER_ID)

    expect(result.totalIncome).toBe('100000')
    expect(result.totalExpenses).toBe('300000')
    expect(result.totalSavings).toBe('-200000')
    // savingsRate = (-200000 * 10000) / 100000 = -20000 basis points
    expect(result.savingsRate).toBe(-20000)
    expect(result.debtAtClose).toBe('500000')
  })
})
