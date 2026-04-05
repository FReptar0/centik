import { describe, it, expect } from 'vitest'
import {
  calculateDebtMetrics,
  getUtilizationColor,
  getDebtToIncomeColor,
  calculateDebtSummary,
} from './debt'
import type { SerializedDebt } from '@/types'

/** Helper to build a minimal SerializedDebt for tests */
function makeDebt(
  overrides: Partial<SerializedDebt> & Pick<SerializedDebt, 'type' | 'currentBalance'>,
): SerializedDebt {
  return {
    id: 'test-id',
    name: 'Test Debt',
    annualRate: 4500,
    isActive: true,
    creditLimit: null,
    minimumPayment: null,
    monthlyPayment: null,
    originalAmount: null,
    remainingMonths: null,
    cutOffDay: null,
    paymentDueDay: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  }
}

describe('calculateDebtMetrics', () => {
  describe('credit card metrics', () => {
    it('calculates utilization rate for credit card', () => {
      const debt = makeDebt({
        type: 'CREDIT_CARD',
        currentBalance: '1500000',
        creditLimit: '5000000',
        annualRate: 4500,
      })

      const metrics = calculateDebtMetrics(debt)

      expect(metrics.utilizationRate).toBe(30.0)
    })

    it('calculates estimated monthly interest for credit card', () => {
      const debt = makeDebt({
        type: 'CREDIT_CARD',
        currentBalance: '1500000',
        creditLimit: '5000000',
        annualRate: 4500,
      })

      const metrics = calculateDebtMetrics(debt)

      // 1500000 * 4500 / 10000 / 12 = 56250
      expect(metrics.estimatedMonthlyInterest).toBe('56250')
    })

    it('returns zero utilization when credit limit is zero', () => {
      const debt = makeDebt({
        type: 'CREDIT_CARD',
        currentBalance: '100000',
        creditLimit: '0',
        annualRate: 3500,
      })

      const metrics = calculateDebtMetrics(debt)

      expect(metrics.utilizationRate).toBe(0)
    })

    it('returns zero utilization when credit limit is null', () => {
      const debt = makeDebt({
        type: 'CREDIT_CARD',
        currentBalance: '100000',
        creditLimit: null,
        annualRate: 3500,
      })

      const metrics = calculateDebtMetrics(debt)

      expect(metrics.utilizationRate).toBe(0)
    })

    it('returns zero monthly interest when balance is zero', () => {
      const debt = makeDebt({
        type: 'CREDIT_CARD',
        currentBalance: '0',
        creditLimit: '5000000',
        annualRate: 4500,
      })

      const metrics = calculateDebtMetrics(debt)

      expect(metrics.estimatedMonthlyInterest).toBe('0')
    })

    it('does not include loan-specific fields for credit cards', () => {
      const debt = makeDebt({
        type: 'CREDIT_CARD',
        currentBalance: '1500000',
        creditLimit: '5000000',
        annualRate: 4500,
      })

      const metrics = calculateDebtMetrics(debt)

      expect(metrics.percentPaid).toBeNull()
      expect(metrics.totalRemainingPayment).toBeNull()
    })
  })

  describe('loan metrics', () => {
    it('calculates percent paid for loan', () => {
      const debt = makeDebt({
        type: 'PERSONAL_LOAN',
        currentBalance: '6000000',
        originalAmount: '8000000',
        monthlyPayment: '200000',
        remainingMonths: 30,
        annualRate: 1500,
      })

      const metrics = calculateDebtMetrics(debt)

      expect(metrics.percentPaid).toBe(25.0)
    })

    it('calculates total remaining payment for loan', () => {
      const debt = makeDebt({
        type: 'PERSONAL_LOAN',
        currentBalance: '6000000',
        originalAmount: '8000000',
        monthlyPayment: '200000',
        remainingMonths: 30,
        annualRate: 1500,
      })

      const metrics = calculateDebtMetrics(debt)

      // 200000 * 30 = 6000000
      expect(metrics.totalRemainingPayment).toBe('6000000')
    })

    it('calculates estimated monthly interest for loan', () => {
      const debt = makeDebt({
        type: 'PERSONAL_LOAN',
        currentBalance: '6000000',
        originalAmount: '8000000',
        monthlyPayment: '200000',
        remainingMonths: 30,
        annualRate: 1500,
      })

      const metrics = calculateDebtMetrics(debt)

      // 6000000 * 1500 / 10000 / 12 = 75000
      expect(metrics.estimatedMonthlyInterest).toBe('75000')
    })

    it('returns zero percent paid when original amount is null', () => {
      const debt = makeDebt({
        type: 'PERSONAL_LOAN',
        currentBalance: '6000000',
        originalAmount: null,
        annualRate: 1500,
      })

      const metrics = calculateDebtMetrics(debt)

      expect(metrics.percentPaid).toBe(0)
    })

    it('returns zero percent paid when original amount is zero', () => {
      const debt = makeDebt({
        type: 'PERSONAL_LOAN',
        currentBalance: '0',
        originalAmount: '0',
        annualRate: 1500,
      })

      const metrics = calculateDebtMetrics(debt)

      expect(metrics.percentPaid).toBe(0)
    })

    it('returns zero total remaining when monthly payment is null', () => {
      const debt = makeDebt({
        type: 'PERSONAL_LOAN',
        currentBalance: '6000000',
        originalAmount: '8000000',
        monthlyPayment: null,
        remainingMonths: 30,
        annualRate: 1500,
      })

      const metrics = calculateDebtMetrics(debt)

      expect(metrics.totalRemainingPayment).toBe('0')
    })

    it('returns zero total remaining when remaining months is null', () => {
      const debt = makeDebt({
        type: 'PERSONAL_LOAN',
        currentBalance: '6000000',
        originalAmount: '8000000',
        monthlyPayment: '200000',
        remainingMonths: null,
        annualRate: 1500,
      })

      const metrics = calculateDebtMetrics(debt)

      expect(metrics.totalRemainingPayment).toBe('0')
    })

    it('does not include utilization rate for loans', () => {
      const debt = makeDebt({
        type: 'PERSONAL_LOAN',
        currentBalance: '6000000',
        originalAmount: '8000000',
        annualRate: 1500,
      })

      const metrics = calculateDebtMetrics(debt)

      expect(metrics.utilizationRate).toBeNull()
    })

    it('handles AUTO_LOAN type same as PERSONAL_LOAN', () => {
      const debt = makeDebt({
        type: 'AUTO_LOAN',
        currentBalance: '10000000',
        originalAmount: '20000000',
        monthlyPayment: '500000',
        remainingMonths: 20,
        annualRate: 1200,
      })

      const metrics = calculateDebtMetrics(debt)

      expect(metrics.percentPaid).toBe(50.0)
      expect(metrics.totalRemainingPayment).toBe('10000000')
    })

    it('handles OTHER type same as loan', () => {
      const debt = makeDebt({
        type: 'OTHER',
        currentBalance: '3000000',
        originalAmount: '4000000',
        monthlyPayment: '100000',
        remainingMonths: 30,
        annualRate: 1000,
      })

      const metrics = calculateDebtMetrics(debt)

      expect(metrics.percentPaid).toBe(25.0)
      expect(metrics.totalRemainingPayment).toBe('3000000')
    })
  })
})

describe('getUtilizationColor', () => {
  it('returns positive for utilization below 30', () => {
    expect(getUtilizationColor(0)).toBe('positive')
    expect(getUtilizationColor(10)).toBe('positive')
    expect(getUtilizationColor(29.9)).toBe('positive')
  })

  it('returns warning for utilization between 30 and 70', () => {
    expect(getUtilizationColor(30)).toBe('warning')
    expect(getUtilizationColor(50)).toBe('warning')
    expect(getUtilizationColor(70)).toBe('warning')
  })

  it('returns negative for utilization above 70', () => {
    expect(getUtilizationColor(70.1)).toBe('negative')
    expect(getUtilizationColor(90)).toBe('negative')
    expect(getUtilizationColor(100)).toBe('negative')
  })
})

describe('getDebtToIncomeColor', () => {
  it('returns positive for ratio below 35', () => {
    expect(getDebtToIncomeColor(0)).toBe('positive')
    expect(getDebtToIncomeColor(20)).toBe('positive')
    expect(getDebtToIncomeColor(34.9)).toBe('positive')
  })

  it('returns warning for ratio between 35 and 50', () => {
    expect(getDebtToIncomeColor(35)).toBe('warning')
    expect(getDebtToIncomeColor(42)).toBe('warning')
    expect(getDebtToIncomeColor(50)).toBe('warning')
  })

  it('returns negative for ratio above 50', () => {
    expect(getDebtToIncomeColor(50.1)).toBe('negative')
    expect(getDebtToIncomeColor(75)).toBe('negative')
    expect(getDebtToIncomeColor(100)).toBe('negative')
  })
})

describe('calculateDebtSummary', () => {
  it('returns all zeros for empty array', () => {
    const result = calculateDebtSummary([], '5000000')

    expect(result).toEqual({
      totalDebt: '0',
      totalMonthlyPayments: '0',
      debtToIncomeRatio: 0,
    })
  })

  it('sums total debt from all debts', () => {
    const debts = [
      makeDebt({ type: 'CREDIT_CARD', currentBalance: '1500000', creditLimit: '5000000' }),
      makeDebt({
        type: 'PERSONAL_LOAN',
        currentBalance: '6000000',
        originalAmount: '8000000',
        name: 'Loan',
      }),
    ]

    const result = calculateDebtSummary(debts, '5000000')

    expect(result.totalDebt).toBe('7500000')
  })

  it('sums minimum payment for credit cards in monthly payments', () => {
    const debts = [
      makeDebt({
        type: 'CREDIT_CARD',
        currentBalance: '1500000',
        creditLimit: '5000000',
        minimumPayment: '75000',
      }),
    ]

    const result = calculateDebtSummary(debts, '5000000')

    expect(result.totalMonthlyPayments).toBe('75000')
  })

  it('sums monthly payment for loans in monthly payments', () => {
    const debts = [
      makeDebt({
        type: 'PERSONAL_LOAN',
        currentBalance: '6000000',
        originalAmount: '8000000',
        monthlyPayment: '200000',
      }),
    ]

    const result = calculateDebtSummary(debts, '5000000')

    expect(result.totalMonthlyPayments).toBe('200000')
  })

  it('sums mixed debt types correctly', () => {
    const debts = [
      makeDebt({
        type: 'CREDIT_CARD',
        currentBalance: '1500000',
        creditLimit: '5000000',
        minimumPayment: '75000',
        name: 'Card',
      }),
      makeDebt({
        type: 'PERSONAL_LOAN',
        currentBalance: '6000000',
        originalAmount: '8000000',
        monthlyPayment: '200000',
        name: 'Loan',
      }),
    ]

    const result = calculateDebtSummary(debts, '5000000')

    expect(result.totalDebt).toBe('7500000')
    expect(result.totalMonthlyPayments).toBe('275000')
  })

  it('calculates debt-to-income ratio correctly', () => {
    const debts = [
      makeDebt({
        type: 'CREDIT_CARD',
        currentBalance: '1500000',
        creditLimit: '5000000',
        minimumPayment: '250000',
      }),
    ]

    // 250000 / 5000000 * 100 = 5.0
    const result = calculateDebtSummary(debts, '5000000')

    expect(result.debtToIncomeRatio).toBe(5)
  })

  it('returns zero ratio when monthly income is zero', () => {
    const debts = [
      makeDebt({
        type: 'CREDIT_CARD',
        currentBalance: '1500000',
        creditLimit: '5000000',
        minimumPayment: '75000',
      }),
    ]

    const result = calculateDebtSummary(debts, '0')

    expect(result.debtToIncomeRatio).toBe(0)
  })

  it('handles null payment fields gracefully', () => {
    const debts = [
      makeDebt({
        type: 'CREDIT_CARD',
        currentBalance: '1500000',
        creditLimit: '5000000',
        minimumPayment: null,
      }),
      makeDebt({
        type: 'PERSONAL_LOAN',
        currentBalance: '6000000',
        originalAmount: '8000000',
        monthlyPayment: null,
        name: 'Loan',
      }),
    ]

    const result = calculateDebtSummary(debts, '5000000')

    expect(result.totalMonthlyPayments).toBe('0')
    expect(result.debtToIncomeRatio).toBe(0)
  })
})
