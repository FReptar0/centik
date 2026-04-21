import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import StatusDot from './StatusDot'

afterEach(() => {
  cleanup()
})

describe('StatusDot', () => {
  it('renders a div element', () => {
    const { container } = render(<StatusDot />)
    const dot = container.firstElementChild
    expect(dot).not.toBeNull()
    expect(dot?.tagName).toBe('DIV')
  })

  it('has aria-hidden="true" for decorative use', () => {
    const { container } = render(<StatusDot />)
    const dot = container.firstElementChild
    expect(dot?.getAttribute('aria-hidden')).toBe('true')
  })

  it('has 4px dimensions via h-1 and w-1 classes', () => {
    const { container } = render(<StatusDot />)
    const dot = container.firstElementChild
    expect(dot?.className).toContain('h-1')
    expect(dot?.className).toContain('w-1')
  })

  it('has the animate-status-pulse CSS class', () => {
    const { container } = render(<StatusDot />)
    const dot = container.firstElementChild
    expect(dot?.className).toContain('animate-status-pulse')
  })

  it('has bg-accent class for chartreuse color', () => {
    const { container } = render(<StatusDot />)
    const dot = container.firstElementChild
    expect(dot?.className).toContain('bg-accent')
  })

  it('has rounded-full class for circle shape', () => {
    const { container } = render(<StatusDot />)
    const dot = container.firstElementChild
    expect(dot?.className).toContain('rounded-full')
  })

  it('accepts and applies additional className for positioning', () => {
    const { container } = render(<StatusDot className="absolute bottom-[-8px] left-1/2" />)
    const dot = container.firstElementChild
    expect(dot?.className).toContain('absolute')
    expect(dot?.className).toContain('left-1/2')
  })
})
