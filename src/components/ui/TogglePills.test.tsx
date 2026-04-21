import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import TogglePills from './TogglePills'

afterEach(() => {
  cleanup()
})

const binaryOptions = [
  { value: 'expense', label: 'Gasto' },
  { value: 'income', label: 'Ingreso' },
]

const multiOptions = [
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mes' },
  { value: 'year', label: 'Anio' },
]

describe('TogglePills', () => {
  it('renders the correct number of buttons matching options length (binary)', () => {
    render(<TogglePills options={binaryOptions} value="expense" onChange={() => {}} />)
    const buttons = screen.getAllByRole('radio')
    expect(buttons).toHaveLength(2)
  })

  it('renders the correct number of buttons for 3+ options (multi)', () => {
    render(<TogglePills options={multiOptions} value="month" onChange={() => {}} />)
    const buttons = screen.getAllByRole('radio')
    expect(buttons).toHaveLength(3)
  })

  it('displays each option label text', () => {
    render(<TogglePills options={binaryOptions} value="expense" onChange={() => {}} />)
    expect(screen.getByText('Gasto')).toBeDefined()
    expect(screen.getByText('Ingreso')).toBeDefined()
  })

  it('active option has chartreuse background and black text', () => {
    render(<TogglePills options={binaryOptions} value="expense" onChange={() => {}} />)
    const activeButton = screen.getByText('Gasto')
    expect(activeButton.className).toContain('bg-accent')
    expect(activeButton.className).toContain('text-black')
  })

  it('inactive options have transparent background and secondary text', () => {
    render(<TogglePills options={binaryOptions} value="expense" onChange={() => {}} />)
    const inactiveButton = screen.getByText('Ingreso')
    expect(inactiveButton.className).toContain('bg-transparent')
    expect(inactiveButton.className).toContain('text-text-secondary')
  })

  it('calls onChange with the clicked option value', () => {
    const handleChange = vi.fn()
    render(<TogglePills options={binaryOptions} value="expense" onChange={handleChange} />)
    fireEvent.click(screen.getByText('Ingreso'))
    expect(handleChange).toHaveBeenCalledOnce()
    expect(handleChange).toHaveBeenCalledWith('income')
  })

  it('calls onChange when clicking the already-active option (idempotent)', () => {
    const handleChange = vi.fn()
    render(<TogglePills options={binaryOptions} value="expense" onChange={handleChange} />)
    fireEvent.click(screen.getByText('Gasto'))
    expect(handleChange).toHaveBeenCalledOnce()
    expect(handleChange).toHaveBeenCalledWith('expense')
  })

  it('all buttons have type="button" to prevent form submission', () => {
    render(<TogglePills options={binaryOptions} value="expense" onChange={() => {}} />)
    const buttons = screen.getAllByRole('radio')
    for (const button of buttons) {
      expect(button.getAttribute('type')).toBe('button')
    }
  })

  it('all buttons have rounded-full class for pill shape', () => {
    render(<TogglePills options={binaryOptions} value="expense" onChange={() => {}} />)
    const buttons = screen.getAllByRole('radio')
    for (const button of buttons) {
      expect(button.className).toContain('rounded-full')
    }
  })

  it('container has role="radiogroup" for accessibility', () => {
    render(<TogglePills options={binaryOptions} value="expense" onChange={() => {}} />)
    const radiogroup = screen.getByRole('radiogroup')
    expect(radiogroup).toBeDefined()
  })

  it('active button has aria-checked="true" and inactive has aria-checked="false"', () => {
    render(<TogglePills options={binaryOptions} value="expense" onChange={() => {}} />)
    const activeButton = screen.getByText('Gasto')
    const inactiveButton = screen.getByText('Ingreso')
    expect(activeButton.getAttribute('aria-checked')).toBe('true')
    expect(inactiveButton.getAttribute('aria-checked')).toBe('false')
  })

  it('accepts and applies container className', () => {
    const { container } = render(
      <TogglePills
        options={binaryOptions}
        value="expense"
        onChange={() => {}}
        className="mt-4 justify-center"
      />,
    )
    const wrapper = container.firstElementChild
    expect(wrapper?.className).toContain('mt-4')
    expect(wrapper?.className).toContain('justify-center')
  })
})
