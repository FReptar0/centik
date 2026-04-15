import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import Numpad from './Numpad'

afterEach(() => {
  cleanup()
})

describe('Numpad', () => {
  it('renders 13 buttons: digits 0-9, decimal, 00, backspace', () => {
    render(<Numpad value="" onChange={vi.fn()} />)

    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(13)
  })

  it('all buttons have type="button"', () => {
    render(<Numpad value="" onChange={vi.fn()} />)

    const buttons = screen.getAllByRole('button')
    for (const button of buttons) {
      expect(button.getAttribute('type')).toBe('button')
    }
  })

  it('tapping 1, 2, 3 in sequence produces onChange calls with "1", "12", "123"', () => {
    const onChange = vi.fn()
    const { rerender } = render(<Numpad value="" onChange={onChange} />)

    fireEvent.click(screen.getByText('1'))
    expect(onChange).toHaveBeenLastCalledWith('1')

    rerender(<Numpad value="1" onChange={onChange} />)
    fireEvent.click(screen.getByText('2'))
    expect(onChange).toHaveBeenLastCalledWith('12')

    rerender(<Numpad value="12" onChange={onChange} />)
    fireEvent.click(screen.getByText('3'))
    expect(onChange).toHaveBeenLastCalledWith('123')
  })

  it('tapping decimal when no decimal exists appends "."', () => {
    const onChange = vi.fn()
    render(<Numpad value="1" onChange={onChange} />)

    fireEvent.click(screen.getByText('.'))
    expect(onChange).toHaveBeenLastCalledWith('1.')
  })

  it('tapping decimal when decimal already exists is a no-op', () => {
    const onChange = vi.fn()
    render(<Numpad value="1.5" onChange={onChange} />)

    fireEvent.click(screen.getByText('.'))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('tapping backspace removes last character', () => {
    const onChange = vi.fn()
    render(<Numpad value="12" onChange={onChange} />)

    fireEvent.click(screen.getByRole('button', { name: /borrar/i }))
    expect(onChange).toHaveBeenLastCalledWith('1')
  })

  it('backspace on empty string stays empty', () => {
    const onChange = vi.fn()
    render(<Numpad value="" onChange={onChange} />)

    fireEvent.click(screen.getByRole('button', { name: /borrar/i }))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('tapping 00 appends two zeros: "1" -> "100"', () => {
    const onChange = vi.fn()
    render(<Numpad value="1" onChange={onChange} />)

    fireEvent.click(screen.getByText('00'))
    expect(onChange).toHaveBeenLastCalledWith('100')
  })

  it('tapping 00 on empty value produces "0" (no leading zeros)', () => {
    const onChange = vi.fn()
    render(<Numpad value="" onChange={onChange} />)

    fireEvent.click(screen.getByText('00'))
    expect(onChange).toHaveBeenLastCalledWith('0')
  })

  it('max 2 decimal places: "1.23" + "4" = no change (still "1.23")', () => {
    const onChange = vi.fn()
    render(<Numpad value="1.23" onChange={onChange} />)

    fireEvent.click(screen.getByText('4'))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('decimal then digits: "" -> "." -> ".5" works', () => {
    const onChange = vi.fn()
    const { rerender } = render(<Numpad value="" onChange={onChange} />)

    fireEvent.click(screen.getByText('.'))
    expect(onChange).toHaveBeenLastCalledWith('.')

    rerender(<Numpad value="." onChange={onChange} />)
    fireEvent.click(screen.getByText('5'))
    expect(onChange).toHaveBeenLastCalledWith('.5')
  })

  it('double-zero after decimal respects limit: "1." + "00" = "1.00", "1.5" + "00" = "1.50"', () => {
    const onChange = vi.fn()
    const { rerender } = render(<Numpad value="1." onChange={onChange} />)

    fireEvent.click(screen.getByText('00'))
    expect(onChange).toHaveBeenLastCalledWith('1.00')

    rerender(<Numpad value="1.5" onChange={onChange} />)
    onChange.mockClear()

    fireEvent.click(screen.getByText('00'))
    expect(onChange).toHaveBeenLastCalledWith('1.50')
  })

  it('backspace icon renders for backspace key (accessible via aria-label)', () => {
    render(<Numpad value="1" onChange={vi.fn()} />)

    const backspaceButton = screen.getByRole('button', { name: /borrar/i })
    expect(backspaceButton).toBeDefined()
    // Should contain an SVG icon, not text
    expect(backspaceButton.querySelector('svg')).not.toBeNull()
  })

  it('all buttons have minimum 48px height', () => {
    render(<Numpad value="" onChange={vi.fn()} />)

    const buttons = screen.getAllByRole('button')
    for (const button of buttons) {
      expect(button.className).toContain('min-h-[48px]')
    }
  })
})
