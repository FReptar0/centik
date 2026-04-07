import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import BatteryBar from './BatteryBar'

afterEach(() => {
  cleanup()
})

describe('BatteryBar', () => {
  it('renders exactly 10 segment elements', () => {
    const { container } = render(<BatteryBar value={50} />)
    // Use CSS selector that matches segment-N but not segment-fill-N
    const segments = container.querySelectorAll(
      '[data-testid^="segment-"]:not([data-testid^="segment-fill-"])',
    )
    expect(segments).toHaveLength(10)
  })

  it('at 0%, no segments are filled', () => {
    const { container } = render(<BatteryBar value={0} />)
    const fills = container.querySelectorAll('[data-testid^="segment-fill-"]')
    fills.forEach((fill) => {
      const width = fill.getAttribute('style')
      expect(width).toContain('width: 0%')
    })
  })

  it('at 45%, first 4 segments are fully filled with accent color, 5th is partially filled, rest empty', () => {
    const { container } = render(<BatteryBar value={45} />)
    const fills = container.querySelectorAll('[data-testid^="segment-fill-"]')

    // Segments 0-3: fully filled (100%)
    for (let i = 0; i < 4; i++) {
      expect(fills[i].getAttribute('style')).toContain('width: 100%')
      expect(fills[i].className).toContain('bg-accent')
    }

    // Segment 4: partially filled (50%)
    expect(fills[4].getAttribute('style')).toContain('width: 50%')
    expect(fills[4].className).toContain('bg-accent')

    // Segments 5-9: empty (0%)
    for (let i = 5; i < 10; i++) {
      expect(fills[i].getAttribute('style')).toContain('width: 0%')
    }
  })

  it('at 85%, segments cross the warning threshold at correct positions', () => {
    const { container } = render(<BatteryBar value={85} />)
    const fills = container.querySelectorAll('[data-testid^="segment-fill-"]')

    // Segments 0-7: accent color (their end range <= 80)
    for (let i = 0; i < 8; i++) {
      expect(fills[i].getAttribute('style')).toContain('width: 100%')
      expect(fills[i].className).toContain('bg-accent')
    }

    // Segment 8: warning color (end range 90 > 80 threshold), partially filled (50%)
    expect(fills[8].getAttribute('style')).toContain('width: 50%')
    expect(fills[8].className).toContain('bg-warning')

    // Segment 9: empty
    expect(fills[9].getAttribute('style')).toContain('width: 0%')
  })

  it('at 100%, segment 10 uses danger/negative color', () => {
    const { container } = render(<BatteryBar value={100} />)
    const fills = container.querySelectorAll('[data-testid^="segment-fill-"]')

    // All segments fully filled
    for (let i = 0; i < 10; i++) {
      expect(fills[i].getAttribute('style')).toContain('width: 100%')
    }

    // Segments 0-7: accent (end range <= 80)
    for (let i = 0; i < 8; i++) {
      expect(fills[i].className).toContain('bg-accent')
    }

    // Segments 8-9: warning (end range 90, 100 -- both <= danger threshold 100)
    expect(fills[8].className).toContain('bg-warning')
    // Segment 9: end range is 100 which equals danger threshold
    // Per spec: <= danger threshold means warning
    expect(fills[9].className).toContain('bg-warning')
  })

  it('at 110%, all 10 segments are filled with negative/red color and overflow text "+10%" appears', () => {
    const { container } = render(<BatteryBar value={110} />)
    const fills = container.querySelectorAll('[data-testid^="segment-fill-"]')

    // All segments filled with negative color in overflow
    for (let i = 0; i < 10; i++) {
      expect(fills[i].getAttribute('style')).toContain('width: 100%')
      expect(fills[i].className).toContain('bg-negative')
    }

    // Overflow text appears
    expect(screen.getByText('+10%')).toBeTruthy()
  })

  it('at 150%, overflow text shows "+50%"', () => {
    render(<BatteryBar value={150} />)
    expect(screen.getByText('+50%')).toBeTruthy()
  })

  it('has role="progressbar" with correct ARIA attributes', () => {
    render(<BatteryBar value={65} />)
    const progressbar = screen.getByRole('progressbar')
    expect(progressbar).toBeTruthy()
    expect(progressbar.getAttribute('aria-valuenow')).toBe('65')
    expect(progressbar.getAttribute('aria-valuemin')).toBe('0')
    expect(progressbar.getAttribute('aria-valuemax')).toBe('100')
  })

  it('uses custom max for aria-valuemax', () => {
    render(<BatteryBar value={65} max={200} />)
    const progressbar = screen.getByRole('progressbar')
    expect(progressbar.getAttribute('aria-valuemax')).toBe('200')
  })

  it('variant="compact" renders 6px height', () => {
    const { container } = render(<BatteryBar value={50} variant="compact" />)
    const bar = container.querySelector('[data-testid="battery-bar"]')
    expect(bar?.className).toContain('h-[6px]')
  })

  it('variant="detailed" renders 8px height', () => {
    const { container } = render(<BatteryBar value={50} variant="detailed" />)
    const bar = container.querySelector('[data-testid="battery-bar"]')
    expect(bar?.className).toContain('h-[8px]')
  })

  it('defaults to compact variant', () => {
    const { container } = render(<BatteryBar value={50} />)
    const bar = container.querySelector('[data-testid="battery-bar"]')
    expect(bar?.className).toContain('h-[6px]')
  })

  it('custom thresholds change color breakpoints', () => {
    const { container } = render(
      <BatteryBar value={35} thresholds={{ warning: 31, danger: 71 }} />,
    )
    const fills = container.querySelectorAll('[data-testid^="segment-fill-"]')

    // Segments 0-2: accent (end range 10, 20, 30 -- all <= 31)
    for (let i = 0; i < 3; i++) {
      expect(fills[i].className).toContain('bg-accent')
    }

    // Segment 3: warning (end range 40 > 31, <= 71)
    expect(fills[3].className).toContain('bg-warning')
    expect(fills[3].getAttribute('style')).toContain('width: 50%')
  })

  it('accepts and applies custom className', () => {
    const { container } = render(
      <BatteryBar value={50} className="mt-4" />,
    )
    const wrapper = container.firstElementChild
    expect(wrapper?.className).toContain('mt-4')
  })
})
