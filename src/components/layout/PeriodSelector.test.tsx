import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'

const mockPush = vi.fn()

vi.mock('next/navigation', () => ({
  useSearchParams: vi.fn(() => new URLSearchParams()),
  useRouter: vi.fn(() => ({ push: mockPush })),
  usePathname: vi.fn(() => '/'),
}))

import PeriodSelector from './PeriodSelector'

afterEach(() => {
  cleanup()
  mockPush.mockClear()
})

describe('PeriodSelector', () => {
  it('renders current month name in Spanish', () => {
    render(<PeriodSelector />)
    const currentMonth = new Date().getMonth()
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
    ]
    expect(screen.getByText(new RegExp(monthNames[currentMonth]))).toBeDefined()
  })

  it('renders current year', () => {
    render(<PeriodSelector />)
    const currentYear = new Date().getFullYear().toString()
    expect(screen.getByText(new RegExp(currentYear))).toBeDefined()
  })

  it('renders left arrow button and right arrow button', () => {
    render(<PeriodSelector />)
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThanOrEqual(2)
  })

  it('when isClosed=true, renders lock icon', () => {
    render(<PeriodSelector isClosed />)
    expect(screen.getByTestId('period-lock-icon')).toBeDefined()
  })

  it('when isClosed is omitted (defaults to false), does NOT render lock icon', () => {
    render(<PeriodSelector />)
    expect(screen.queryByTestId('period-lock-icon')).toBeNull()
  })

  it('right arrow button is disabled when viewing current month/year', () => {
    render(<PeriodSelector />)
    const buttons = screen.getAllByRole('button')
    const rightArrow = buttons[buttons.length - 1]
    expect(rightArrow.hasAttribute('disabled')).toBe(true)
  })
})
