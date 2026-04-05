import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import FAB from './FAB'

afterEach(() => {
  cleanup()
})

describe('FAB', () => {
  it('renders a button with aria-label "Registrar movimiento"', () => {
    render(<FAB />)
    const button = screen.getByRole('button', {
      name: /registrar movimiento/i,
    })
    expect(button).toBeDefined()
  })

  it('FAB button is present in the document on initial render', () => {
    render(<FAB />)
    const button = screen.getByRole('button', {
      name: /registrar movimiento/i,
    })
    expect(button).toBeDefined()
  })

  it('clicking FAB opens Modal with placeholder content', () => {
    render(<FAB />)
    const button = screen.getByRole('button', {
      name: /registrar movimiento/i,
    })
    fireEvent.click(button)

    // Modal renders "Nuevo movimiento" title (both mobile and desktop variants)
    const titles = screen.getAllByText('Nuevo movimiento')
    expect(titles.length).toBeGreaterThanOrEqual(1)
  })

  it('after opening, triggering onClose hides modal content', () => {
    render(<FAB />)
    const button = screen.getByRole('button', {
      name: /registrar movimiento/i,
    })
    fireEvent.click(button)

    // Modal is open -- verify title is present
    const titles = screen.getAllByText('Nuevo movimiento')
    expect(titles.length).toBeGreaterThanOrEqual(1)

    // Close via Escape key
    fireEvent.keyDown(document, { key: 'Escape' })

    // Modal content should be gone
    expect(screen.queryByText('Nuevo movimiento')).toBeNull()
  })
})
