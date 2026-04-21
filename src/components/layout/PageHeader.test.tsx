import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'

import PageHeader from './PageHeader'

afterEach(() => {
  cleanup()
})

describe('PageHeader', () => {
  it('renders title in an h1 element', () => {
    render(<PageHeader title="Inicio" />)
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toBeDefined()
    expect(heading.textContent).toBe('Inicio')
  })

  it('renders action slot when provided', () => {
    render(<PageHeader title="Movimientos" action={<button type="button">Registrar</button>} />)
    expect(screen.getByText('Registrar')).toBeDefined()
  })

  it('does not render action area when action is omitted', () => {
    const { container } = render(<PageHeader title="Deudas" />)
    expect(container.querySelector('[data-testid="page-header-action"]')).toBeNull()
  })

  it('renders periodSelector content when provided', () => {
    render(<PageHeader title="Inicio" periodSelector={<span>Abril 2026</span>} />)
    expect(screen.getByText('Abril 2026')).toBeDefined()
  })

  it('renders closed banner with "Periodo cerrado" text when closedBanner=true', () => {
    render(<PageHeader title="Inicio" closedBanner />)
    expect(screen.getByText(/Periodo cerrado/)).toBeDefined()
  })

  it('does not render closed banner when closedBanner is false', () => {
    render(<PageHeader title="Inicio" closedBanner={false} />)
    const banner = screen.queryByText(/Periodo cerrado/)
    expect(banner).toBeNull()
  })
})
