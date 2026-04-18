import { describe, it, expect, vi, beforeEach } from 'vitest'
import { upsertBudgets } from './actions'

const mockFindFirst = vi.fn()
const mockCreate = vi.fn()
const mockUpdate = vi.fn()

vi.mock('@/lib/prisma', () => ({
  default: {
    budget: {
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
      create: (...args: unknown[]) => mockCreate(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
  },
}))

const mockRevalidatePath = vi.fn()
vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}))

const TEST_USER_ID = 'test-user-id'
vi.mock('@/lib/auth-utils', () => ({
  getDefaultUserId: vi.fn().mockResolvedValue('test-user-id'),
}))

const validEntries = {
  entries: [
    { categoryId: 'cat1', quincenalAmount: '500000' },
    { categoryId: 'cat2', quincenalAmount: '200000' },
  ],
}

describe('upsertBudgets', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates new entries when no existing budgets found', async () => {
    mockFindFirst.mockResolvedValue(null)
    mockCreate.mockResolvedValue({ id: 'b1' })

    const result = await upsertBudgets('period-1', validEntries)

    expect(result).toEqual({ success: true })
    expect(mockFindFirst).toHaveBeenCalledTimes(2)
    expect(mockCreate).toHaveBeenCalledTimes(2)
    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        periodId: 'period-1',
        categoryId: 'cat1',
        quincenalAmount: BigInt('500000'),
        userId: TEST_USER_ID,
      },
    })
    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        periodId: 'period-1',
        categoryId: 'cat2',
        quincenalAmount: BigInt('200000'),
        userId: TEST_USER_ID,
      },
    })
  })

  it('updates existing entries when budgets found', async () => {
    mockFindFirst.mockResolvedValue({ id: 'existing-budget' })
    mockUpdate.mockResolvedValue({ id: 'existing-budget' })

    const result = await upsertBudgets('period-1', validEntries)

    expect(result).toEqual({ success: true })
    expect(mockUpdate).toHaveBeenCalledTimes(2)
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'existing-budget' },
      data: { quincenalAmount: BigInt('500000') },
    })
  })

  it('returns field errors for invalid quincenalAmount', async () => {
    const result = await upsertBudgets('period-1', {
      entries: [{ categoryId: 'cat1', quincenalAmount: 'abc' }],
    })

    expect(result).toHaveProperty('error')
    if ('error' in result) {
      expect(result.error).toHaveProperty('entries')
    }
    expect(mockFindFirst).not.toHaveBeenCalled()
  })

  it('returns validation error for empty entries array', async () => {
    const result = await upsertBudgets('period-1', { entries: [] })

    expect(result).toHaveProperty('error')
    if ('error' in result) {
      expect(result.error).toHaveProperty('entries')
    }
    expect(mockFindFirst).not.toHaveBeenCalled()
  })

  it('revalidates /presupuesto and / paths after success', async () => {
    mockFindFirst.mockResolvedValue(null)
    mockCreate.mockResolvedValue({ id: 'b1' })

    await upsertBudgets('period-1', validEntries)

    expect(mockRevalidatePath).toHaveBeenCalledWith('/presupuesto')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/')
  })

  it('returns generic server error on Prisma failure', async () => {
    mockFindFirst.mockRejectedValue(new Error('Connection lost'))

    const result = await upsertBudgets('period-1', validEntries)

    expect(result).toHaveProperty('error')
    if ('error' in result) {
      expect(result.error).toHaveProperty('_form')
      expect(result.error._form).toContain('Error de servidor')
    }
  })
})
