import prisma from '@/lib/prisma'
import type { BudgetWithSpent } from './budget-shared'

// Re-export pure types and functions for server+client use
export type { BudgetWithSpent } from './budget-shared'
export { getBudgetColor } from './budget-shared'

/**
 * Fetches budgets for a period with actual spending per category.
 * Uses parallel queries: budget findMany (with category include) + transaction groupBy.
 * Joins results via a spentMap keyed by categoryId.
 */
export async function getBudgetsWithSpent(periodId: string, userId: string): Promise<BudgetWithSpent[]> {
  const [budgets, expenseGroups] = await Promise.all([
    prisma.budget.findMany({
      where: { periodId, userId },
      include: { category: true },
    }),
    prisma.transaction.groupBy({
      by: ['categoryId'],
      where: { periodId, type: 'EXPENSE', userId },
      _sum: { amount: true },
    }),
  ])

  if (budgets.length === 0) return []

  const spentMap = new Map<string, bigint>()
  for (const group of expenseGroups) {
    if (group._sum.amount !== null) {
      spentMap.set(group.categoryId, group._sum.amount)
    }
  }

  return budgets.map((budget) => ({
    id: budget.id,
    categoryId: budget.categoryId,
    categoryName: budget.category.name,
    categoryIcon: budget.category.icon,
    categoryColor: budget.category.color,
    quincenalAmount: budget.quincenalAmount.toString(),
    spent: (spentMap.get(budget.categoryId) ?? BigInt(0)).toString(),
  }))
}

/**
 * Copies budget entries from the previous month's period to the target period.
 * Handles January -> December year wrap.
 * Returns true if budgets were copied, false if nothing to copy.
 */
export async function copyBudgetsFromPreviousPeriod(
  periodId: string,
  month: number,
  year: number,
  userId: string,
): Promise<boolean> {
  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear = month === 1 ? year - 1 : year

  const previousPeriod = await prisma.period.findFirst({
    where: { month: prevMonth, year: prevYear, userId },
  })

  if (!previousPeriod) return false

  const previousBudgets = await prisma.budget.findMany({
    where: { periodId: previousPeriod.id, userId },
  })

  if (previousBudgets.length === 0) return false

  await prisma.budget.createMany({
    data: previousBudgets.map((budget) => ({
      categoryId: budget.categoryId,
      quincenalAmount: budget.quincenalAmount,
      periodId,
      userId,
    })),
  })

  return true
}
