import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createTransaction, updateTransaction, deleteTransaction } from './actions'

const mockCreate = vi.fn()
const mockFindUnique = vi.fn()
const mockUpdate = vi.fn()
const mockDelete = vi.fn()

vi.mock('@/lib/prisma', () => ({
  default: {
    transaction: {
      create: (...args: unknown[]) => mockCreate(...args),
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
      delete: (...args: unknown[]) => mockDelete(...args),
    },
  },
}))

const mockRevalidatePath = vi.fn()
vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}))

const mockGetPeriodForDate = vi.fn()
vi.mock('@/lib/period', () => ({
  getPeriodForDate: (...args: unknown[]) => mockGetPeriodForDate(...args),
}))

const TEST_USER_ID = 'test-user-id'
vi.mock('@/lib/auth-utils', () => ({
  getDefaultUserId: vi.fn().mockResolvedValue('test-user-id'),
}))

const openPeriod = {
  id: 'period-open',
  month: 4,
  year: 2026,
  isClosed: false,
  closedAt: null,
}

const closedPeriod = {
  id: 'period-closed',
  month: 3,
  year: 2026,
  isClosed: true,
  closedAt: new Date('2026-04-01'),
}

const validExpenseData = {
  type: 'EXPENSE' as const,
  amount: '15000',
  categoryId: 'cat-1',
  date: '2026-04-05',
  description: 'Almuerzo',
  paymentMethod: 'DEBITO' as const,
}

const validIncomeData = {
  type: 'INCOME' as const,
  amount: '2500000',
  categoryId: 'cat-income',
  date: '2026-04-15',
  incomeSourceId: 'source-1',
}

const existingTransaction = {
  id: 'txn-1',
  type: 'EXPENSE',
  amount: BigInt(15000),
  categoryId: 'cat-1',
  date: new Date('2026-04-05'),
  description: 'Almuerzo',
  paymentMethod: 'DEBITO',
  notes: null,
  incomeSourceId: null,
  periodId: 'period-open',
  createdAt: new Date(),
  updatedAt: new Date(),
  period: openPeriod,
}

describe('createTransaction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates transaction with valid data and returns success', async () => {
    mockGetPeriodForDate.mockResolvedValue(openPeriod)
    mockCreate.mockResolvedValue({ id: 'new-txn', ...validExpenseData })

    const result = await createTransaction(validExpenseData)

    expect(result).toEqual({ success: true })
    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        type: 'EXPENSE',
        amount: BigInt(15000),
        categoryId: 'cat-1',
        date: new Date('2026-04-05'),
        description: 'Almuerzo',
        paymentMethod: 'DEBITO',
        notes: null,
        incomeSourceId: null,
        periodId: 'period-open',
        userId: TEST_USER_ID,
      },
    })
  })

  it('returns field errors for invalid data', async () => {
    const result = await createTransaction({
      type: 'INVALID',
      amount: 'abc',
      categoryId: '',
      date: 'not-a-date',
    })

    expect(result).toHaveProperty('error')
    if ('error' in result) {
      expect(result.error).toHaveProperty('type')
      expect(result.error).toHaveProperty('amount')
      expect(result.error).toHaveProperty('date')
    }
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('rejects transaction in closed period with Spanish error', async () => {
    mockGetPeriodForDate.mockResolvedValue(closedPeriod)

    const result = await createTransaction(validExpenseData)

    expect(result).toEqual({
      error: {
        _form: [
          'El periodo de este mes esta cerrado. Reabre el periodo para agregar transacciones.',
        ],
      },
    })
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('links income source for income transactions', async () => {
    mockGetPeriodForDate.mockResolvedValue(openPeriod)
    mockCreate.mockResolvedValue({ id: 'new-income-txn' })

    await createTransaction(validIncomeData)

    const createCall = mockCreate.mock.calls[0][0]
    expect(createCall.data.incomeSourceId).toBe('source-1')
  })

  it('calls revalidatePath for /, /movimientos, and /presupuesto', async () => {
    mockGetPeriodForDate.mockResolvedValue(openPeriod)
    mockCreate.mockResolvedValue({ id: 'new-txn' })

    await createTransaction(validExpenseData)

    expect(mockRevalidatePath).toHaveBeenCalledWith('/')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/movimientos')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/presupuesto')
  })

  it('returns generic error for unexpected failures', async () => {
    mockGetPeriodForDate.mockResolvedValue(openPeriod)
    mockCreate.mockRejectedValue(new Error('Connection lost'))

    const result = await createTransaction(validExpenseData)

    expect(result).toEqual({
      error: { _form: ['Error de servidor'] },
    })
  })
})

describe('updateTransaction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('updates transaction with valid data and returns success', async () => {
    mockFindUnique.mockResolvedValue(existingTransaction)
    mockGetPeriodForDate.mockResolvedValue(openPeriod)
    mockUpdate.mockResolvedValue({ id: 'txn-1' })

    const result = await updateTransaction('txn-1', validExpenseData)

    expect(result).toEqual({ success: true })
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'txn-1' },
      data: {
        type: 'EXPENSE',
        amount: BigInt(15000),
        categoryId: 'cat-1',
        date: new Date('2026-04-05'),
        description: 'Almuerzo',
        paymentMethod: 'DEBITO',
        notes: null,
        incomeSourceId: null,
        periodId: 'period-open',
      },
    })
  })

  it('returns field errors for invalid data', async () => {
    const result = await updateTransaction('txn-1', {
      type: 'BAD',
      amount: '-1',
    })

    expect(result).toHaveProperty('error')
    if ('error' in result) {
      expect(result.error).toHaveProperty('type')
    }
    expect(mockFindUnique).not.toHaveBeenCalled()
  })

  it('returns not-found error for non-existent ID', async () => {
    mockFindUnique.mockResolvedValue(null)

    const result = await updateTransaction('nonexistent', validExpenseData)

    expect(result).toEqual({
      error: { _form: ['Transaccion no encontrada'] },
    })
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('rejects update when existing transaction is in closed period', async () => {
    mockFindUnique.mockResolvedValue({
      ...existingTransaction,
      period: closedPeriod,
      periodId: closedPeriod.id,
    })

    const result = await updateTransaction('txn-1', validExpenseData)

    expect(result).toEqual({
      error: {
        _form: [
          'El periodo de este mes esta cerrado. Reabre el periodo para agregar transacciones.',
        ],
      },
    })
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('rejects update when new target period is closed', async () => {
    mockFindUnique.mockResolvedValue(existingTransaction)
    mockGetPeriodForDate.mockResolvedValue(closedPeriod)

    const result = await updateTransaction('txn-1', {
      ...validExpenseData,
      date: '2026-03-15',
    })

    expect(result).toEqual({
      error: {
        _form: [
          'El periodo de este mes esta cerrado. Reabre el periodo para agregar transacciones.',
        ],
      },
    })
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('calls revalidatePath for /, /movimientos, and /presupuesto', async () => {
    mockFindUnique.mockResolvedValue(existingTransaction)
    mockGetPeriodForDate.mockResolvedValue(openPeriod)
    mockUpdate.mockResolvedValue({ id: 'txn-1' })

    await updateTransaction('txn-1', validExpenseData)

    expect(mockRevalidatePath).toHaveBeenCalledWith('/')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/movimientos')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/presupuesto')
  })

  it('returns generic error for unexpected failures', async () => {
    mockFindUnique.mockResolvedValue(existingTransaction)
    mockGetPeriodForDate.mockResolvedValue(openPeriod)
    mockUpdate.mockRejectedValue(new Error('DB timeout'))

    const result = await updateTransaction('txn-1', validExpenseData)

    expect(result).toEqual({
      error: { _form: ['Error de servidor'] },
    })
  })
})

describe('deleteTransaction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deletes transaction in open period and returns success', async () => {
    mockFindUnique.mockResolvedValue(existingTransaction)
    mockDelete.mockResolvedValue({ id: 'txn-1' })

    const result = await deleteTransaction('txn-1')

    expect(result).toEqual({ success: true })
    expect(mockDelete).toHaveBeenCalledWith({
      where: { id: 'txn-1' },
    })
  })

  it('returns not-found error for non-existent ID', async () => {
    mockFindUnique.mockResolvedValue(null)

    const result = await deleteTransaction('nonexistent')

    expect(result).toEqual({
      error: { _form: ['Transaccion no encontrada'] },
    })
    expect(mockDelete).not.toHaveBeenCalled()
  })

  it('rejects delete when transaction is in closed period', async () => {
    mockFindUnique.mockResolvedValue({
      ...existingTransaction,
      period: closedPeriod,
      periodId: closedPeriod.id,
    })

    const result = await deleteTransaction('txn-1')

    expect(result).toEqual({
      error: {
        _form: [
          'El periodo de este mes esta cerrado. Reabre el periodo para agregar transacciones.',
        ],
      },
    })
    expect(mockDelete).not.toHaveBeenCalled()
  })

  it('calls revalidatePath for /, /movimientos, and /presupuesto', async () => {
    mockFindUnique.mockResolvedValue(existingTransaction)
    mockDelete.mockResolvedValue({ id: 'txn-1' })

    await deleteTransaction('txn-1')

    expect(mockRevalidatePath).toHaveBeenCalledWith('/')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/movimientos')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/presupuesto')
  })

  it('returns generic error for unexpected failures', async () => {
    mockFindUnique.mockResolvedValue(existingTransaction)
    mockDelete.mockRejectedValue(new Error('DB error'))

    const result = await deleteTransaction('txn-1')

    expect(result).toEqual({
      error: { _form: ['Error de servidor'] },
    })
  })
})
