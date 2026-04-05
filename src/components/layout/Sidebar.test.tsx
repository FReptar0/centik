import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/'),
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

import Sidebar from './Sidebar'
import { usePathname } from 'next/navigation'

afterEach(() => {
  cleanup()
  vi.mocked(usePathname).mockReturnValue('/')
})

describe('Sidebar', () => {
  it('renders the app name "Centik"', () => {
    render(<Sidebar />)
    const elements = screen.getAllByText('Centik')
    expect(elements.length).toBeGreaterThanOrEqual(1)
  })

  it('renders all 6 nav item labels', () => {
    render(<Sidebar />)
    const labels = [
      'Inicio',
      'Movimientos',
      'Deudas',
      'Presupuesto',
      'Ingresos',
      'Historial',
    ]
    for (const label of labels) {
      const elements = screen.getAllByText(label)
      expect(elements.length).toBeGreaterThanOrEqual(1)
    }
  })

  it('each nav item is a link with correct href', () => {
    render(<Sidebar />)
    const expectedLinks: Record<string, string> = {
      Inicio: '/',
      Movimientos: '/movimientos',
      Deudas: '/deudas',
      Presupuesto: '/presupuesto',
      Ingresos: '/ingresos',
      Historial: '/historial',
    }
    for (const [label, href] of Object.entries(expectedLinks)) {
      const links = screen.getAllByRole('link', { name: new RegExp(label) })
      const matchingLink = links.find(
        (link) => link.getAttribute('href') === href,
      )
      expect(matchingLink).toBeDefined()
    }
  })

  it('active item (pathname="/") has accent styling', () => {
    vi.mocked(usePathname).mockReturnValue('/')
    render(<Sidebar />)
    const links = screen.getAllByRole('link', { name: /Inicio/ })
    const hasAccent = links.some(
      (link) =>
        link.className.includes('text-accent') ||
        link.className.includes('bg-accent'),
    )
    expect(hasAccent).toBe(true)
  })

  it('non-active items do not have accent styling', () => {
    vi.mocked(usePathname).mockReturnValue('/')
    render(<Sidebar />)
    const links = screen.getAllByRole('link', { name: /Deudas/ })
    for (const link of links) {
      expect(link.className).not.toContain('text-accent')
    }
  })
})
