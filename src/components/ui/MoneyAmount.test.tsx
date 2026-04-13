import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import MoneyAmount from './MoneyAmount'

afterEach(() => {
  cleanup()
})

describe('MoneyAmount', () => {
  it('renders "$" prefix in a separate span with text-text-tertiary and smaller text class', () => {
    const { container } = render(<MoneyAmount value="15075" />)
    const prefix = container.querySelector('[data-testid="money-prefix"]')
    expect(prefix).toBeTruthy()
    expect(prefix?.textContent).toBe('$')
    expect(prefix?.className).toContain('text-text-tertiary')
  })

  it('renders amount digits in font-mono tabular-nums', () => {
    const { container } = render(<MoneyAmount value="15075" />)
    const amount = container.querySelector('[data-testid="money-amount"]')
    expect(amount).toBeTruthy()
    expect(amount?.className).toContain('font-mono')
    expect(amount?.className).toContain('tabular-nums')
  })

  it('applies text-positive color when variant="income"', () => {
    const { container } = render(
      <MoneyAmount value="15075" variant="income" />,
    )
    const wrapper = container.querySelector('[data-testid="money-wrapper"]')
    expect(wrapper?.className).toContain('text-positive')
  })

  it('applies text-negative color when variant="expense"', () => {
    const { container } = render(
      <MoneyAmount value="15075" variant="expense" />,
    )
    const wrapper = container.querySelector('[data-testid="money-wrapper"]')
    expect(wrapper?.className).toContain('text-negative')
  })

  it('applies text-text-primary color when variant="neutral" (default)', () => {
    const { container } = render(<MoneyAmount value="15075" />)
    const wrapper = container.querySelector('[data-testid="money-wrapper"]')
    expect(wrapper?.className).toContain('text-text-primary')
  })

  it('renders with custom className passed through', () => {
    const { container } = render(
      <MoneyAmount value="15075" className="mt-4 text-lg" />,
    )
    const wrapper = container.querySelector('[data-testid="money-wrapper"]')
    expect(wrapper?.className).toContain('mt-4')
  })

  it('handles zero amount ("0") correctly', () => {
    const { container } = render(<MoneyAmount value="0" />)
    const amount = container.querySelector('[data-testid="money-amount"]')
    // formatMoney("0") produces "$0.00" -> amount should be "0.00"
    expect(amount?.textContent).toContain('0.00')
  })

  it('accepts raw centavo string and formats via formatMoney, splitting "$" from digits', () => {
    const { container } = render(<MoneyAmount value="15075" />)
    const prefix = container.querySelector('[data-testid="money-prefix"]')
    const amount = container.querySelector('[data-testid="money-amount"]')
    // formatMoney("15075") produces "$150.75"
    expect(prefix?.textContent).toBe('$')
    expect(amount?.textContent).toContain('150.75')
  })
})
