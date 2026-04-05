import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getCurrentPeriod, getPeriodForDate } from './period'

const mockFindUnique = vi.fn()
const mockCreate = vi.fn()

vi.mock('@/lib/prisma', () => ({
  default: {
    period: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      create: (...args: unknown[]) => mockCreate(...args),
    },
  },
}))

const existingPeriod = {
  id: 'period-1',
  month: 4,
  year: 2026,
  startDate: new Date(2026, 3, 1),
  endDate: new Date(2026, 3, 30),
  isClosed: false,
  closedAt: null,
  createdAt: new Date(),
}

describe('getCurrentPeriod', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 3, 5)) // April 5, 2026
  })

  it('returns existing period when one exists for current month/year', async () => {
    mockFindUnique.mockResolvedValue(existingPeriod)

    const result = await getCurrentPeriod()

    expect(result).toEqual(existingPeriod)
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { month_year: { month: 4, year: 2026 } },
    })
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('creates and returns a new period when none exists', async () => {
    const createdPeriod = { ...existingPeriod, id: 'new-period' }
    mockFindUnique.mockResolvedValue(null)
    mockCreate.mockResolvedValue(createdPeriod)

    const result = await getCurrentPeriod()

    expect(result).toEqual(createdPeriod)
    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        month: 4,
        year: 2026,
        startDate: new Date(2026, 3, 1),
        endDate: new Date(2026, 4, 0),
        isClosed: false,
      },
    })
  })

  it('creates period with correct isClosed=false', async () => {
    mockFindUnique.mockResolvedValue(null)
    mockCreate.mockResolvedValue(existingPeriod)

    await getCurrentPeriod()

    const createCall = mockCreate.mock.calls[0][0]
    expect(createCall.data.isClosed).toBe(false)
  })
})

describe('getPeriodForDate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns existing period matching the date month/year', async () => {
    mockFindUnique.mockResolvedValue(existingPeriod)

    const result = await getPeriodForDate('2026-04-15')

    expect(result).toEqual(existingPeriod)
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { month_year: { month: 4, year: 2026 } },
    })
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('creates period if it does not exist for the given date', async () => {
    const marchPeriod = {
      ...existingPeriod,
      id: 'march-period',
      month: 3,
      startDate: new Date(2026, 2, 1),
      endDate: new Date(2026, 2, 31),
    }
    mockFindUnique.mockResolvedValue(null)
    mockCreate.mockResolvedValue(marchPeriod)

    const result = await getPeriodForDate('2026-03-20')

    expect(result).toEqual(marchPeriod)
    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        month: 3,
        year: 2026,
        startDate: new Date(2026, 2, 1),
        endDate: new Date(2026, 3, 0),
        isClosed: false,
      },
    })
  })

  it('calculates correct endDate for February (non-leap year)', async () => {
    const febPeriod = {
      ...existingPeriod,
      id: 'feb-period',
      month: 2,
      year: 2027,
    }
    mockFindUnique.mockResolvedValue(null)
    mockCreate.mockResolvedValue(febPeriod)

    await getPeriodForDate('2027-02-10')

    const createCall = mockCreate.mock.calls[0][0]
    // February 2027 has 28 days (non-leap year)
    expect(createCall.data.endDate).toEqual(new Date(2027, 2, 0))
    expect(createCall.data.endDate.getDate()).toBe(28)
  })

  it('calculates correct endDate for February (leap year)', async () => {
    const febPeriod = {
      ...existingPeriod,
      id: 'feb-leap-period',
      month: 2,
      year: 2028,
    }
    mockFindUnique.mockResolvedValue(null)
    mockCreate.mockResolvedValue(febPeriod)

    await getPeriodForDate('2028-02-15')

    const createCall = mockCreate.mock.calls[0][0]
    // February 2028 has 29 days (leap year)
    expect(createCall.data.endDate).toEqual(new Date(2028, 2, 0))
    expect(createCall.data.endDate.getDate()).toBe(29)
  })

  it('calculates correct endDate for month with 31 days', async () => {
    const janPeriod = {
      ...existingPeriod,
      id: 'jan-period',
      month: 1,
      year: 2026,
    }
    mockFindUnique.mockResolvedValue(null)
    mockCreate.mockResolvedValue(janPeriod)

    await getPeriodForDate('2026-01-20')

    const createCall = mockCreate.mock.calls[0][0]
    expect(createCall.data.startDate).toEqual(new Date(2026, 0, 1))
    expect(createCall.data.endDate).toEqual(new Date(2026, 1, 0))
    expect(createCall.data.endDate.getDate()).toBe(31)
  })
})
