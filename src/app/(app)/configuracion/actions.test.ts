import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createCategory, deleteCategory } from './actions'

const mockCreate = vi.fn()
const mockFindFirst = vi.fn()
const mockUpdate = vi.fn()
const mockAggregate = vi.fn()

vi.mock('@/lib/prisma', () => ({
  default: {
    category: {
      create: (...args: unknown[]) => mockCreate(...args),
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
      aggregate: (...args: unknown[]) => mockAggregate(...args),
    },
  },
}))

const mockRevalidatePath = vi.fn()
vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}))

const TEST_USER_ID = 'test-user-id'
vi.mock('@/lib/auth-utils', () => ({
  requireAuth: vi.fn().mockResolvedValue({ userId: 'test-user-id' }),
}))

const validData = {
  name: 'Mascotas',
  icon: 'heart',
  color: '#C48AA3',
  type: 'EXPENSE' as const,
}

describe('createCategory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAggregate.mockResolvedValue({ _max: { sortOrder: 5 } })
  })

  it('creates record with valid data, isDefault=false, and auto-incremented sortOrder', async () => {
    mockCreate.mockResolvedValue({ id: 'test-id', ...validData })

    const result = await createCategory(validData)

    expect(result).toEqual({ success: true })
    expect(mockAggregate).toHaveBeenCalledWith({
      _max: { sortOrder: true },
    })
    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        name: 'Mascotas',
        icon: 'heart',
        color: '#C48AA3',
        type: 'EXPENSE',
        isDefault: false,
        sortOrder: 6,
        userId: TEST_USER_ID,
      },
    })
  })

  it('handles null max sortOrder (first category)', async () => {
    mockAggregate.mockResolvedValue({ _max: { sortOrder: null } })
    mockCreate.mockResolvedValue({ id: 'test-id' })

    const result = await createCategory(validData)

    expect(result).toEqual({ success: true })
    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ sortOrder: 1 }),
    })
  })

  it('returns field errors for invalid data (empty name)', async () => {
    const result = await createCategory({
      name: '',
      icon: 'heart',
      color: '#C48AA3',
      type: 'EXPENSE',
    })

    expect(result).toHaveProperty('error')
    if ('error' in result) {
      expect(result.error).toHaveProperty('name')
    }
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('returns field errors for invalid color format', async () => {
    const result = await createCategory({
      name: 'Test',
      icon: 'heart',
      color: 'invalid',
      type: 'EXPENSE',
    })

    expect(result).toHaveProperty('error')
    if ('error' in result) {
      expect(result.error).toHaveProperty('color')
    }
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('returns friendly error for duplicate name (P2002)', async () => {
    mockCreate.mockRejectedValue({ code: 'P2002', meta: { target: ['name'] } })

    const result = await createCategory(validData)

    expect(result).toEqual({
      error: { name: ['Ya existe una categoria con ese nombre'] },
    })
  })

  it('calls revalidatePath for /configuracion and /movimientos on success', async () => {
    mockCreate.mockResolvedValue({ id: 'test-id' })

    await createCategory(validData)

    expect(mockRevalidatePath).toHaveBeenCalledWith('/configuracion')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/movimientos')
  })

  it('returns generic error for unexpected failures', async () => {
    mockCreate.mockRejectedValue(new Error('Connection lost'))

    const result = await createCategory(validData)

    expect(result).toHaveProperty('error')
    if ('error' in result) {
      expect(result.error).toHaveProperty('_form')
    }
  })
})

describe('deleteCategory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('soft-deletes a non-default category and returns success', async () => {
    mockFindFirst.mockResolvedValue({ isDefault: false })
    mockUpdate.mockResolvedValue({ id: 'custom-cat-id' })

    const result = await deleteCategory('custom-cat-id')

    expect(result).toEqual({ success: true })
    expect(mockFindFirst).toHaveBeenCalledWith({
      where: { id: 'custom-cat-id', userId: TEST_USER_ID },
      select: { isDefault: true },
    })
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'custom-cat-id' },
      data: { isActive: false },
    })
  })

  it('refuses to delete a default category', async () => {
    mockFindFirst.mockResolvedValue({ isDefault: true })

    const result = await deleteCategory('default-cat-id')

    expect(result).toEqual({
      error: { _form: ['No se pueden eliminar categorias predeterminadas'] },
    })
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('returns not-found error for non-existent ID', async () => {
    mockFindFirst.mockResolvedValue(null)

    const result = await deleteCategory('nonexistent-id')

    expect(result).toEqual({
      error: { _form: ['Categoria no encontrada'] },
    })
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('calls revalidatePath for /configuracion and /movimientos on success', async () => {
    mockFindFirst.mockResolvedValue({ isDefault: false })
    mockUpdate.mockResolvedValue({ id: 'custom-cat-id' })

    await deleteCategory('custom-cat-id')

    expect(mockRevalidatePath).toHaveBeenCalledWith('/configuracion')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/movimientos')
  })

  it('returns generic error for unexpected failures', async () => {
    mockFindFirst.mockRejectedValue(new Error('DB timeout'))

    const result = await deleteCategory('some-id')

    expect(result).toHaveProperty('error')
    if ('error' in result) {
      expect(result.error).toHaveProperty('_form')
    }
  })
})
