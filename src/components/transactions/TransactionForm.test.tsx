import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react'
import TransactionForm from './TransactionForm'
import type { Category } from '@/types'
import type { SerializedIncomeSource, SerializedTransaction } from '@/types'

const mockCreateTransaction = vi.fn().mockResolvedValue({ success: true })
const mockUpdateTransaction = vi.fn().mockResolvedValue({ success: true })

vi.mock('@/app/(app)/movimientos/actions', () => ({
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
    userId: 'test-user-id',
    ...overrides,
  }
}

function makeIncomeSource(overrides: Partial<SerializedIncomeSource> = {}): SerializedIncomeSource {
  return {
    id: 'src-1',
    name: 'TerSoft',
    defaultAmount: '2000000',
    frequency: 'QUINCENAL',
    type: 'EMPLOYMENT',
    isActive: true,
    userId: 'test-user-id',
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

    // TogglePills renders radio buttons
    const gastoRadios = screen.getAllByRole('radio', { name: /gasto/i })
    expect(gastoRadios.length).toBeGreaterThanOrEqual(1)
    expect(gastoRadios[0].getAttribute('aria-checked')).toBe('true')
  })

  it('toggling to income filters categories to income type', () => {
    render(<TransactionForm {...defaultProps} />)

    // Initially shows expense categories
    expect(screen.getAllByText('Comida').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Servicios').length).toBeGreaterThanOrEqual(1)
    expect(screen.queryByText('Empleo')).toBeNull()

    // Toggle to income via TogglePills radio
    const ingresoRadios = screen.getAllByRole('radio', { name: /ingreso/i })
    ingresoRadios.forEach((btn) => fireEvent.click(btn))

    // Now shows income categories
    expect(screen.getAllByText('Empleo').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Freelance').length).toBeGreaterThanOrEqual(1)
    expect(screen.queryByText('Comida')).toBeNull()
  })

  it('renders Numpad component with digit buttons', () => {
    render(<TransactionForm {...defaultProps} />)

    // Numpad renders digit buttons 0-9
    for (let d = 0; d <= 9; d++) {
      const digitButtons = screen.getAllByRole('button', { name: String(d) })
      expect(digitButtons.length).toBeGreaterThanOrEqual(1)
    }
  })

  it('hero amount display updates when Numpad digits are tapped', () => {
    render(<TransactionForm {...defaultProps} />)

    // Initially shows 0.00
    expect(screen.getAllByText('0.00').length).toBeGreaterThanOrEqual(1)

    // Tap 1, 5, 0 on numpad
    const btn1 = screen.getAllByRole('button', { name: '1' })
    const btn5 = screen.getAllByRole('button', { name: '5' })
    const btn0 = screen.getAllByRole('button', { name: '0' })

    fireEvent.click(btn1[0])
    fireEvent.click(btn5[0])
    fireEvent.click(btn0[0])

    // Hero display should show "150"
    expect(screen.getAllByText('150').length).toBeGreaterThanOrEqual(1)
  })

  it('category grid shows circular icons with accent ring on selected', () => {
    render(<TransactionForm {...defaultProps} />)

    // Select first category (Comida)
    const comidaButtons = screen.getAllByRole('button', { name: /comida/i })
    fireEvent.click(comidaButtons[0])

    // The icon container should have ring-2 ring-accent classes
    const iconContainer = comidaButtons[0].querySelector('div')
    expect(iconContainer?.className).toContain('ring-2')
    expect(iconContainer?.className).toContain('ring-accent')
  })

  it('GUARDAR button is in header', () => {
    render(<TransactionForm {...defaultProps} />)

    const guardarButtons = screen.getAllByRole('button', { name: /guardar/i })
    expect(guardarButtons.length).toBeGreaterThanOrEqual(1)
    expect(guardarButtons[0].textContent).toBe('GUARDAR')
  })

  it('uses TogglePills for type selection (radiogroup)', () => {
    render(<TransactionForm {...defaultProps} />)

    const radiogroups = screen.getAllByRole('radiogroup')
    expect(radiogroups.length).toBeGreaterThanOrEqual(1)

    const gastoRadios = screen.getAllByRole('radio', { name: /gasto/i })
    const ingresoRadios = screen.getAllByRole('radio', { name: /ingreso/i })
    expect(gastoRadios.length).toBeGreaterThanOrEqual(1)
    expect(ingresoRadios.length).toBeGreaterThanOrEqual(1)
  })

  it('"Mas detalles" section is collapsed by default, clicking expands it', () => {
    render(<TransactionForm {...defaultProps} />)

    // FloatingInput description should not be visible
    expect(screen.queryByLabelText(/descripcion/i)).toBeNull()

    // Click "Mas detalles"
    const toggleButtons = screen.getAllByRole('button', { name: /mas detalles/i })
    fireEvent.click(toggleButtons[0])

    // Now description FloatingInput should be visible
    expect(screen.getAllByLabelText(/descripcion/i).length).toBeGreaterThanOrEqual(1)
  })

  it('submit calls createTransaction with correct data shape', async () => {
    render(<TransactionForm {...defaultProps} />)

    // Tap 1, 5, 0 on the numpad
    const btn1 = screen.getAllByRole('button', { name: '1' })
    const btn5 = screen.getAllByRole('button', { name: '5' })
    const btn0 = screen.getAllByRole('button', { name: '0' })
    fireEvent.click(btn1[0])
    fireEvent.click(btn5[0])
    fireEvent.click(btn0[0])

    // Select category
    const comidaButtons = screen.getAllByRole('button', { name: /comida/i })
    fireEvent.click(comidaButtons[0])

    // Click GUARDAR
    const guardarButtons = screen.getAllByRole('button', { name: /guardar/i })
    await act(async () => {
      fireEvent.click(guardarButtons[0])
    })

    expect(mockCreateTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'EXPENSE',
        amount: '15000',
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
      userId: 'test-user-id',
      createdAt: new Date('2026-04-01'),
      updatedAt: new Date('2026-04-01'),
    }

    render(<TransactionForm {...defaultProps} transaction={transaction} />)

    // Hero amount display should show "150.75" (15075 centavos = 150.75 pesos)
    expect(screen.getAllByText('150.75').length).toBeGreaterThanOrEqual(1)

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
    const ingresoRadios = screen.getAllByRole('radio', { name: /ingreso/i })
    fireEvent.click(ingresoRadios[0])

    // Expand details to see income source
    const toggleButtons = screen.getAllByRole('button', { name: /mas detalles/i })
    fireEvent.click(toggleButtons[0])

    // Now income source dropdown should be visible
    expect(screen.getAllByLabelText(/fuente de ingreso/i).length).toBeGreaterThanOrEqual(1)
  })

  it('successful submit closes modal by calling onClose', async () => {
    vi.useFakeTimers()
    const onClose = vi.fn()

    render(<TransactionForm {...defaultProps} onClose={onClose} />)

    // Enter amount via numpad
    const btn1 = screen.getAllByRole('button', { name: '1' })
    const btn0 = screen.getAllByRole('button', { name: '0' })
    fireEvent.click(btn1[0])
    fireEvent.click(btn0[0])
    fireEvent.click(btn0[0])

    // Select category
    const comidaButtons = screen.getAllByRole('button', { name: /comida/i })
    fireEvent.click(comidaButtons[0])

    // Click GUARDAR
    const guardarButtons = screen.getAllByRole('button', { name: /guardar/i })
    await act(async () => {
      fireEvent.click(guardarButtons[0])
    })

    // Advance timers to trigger the 200ms delay
    await act(async () => {
      vi.advanceTimersByTime(200)
    })

    expect(onClose).toHaveBeenCalled()
    vi.useRealTimers()
  })
})
