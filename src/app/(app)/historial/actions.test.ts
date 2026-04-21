import { describe, it, expect, vi, beforeEach } from 'vitest'
import { closePeriod, reopenPeriod, getClosePeriodPreviewAction } from './actions'

// --- Mock prisma ---
const mockPeriodFindFirst = vi.fn()
const mockPeriodUpdate = vi.fn()
const mockPeriodCreate = vi.fn()
const mockMonthlySummaryCreate = vi.fn()
const mockMonthlySummaryDelete = vi.fn()
const mockTransactionAggregate = vi.fn()
const mockDebtAggregate = vi.fn()
const mockBudgetFindMany = vi.fn()
const mockBudgetCreateMany = vi.fn()
const mockBudgetCount = vi.fn()
const mockTransaction = vi.fn()

vi.mock('@/lib/prisma', () => ({
  default: {
    period: {
      findFirst: (...args: unknown[]) => mockPeriodFindFirst(...args),
      update: (...args: unknown[]) => mockPeriodUpdate(...args),
    },
    monthlySummary: {
      create: (...args: unknown[]) => mockMonthlySummaryCreate(...args),
      delete: (...args: unknown[]) => mockMonthlySummaryDelete(...args),
    },
    $transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}))

const mockRevalidatePath = vi.fn()
vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}))

const mockGetClosePeriodPreview = vi.fn()
vi.mock('@/lib/history', () => ({
  getClosePeriodPreview: (...args: unknown[]) => mockGetClosePeriodPreview(...args),
}))

const TEST_USER_ID = 'test-user-id'
vi.mock('@/lib/auth-utils', () => ({
  requireAuth: vi.fn().mockResolvedValue({ userId: 'test-user-id' }),
}))

// --- Helper: create a mock tx object for $transaction callback ---
function createMockTx() {
  return {
    transaction: {
      aggregate: (...args: unknown[]) => mockTransactionAggregate(...args),
    },
    debt: {
      aggregate: (...args: unknown[]) => mockDebtAggregate(...args),
    },
    monthlySummary: {
      create: (...args: unknown[]) => mockMonthlySummaryCreate(...args),
    },
    period: {
      update: (...args: unknown[]) => mockPeriodUpdate(...args),
      findFirst: (...args: unknown[]) => mockPeriodFindFirst(...args),
      create: (...args: unknown[]) => mockPeriodCreate(...args),
    },
    budget: {
      findMany: (...args: unknown[]) => mockBudgetFindMany(...args),
      createMany: (...args: unknown[]) => mockBudgetCreateMany(...args),
      count: (...args: unknown[]) => mockBudgetCount(...args),
    },
  }
}

const openPeriod = {
  id: 'period-apr',
  month: 4,
  year: 2026,
  isClosed: false,
  closedAt: null,
  startDate: new Date('2026-04-01'),
  endDate: new Date('2026-04-30'),
  createdAt: new Date(),
}

const closedPeriod = {
  id: 'period-mar',
  month: 3,
  year: 2026,
  isClosed: true,
  closedAt: new Date('2026-04-01'),
  startDate: new Date('2026-03-01'),
  endDate: new Date('2026-03-31'),
  createdAt: new Date(),
}

describe('closePeriod', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects if period not found', async () => {
    mockPeriodFindFirst.mockResolvedValue(null)

    const result = await closePeriod('nonexistent')

    expect(result).toEqual({
      error: { _form: ['Periodo no encontrado'] },
    })
    expect(mockTransaction).not.toHaveBeenCalled()
  })

  it('rejects if period already closed', async () => {
    mockPeriodFindFirst.mockResolvedValue(closedPeriod)

    const result = await closePeriod('period-mar')

    expect(result).toEqual({
      error: { _form: ['Este periodo ya esta cerrado'] },
    })
    expect(mockTransaction).not.toHaveBeenCalled()
  })

  it('executes atomic $transaction with all 5 steps', async () => {
    // First call: top-level period lookup; Second call: next period lookup in $transaction
    mockPeriodFindFirst.mockResolvedValueOnce(openPeriod).mockResolvedValueOnce(null)

    const mockTx = createMockTx()
    mockTransaction.mockImplementation(async (cb: (tx: unknown) => Promise<void>) => {
      await cb(mockTx)
    })

    // Step 1: Compute totals
    mockTransactionAggregate
      .mockResolvedValueOnce({ _sum: { amount: BigInt(500000) } }) // income
      .mockResolvedValueOnce({ _sum: { amount: BigInt(300000) } }) // expenses
    mockDebtAggregate.mockResolvedValue({
      _sum: { currentBalance: BigInt(1000000) },
    })

    // Step 2: Create MonthlySummary
    mockMonthlySummaryCreate.mockResolvedValue({ id: 'ms-new' })

    // Step 3: Mark period closed
    mockPeriodUpdate.mockResolvedValue({ id: 'period-apr' })

    // Step 4: Create next period
    mockPeriodCreate.mockResolvedValue({ id: 'period-may', month: 5, year: 2026 })

    // Step 5: Copy budgets
    mockBudgetCount.mockResolvedValue(0)
    mockBudgetFindMany.mockResolvedValue([
      { id: 'b1', categoryId: 'cat-1', quincenalAmount: BigInt(50000), periodId: 'period-apr' },
      { id: 'b2', categoryId: 'cat-2', quincenalAmount: BigInt(25000), periodId: 'period-apr' },
    ])
    mockBudgetCreateMany.mockResolvedValue({ count: 2 })

    const result = await closePeriod('period-apr')

    expect(result).toEqual({ success: true })

    // Verify MonthlySummary was created with correct totals and userId
    expect(mockMonthlySummaryCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        periodId: 'period-apr',
        totalIncome: BigInt(500000),
        totalExpenses: BigInt(300000),
        totalSavings: BigInt(200000),
        savingsRate: 4000,
        debtAtClose: BigInt(1000000),
        debtPayments: BigInt(0),
        userId: TEST_USER_ID,
      }),
    })

    // Verify period was marked closed
    expect(mockPeriodUpdate).toHaveBeenCalledWith({
      where: { id: 'period-apr' },
      data: { isClosed: true, closedAt: expect.any(Date) },
    })

    // Verify next period was created (May 2026)
    expect(mockPeriodFindFirst).toHaveBeenCalledWith({
      where: { month: 5, year: 2026, userId: TEST_USER_ID },
    })

    // Verify budgets were copied with userId
    expect(mockBudgetCreateMany).toHaveBeenCalledWith({
      data: [
        {
          categoryId: 'cat-1',
          quincenalAmount: BigInt(50000),
          periodId: 'period-may',
          userId: TEST_USER_ID,
        },
        {
          categoryId: 'cat-2',
          quincenalAmount: BigInt(25000),
          periodId: 'period-may',
          userId: TEST_USER_ID,
        },
      ],
    })
  })

  it('handles December->January year wrap (month=12, year=2025)', async () => {
    const decemberPeriod = {
      ...openPeriod,
      id: 'period-dec',
      month: 12,
      year: 2025,
    }

    // First call: top-level period lookup; Second call: next period lookup in $transaction
    mockPeriodFindFirst.mockResolvedValueOnce(decemberPeriod).mockResolvedValueOnce(null)

    const mockTx = createMockTx()
    mockTransaction.mockImplementation(async (cb: (tx: unknown) => Promise<void>) => {
      await cb(mockTx)
    })

    mockTransactionAggregate
      .mockResolvedValueOnce({ _sum: { amount: BigInt(0) } })
      .mockResolvedValueOnce({ _sum: { amount: BigInt(0) } })
    mockDebtAggregate.mockResolvedValue({ _sum: { currentBalance: BigInt(0) } })
    mockMonthlySummaryCreate.mockResolvedValue({ id: 'ms-dec' })
    mockPeriodUpdate.mockResolvedValue({ id: 'period-dec' })
    mockPeriodCreate.mockResolvedValue({ id: 'period-jan26', month: 1, year: 2026 })
    mockBudgetCount.mockResolvedValue(0)
    mockBudgetFindMany.mockResolvedValue([])

    const result = await closePeriod('period-dec')

    expect(result).toEqual({ success: true })

    // Next period should be January 2026
    expect(mockPeriodFindFirst).toHaveBeenCalledWith({
      where: { month: 1, year: 2026, userId: TEST_USER_ID },
    })
  })

  it('handles January->February (month=1, year=2026)', async () => {
    const januaryPeriod = {
      ...openPeriod,
      id: 'period-jan',
      month: 1,
      year: 2026,
    }

    // First call: top-level period lookup; Second call: next period lookup in $transaction
    mockPeriodFindFirst.mockResolvedValueOnce(januaryPeriod).mockResolvedValueOnce(null)

    const mockTx = createMockTx()
    mockTransaction.mockImplementation(async (cb: (tx: unknown) => Promise<void>) => {
      await cb(mockTx)
    })

    mockTransactionAggregate
      .mockResolvedValueOnce({ _sum: { amount: BigInt(0) } })
      .mockResolvedValueOnce({ _sum: { amount: BigInt(0) } })
    mockDebtAggregate.mockResolvedValue({ _sum: { currentBalance: BigInt(0) } })
    mockMonthlySummaryCreate.mockResolvedValue({ id: 'ms-jan' })
    mockPeriodUpdate.mockResolvedValue({ id: 'period-jan' })
    mockPeriodCreate.mockResolvedValue({ id: 'period-feb26', month: 2, year: 2026 })
    mockBudgetCount.mockResolvedValue(0)
    mockBudgetFindMany.mockResolvedValue([])

    const result = await closePeriod('period-jan')

    expect(result).toEqual({ success: true })

    // Next period should be February 2026
    expect(mockPeriodFindFirst).toHaveBeenCalledWith({
      where: { month: 2, year: 2026, userId: TEST_USER_ID },
    })
  })

  it('handles June->July mid-year (month=6, year=2026)', async () => {
    const junePeriod = {
      ...openPeriod,
      id: 'period-jun',
      month: 6,
      year: 2026,
    }

    // First call: top-level period lookup; Second call: next period lookup in $transaction
    mockPeriodFindFirst.mockResolvedValueOnce(junePeriod).mockResolvedValueOnce(null)

    const mockTx = createMockTx()
    mockTransaction.mockImplementation(async (cb: (tx: unknown) => Promise<void>) => {
      await cb(mockTx)
    })

    mockTransactionAggregate
      .mockResolvedValueOnce({ _sum: { amount: BigInt(0) } })
      .mockResolvedValueOnce({ _sum: { amount: BigInt(0) } })
    mockDebtAggregate.mockResolvedValue({ _sum: { currentBalance: BigInt(0) } })
    mockMonthlySummaryCreate.mockResolvedValue({ id: 'ms-jun' })
    mockPeriodUpdate.mockResolvedValue({ id: 'period-jun' })
    mockPeriodCreate.mockResolvedValue({ id: 'period-jul26', month: 7, year: 2026 })
    mockBudgetCount.mockResolvedValue(0)
    mockBudgetFindMany.mockResolvedValue([])

    const result = await closePeriod('period-jun')

    expect(result).toEqual({ success: true })

    // Next period should be July 2026
    expect(mockPeriodFindFirst).toHaveBeenCalledWith({
      where: { month: 7, year: 2026, userId: TEST_USER_ID },
    })
  })

  it('skips budget copy when next period already has budgets', async () => {
    // First call: top-level period lookup; Second call: next period lookup in $transaction
    mockPeriodFindFirst.mockResolvedValueOnce(openPeriod).mockResolvedValueOnce(null)

    const mockTx = createMockTx()
    mockTransaction.mockImplementation(async (cb: (tx: unknown) => Promise<void>) => {
      await cb(mockTx)
    })

    mockTransactionAggregate
      .mockResolvedValueOnce({ _sum: { amount: BigInt(100000) } })
      .mockResolvedValueOnce({ _sum: { amount: BigInt(50000) } })
    mockDebtAggregate.mockResolvedValue({ _sum: { currentBalance: BigInt(0) } })
    mockMonthlySummaryCreate.mockResolvedValue({ id: 'ms-new' })
    mockPeriodUpdate.mockResolvedValue({ id: 'period-apr' })
    mockPeriodCreate.mockResolvedValue({ id: 'period-may', month: 5, year: 2026 })

    // Next period already has 3 budgets
    mockBudgetCount.mockResolvedValue(3)

    const result = await closePeriod('period-apr')

    expect(result).toEqual({ success: true })
    // Should NOT have called findMany/createMany for budgets since count > 0
    expect(mockBudgetFindMany).not.toHaveBeenCalled()
    expect(mockBudgetCreateMany).not.toHaveBeenCalled()
  })

  it('revalidates /, /historial, /presupuesto, /movimientos after close', async () => {
    // First call: top-level period lookup; Second call: next period lookup in $transaction
    mockPeriodFindFirst.mockResolvedValueOnce(openPeriod).mockResolvedValueOnce(null)

    const mockTx = createMockTx()
    mockTransaction.mockImplementation(async (cb: (tx: unknown) => Promise<void>) => {
      await cb(mockTx)
    })

    mockTransactionAggregate
      .mockResolvedValueOnce({ _sum: { amount: BigInt(0) } })
      .mockResolvedValueOnce({ _sum: { amount: BigInt(0) } })
    mockDebtAggregate.mockResolvedValue({ _sum: { currentBalance: BigInt(0) } })
    mockMonthlySummaryCreate.mockResolvedValue({ id: 'ms-new' })
    mockPeriodUpdate.mockResolvedValue({ id: 'period-apr' })
    mockPeriodCreate.mockResolvedValue({ id: 'period-may', month: 5, year: 2026 })
    mockBudgetCount.mockResolvedValue(0)
    mockBudgetFindMany.mockResolvedValue([])

    await closePeriod('period-apr')

    expect(mockRevalidatePath).toHaveBeenCalledWith('/')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/historial')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/presupuesto')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/movimientos')
  })

  it('returns generic error on unexpected failure', async () => {
    mockPeriodFindFirst.mockResolvedValueOnce(openPeriod)
    mockTransaction.mockRejectedValue(new Error('DB timeout'))

    const result = await closePeriod('period-apr')

    expect(result).toEqual({
      error: { _form: ['Error de servidor'] },
    })
  })
})

describe('reopenPeriod', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects if period not found', async () => {
    mockPeriodFindFirst.mockResolvedValue(null)

    const result = await reopenPeriod('nonexistent')

    expect(result).toEqual({
      error: { _form: ['Periodo no encontrado'] },
    })
  })

  it('rejects if period is not closed', async () => {
    mockPeriodFindFirst.mockResolvedValue(openPeriod)

    const result = await reopenPeriod('period-apr')

    expect(result).toEqual({
      error: { _form: ['Este periodo no esta cerrado'] },
    })
  })

  it('deletes MonthlySummary and unlocks period on success', async () => {
    mockPeriodFindFirst.mockResolvedValue(closedPeriod)
    mockMonthlySummaryDelete.mockResolvedValue({ id: 'ms-mar' })
    mockPeriodUpdate.mockResolvedValue({ id: 'period-mar', isClosed: false })

    const result = await reopenPeriod('period-mar')

    expect(result).toEqual({ success: true })

    expect(mockMonthlySummaryDelete).toHaveBeenCalledWith({
      where: { periodId: 'period-mar' },
    })

    expect(mockPeriodUpdate).toHaveBeenCalledWith({
      where: { id: 'period-mar' },
      data: { isClosed: false, closedAt: null },
    })
  })

  it('revalidates /, /historial, /presupuesto, /movimientos after reopen', async () => {
    mockPeriodFindFirst.mockResolvedValue(closedPeriod)
    mockMonthlySummaryDelete.mockResolvedValue({ id: 'ms-mar' })
    mockPeriodUpdate.mockResolvedValue({ id: 'period-mar' })

    await reopenPeriod('period-mar')

    expect(mockRevalidatePath).toHaveBeenCalledWith('/')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/historial')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/presupuesto')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/movimientos')
  })

  it('returns generic error on unexpected failure', async () => {
    mockPeriodFindFirst.mockResolvedValue(closedPeriod)
    mockMonthlySummaryDelete.mockRejectedValue(new Error('DB error'))

    const result = await reopenPeriod('period-mar')

    expect(result).toEqual({
      error: { _form: ['Error de servidor'] },
    })
  })
})

describe('getClosePeriodPreviewAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('delegates to getClosePeriodPreview and returns result', async () => {
    const previewData = {
      totalIncome: '500000',
      totalExpenses: '300000',
      totalSavings: '200000',
      savingsRate: 4000,
      debtAtClose: '1000000',
      debtPayments: '0',
    }
    mockGetClosePeriodPreview.mockResolvedValue(previewData)

    const result = await getClosePeriodPreviewAction('period-apr')

    expect(mockGetClosePeriodPreview).toHaveBeenCalledWith('period-apr', TEST_USER_ID)
    expect(result).toEqual(previewData)
  })
})
