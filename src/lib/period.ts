import type { Period } from '@/types'
import prisma from '@/lib/prisma'

/**
 * Finds or creates the period for a given month/year.
 * Used by both getCurrentPeriod and getPeriodForDate.
 */
async function findOrCreatePeriod(month: number, year: number): Promise<Period> {
  const existing = await prisma.period.findUnique({
    where: { month_year: { month, year } },
  })

  if (existing) {
    return existing
  }

  return prisma.period.create({
    data: {
      month,
      year,
      startDate: new Date(year, month - 1, 1),
      endDate: new Date(year, month, 0),
      isClosed: false,
    },
  })
}

/**
 * Returns the period for the current month, creating it if it does not exist.
 * Guarantees a period always exists for the current month.
 */
export async function getCurrentPeriod(): Promise<Period> {
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()

  return findOrCreatePeriod(month, year)
}

/**
 * Returns the period matching a given date string's month/year,
 * creating it if it does not exist.
 * Used by transaction actions to resolve the period for a transaction's date.
 */
export async function getPeriodForDate(dateStr: string): Promise<Period> {
  const date = new Date(dateStr)
  const month = date.getUTCMonth() + 1
  const year = date.getUTCFullYear()

  return findOrCreatePeriod(month, year)
}
