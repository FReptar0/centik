import { describe, it, expect } from 'vitest'
import { serializeBigInts } from './serialize'

describe('serializeBigInts', () => {
  it('converts a top-level BigInt field to string', () => {
    const result = serializeBigInts({ amount: 15075n })
    expect(result).toEqual({ amount: '15075' })
  })

  it('converts nested BigInt fields to strings', () => {
    const result = serializeBigInts({ nested: { deep: 99n } })
    expect(result).toEqual({ nested: { deep: '99' } })
  })

  it('converts BigInt values in arrays', () => {
    const result = serializeBigInts([1n, 2n, 3n])
    expect(result).toEqual(['1', '2', '3'])
  })

  it('preserves non-BigInt types in mixed objects', () => {
    const result = serializeBigInts({ mixed: 'hello', amount: 0n, flag: true })
    expect(result).toEqual({ mixed: 'hello', amount: '0', flag: true })
  })

  it('returns null for null input', () => {
    const result = serializeBigInts(null)
    expect(result).toBeNull()
  })

  it('converts Date to ISO string (JSON.parse behavior)', () => {
    const date = new Date('2025-01-15T10:00:00.000Z')
    const result = serializeBigInts({ date })
    expect(result).toEqual({ date: '2025-01-15T10:00:00.000Z' })
  })

  it('handles empty object', () => {
    const result = serializeBigInts({})
    expect(result).toEqual({})
  })

  it('handles empty array', () => {
    const result = serializeBigInts([])
    expect(result).toEqual([])
  })

  it('preserves string values', () => {
    const result = serializeBigInts({ name: 'test' })
    expect(result).toEqual({ name: 'test' })
  })

  it('preserves number values', () => {
    const result = serializeBigInts({ count: 42 })
    expect(result).toEqual({ count: 42 })
  })

  it('preserves boolean values', () => {
    const result = serializeBigInts({ active: true, closed: false })
    expect(result).toEqual({ active: true, closed: false })
  })

  it('converts undefined values to missing keys (JSON behavior)', () => {
    const result = serializeBigInts({ a: 1, b: undefined })
    expect(result).toEqual({ a: 1 })
    expect('b' in result).toBe(false)
  })

  it('handles deeply nested mixed structures', () => {
    const input = {
      user: {
        name: 'Test',
        accounts: [
          { balance: 1000n, active: true },
          { balance: 2000n, active: false },
        ],
      },
    }
    const result = serializeBigInts(input)
    expect(result).toEqual({
      user: {
        name: 'Test',
        accounts: [
          { balance: '1000', active: true },
          { balance: '2000', active: false },
        ],
      },
    })
  })
})
