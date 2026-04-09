import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import DynamicIcon, { ICON_MAP } from './DynamicIcon'

describe('DynamicIcon', () => {
  const defaultCategoryIcons = [
    'utensils',
    'zap',
    'clapperboard',
    'smartphone',
    'car',
    'package',
    'briefcase',
    'laptop',
  ]

  it.each(defaultCategoryIcons)(
    'resolves "%s" to a non-fallback icon',
    (iconName) => {
      expect(ICON_MAP[iconName]).toBeDefined()
    },
  )

  it('renders fallback Package icon for unknown name', () => {
    render(<DynamicIcon name="unknown-icon" data-testid="icon" />)
    const icon = screen.getByTestId('icon')
    expect(icon).toBeDefined()
  })

  it('passes through size prop', () => {
    const { container } = render(<DynamicIcon name="utensils" size={24} />)
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(svg?.getAttribute('width')).toBe('24')
    expect(svg?.getAttribute('height')).toBe('24')
  })

  it('passes through className prop', () => {
    const { container } = render(
      <DynamicIcon name="utensils" className="text-red-500" />,
    )
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(svg?.classList.contains('text-red-500')).toBe(true)
  })

  it('includes nav icons in ICON_MAP', () => {
    const navIcons = [
      'layout-dashboard',
      'arrow-left-right',
      'credit-card',
      'piggy-bank',
      'banknote',
      'history',
      'settings',
      'more-horizontal',
      'plus',
    ]
    for (const icon of navIcons) {
      expect(ICON_MAP[icon]).toBeDefined()
    }
  })

  it('applies default strokeWidth of 1.5', () => {
    const { container } = render(<DynamicIcon name="utensils" />)
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(svg?.getAttribute('stroke-width')).toBe('1.5')
  })

  it('applies crispEdges shape-rendering', () => {
    const { container } = render(<DynamicIcon name="utensils" />)
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(svg?.style.shapeRendering).toBe('crispedges')
  })

  it('allows strokeWidth override', () => {
    const { container } = render(
      <DynamicIcon name="utensils" strokeWidth={2} />,
    )
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(svg?.getAttribute('stroke-width')).toBe('2')
  })
})
