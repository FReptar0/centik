import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createDebt, updateDebt, updateDebtBalance, deleteDebt } from './actions'

const mockCreate = vi.fn()
const mockFindFirst = vi.fn()
const mockUpdate = vi.fn()
const mockDelete = vi.fn()

vi.mock('@/lib/prisma', () => ({
  default: {
    debt: {
      create: (...args: unknown[]) => mockCreate(...args),
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
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
  requireAuth: vi.fn().mockResolvedValue({ userId: 'test-user-id' }),
}))

const validCreditCard = {
  name: 'BBVA Oro',
  type: 'CREDIT_CARD' as const,
  currentBalance: '1500000',
  creditLimit: '5000000',
  annualRate: 4500,
  minimumPayment: '75000',
  cutOffDay: 15,
  paymentDueDay: 5,
}

const validLoan = {
  name: 'Prestamo Personal',
  type: 'PERSONAL_LOAN' as const,
  currentBalance: '6000000',
  annualRate: 1500,
  monthlyPayment: '200000',
  originalAmount: '8000000',
  remainingMonths: 30,
}

describe('createDebt', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates credit card with valid data and returns success', async () => {
    mockCreate.mockResolvedValue({ id: 'test-id', ...validCreditCard })

    const result = await createDebt(validCreditCard)

    expect(result).toEqual({ success: true })
    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        name: 'BBVA Oro',
        type: 'CREDIT_CARD',
        currentBalance: BigInt('1500000'),
        creditLimit: BigInt('5000000'),
        annualRate: 4500,
        minimumPayment: BigInt('75000'),
        monthlyPayment: null,
        originalAmount: null,
        remainingMonths: null,
        cutOffDay: 15,
        paymentDueDay: 5,
        userId: TEST_USER_ID,
      },
    })
  })

  it('creates loan with valid data and returns success', async () => {
    mockCreate.mockResolvedValue({ id: 'test-id', ...validLoan })

    const result = await createDebt(validLoan)

    expect(result).toEqual({ success: true })
    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        name: 'Prestamo Personal',
        type: 'PERSONAL_LOAN',
        currentBalance: BigInt('6000000'),
        creditLimit: null,
        annualRate: 1500,
        minimumPayment: null,
        monthlyPayment: BigInt('200000'),
        originalAmount: BigInt('8000000'),
        remainingMonths: 30,
        cutOffDay: null,
        paymentDueDay: null,
        userId: TEST_USER_ID,
      },
    })
  })

  it('returns field errors for invalid data', async () => {
    const result = await createDebt({
      name: '',
      type: 'INVALID',
      currentBalance: 'abc',
      annualRate: -5,
    })

    expect(result).toHaveProperty('error')
    if ('error' in result) {
      expect(result.error).toHaveProperty('name')
      expect(result.error).toHaveProperty('type')
      expect(result.error).toHaveProperty('currentBalance')
      expect(result.error).toHaveProperty('annualRate')
    }
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('returns refinement error when credit card has no credit limit', async () => {
    const result = await createDebt({
      name: 'Card without limit',
      type: 'CREDIT_CARD',
      currentBalance: '100000',
      annualRate: 3500,
    })

    expect(result).toHaveProperty('error')
    if ('error' in result) {
      expect(result.error).toHaveProperty('creditLimit')
    }
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('returns friendly error for duplicate name (P2002)', async () => {
    mockCreate.mockRejectedValue({ code: 'P2002', meta: { target: ['name'] } })

    const result = await createDebt(validCreditCard)

    expect(result).toEqual({
      error: { name: ['Ya existe una deuda con ese nombre'] },
    })
  })

  it('calls revalidatePath for /deudas and / on success', async () => {
    mockCreate.mockResolvedValue({ id: 'test-id' })

    await createDebt(validCreditCard)

    expect(mockRevalidatePath).toHaveBeenCalledWith('/deudas')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/')
  })

  it('returns generic error for unexpected failures', async () => {
    mockCreate.mockRejectedValue(new Error('Connection lost'))

    const result = await createDebt(validCreditCard)

    expect(result).toHaveProperty('error')
    if ('error' in result) {
      expect(result.error).toHaveProperty('_form')
    }
  })
})

describe('updateDebt', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('updates debt with valid data and returns success', async () => {
    mockFindFirst.mockResolvedValue({ id: 'existing-id' })
    mockUpdate.mockResolvedValue({ id: 'existing-id', ...validCreditCard })

    const result = await updateDebt('existing-id', validCreditCard)

    expect(result).toEqual({ success: true })
    expect(mockFindFirst).toHaveBeenCalledWith({
      where: { id: 'existing-id', userId: TEST_USER_ID },
    })
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'existing-id' },
      data: {
        name: 'BBVA Oro',
        type: 'CREDIT_CARD',
        currentBalance: BigInt('1500000'),
        creditLimit: BigInt('5000000'),
        annualRate: 4500,
        minimumPayment: BigInt('75000'),
        monthlyPayment: null,
        originalAmount: null,
        remainingMonths: null,
        cutOffDay: 15,
        paymentDueDay: 5,
      },
    })
  })

  it('returns field errors for invalid data', async () => {
    const result = await updateDebt('some-id', {
      name: '',
      type: 'BAD',
      currentBalance: 'xyz',
      annualRate: -1,
    })

    expect(result).toHaveProperty('error')
    if ('error' in result) {
      expect(result.error).toHaveProperty('name')
    }
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('returns not-found error for non-existent ID', async () => {
    mockFindFirst.mockResolvedValue(null)

    const result = await updateDebt('nonexistent-id', validCreditCard)

    expect(result).toEqual({
      error: { _form: ['Deuda no encontrada'] },
    })
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('returns friendly error for duplicate name on update (P2002)', async () => {
    mockFindFirst.mockResolvedValue({ id: 'existing-id' })
    mockUpdate.mockRejectedValue({ code: 'P2002', meta: { target: ['name'] } })

    const result = await updateDebt('existing-id', validCreditCard)

    expect(result).toEqual({
      error: { name: ['Ya existe una deuda con ese nombre'] },
    })
  })

  it('calls revalidatePath for /deudas and / on success', async () => {
    mockFindFirst.mockResolvedValue({ id: 'existing-id' })
    mockUpdate.mockResolvedValue({ id: 'existing-id' })

    await updateDebt('existing-id', validCreditCard)

    expect(mockRevalidatePath).toHaveBeenCalledWith('/deudas')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/')
  })
})

describe('updateDebtBalance', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('updates balance with valid data and returns success', async () => {
    mockFindFirst.mockResolvedValue({ id: 'existing-id' })
    mockUpdate.mockResolvedValue({ id: 'existing-id', currentBalance: BigInt('2000000') })

    const result = await updateDebtBalance('existing-id', { currentBalance: '2000000' })

    expect(result).toEqual({ success: true })
    expect(mockFindFirst).toHaveBeenCalledWith({
      where: { id: 'existing-id', userId: TEST_USER_ID },
    })
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'existing-id' },
      data: { currentBalance: BigInt('2000000') },
    })
  })

  it('returns field errors for invalid balance', async () => {
    const result = await updateDebtBalance('some-id', { currentBalance: 'abc' })

    expect(result).toHaveProperty('error')
    if ('error' in result) {
      expect(result.error).toHaveProperty('currentBalance')
    }
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('returns not-found error for non-existent ID', async () => {
    mockFindFirst.mockResolvedValue(null)

    const result = await updateDebtBalance('nonexistent-id', { currentBalance: '2000000' })

    expect(result).toEqual({
      error: { _form: ['Deuda no encontrada'] },
    })
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('calls revalidatePath for /deudas and / on success', async () => {
    mockFindFirst.mockResolvedValue({ id: 'existing-id' })
    mockUpdate.mockResolvedValue({ id: 'existing-id' })

    await updateDebtBalance('existing-id', { currentBalance: '2000000' })

    expect(mockRevalidatePath).toHaveBeenCalledWith('/deudas')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/')
  })

  it('returns generic error for unexpected failures', async () => {
    mockFindFirst.mockResolvedValue({ id: 'some-id' })
    mockUpdate.mockRejectedValue(new Error('DB timeout'))

    const result = await updateDebtBalance('some-id', { currentBalance: '2000000' })

    expect(result).toHaveProperty('error')
    if ('error' in result) {
      expect(result.error).toHaveProperty('_form')
    }
  })
})

describe('deleteDebt', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deletes debt and returns success', async () => {
    mockFindFirst.mockResolvedValue({ id: 'existing-id' })
    mockDelete.mockResolvedValue({ id: 'existing-id' })

    const result = await deleteDebt('existing-id')

    expect(result).toEqual({ success: true })
    expect(mockFindFirst).toHaveBeenCalledWith({
      where: { id: 'existing-id', userId: TEST_USER_ID },
    })
    expect(mockDelete).toHaveBeenCalledWith({
      where: { id: 'existing-id' },
    })
  })

  it('returns not-found error for non-existent ID', async () => {
    mockFindFirst.mockResolvedValue(null)

    const result = await deleteDebt('nonexistent-id')

    expect(result).toEqual({
      error: { _form: ['Deuda no encontrada'] },
    })
    expect(mockDelete).not.toHaveBeenCalled()
  })

  it('calls revalidatePath for /deudas and / on success', async () => {
    mockFindFirst.mockResolvedValue({ id: 'existing-id' })
    mockDelete.mockResolvedValue({ id: 'existing-id' })

    await deleteDebt('existing-id')

    expect(mockRevalidatePath).toHaveBeenCalledWith('/deudas')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/')
  })

  it('returns generic error for unexpected failures', async () => {
    mockFindFirst.mockResolvedValue({ id: 'some-id' })
    mockDelete.mockRejectedValue(new Error('DB timeout'))

    const result = await deleteDebt('some-id')

    expect(result).toHaveProperty('error')
    if ('error' in result) {
      expect(result.error).toHaveProperty('_form')
    }
  })
})
