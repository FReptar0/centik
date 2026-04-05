import prisma from '@/lib/prisma'
import type {
  DashboardKPIs,
  CategoryExpense,
  BudgetVsSpent,
  MonthlyTrendPoint,
} from '@/types'

/** Transaction with joined category fields for recent transactions display */
export interface RecentTransaction {
  id: string
  type: string
  amount: string
  description: string | null
  categoryId: string
  date: Date
  createdAt: Date
  updatedAt: Date
  periodId: string
  incomeSourceId: string | null
  paymentMethod: string | null
  notes: string | null
  category: {
    name: string
    icon: string
    color: string
  }
}

/**
 * Computes monthly equivalent from raw BigInt defaultAmount + frequency.
 * Uses same CASE logic as DATA_FLOW.md SQL:
 * QUINCENAL x2, SEMANAL x4, MENSUAL x1, VARIABLE x1
 */
function computeMonthlyFromFrequency(amount: bigint, frequency: string): bigint {
  switch (frequency) {
    case 'QUINCENAL':
      return amount * BigInt(2)
    case 'SEMANAL':
      return amount * BigInt(4)
    case 'MENSUAL':
      return amount
    case 'VARIABLE':
      return amount
    default:
      return amount
  }
}

/**
 * Returns 6 KPI values for the dashboard.
 * Uses Prisma aggregate queries (not loading individual records).
 * All monetary values serialized as strings; rates as basis points (integers).
 */
export async function getDashboardKPIs(periodId: string): Promise<DashboardKPIs> {
  const [incomeSources, expenseAgg, _incomeAgg, debtAgg] = await Promise.all([
    prisma.incomeSource.findMany({
      where: { isActive: true },
      select: { defaultAmount: true, frequency: true },
    }),
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { periodId, type: 'EXPENSE' },
    }),
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { periodId, type: 'INCOME' },
    }),
    prisma.debt.aggregate({
      _sum: { currentBalance: true },
      where: { isActive: true },
    }),
  ])

  // Compute monthly estimated income from active sources using BigInt arithmetic
  let monthlyEstimatedIncome = BigInt(0)
  for (const source of incomeSources) {
    monthlyEstimatedIncome += computeMonthlyFromFrequency(
      source.defaultAmount,
      source.frequency,
    )
  }

  const monthExpenses = expenseAgg._sum.amount ?? BigInt(0)
  const totalDebt = debtAgg._sum.currentBalance ?? BigInt(0)

  // Derived: available = estimated income - expenses
  const available = monthlyEstimatedIncome - monthExpenses

  // Derived: savingsRate = (income - expenses) / income * 10000 (basis points)
  let savingsRate = 0
  if (monthlyEstimatedIncome > BigInt(0)) {
    savingsRate = Number(
      (available * BigInt(10000)) / monthlyEstimatedIncome,
    )
  }

  // Derived: debtToIncomeRatio = totalDebt / income * 10000 (basis points)
  let debtToIncomeRatio = 0
  if (monthlyEstimatedIncome > BigInt(0)) {
    debtToIncomeRatio = Number(
      (totalDebt * BigInt(10000)) / monthlyEstimatedIncome,
    )
  }

  return {
    monthlyEstimatedIncome: monthlyEstimatedIncome.toString(),
    monthExpenses: monthExpenses.toString(),
    available: available.toString(),
    totalDebt: totalDebt.toString(),
    savingsRate,
    debtToIncomeRatio,
  }
}

/**
 * Returns expense totals grouped by category for the pie/donut chart.
 * Uses Prisma groupBy (SQL aggregation), then joins category data separately
 * (Prisma groupBy does not support include).
 * Returns sorted by total descending.
 */
export async function getCategoryExpenses(periodId: string): Promise<CategoryExpense[]> {
  const grouped = await prisma.transaction.groupBy({
    by: ['categoryId'],
    _sum: { amount: true },
    where: { periodId, type: 'EXPENSE' },
  })

  if (grouped.length === 0) {
    return []
  }

  const categoryIds = grouped.map((g) => g.categoryId)
  const categoryData = await prisma.category.findMany({
    where: { id: { in: categoryIds } },
    select: { id: true, name: true, icon: true, color: true },
  })

  const categoryMap = new Map(categoryData.map((c) => [c.id, c]))

  const result: CategoryExpense[] = grouped
    .map((g) => {
      const cat = categoryMap.get(g.categoryId)
      return {
        name: cat?.name ?? 'Desconocido',
        icon: cat?.icon ?? 'package',
        color: cat?.color ?? '#94a3b8',
        total: (g._sum.amount ?? BigInt(0)).toString(),
      }
    })
    .sort((a, b) => Number(BigInt(b.total) - BigInt(a.total)))

  return result
}

/**
 * Returns budget amount vs actual spending per category for the bar chart.
 * Queries budgets with category include, then separately groups expense totals.
 * Budget monthly = quincenalAmount * 2.
 */
export async function getBudgetVsSpent(periodId: string): Promise<BudgetVsSpent[]> {
  const [budgets, expensesByCategory] = await Promise.all([
    prisma.budget.findMany({
      where: { periodId },
      include: { category: { select: { name: true, color: true } } },
    }),
    prisma.transaction.groupBy({
      by: ['categoryId'],
      _sum: { amount: true },
      where: { periodId, type: 'EXPENSE' },
    }),
  ])

  if (budgets.length === 0) {
    return []
  }

  const spentMap = new Map(
    expensesByCategory.map((e) => [e.categoryId, e._sum.amount ?? BigInt(0)]),
  )

  return budgets.map((b) => ({
    name: b.category.name,
    color: b.category.color,
    budget: (b.quincenalAmount * BigInt(2)).toString(),
    spent: (spentMap.get(b.categoryId) ?? BigInt(0)).toString(),
  }))
}

/**
 * Returns up to 6 months of MonthlySummary data for the trend area chart.
 * Ordered chronologically (oldest first).
 */
export async function getMonthlyTrend(): Promise<MonthlyTrendPoint[]> {
  const summaries = await prisma.monthlySummary.findMany({
    include: { period: { select: { month: true, year: true } } },
    orderBy: { period: { year: 'asc' } },
    take: 6,
  })

  // Sort by year then month for chronological order
  summaries.sort((a, b) => {
    if (a.period.year !== b.period.year) {
      return a.period.year - b.period.year
    }
    return a.period.month - b.period.month
  })

  return summaries.map((s) => ({
    month: s.period.month,
    year: s.period.year,
    totalIncome: s.totalIncome.toString(),
    totalExpenses: s.totalExpenses.toString(),
    totalSavings: s.totalSavings.toString(),
  }))
}

/**
 * Returns the last 8 transactions for the current period with category data.
 * Serializes BigInt amount to string.
 */
export async function getRecentTransactions(
  periodId: string,
): Promise<RecentTransaction[]> {
  const transactions = await prisma.transaction.findMany({
    where: { periodId },
    include: {
      category: { select: { name: true, icon: true, color: true } },
    },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    take: 8,
  })

  return transactions.map((t) => ({
    ...t,
    amount: t.amount.toString(),
    type: t.type as string,
    paymentMethod: t.paymentMethod as string | null,
  }))
}
