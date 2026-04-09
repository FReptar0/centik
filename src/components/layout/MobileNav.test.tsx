import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'

const mockUsePathname = vi.fn(() => '/')

vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}))

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode
    href: string
    [key: string]: unknown
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

import MobileNav from './MobileNav'

afterEach(() => {
  cleanup()
  mockUsePathname.mockReturnValue('/')
})

describe('MobileNav', () => {
  it('renders 4 nav tab links with correct hrefs', () => {
    render(<MobileNav />)
    const expectedLinks: Record<string, string> = {
      Inicio: '/',
      Movimientos: '/movimientos',
      Deudas: '/deudas',
      Presupuesto: '/presupuesto',
    }
    for (const [label, href] of Object.entries(expectedLinks)) {
      const link = screen.getByRole('link', { name: label })
      expect(link.getAttribute('href')).toBe(href)
    }
  })

  it('renders "Mas" button accessible by aria-label', () => {
    render(<MobileNav />)
    const masButton = screen.getByTestId('mas-button')
    expect(masButton).toBeDefined()
    expect(masButton.getAttribute('aria-label')).toBe('Mas')
  })

  it('no text labels rendered in nav', () => {
    render(<MobileNav />)
    const tabLabels = ['Inicio', 'Movimientos', 'Deudas', 'Presupuesto']
    for (const label of tabLabels) {
      const link = screen.getByRole('link', { name: label })
      const spans = link.querySelectorAll('span')
      expect(spans.length).toBe(0)
    }
  })

  it('active tab shows StatusDot indicator', () => {
    mockUsePathname.mockReturnValue('/movimientos')
    render(<MobileNav />)
    const activeLink = screen.getByRole('link', { name: 'Movimientos' })
    const dot = activeLink.querySelector('[aria-hidden="true"].bg-accent')
    expect(dot).not.toBeNull()
  })

  it('inactive tabs do not show StatusDot indicator', () => {
    mockUsePathname.mockReturnValue('/')
    render(<MobileNav />)
    const inactiveLink = screen.getByRole('link', { name: 'Deudas' })
    const dot = inactiveLink.querySelector('.bg-accent.animate-status-pulse')
    expect(dot).toBeNull()
  })

  it('all nav links have aria-label for accessibility', () => {
    render(<MobileNav />)
    const labels = ['Inicio', 'Movimientos', 'Deudas', 'Presupuesto']
    for (const label of labels) {
      const link = screen.getByRole('link', { name: label })
      expect(link.getAttribute('aria-label')).toBe(label)
    }
  })

  it('clicking "Mas" shows MobileMoreSheet content', () => {
    render(<MobileNav />)
    const masButton = screen.getByTestId('mas-button')
    fireEvent.click(masButton)

    expect(screen.getByText('Ingresos')).toBeDefined()
    expect(screen.getByText('Historial')).toBeDefined()
    expect(screen.getByText('Configuracion')).toBeDefined()
  })
})
