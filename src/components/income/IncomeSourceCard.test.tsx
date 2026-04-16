import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react'
import IncomeSourceCard from './IncomeSourceCard'
import type { SerializedIncomeSource } from '@/types'

vi.mock('@/app/ingresos/actions', () => ({
  deleteIncomeSource: vi.fn().mockResolvedValue({ success: true }),
}))

vi.mock('@/lib/income', () => ({
  getMonthlyEquivalent: vi.fn().mockReturnValue('4000000'),
}))

vi.mock('@/lib/utils', async () => {
  const actual = await vi.importActual<typeof import('@/lib/utils')>('@/lib/utils')
  return {
    ...actual,
    formatMoney: vi.fn((cents: string) => `$${(Number(cents) / 100).toFixed(2)}`),
  }
})

const { deleteIncomeSource } = await import('@/app/ingresos/actions')
const { getMonthlyEquivalent } = await import('@/lib/income')

function makeMockSource(overrides: Partial<SerializedIncomeSource> = {}): SerializedIncomeSource {
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

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('IncomeSourceCard', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders source name, formatted amount, and frequency badge', () => {
    const source = makeMockSource()
    render(<IncomeSourceCard source={source} onEdit={vi.fn()} />)

    expect(screen.getByText('TerSoft')).toBeDefined()
    // MoneyAmount splits "$" prefix and digits into separate spans
    expect(screen.getAllByTestId('money-wrapper').length).toBeGreaterThan(0)
    expect(screen.getByText('Quincenal')).toBeDefined()
  })

  it('displays monthly equivalent', () => {
    const source = makeMockSource()
    render(<IncomeSourceCard source={source} onEdit={vi.fn()} />)

    expect(getMonthlyEquivalent).toHaveBeenCalledWith('2000000', 'QUINCENAL')
    // MoneyAmount renders the monthly equivalent via data-testid
    const moneyWrappers = screen.getAllByTestId('money-wrapper')
    expect(moneyWrappers.length).toBeGreaterThanOrEqual(2) // default + monthly
  })

  it('shows "(estimado)" for VARIABLE frequency', () => {
    const source = makeMockSource({ frequency: 'VARIABLE' })
    render(<IncomeSourceCard source={source} onEdit={vi.fn()} />)

    expect(screen.getByText('(estimado)')).toBeDefined()
  })

  it('does not show "(estimado)" for non-VARIABLE frequency', () => {
    const source = makeMockSource({ frequency: 'QUINCENAL' })
    render(<IncomeSourceCard source={source} onEdit={vi.fn()} />)

    expect(screen.queryByText('(estimado)')).toBeNull()
  })

  it('shows inline confirmation when delete is clicked', () => {
    const source = makeMockSource()
    render(<IncomeSourceCard source={source} onEdit={vi.fn()} />)

    const deleteButton = screen.getByRole('button', { name: /eliminar/i })
    fireEvent.click(deleteButton)

    expect(screen.getByText(/Eliminar\?/)).toBeDefined()
    expect(screen.getByText('Si')).toBeDefined()
    expect(screen.getByText('No')).toBeDefined()
  })

  it('auto-reverts delete confirmation after 3 seconds', () => {
    const source = makeMockSource()
    render(<IncomeSourceCard source={source} onEdit={vi.fn()} />)

    const deleteButton = screen.getByRole('button', { name: /eliminar/i })
    fireEvent.click(deleteButton)

    expect(screen.getByText(/Eliminar\?/)).toBeDefined()

    act(() => {
      vi.advanceTimersByTime(3000)
    })

    expect(screen.queryByText(/Eliminar\?/)).toBeNull()
    expect(screen.getByRole('button', { name: /eliminar/i })).toBeDefined()
  })

  it('calls deleteIncomeSource with correct id when "Si" is clicked', async () => {
    const source = makeMockSource()
    render(<IncomeSourceCard source={source} onEdit={vi.fn()} />)

    const deleteButton = screen.getByRole('button', { name: /eliminar/i })
    fireEvent.click(deleteButton)

    await act(async () => {
      fireEvent.click(screen.getByText('Si'))
    })

    expect(deleteIncomeSource).toHaveBeenCalledWith('src-1')
  })

  it('cancels delete confirmation when "No" is clicked', () => {
    const source = makeMockSource()
    render(<IncomeSourceCard source={source} onEdit={vi.fn()} />)

    const deleteButton = screen.getByRole('button', { name: /eliminar/i })
    fireEvent.click(deleteButton)

    fireEvent.click(screen.getByText('No'))

    expect(screen.queryByText(/Eliminar\?/)).toBeNull()
    expect(screen.getByRole('button', { name: /eliminar/i })).toBeDefined()
  })

  it('calls onEdit with the source when edit is clicked', () => {
    const source = makeMockSource()
    const handleEdit = vi.fn()
    render(<IncomeSourceCard source={source} onEdit={handleEdit} />)

    const editButton = screen.getByRole('button', { name: /editar/i })
    fireEvent.click(editButton)

    expect(handleEdit).toHaveBeenCalledWith(source)
  })
})
