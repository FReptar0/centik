import { describe, it, expect } from 'vitest'
import { getMonthlyEquivalent, calculateIncomeSummary } from './income'
import type { SerializedIncomeSource } from '@/types'

describe('getMonthlyEquivalent', () => {
  it('doubles QUINCENAL amount (x2)', () => {
    expect(getMonthlyEquivalent('2500000', 'QUINCENAL')).toBe('5000000')
  })

  it('multiplies SEMANAL amount by 4', () => {
    expect(getMonthlyEquivalent('625000', 'SEMANAL')).toBe('2500000')
  })

  it('returns MENSUAL amount unchanged (x1)', () => {
    expect(getMonthlyEquivalent('5000000', 'MENSUAL')).toBe('5000000')
  })

  it('returns VARIABLE amount as estimate (same as input)', () => {
    expect(getMonthlyEquivalent('1500000', 'VARIABLE')).toBe('1500000')
  })

  it('returns "0" for zero amount with any frequency', () => {
    expect(getMonthlyEquivalent('0', 'QUINCENAL')).toBe('0')
    expect(getMonthlyEquivalent('0', 'SEMANAL')).toBe('0')
    expect(getMonthlyEquivalent('0', 'MENSUAL')).toBe('0')
    expect(getMonthlyEquivalent('0', 'VARIABLE')).toBe('0')
  })
})

/** Helper to build a minimal SerializedIncomeSource for tests */
function makeSource(
  overrides: Partial<SerializedIncomeSource> & Pick<SerializedIncomeSource, 'defaultAmount' | 'frequency'>,
): SerializedIncomeSource {
  return {
    id: 'test-id',
    name: 'Test Source',
    type: 'EMPLOYMENT',
    isActive: true,
    userId: 'test-user-id',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  }
}

describe('calculateIncomeSummary', () => {
  it('returns all zeros for empty array', () => {
    const result = calculateIncomeSummary([])
    expect(result).toEqual({
      quincenal: '0',
      monthly: '0',
      semester: '0',
      annual: '0',
    })
  })

  it('calculates correct multiples for a single QUINCENAL source', () => {
    const sources = [
      makeSource({ defaultAmount: '1000000', frequency: 'QUINCENAL' }),
    ]
    const result = calculateIncomeSummary(sources)
    // quincenal = 1000000, monthly = 2000000, semester = 12000000, annual = 24000000
    expect(result).toEqual({
      quincenal: '1000000',
      monthly: '2000000',
      semester: '12000000',
      annual: '24000000',
    })
  })

  it('calculates correct quincenal for SEMANAL source (x2 weeks per quincena)', () => {
    const sources = [
      makeSource({ defaultAmount: '500000', frequency: 'SEMANAL' }),
    ]
    const result = calculateIncomeSummary(sources)
    // quincenal = 500000 * 2 = 1000000
    // monthly = 1000000 * 2 = 2000000
    expect(result.quincenal).toBe('1000000')
    expect(result.monthly).toBe('2000000')
  })

  it('calculates correct quincenal for MENSUAL source (half per quincena)', () => {
    const sources = [
      makeSource({ defaultAmount: '6000000', frequency: 'MENSUAL' }),
    ]
    const result = calculateIncomeSummary(sources)
    // quincenal = 6000000 / 2 = 3000000
    // monthly = 3000000 * 2 = 6000000
    expect(result.quincenal).toBe('3000000')
    expect(result.monthly).toBe('6000000')
  })

  it('calculates correct quincenal for VARIABLE source (estimate, half per quincena)', () => {
    const sources = [
      makeSource({ defaultAmount: '4000000', frequency: 'VARIABLE' }),
    ]
    const result = calculateIncomeSummary(sources)
    // quincenal = 4000000 / 2 = 2000000
    // monthly = 2000000 * 2 = 4000000
    expect(result.quincenal).toBe('2000000')
    expect(result.monthly).toBe('4000000')
  })

  it('aggregates mixed-frequency sources correctly', () => {
    const sources = [
      makeSource({ defaultAmount: '2500000', frequency: 'QUINCENAL', name: 'Empleo' }),
      makeSource({ defaultAmount: '1000000', frequency: 'MENSUAL', name: 'Freelance' }),
      makeSource({ defaultAmount: '250000', frequency: 'SEMANAL', name: 'Side gig' }),
    ]
    const result = calculateIncomeSummary(sources)
    // QUINCENAL: 2500000 directly
    // MENSUAL: 1000000 / 2 = 500000
    // SEMANAL: 250000 * 2 = 500000
    // quincenal total = 2500000 + 500000 + 500000 = 3500000
    // monthly = 3500000 * 2 = 7000000
    // semester = 3500000 * 12 = 42000000
    // annual = 3500000 * 24 = 84000000
    expect(result).toEqual({
      quincenal: '3500000',
      monthly: '7000000',
      semester: '42000000',
      annual: '84000000',
    })
  })

  it('handles sources with zero amounts', () => {
    const sources = [
      makeSource({ defaultAmount: '0', frequency: 'QUINCENAL' }),
      makeSource({ defaultAmount: '1000000', frequency: 'QUINCENAL', name: 'Active' }),
    ]
    const result = calculateIncomeSummary(sources)
    expect(result.quincenal).toBe('1000000')
    expect(result.monthly).toBe('2000000')
  })
})
