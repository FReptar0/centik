import { describe, it, expect, vi, beforeEach } from 'vitest'
import { upsertBudgets } from './actions'

const mockUpsert = vi.fn()

vi.mock('@/lib/prisma', () => ({
  default: {
    budget: {
      upsert: (...args: unknown[]) => mockUpsert(...args),
    },
  },
}))

const mockRevalidatePath = vi.fn()
vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
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

  it('upserts valid entries for a period and returns success', async () => {
    mockUpsert.mockResolvedValue({ id: 'b1' })

    const result = await upsertBudgets('period-1', validEntries)

    expect(result).toEqual({ success: true })
    expect(mockUpsert).toHaveBeenCalledTimes(2)
    expect(mockUpsert).toHaveBeenCalledWith({
      where: { periodId_categoryId: { periodId: 'period-1', categoryId: 'cat1' } },
      update: { quincenalAmount: BigInt('500000') },
      create: { periodId: 'period-1', categoryId: 'cat1', quincenalAmount: BigInt('500000') },
    })
    expect(mockUpsert).toHaveBeenCalledWith({
      where: { periodId_categoryId: { periodId: 'period-1', categoryId: 'cat2' } },
      update: { quincenalAmount: BigInt('200000') },
      create: { periodId: 'period-1', categoryId: 'cat2', quincenalAmount: BigInt('200000') },
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
    expect(mockUpsert).not.toHaveBeenCalled()
  })

  it('returns validation error for empty entries array', async () => {
    const result = await upsertBudgets('period-1', { entries: [] })

    expect(result).toHaveProperty('error')
    if ('error' in result) {
      expect(result.error).toHaveProperty('entries')
    }
    expect(mockUpsert).not.toHaveBeenCalled()
  })

  it('revalidates /presupuesto and / paths after success', async () => {
    mockUpsert.mockResolvedValue({ id: 'b1' })

    await upsertBudgets('period-1', validEntries)

    expect(mockRevalidatePath).toHaveBeenCalledWith('/presupuesto')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/')
  })

  it('returns generic server error on Prisma failure', async () => {
    mockUpsert.mockRejectedValue(new Error('Connection lost'))

    const result = await upsertBudgets('period-1', validEntries)

    expect(result).toHaveProperty('error')
    if ('error' in result) {
      expect(result.error).toHaveProperty('_form')
      expect(result.error._form).toContain('Error de servidor')
    }
  })
})
