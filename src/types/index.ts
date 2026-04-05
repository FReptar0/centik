// Re-exported Prisma model types and enums for application use.
// Serialized* variants replace BigInt fields with string for JSON compatibility.

// --- Model types (type-only, no runtime cost) ---
export type { IncomeSource } from '../../generated/prisma/client'
export type { Transaction } from '../../generated/prisma/client'
export type { Category } from '../../generated/prisma/client'
export type { Debt } from '../../generated/prisma/client'
export type { Budget } from '../../generated/prisma/client'
export type { Period } from '../../generated/prisma/client'
export type { MonthlySummary } from '../../generated/prisma/client'
export type { ValueUnit } from '../../generated/prisma/client'
export type { UnitRate } from '../../generated/prisma/client'
export type { Asset } from '../../generated/prisma/client'

// --- Enum re-exports (runtime values for validation/display) ---
export {
  TransactionType,
  Frequency,
  DebtType,
  PaymentMethod,
  CategoryType,
  AssetCategory,
} from '../../generated/prisma/client'

// --- Serialized variants (BigInt fields become string for JSON) ---

import type {
  Transaction,
  IncomeSource,
  Debt,
  Budget,
  MonthlySummary,
} from '../../generated/prisma/client'

/** Transaction with amount as string (serialized from BigInt centavos) */
export type SerializedTransaction = Omit<Transaction, 'amount'> & {
  amount: string
}

/** IncomeSource with defaultAmount as string (serialized from BigInt centavos) */
export type SerializedIncomeSource = Omit<IncomeSource, 'defaultAmount'> & {
  defaultAmount: string
}

/** Debt with all monetary BigInt fields as string */
export type SerializedDebt = Omit<
  Debt,
  'currentBalance' | 'creditLimit' | 'minimumPayment' | 'monthlyPayment' | 'originalAmount'
> & {
  currentBalance: string
  creditLimit: string | null
  minimumPayment: string | null
  monthlyPayment: string | null
  originalAmount: string | null
}

/** Budget with quincenalAmount as string (serialized from BigInt centavos) */
export type SerializedBudget = Omit<Budget, 'quincenalAmount'> & {
  quincenalAmount: string
}

/** MonthlySummary with all monetary BigInt fields as string */
export type SerializedMonthlySummary = Omit<
  MonthlySummary,
  'totalIncome' | 'totalExpenses' | 'totalSavings' | 'debtAtClose' | 'debtPayments'
> & {
  totalIncome: string
  totalExpenses: string
  totalSavings: string
  debtAtClose: string
  debtPayments: string
}
