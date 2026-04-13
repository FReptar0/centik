import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import IncomeSummaryCards from './IncomeSummaryCards'

vi.mock('@/lib/income', () => ({
  calculateIncomeSummary: vi.fn(),
}))

vi.mock('@/components/ui/MoneyAmount', () => ({
  default: ({ value, variant, size }: { value: string; variant?: string; size?: string }) => (
    <span data-testid="money-amount" data-value={value} data-variant={variant} data-size={size}>
      ${(Number(value) / 100).toFixed(2)}
    </span>
  ),
}))

const { calculateIncomeSummary } = await import('@/lib/income')

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('IncomeSummaryCards', () => {
  it('renders 4 summary cards with correct labels', () => {
    vi.mocked(calculateIncomeSummary).mockReturnValue({
      quincenal: '2000000',
      monthly: '4000000',
      semester: '24000000',
      annual: '48000000',
    })

    render(<IncomeSummaryCards sources={[]} />)

    expect(screen.getByText('Quincenal')).toBeDefined()
    expect(screen.getByText('Mensual')).toBeDefined()
    expect(screen.getByText('Semestral')).toBeDefined()
    expect(screen.getByText('Anual')).toBeDefined()
  })

  it('displays formatted money amounts via MoneyAmount component', () => {
    vi.mocked(calculateIncomeSummary).mockReturnValue({
      quincenal: '2000000',
      monthly: '4000000',
      semester: '24000000',
      annual: '48000000',
    })

    render(<IncomeSummaryCards sources={[]} />)

    const moneyAmounts = screen.getAllByTestId('money-amount')
    expect(moneyAmounts).toHaveLength(4)

    const values = moneyAmounts.map((el) => el.getAttribute('data-value'))
    expect(values).toContain('2000000')
    expect(values).toContain('4000000')
    expect(values).toContain('24000000')
    expect(values).toContain('48000000')

    // All should use income variant
    for (const el of moneyAmounts) {
      expect(el.getAttribute('data-variant')).toBe('income')
      expect(el.getAttribute('data-size')).toBe('xl')
    }
  })

  it('shows $0.00 for empty sources array', () => {
    vi.mocked(calculateIncomeSummary).mockReturnValue({
      quincenal: '0',
      monthly: '0',
      semester: '0',
      annual: '0',
    })

    render(<IncomeSummaryCards sources={[]} />)

    const moneyAmounts = screen.getAllByTestId('money-amount')
    expect(moneyAmounts).toHaveLength(4)

    for (const el of moneyAmounts) {
      expect(el.getAttribute('data-value')).toBe('0')
    }
  })
})
