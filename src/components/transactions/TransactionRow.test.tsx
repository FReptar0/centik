import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react'
import TransactionRow from './TransactionRow'
import type { SerializedTransaction } from '@/types'

const mockDeleteTransaction = vi.fn().mockResolvedValue({ success: true })

vi.mock('@/app/movimientos/actions', () => ({
  deleteTransaction: (...args: unknown[]) => mockDeleteTransaction(...args),
}))

vi.mock('@/lib/utils', async () => {
  const actual = await vi.importActual<typeof import('@/lib/utils')>('@/lib/utils')
  return {
    ...actual,
    formatMoney: vi.fn((cents: string) => `$${(Number(cents) / 100).toFixed(2)}`),
  }
})

type TransactionWithCategory = SerializedTransaction & {
  category: { name: string; icon: string; color: string }
}

function makeTransaction(
  overrides: Partial<TransactionWithCategory> = {},
): TransactionWithCategory {
  return {
    id: 'txn-1',
    type: 'EXPENSE',
    amount: '15075',
    description: null,
    categoryId: 'cat-1',
    incomeSourceId: null,
    date: new Date('2026-04-01'),
    paymentMethod: null,
    periodId: 'period-1',
    notes: null,
    createdAt: new Date('2026-04-01'),
    updatedAt: new Date('2026-04-01'),
    category: { name: 'Comida', icon: 'utensils', color: '#fb923c' },
    ...overrides,
  }
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('TransactionRow', () => {
  it('renders category name when no description', () => {
    const txn = makeTransaction({ description: null })
    render(<TransactionRow transaction={txn} onEdit={vi.fn()} />)

    expect(screen.getByText('Comida')).toBeDefined()
  })

  it('renders description instead of category name when description exists', () => {
    const txn = makeTransaction({ description: 'Almuerzo especial' })
    render(<TransactionRow transaction={txn} onEdit={vi.fn()} />)

    expect(screen.getByText('Almuerzo especial')).toBeDefined()
    // Category name should not appear as the primary text
    expect(screen.queryByText('Comida')).toBeNull()
  })

  it('INCOME shows green "+$" amount', () => {
    const txn = makeTransaction({
      type: 'INCOME',
      amount: '5000000',
      category: { name: 'Empleo', icon: 'briefcase', color: '#34d399' },
    })
    render(<TransactionRow transaction={txn} onEdit={vi.fn()} />)

    const amountElement = screen.getByText(/\+\$50000\.00/)
    expect(amountElement.className).toContain('text-positive')
  })

  it('EXPENSE shows red "-$" amount', () => {
    const txn = makeTransaction({ type: 'EXPENSE', amount: '15075' })
    render(<TransactionRow transaction={txn} onEdit={vi.fn()} />)

    const amountElement = screen.getByText(/-\$150\.75/)
    expect(amountElement.className).toContain('text-negative')
  })

  it('edit button calls onEdit with transaction', () => {
    const txn = makeTransaction()
    const handleEdit = vi.fn()
    render(<TransactionRow transaction={txn} onEdit={handleEdit} />)

    const editButton = screen.getByRole('button', { name: /editar/i })
    fireEvent.click(editButton)

    expect(handleEdit).toHaveBeenCalledWith(txn)
  })

  it('delete shows inline confirmation', () => {
    const txn = makeTransaction()
    render(<TransactionRow transaction={txn} onEdit={vi.fn()} />)

    const deleteButton = screen.getByRole('button', { name: /eliminar/i })
    fireEvent.click(deleteButton)

    expect(screen.getByText(/Eliminar\?/)).toBeDefined()
    expect(screen.getByText('Si')).toBeDefined()
    expect(screen.getByText('No')).toBeDefined()
  })

  it('confirmation auto-reverts after 3s', () => {
    vi.useFakeTimers()

    const txn = makeTransaction()
    render(<TransactionRow transaction={txn} onEdit={vi.fn()} />)

    const deleteButton = screen.getByRole('button', { name: /eliminar/i })
    fireEvent.click(deleteButton)

    expect(screen.getByText(/Eliminar\?/)).toBeDefined()

    act(() => {
      vi.advanceTimersByTime(3000)
    })

    expect(screen.queryByText(/Eliminar\?/)).toBeNull()
    expect(screen.getByRole('button', { name: /eliminar/i })).toBeDefined()

    vi.useRealTimers()
  })

  it('"Si" calls deleteTransaction with transaction id', async () => {
    const txn = makeTransaction()
    render(<TransactionRow transaction={txn} onEdit={vi.fn()} />)

    const deleteButton = screen.getByRole('button', { name: /eliminar/i })
    fireEvent.click(deleteButton)

    await act(async () => {
      fireEvent.click(screen.getByText('Si'))
    })

    expect(mockDeleteTransaction).toHaveBeenCalledWith('txn-1')
  })
})
