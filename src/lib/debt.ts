import type { SerializedDebt } from '@/types'

/** Calculated metrics for a single debt, varies by debt type */
export interface DebtMetrics {
  /** Credit card: percentage of credit limit used (0-100). Null for loans. */
  utilizationRate: number | null
  /** Estimated monthly interest in centavos (string). Applies to all types. */
  estimatedMonthlyInterest: string
  /** Loan: percentage of original amount paid off (0-100). Null for credit cards. */
  percentPaid: number | null
  /** Loan: total remaining payment in centavos (string). Null for credit cards. */
  totalRemainingPayment: string | null
}

/** Aggregated debt summary across all debts */
export interface DebtSummary {
  /** Sum of all currentBalance in centavos */
  totalDebt: string
  /** Sum of minimumPayment (cards) + monthlyPayment (loans) in centavos */
  totalMonthlyPayments: string
  /** (totalMonthlyPayments / monthlyIncome) * 100, as a number */
  debtToIncomeRatio: number
}

/**
 * Computes derived metrics for a single debt.
 * Credit cards get utilizationRate; loans get percentPaid and totalRemainingPayment.
 * All types get estimatedMonthlyInterest.
 * All monetary arithmetic uses BigInt to avoid floating-point errors.
 */
export function calculateDebtMetrics(debt: SerializedDebt): DebtMetrics {
  const balance = BigInt(debt.currentBalance)
  const rate = BigInt(debt.annualRate)

  // Monthly interest: balance * annualRate / 10000 / 12
  const estimatedMonthlyInterest =
    balance === BigInt(0) ? BigInt(0) : (balance * rate) / BigInt(10000) / BigInt(12)

  if (debt.type === 'CREDIT_CARD') {
    let utilizationRate = 0
    if (debt.creditLimit !== null && debt.creditLimit !== '0') {
      utilizationRate = (Number(debt.currentBalance) / Number(debt.creditLimit)) * 100
    }

    return {
      utilizationRate,
      estimatedMonthlyInterest: estimatedMonthlyInterest.toString(),
      percentPaid: null,
      totalRemainingPayment: null,
    }
  }

  // Loan types: PERSONAL_LOAN, AUTO_LOAN, OTHER
  let percentPaid = 0
  if (debt.originalAmount !== null && debt.originalAmount !== '0') {
    percentPaid = (1 - Number(debt.currentBalance) / Number(debt.originalAmount)) * 100
  }

  let totalRemainingPayment = BigInt(0)
  if (debt.monthlyPayment !== null && debt.remainingMonths !== null) {
    totalRemainingPayment = BigInt(debt.monthlyPayment) * BigInt(debt.remainingMonths)
  }

  return {
    utilizationRate: null,
    estimatedMonthlyInterest: estimatedMonthlyInterest.toString(),
    percentPaid,
    totalRemainingPayment: totalRemainingPayment.toString(),
  }
}

/**
 * Returns traffic-light color for credit card utilization rate.
 * <30 = positive (green), 30-70 = warning (orange), >70 = negative (red).
 */
export function getUtilizationColor(rate: number): 'positive' | 'warning' | 'negative' {
  if (rate < 30) return 'positive'
  if (rate <= 70) return 'warning'
  return 'negative'
}

/**
 * Returns traffic-light color for debt-to-income ratio.
 * <35 = positive (green), 35-50 = warning (orange), >50 = negative (red).
 */
export function getDebtToIncomeColor(ratio: number): 'positive' | 'warning' | 'negative' {
  if (ratio < 35) return 'positive'
  if (ratio <= 50) return 'warning'
  return 'negative'
}

/**
 * Calculates aggregated debt summary from a list of serialized debts.
 * Sums minimumPayment for credit cards and monthlyPayment for loan types.
 * Debt-to-income ratio: (totalMonthlyPayments / monthlyIncome) * 100.
 */
export function calculateDebtSummary(debts: SerializedDebt[], monthlyIncome: string): DebtSummary {
  let totalDebt = BigInt(0)
  let totalMonthlyPayments = BigInt(0)

  for (const debt of debts) {
    totalDebt += BigInt(debt.currentBalance)

    if (debt.type === 'CREDIT_CARD') {
      if (debt.minimumPayment !== null) {
        totalMonthlyPayments += BigInt(debt.minimumPayment)
      }
    } else {
      if (debt.monthlyPayment !== null) {
        totalMonthlyPayments += BigInt(debt.monthlyPayment)
      }
    }
  }

  let debtToIncomeRatio = 0
  const income = BigInt(monthlyIncome)
  if (income > BigInt(0) && totalMonthlyPayments > BigInt(0)) {
    // Use basis-point precision: (payments * 10000) / income gives bps, then / 100 for percentage
    debtToIncomeRatio =
      Number((totalMonthlyPayments * BigInt(10000)) / income) / 100
  }

  return {
    totalDebt: totalDebt.toString(),
    totalMonthlyPayments: totalMonthlyPayments.toString(),
    debtToIncomeRatio,
  }
}
