import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'

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

import MobileNav from './MobileNav'

afterEach(() => {
  cleanup()
})

describe('MobileNav', () => {
  it('renders 4 nav tab labels', () => {
    render(<MobileNav />)
    const labels = ['Inicio', 'Movimientos', 'Deudas', 'Presupuesto']
    for (const label of labels) {
      expect(screen.getByText(label)).toBeDefined()
    }
  })

  it('renders "Mas" button', () => {
    render(<MobileNav />)
    expect(screen.getByText('Mas')).toBeDefined()
  })

  it('each nav tab is a link with correct href', () => {
    render(<MobileNav />)
    const expectedLinks: Record<string, string> = {
      Inicio: '/',
      Movimientos: '/movimientos',
      Deudas: '/deudas',
      Presupuesto: '/presupuesto',
    }
    for (const [label, href] of Object.entries(expectedLinks)) {
      const link = screen.getByRole('link', { name: new RegExp(label) })
      expect(link.getAttribute('href')).toBe(href)
    }
  })

  it('clicking "Mas" shows MobileMoreSheet content', () => {
    render(<MobileNav />)
    const masButton = screen.getByText('Mas').closest('button')
    expect(masButton).not.toBeNull()
    fireEvent.click(masButton!)

    expect(screen.getByText('Ingresos')).toBeDefined()
    expect(screen.getByText('Historial')).toBeDefined()
    expect(screen.getByText('Configuracion')).toBeDefined()
  })
})
