import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createIncomeSource, updateIncomeSource, deleteIncomeSource } from './actions'

const mockCreate = vi.fn()
const mockUpdate = vi.fn()
const mockDelete = vi.fn()

vi.mock('@/lib/prisma', () => ({
  default: {
    incomeSource: {
      create: (...args: unknown[]) => mockCreate(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
      delete: (...args: unknown[]) => mockDelete(...args),
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

const validData = {
  name: 'TerSoft',
  defaultAmount: '2500000',
  frequency: 'QUINCENAL' as const,
  type: 'EMPLOYMENT',
}

describe('createIncomeSource', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates record with valid data and returns success', async () => {
    mockCreate.mockResolvedValue({ id: 'test-id', ...validData })

    const result = await createIncomeSource(validData)

    expect(result).toEqual({ success: true })
    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        name: 'TerSoft',
        defaultAmount: BigInt('2500000'),
        frequency: 'QUINCENAL',
        type: 'EMPLOYMENT',
        userId: TEST_USER_ID,
      },
    })
  })

  it('returns field errors for invalid data', async () => {
    const result = await createIncomeSource({
      name: '',
      defaultAmount: 'abc',
      frequency: 'INVALID',
      type: '',
    })

    expect(result).toHaveProperty('error')
    if ('error' in result) {
      expect(result.error).toHaveProperty('name')
      expect(result.error).toHaveProperty('defaultAmount')
      expect(result.error).toHaveProperty('frequency')
      expect(result.error).toHaveProperty('type')
    }
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('returns friendly error for duplicate name (P2002)', async () => {
    mockCreate.mockRejectedValue({ code: 'P2002', meta: { target: ['name'] } })

    const result = await createIncomeSource(validData)

    expect(result).toEqual({
      error: { name: ['Ya existe una fuente con ese nombre'] },
    })
  })

  it('calls revalidatePath for /ingresos and / on success', async () => {
    mockCreate.mockResolvedValue({ id: 'test-id' })

    await createIncomeSource(validData)

    expect(mockRevalidatePath).toHaveBeenCalledWith('/ingresos')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/')
  })

  it('returns generic error for unexpected failures', async () => {
    mockCreate.mockRejectedValue(new Error('Connection lost'))

    const result = await createIncomeSource(validData)

    expect(result).toHaveProperty('error')
    if ('error' in result) {
      expect(result.error).toHaveProperty('_form')
    }
  })
})

describe('updateIncomeSource', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('updates record with valid data and returns success', async () => {
    mockUpdate.mockResolvedValue({ id: 'existing-id', ...validData })

    const result = await updateIncomeSource('existing-id', validData)

    expect(result).toEqual({ success: true })
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'existing-id' },
      data: {
        name: 'TerSoft',
        defaultAmount: BigInt('2500000'),
        frequency: 'QUINCENAL',
        type: 'EMPLOYMENT',
      },
    })
  })

  it('returns field errors for invalid data', async () => {
    const result = await updateIncomeSource('some-id', {
      name: '',
      defaultAmount: '-100',
      frequency: 'BAD',
      type: '',
    })

    expect(result).toHaveProperty('error')
    if ('error' in result) {
      expect(result.error).toHaveProperty('name')
    }
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('returns not-found error for non-existent ID (P2025)', async () => {
    mockUpdate.mockRejectedValue({ code: 'P2025' })

    const result = await updateIncomeSource('nonexistent-id', validData)

    expect(result).toEqual({
      error: { _form: ['Fuente de ingreso no encontrada'] },
    })
  })

  it('returns friendly error for duplicate name on update (P2002)', async () => {
    mockUpdate.mockRejectedValue({ code: 'P2002', meta: { target: ['name'] } })

    const result = await updateIncomeSource('existing-id', validData)

    expect(result).toEqual({
      error: { name: ['Ya existe una fuente con ese nombre'] },
    })
  })

  it('calls revalidatePath for /ingresos and / on success', async () => {
    mockUpdate.mockResolvedValue({ id: 'existing-id' })

    await updateIncomeSource('existing-id', validData)

    expect(mockRevalidatePath).toHaveBeenCalledWith('/ingresos')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/')
  })
})

describe('deleteIncomeSource', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deletes record and returns success', async () => {
    mockDelete.mockResolvedValue({ id: 'existing-id' })

    const result = await deleteIncomeSource('existing-id')

    expect(result).toEqual({ success: true })
    expect(mockDelete).toHaveBeenCalledWith({
      where: { id: 'existing-id' },
    })
  })

  it('returns not-found error for non-existent ID (P2025)', async () => {
    mockDelete.mockRejectedValue({ code: 'P2025' })

    const result = await deleteIncomeSource('nonexistent-id')

    expect(result).toEqual({
      error: { _form: ['Fuente de ingreso no encontrada'] },
    })
  })

  it('calls revalidatePath for /ingresos and / on success', async () => {
    mockDelete.mockResolvedValue({ id: 'existing-id' })

    await deleteIncomeSource('existing-id')

    expect(mockRevalidatePath).toHaveBeenCalledWith('/ingresos')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/')
  })

  it('returns generic error for unexpected failures', async () => {
    mockDelete.mockRejectedValue(new Error('DB timeout'))

    const result = await deleteIncomeSource('some-id')

    expect(result).toHaveProperty('error')
    if ('error' in result) {
      expect(result.error).toHaveProperty('_form')
    }
  })
})
