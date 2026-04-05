import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getBudgetColor, getBudgetsWithSpent, copyBudgetsFromPreviousPeriod } from './budget'

const mockFindMany = vi.fn()
const mockGroupBy = vi.fn()
const mockFindUnique = vi.fn()
const mockCreateMany = vi.fn()

vi.mock('@/lib/prisma', () => ({
  default: {
    budget: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      createMany: (...args: unknown[]) => mockCreateMany(...args),
    },
    transaction: {
      groupBy: (...args: unknown[]) => mockGroupBy(...args),
    },
    period: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
  },
}))

describe('getBudgetColor', () => {
  it('returns positive for 0% usage', () => {
    expect(getBudgetColor(0)).toBe('positive')
  })

  it('returns positive for 79% usage', () => {
    expect(getBudgetColor(79)).toBe('positive')
  })

  it('returns warning for 80% usage', () => {
    expect(getBudgetColor(80)).toBe('warning')
  })

  it('returns warning for 99% usage', () => {
    expect(getBudgetColor(99)).toBe('warning')
  })

  it('returns negative for 100% usage', () => {
    expect(getBudgetColor(100)).toBe('negative')
  })

  it('returns negative for 150% usage', () => {
    expect(getBudgetColor(150)).toBe('negative')
  })
})

describe('getBudgetsWithSpent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns budget rows joined with spent amounts from transactions', async () => {
    mockFindMany.mockResolvedValue([
      {
        id: 'b1',
        categoryId: 'cat1',
        quincenalAmount: BigInt(500000),
        periodId: 'p1',
        category: { name: 'Comida', icon: 'utensils', color: '#fb923c' },
      },
      {
        id: 'b2',
        categoryId: 'cat2',
        quincenalAmount: BigInt(200000),
        periodId: 'p1',
        category: { name: 'Transporte', icon: 'car', color: '#fbbf24' },
      },
    ])

    mockGroupBy.mockResolvedValue([
      { categoryId: 'cat1', _sum: { amount: BigInt(350000) } },
    ])

    const result = await getBudgetsWithSpent('p1')

    expect(result).toEqual([
      {
        id: 'b1',
        categoryId: 'cat1',
        categoryName: 'Comida',
        categoryIcon: 'utensils',
        categoryColor: '#fb923c',
        quincenalAmount: '500000',
        spent: '350000',
      },
      {
        id: 'b2',
        categoryId: 'cat2',
        categoryName: 'Transporte',
        categoryIcon: 'car',
        categoryColor: '#fbbf24',
        quincenalAmount: '200000',
        spent: '0',
      },
    ])
  })

  it('returns empty array when no budgets exist for the period', async () => {
    mockFindMany.mockResolvedValue([])
    mockGroupBy.mockResolvedValue([])

    const result = await getBudgetsWithSpent('p-empty')

    expect(result).toEqual([])
  })
})

describe('copyBudgetsFromPreviousPeriod', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('copies budgets from previous period to target period', async () => {
    mockFindUnique.mockResolvedValue({ id: 'prev-period' })
    mockFindMany.mockResolvedValue([
      { categoryId: 'cat1', quincenalAmount: BigInt(500000) },
      { categoryId: 'cat2', quincenalAmount: BigInt(200000) },
    ])
    mockCreateMany.mockResolvedValue({ count: 2 })

    const result = await copyBudgetsFromPreviousPeriod('current-period', 4, 2026)

    expect(result).toBe(true)
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { month_year: { month: 3, year: 2026 } },
    })
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { periodId: 'prev-period' },
    })
    expect(mockCreateMany).toHaveBeenCalledWith({
      data: [
        { categoryId: 'cat1', quincenalAmount: BigInt(500000), periodId: 'current-period' },
        { categoryId: 'cat2', quincenalAmount: BigInt(200000), periodId: 'current-period' },
      ],
    })
  })

  it('handles January wrapping to December of previous year', async () => {
    mockFindUnique.mockResolvedValue({ id: 'dec-period' })
    mockFindMany.mockResolvedValue([
      { categoryId: 'cat1', quincenalAmount: BigInt(300000) },
    ])
    mockCreateMany.mockResolvedValue({ count: 1 })

    const result = await copyBudgetsFromPreviousPeriod('jan-period', 1, 2026)

    expect(result).toBe(true)
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { month_year: { month: 12, year: 2025 } },
    })
  })

  it('returns false when no previous period exists', async () => {
    mockFindUnique.mockResolvedValue(null)

    const result = await copyBudgetsFromPreviousPeriod('current-period', 4, 2026)

    expect(result).toBe(false)
    expect(mockFindMany).not.toHaveBeenCalled()
    expect(mockCreateMany).not.toHaveBeenCalled()
  })

  it('returns false when previous period has no budgets', async () => {
    mockFindUnique.mockResolvedValue({ id: 'prev-period' })
    mockFindMany.mockResolvedValue([])

    const result = await copyBudgetsFromPreviousPeriod('current-period', 4, 2026)

    expect(result).toBe(false)
    expect(mockCreateMany).not.toHaveBeenCalled()
  })
})
