import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import FloatingInput from './FloatingInput'

afterEach(() => {
  cleanup()
})

describe('FloatingInput', () => {
  it('renders an input element and a label element', () => {
    render(<FloatingInput label="Monto" value="" onChange={() => {}} />)
    expect(screen.getByRole('textbox')).toBeDefined()
    expect(screen.getByText('Monto')).toBeDefined()
  })

  it('label has htmlFor matching input id (accessibility)', () => {
    render(<FloatingInput label="Monto" value="" onChange={() => {}} id="test-input" />)
    const input = screen.getByRole('textbox')
    const label = screen.getByText('Monto')
    expect(input.getAttribute('id')).toBe('test-input')
    expect(label.getAttribute('for')).toBe('test-input')
  })

  it('when value is empty and not focused, label has placeholder-position classes', () => {
    render(<FloatingInput label="Monto" value="" onChange={() => {}} />)
    const label = screen.getByText('Monto')
    expect(label.className).toContain('top-[10px]')
    expect(label.className).toContain('text-sm')
    expect(label.className).toContain('text-text-tertiary')
    expect(label.className).not.toContain('uppercase')
  })

  it('when value is non-empty, label has floating CSS classes', () => {
    render(<FloatingInput label="Monto" value="100" onChange={() => {}} />)
    const label = screen.getByText('Monto')
    expect(label.className).toContain('top-[-8px]')
    expect(label.className).toContain('uppercase')
    expect(label.className).toContain('text-[11px]')
    expect(label.className).toContain('tracking-[2px]')
    expect(label.className).toContain('text-text-secondary')
  })

  it('when input is focused, label has floating CSS classes', () => {
    render(<FloatingInput label="Monto" value="" onChange={() => {}} />)
    const input = screen.getByRole('textbox')
    fireEvent.focus(input)
    const label = screen.getByText('Monto')
    expect(label.className).toContain('top-[-8px]')
    expect(label.className).toContain('uppercase')
    expect(label.className).toContain('text-[11px]')
    expect(label.className).toContain('tracking-[2px]')
    expect(label.className).toContain('text-text-secondary')
  })

  it('when focused, underline changes to accent color class', () => {
    render(<FloatingInput label="Monto" value="" onChange={() => {}} />)
    const input = screen.getByRole('textbox')
    fireEvent.focus(input)
    expect(input.className).toContain('border-accent')
  })

  it('when error prop is set, underline shows negative color and error message appears', () => {
    render(<FloatingInput label="Monto" value="" onChange={() => {}} error="Campo requerido" />)
    const input = screen.getByRole('textbox')
    expect(input.className).toContain('border-negative')
    expect(screen.getByText('Campo requerido')).toBeDefined()
  })

  it('error message text content matches error prop value', () => {
    render(<FloatingInput label="Monto" value="" onChange={() => {}} error="Monto invalido" />)
    const errorEl = screen.getByText('Monto invalido')
    expect(errorEl.textContent).toBe('Monto invalido')
  })

  it('prefix renders when prefix prop is set', () => {
    render(<FloatingInput label="Monto" value="" onChange={() => {}} prefix="$" />)
    expect(screen.getByText('$')).toBeDefined()
  })

  it('suffix renders when suffix prop is set', () => {
    render(<FloatingInput label="Tasa" value="" onChange={() => {}} suffix="%" />)
    expect(screen.getByText('%')).toBeDefined()
  })

  it('prefix and suffix do not float (always visible in same position)', () => {
    render(<FloatingInput label="Monto" value="" onChange={() => {}} prefix="$" suffix="%" />)
    const prefix = screen.getByText('$')
    const suffix = screen.getByText('%')
    // Both should be absolute positioned at the same vertical position
    expect(prefix.className).toContain('absolute')
    expect(prefix.className).toContain('top-[10px]')
    expect(suffix.className).toContain('absolute')
    expect(suffix.className).toContain('top-[10px]')

    // Focus should not change prefix/suffix position
    const input = screen.getByRole('textbox')
    fireEvent.focus(input)
    expect(prefix.className).toContain('top-[10px]')
    expect(suffix.className).toContain('top-[10px]')
  })

  it('onChange callback fires with the input value when user types', () => {
    const handleChange = vi.fn()
    render(<FloatingInput label="Monto" value="" onChange={handleChange} />)
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: '500' } })
    expect(handleChange).toHaveBeenCalledWith('500')
  })

  it('optional label shows "(opcional)" text when optional prop is true', () => {
    render(<FloatingInput label="Notas" value="algo" onChange={() => {}} optional={true} />)
    // When floating (value is non-empty), show "(opcional)"
    expect(screen.getByText(/opcional/i)).toBeDefined()
  })

  it('input has no background and no box border (only bottom border)', () => {
    render(<FloatingInput label="Monto" value="" onChange={() => {}} />)
    const input = screen.getByRole('textbox')
    expect(input.className).toContain('bg-transparent')
    expect(input.className).toContain('border-0')
    expect(input.className).toContain('border-b')
  })

  it('input type defaults to text but can be overridden', () => {
    const { unmount } = render(<FloatingInput label="Monto" value="" onChange={() => {}} />)
    expect(screen.getByRole('textbox').getAttribute('type')).toBe('text')
    unmount()

    render(<FloatingInput label="Fecha" value="" onChange={() => {}} type="date" />)
    // Date inputs don't have textbox role, query by the test id or directly
    const dateInput = document.querySelector('input[type="date"]')
    expect(dateInput).toBeDefined()
    expect(dateInput?.getAttribute('type')).toBe('date')
  })
})
