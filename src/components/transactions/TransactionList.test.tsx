import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import TransactionList from './TransactionList'
import type { SerializedTransaction } from '@/types'

vi.mock('@/components/transactions/TransactionRow', () => ({
  default: ({ transaction }: { transaction: { id: string } }) => (
    <div data-testid="transaction-row">{transaction.id}</div>
  ),
}))

vi.mock('@/components/ui/DynamicIcon', () => ({
  default: ({ name }: { name: string }) => <span data-testid="icon">{name}</span>,
}))

type TransactionWithCategory = SerializedTransaction & {
  category: { name: string; icon: string; color: string }
}

function makeTxn(id: string): TransactionWithCategory {
  return {
    id,
    type: 'EXPENSE',
    amount: '15000',
    description: null,
    categoryId: 'cat-1',
    incomeSourceId: null,
    date: new Date('2026-04-01'),
    paymentMethod: null,
    periodId: 'period-1',
    notes: null,
    createdAt: new Date('2026-04-01'),
    updatedAt: new Date('2026-04-01'),
    category: { name: 'Comida', icon: 'utensils', color: '#C88A5A' },
  }
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('TransactionList', () => {
  it('shows empty state when transactions is empty', () => {
    render(
      <TransactionList
        transactions={[]}
        onEdit={vi.fn()}
        hasMore={false}
        onLoadMore={vi.fn()}
        isLoadingMore={false}
      />,
    )

    expect(screen.getByText('Sin movimientos este mes')).toBeDefined()
    expect(screen.getByTestId('icon').textContent).toBe('arrow-left-right')
    expect(screen.queryByText('Cargar mas')).toBeNull()
  })

  it('renders transaction rows for each item', () => {
    const transactions = [makeTxn('txn-1'), makeTxn('txn-2'), makeTxn('txn-3')]

    render(
      <TransactionList
        transactions={transactions}
        onEdit={vi.fn()}
        hasMore={false}
        onLoadMore={vi.fn()}
        isLoadingMore={false}
      />,
    )

    const rows = screen.getAllByTestId('transaction-row')
    expect(rows).toHaveLength(3)
    expect(rows[0].textContent).toBe('txn-1')
    expect(rows[1].textContent).toBe('txn-2')
    expect(rows[2].textContent).toBe('txn-3')
  })

  it('shows "Cargar mas" button when hasMore is true', () => {
    render(
      <TransactionList
        transactions={[makeTxn('txn-1')]}
        onEdit={vi.fn()}
        hasMore={true}
        onLoadMore={vi.fn()}
        isLoadingMore={false}
      />,
    )

    const button = screen.getByText('Cargar mas')
    expect(button).toBeDefined()
    expect(button.tagName).toBe('BUTTON')
  })

  it('hides "Cargar mas" button when hasMore is false', () => {
    render(
      <TransactionList
        transactions={[makeTxn('txn-1')]}
        onEdit={vi.fn()}
        hasMore={false}
        onLoadMore={vi.fn()}
        isLoadingMore={false}
      />,
    )

    expect(screen.queryByText('Cargar mas')).toBeNull()
  })

  it('calls onLoadMore when "Cargar mas" is clicked', () => {
    const handleLoadMore = vi.fn()

    render(
      <TransactionList
        transactions={[makeTxn('txn-1')]}
        onEdit={vi.fn()}
        hasMore={true}
        onLoadMore={handleLoadMore}
        isLoadingMore={false}
      />,
    )

    fireEvent.click(screen.getByText('Cargar mas'))
    expect(handleLoadMore).toHaveBeenCalledOnce()
  })

  it('shows "Cargando..." and disables button when isLoadingMore is true', () => {
    render(
      <TransactionList
        transactions={[makeTxn('txn-1')]}
        onEdit={vi.fn()}
        hasMore={true}
        onLoadMore={vi.fn()}
        isLoadingMore={true}
      />,
    )

    const button = screen.getByText('Cargando...')
    expect(button).toBeDefined()
    expect((button as HTMLButtonElement).disabled).toBe(true)
    expect(screen.queryByText('Cargar mas')).toBeNull()
  })
})
