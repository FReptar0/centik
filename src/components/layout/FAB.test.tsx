import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react'
import FAB from './FAB'

const mockGetTransactionFormData = vi.fn().mockResolvedValue({
  categories: [
    {
      id: 'cat-1',
      name: 'Comida',
      icon: 'utensils',
      color: '#C88A5A',
      type: 'EXPENSE',
      isDefault: true,
      isActive: true,
      sortOrder: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  incomeSources: [],
})

vi.mock('@/app/(app)/movimientos/actions', () => ({
  getTransactionFormData: () => mockGetTransactionFormData(),
}))

vi.mock('@/components/transactions/TransactionForm', () => ({
  default: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
    isOpen ? (
      <div data-testid="transaction-form">
        <span>TransactionForm</span>
        <button onClick={onClose}>Cerrar</button>
      </div>
    ) : null,
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('FAB', () => {
  it('renders a button with aria-label "Registrar movimiento"', () => {
    render(<FAB />)
    const button = screen.getByRole('button', {
      name: /registrar movimiento/i,
    })
    expect(button).toBeDefined()
  })

  it('clicking FAB fetches form data and opens TransactionForm', async () => {
    render(<FAB />)
    const button = screen.getByRole('button', {
      name: /registrar movimiento/i,
    })

    await act(async () => {
      fireEvent.click(button)
    })

    expect(mockGetTransactionFormData).toHaveBeenCalledOnce()
    expect(screen.getByTestId('transaction-form')).toBeDefined()
    expect(screen.getByText('TransactionForm')).toBeDefined()
  })

  it('caches form data on subsequent opens', async () => {
    render(<FAB />)
    const button = screen.getByRole('button', {
      name: /registrar movimiento/i,
    })

    await act(async () => {
      fireEvent.click(button)
    })

    expect(mockGetTransactionFormData).toHaveBeenCalledOnce()

    // Close
    fireEvent.click(screen.getByText('Cerrar'))
    expect(screen.queryByTestId('transaction-form')).toBeNull()

    // Reopen -- should not fetch again
    await act(async () => {
      fireEvent.click(button)
    })

    expect(mockGetTransactionFormData).toHaveBeenCalledOnce()
    expect(screen.getByTestId('transaction-form')).toBeDefined()
  })

  it('closes TransactionForm when onClose is called', async () => {
    render(<FAB />)
    const button = screen.getByRole('button', {
      name: /registrar movimiento/i,
    })

    await act(async () => {
      fireEvent.click(button)
    })

    expect(screen.getByTestId('transaction-form')).toBeDefined()

    fireEvent.click(screen.getByText('Cerrar'))

    expect(screen.queryByTestId('transaction-form')).toBeNull()
  })
})
