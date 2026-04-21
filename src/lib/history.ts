import prisma from '@/lib/prisma'
import type { SerializedMonthlySummary } from '@/types'

/** Preview data returned before confirming period close */
export interface ClosePeriodPreview {
  totalIncome: string
  totalExpenses: string
  totalSavings: string
  savingsRate: number // basis points
  debtAtClose: string
  debtPayments: string
}

/** Single month slot in the yearly summaries array */
export interface MonthSummarySlot {
  month: number
  year: number
  data: SerializedMonthlySummary | null
}

/**
 * Returns a 12-slot array for the given year (one per month).
 * Each slot contains serialized MonthlySummary data or null if no summary exists.
 * Index 0 = January, index 11 = December.
 */
export async function getMonthlySummariesForYear(
  year: number,
  userId: string,
): Promise<MonthSummarySlot[]> {
  const summaries = await prisma.monthlySummary.findMany({
    where: { userId, period: { year } },
    include: { period: { select: { month: true, year: true } } },
  })

  const summaryMap = new Map<number, (typeof summaries)[0]>()
  for (const summary of summaries) {
    summaryMap.set(summary.period.month, summary)
  }

  const slots: MonthSummarySlot[] = []
  for (let month = 1; month <= 12; month++) {
    const summary = summaryMap.get(month)
    if (summary) {
      slots.push({
        month,
        year,
        data: {
          id: summary.id,
          periodId: summary.periodId,
          totalIncome: summary.totalIncome.toString(),
          totalExpenses: summary.totalExpenses.toString(),
          totalSavings: summary.totalSavings.toString(),
          savingsRate: summary.savingsRate,
          debtAtClose: summary.debtAtClose.toString(),
          debtPayments: summary.debtPayments.toString(),
          notes: summary.notes,
          createdAt: summary.createdAt,
          userId: summary.userId,
        },
      })
    } else {
      slots.push({ month, year, data: null })
    }
  }

  return slots
}

/**
 * Returns sorted array of distinct years that have at least one period.
 * Used by year selector in the history page.
 */
export async function getAvailableYears(userId: string): Promise<number[]> {
  const periods = await prisma.period.findMany({
    where: { userId },
    select: { year: true },
    distinct: ['year'],
    orderBy: { year: 'asc' },
  })

  return periods.map((p) => p.year)
}

/**
 * Computes the exact totals that closePeriod will snapshot.
 * Uses parallel aggregate queries for income, expenses, and debt.
 * Returns all monetary fields as serialized strings; savingsRate as basis points.
 */
export async function getClosePeriodPreview(
  periodId: string,
  userId: string,
): Promise<ClosePeriodPreview> {
  const [incomeAgg, expenseAgg, debtAgg] = await Promise.all([
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { periodId, type: 'INCOME', userId },
    }),
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { periodId, type: 'EXPENSE', userId },
    }),
    prisma.debt.aggregate({
      _sum: { currentBalance: true },
      where: { isActive: true, userId },
    }),
  ])

  const totalIncome = incomeAgg._sum.amount ?? BigInt(0)
  const totalExpenses = expenseAgg._sum.amount ?? BigInt(0)
  const totalSavings = totalIncome - totalExpenses
  const debtAtClose = debtAgg._sum.currentBalance ?? BigInt(0)
  const debtPayments = BigInt(0) // MVP: no explicit debt-payment category tracking

  const savingsRate =
    totalIncome > BigInt(0) ? Number((totalSavings * BigInt(10000)) / totalIncome) : 0

  return {
    totalIncome: totalIncome.toString(),
    totalExpenses: totalExpenses.toString(),
    totalSavings: totalSavings.toString(),
    savingsRate,
    debtAtClose: debtAtClose.toString(),
    debtPayments: debtPayments.toString(),
  }
}
