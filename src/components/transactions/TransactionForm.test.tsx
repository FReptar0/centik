import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react'
import TransactionForm from './TransactionForm'
import type { Category } from '@/types'
import type { SerializedIncomeSource, SerializedTransaction } from '@/types'

const mockCreateTransaction = vi.fn().mockResolvedValue({ success: true })
const mockUpdateTransaction = vi.fn().mockResolvedValue({ success: true })

vi.mock('@/app/movimientos/actions', () => ({
  createTransaction: (...args: unknown[]) => mockCreateTransaction(...args),
  updateTransaction: (...args: unknown[]) => mockUpdateTransaction(...args),
}))

vi.mock('@/lib/utils', async () => {
  const actual = await vi.importActual<typeof import('@/lib/utils')>('@/lib/utils')
  return {
    ...actual,
    toCents: vi.fn((input: string) => {
      const parts = input.split('.')
      const integer = parts[0] || '0'
      const fraction = (parts[1] ?? '').padEnd(2, '0').slice(0, 2)
      return (integer + fraction).replace(/^0+/, '') || '0'
    }),
  }
})

function makeCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: 'cat-expense-1',
    name: 'Comida',
    icon: 'utensils',
    color: '#C88A5A',
    type: 'EXPENSE',
    isDefault: true,
    isActive: true,
    sortOrder: 1,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  }
}

function makeIncomeSource(
  overrides: Partial<SerializedIncomeSource> = {},
): SerializedIncomeSource {
  return {
    id: 'src-1',
    name: 'TerSoft',
    defaultAmount: '2000000',
    frequency: 'QUINCENAL',
    type: 'EMPLOYMENT',
    isActive: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  }
}

const expenseCategories: Category[] = [
  makeCategory({ id: 'cat-1', name: 'Comida', icon: 'utensils', type: 'EXPENSE' }),
  makeCategory({ id: 'cat-2', name: 'Servicios', icon: 'zap', type: 'EXPENSE' }),
  makeCategory({ id: 'cat-3', name: 'Transporte', icon: 'car', type: 'EXPENSE' }),
]

const incomeCategories: Category[] = [
  makeCategory({
    id: 'cat-inc-1',
    name: 'Empleo',
    icon: 'briefcase',
    type: 'INCOME',
    color: '#6BAF8E',
  }),
  makeCategory({
    id: 'cat-inc-2',
    name: 'Freelance',
    icon: 'laptop',
    type: 'INCOME',
    color: '#7AACB8',
  }),
]

const allCategories = [...expenseCategories, ...incomeCategories]

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  categories: allCategories,
  incomeSources: [] as SerializedIncomeSource[],
  transaction: null,
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('TransactionForm', () => {
  it('renders with expense toggle selected by default', () => {
    render(<TransactionForm {...defaultProps} />)

    // Modal renders both mobile and desktop -- use getAllBy
    const gastoButtons = screen.getAllByRole('button', { name: /gasto/i })
    expect(gastoButtons.length).toBeGreaterThanOrEqual(1)
    expect(gastoButtons[0].className).toContain('bg-accent')
  })

  it('toggling to income filters categories to income type', () => {
    render(<TransactionForm {...defaultProps} />)

    // Initially shows expense categories (dual render = 2x each)
    expect(screen.getAllByText('Comida').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Servicios').length).toBeGreaterThanOrEqual(1)
    expect(screen.queryByText('Empleo')).toBeNull()

    // Toggle to income on ALL instances (dual render: mobile + desktop)
    const ingresoButtons = screen.getAllByRole('button', { name: /ingreso/i })
    ingresoButtons.forEach((btn) => fireEvent.click(btn))

    // Now shows income categories
    expect(screen.getAllByText('Empleo').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Freelance').length).toBeGreaterThanOrEqual(1)
    expect(screen.queryByText('Comida')).toBeNull()
  })

  it('amount input has inputMode="decimal"', () => {
    render(<TransactionForm {...defaultProps} />)

    const amountInputs = screen.getAllByPlaceholderText('0.00')
    expect(amountInputs[0].getAttribute('inputMode')).toBe('decimal')
  })

  it('"Mas detalles" section is collapsed by default, clicking expands it', () => {
    render(<TransactionForm {...defaultProps} />)

    // Description should not be visible
    expect(screen.queryByLabelText(/descripcion/i)).toBeNull()

    // Click "Mas detalles" (first instance)
    const toggleButtons = screen.getAllByRole('button', { name: /mas detalles/i })
    fireEvent.click(toggleButtons[0])

    // Now description should be visible
    expect(screen.getAllByLabelText(/descripcion/i).length).toBeGreaterThanOrEqual(1)
  })

  it('submit calls createTransaction with correct data shape (amount in centavos)', async () => {
    render(<TransactionForm {...defaultProps} />)

    // Enter amount (first instance)
    const amountInputs = screen.getAllByPlaceholderText('0.00')
    fireEvent.change(amountInputs[0], { target: { value: '150.75' } })

    // Select category (first Comida button)
    const comidaButtons = screen.getAllByRole('button', { name: /comida/i })
    fireEvent.click(comidaButtons[0])

    // Submit (first Guardar button)
    const submitButtons = screen.getAllByRole('button', { name: /guardar/i })
    await act(async () => {
      fireEvent.click(submitButtons[0])
    })

    expect(mockCreateTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'EXPENSE',
        amount: '15075',
        categoryId: 'cat-1',
      }),
    )
  })

  it('edit mode pre-fills form fields from transaction prop', () => {
    const transaction: SerializedTransaction = {
      id: 'txn-1',
      type: 'EXPENSE',
      amount: '15075',
      description: 'Almuerzo',
      categoryId: 'cat-1',
      incomeSourceId: null,
      date: new Date('2026-04-01'),
      paymentMethod: 'DEBITO',
      periodId: 'period-1',
      notes: 'Con colegas',
      createdAt: new Date('2026-04-01'),
      updatedAt: new Date('2026-04-01'),
    }

    render(<TransactionForm {...defaultProps} transaction={transaction} />)

    // Amount should be pre-filled in pesos (15075 centavos = 150.75 pesos)
    const amountInputs = screen.getAllByPlaceholderText('0.00') as HTMLInputElement[]
    expect(amountInputs[0].value).toBe('150.75')

    // Optional fields should be expanded since transaction has description/notes
    const descInputs = screen.getAllByLabelText(/descripcion/i) as HTMLInputElement[]
    expect(descInputs.length).toBeGreaterThanOrEqual(1)
    expect(descInputs[0].value).toBe('Almuerzo')
  })

  it('income source dropdown only visible when type is INCOME', () => {
    const incomeSources = [makeIncomeSource()]

    render(<TransactionForm {...defaultProps} incomeSources={incomeSources} />)

    // Initially expense -- no income source dropdown
    expect(screen.queryByLabelText(/fuente de ingreso/i)).toBeNull()

    // Toggle to income
    const ingresoButtons = screen.getAllByRole('button', { name: /ingreso/i })
    fireEvent.click(ingresoButtons[0])

    // Expand details to see income source
    const toggleButtons = screen.getAllByRole('button', { name: /mas detalles/i })
    fireEvent.click(toggleButtons[0])

    // Now income source dropdown should be visible
    expect(
      screen.getAllByLabelText(/fuente de ingreso/i).length,
    ).toBeGreaterThanOrEqual(1)
  })

  it('successful submit closes modal by calling onClose', async () => {
    const onClose = vi.fn()

    render(<TransactionForm {...defaultProps} onClose={onClose} />)

    // Enter amount
    const amountInputs = screen.getAllByPlaceholderText('0.00')
    fireEvent.change(amountInputs[0], { target: { value: '100' } })

    // Select category
    const comidaButtons = screen.getAllByRole('button', { name: /comida/i })
    fireEvent.click(comidaButtons[0])

    // Submit
    const submitButtons = screen.getAllByRole('button', { name: /guardar/i })
    await act(async () => {
      fireEvent.click(submitButtons[0])
    })

    expect(onClose).toHaveBeenCalled()
  })
})
