import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react'
import TransactionRow from './TransactionRow'
import type { SerializedTransaction } from '@/types'

const mockDeleteTransaction = vi.fn().mockResolvedValue({ success: true })

vi.mock('@/app/(app)/movimientos/actions', () => ({
  deleteTransaction: (...args: unknown[]) => mockDeleteTransaction(...args),
}))

vi.mock('@/components/ui/MoneyAmount', () => ({
  default: ({ value, variant, size }: { value: string; variant?: string; size?: string }) => (
    <span data-testid="money-amount" data-value={value} data-variant={variant} data-size={size}>
      ${(Number(value) / 100).toFixed(2)}
    </span>
  ),
}))

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
    userId: 'test-user-id',
    createdAt: new Date('2026-04-01'),
    updatedAt: new Date('2026-04-01'),
    category: { name: 'Comida', icon: 'utensils', color: '#C88A5A' },
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

  it('INCOME shows green "+" sign and income MoneyAmount', () => {
    const txn = makeTransaction({
      type: 'INCOME',
      amount: '5000000',
      category: { name: 'Empleo', icon: 'briefcase', color: '#6BAF8E' },
    })
    render(<TransactionRow transaction={txn} onEdit={vi.fn()} />)

    // Sign prefix is in its own span
    const signElement = screen.getByText('+')
    expect(signElement.className).toContain('text-positive')

    // MoneyAmount renders with income variant
    const moneyElement = screen.getByTestId('money-amount')
    expect(moneyElement.getAttribute('data-variant')).toBe('income')
    expect(moneyElement.getAttribute('data-value')).toBe('5000000')
  })

  it('EXPENSE shows red "-" sign and expense MoneyAmount', () => {
    const txn = makeTransaction({ type: 'EXPENSE', amount: '15075' })
    render(<TransactionRow transaction={txn} onEdit={vi.fn()} />)

    // Sign prefix is in its own span
    const signElement = screen.getByText('-')
    expect(signElement.className).toContain('text-negative')

    // MoneyAmount renders with expense variant
    const moneyElement = screen.getByTestId('money-amount')
    expect(moneyElement.getAttribute('data-variant')).toBe('expense')
    expect(moneyElement.getAttribute('data-value')).toBe('15075')
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

  it('applies animate-scanline-reveal class when isNew is true', () => {
    const txn = makeTransaction()
    const { container } = render(<TransactionRow transaction={txn} onEdit={vi.fn()} isNew={true} />)

    const outerDiv = container.firstElementChild as HTMLElement
    expect(outerDiv.className).toContain('animate-scanline-reveal')
  })

  it('does not apply animate-scanline-reveal class when isNew is false or undefined', () => {
    const txn = makeTransaction()

    // Without isNew prop
    const { container: container1 } = render(<TransactionRow transaction={txn} onEdit={vi.fn()} />)
    const div1 = container1.firstElementChild as HTMLElement
    expect(div1.className).not.toContain('animate-scanline-reveal')

    cleanup()

    // With isNew=false
    const { container: container2 } = render(
      <TransactionRow transaction={txn} onEdit={vi.fn()} isNew={false} />,
    )
    const div2 = container2.firstElementChild as HTMLElement
    expect(div2.className).not.toContain('animate-scanline-reveal')
  })
})
