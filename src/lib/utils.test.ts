import { describe, it, expect } from 'vitest'
import { formatMoney, toCents, parseCents, formatRate, formatUnitAmount, cn } from './utils'

describe('formatMoney', () => {
  it('formats centavos to MXN currency string', () => {
    expect(formatMoney('15075')).toBe('$150.75')
  })

  it('handles zero', () => {
    expect(formatMoney('0')).toBe('$0.00')
  })

  it('handles single centavo', () => {
    expect(formatMoney('1')).toBe('$0.01')
  })

  it('handles exact peso amount', () => {
    expect(formatMoney('100')).toBe('$1.00')
  })

  it('handles large amounts without precision loss', () => {
    const result = formatMoney('999999999')
    // 999999999 centavos = $9,999,999.99
    expect(result).toContain('9,999,999.99')
  })

  it('handles negative cents string', () => {
    const result = formatMoney('-15075')
    expect(result).toContain('150.75')
  })
})

describe('toCents', () => {
  it('converts pesos with centavos to centavo string', () => {
    expect(toCents('150.75')).toBe('15075')
  })

  it('converts whole pesos to centavos', () => {
    expect(toCents('1500')).toBe('150000')
  })

  it('converts zero', () => {
    expect(toCents('0')).toBe('0')
  })

  it('converts single centavo', () => {
    expect(toCents('0.01')).toBe('1')
  })

  it('handles leading dot', () => {
    expect(toCents('.50')).toBe('50')
  })

  it('handles trailing dot', () => {
    expect(toCents('1500.')).toBe('150000')
  })

  it('truncates beyond 2 decimal places', () => {
    expect(toCents('99.999')).toBe('9999')
  })

  it('pads single decimal digit to 2 places', () => {
    expect(toCents('99.9')).toBe('9990')
  })

  it('trims whitespace before processing', () => {
    expect(toCents('  150.75  ')).toBe('15075')
  })

  it('throws on empty string', () => {
    expect(() => toCents('')).toThrow()
  })

  it('throws on non-numeric input', () => {
    expect(() => toCents('abc')).toThrow()
  })

  it('throws on multiple dots', () => {
    expect(() => toCents('12.34.56')).toThrow()
  })

  it('throws on negative input', () => {
    expect(() => toCents('-5')).toThrow()
  })

  it('throws on whitespace-only input', () => {
    expect(() => toCents('   ')).toThrow()
  })

  it('throws on non-numeric characters in decimal part', () => {
    expect(() => toCents('10.ab')).toThrow('non-numeric characters in decimal')
  })
})

describe('parseCents', () => {
  it('converts string to BigInt', () => {
    expect(parseCents('15075')).toBe(15075n)
  })

  it('converts zero string to 0n', () => {
    expect(parseCents('0')).toBe(0n)
  })

  it('throws on invalid input', () => {
    expect(() => parseCents('invalid')).toThrow()
  })
})

describe('formatRate', () => {
  it('converts basis points to percentage string', () => {
    expect(formatRate(4500)).toBe('45.00%')
  })

  it('handles zero', () => {
    expect(formatRate(0)).toBe('0.00%')
  })

  it('handles fractional percentage', () => {
    expect(formatRate(50)).toBe('0.50%')
  })

  it('handles 100%', () => {
    expect(formatRate(10000)).toBe('100.00%')
  })
})

describe('formatUnitAmount', () => {
  it('formats with 6 decimal precision for UDI', () => {
    const result = formatUnitAmount('50000123456', 6)
    // 50000123456 / 1e6 = 50000.123456
    expect(result).toContain('50')
    expect(result).toContain('123456')
  })

  it('formats with 2 decimal precision', () => {
    const result = formatUnitAmount('82900', 2)
    // 82900 / 100 = 829.00
    expect(result).toContain('829')
    expect(result).toContain('00')
  })
})

describe('cn', () => {
  it('merges conflicting Tailwind classes', () => {
    const result = cn('px-4 py-2', 'px-6')
    expect(result).toBe('py-2 px-6')
  })

  it('handles falsy values', () => {
    const result = cn('text-red-500', false && 'bg-blue-500')
    expect(result).toBe('text-red-500')
  })

  it('handles undefined values', () => {
    const result = cn('p-4', undefined, 'm-2')
    expect(result).toBe('p-4 m-2')
  })

  it('handles empty arguments', () => {
    const result = cn()
    expect(result).toBe('')
  })
})
