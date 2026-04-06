'use server'

import { revalidatePath } from 'next/cache'
import prisma from '@/lib/prisma'
import { getClosePeriodPreview, type ClosePeriodPreview } from '@/lib/history'

type ActionResult = { success: true } | { error: Record<string, string[]> }

/** Revalidate all paths affected by period close/reopen */
function revalidateHistoryPaths(): void {
  revalidatePath('/')
  revalidatePath('/historial')
  revalidatePath('/presupuesto')
  revalidatePath('/movimientos')
}

/**
 * Closes a period atomically using Prisma $transaction.
 * 5 steps: compute totals, create MonthlySummary, mark closed,
 * create next period, copy budgets.
 */
export async function closePeriod(periodId: string): Promise<ActionResult> {
  try {
    const period = await prisma.period.findUnique({
      where: { id: periodId },
    })

    if (!period) {
      return { error: { _form: ['Periodo no encontrado'] } }
    }

    if (period.isClosed) {
      return { error: { _form: ['Este periodo ya esta cerrado'] } }
    }

    await prisma.$transaction(async (tx) => {
      // Step 1: Compute totals
      const [incomeAgg, expenseAgg, debtAgg] = await Promise.all([
        tx.transaction.aggregate({
          _sum: { amount: true },
          where: { periodId, type: 'INCOME' },
        }),
        tx.transaction.aggregate({
          _sum: { amount: true },
          where: { periodId, type: 'EXPENSE' },
        }),
        tx.debt.aggregate({
          _sum: { currentBalance: true },
          where: { isActive: true },
        }),
      ])

      const totalIncome = incomeAgg._sum.amount ?? BigInt(0)
      const totalExpenses = expenseAgg._sum.amount ?? BigInt(0)
      const totalSavings = totalIncome - totalExpenses
      const debtAtClose = debtAgg._sum.currentBalance ?? BigInt(0)
      const debtPayments = BigInt(0) // MVP: no explicit debt-payment category

      const savingsRate =
        totalIncome > BigInt(0)
          ? Number((totalSavings * BigInt(10000)) / totalIncome)
          : 0

      // Step 2: Create MonthlySummary
      await tx.monthlySummary.create({
        data: {
          periodId,
          totalIncome,
          totalExpenses,
          totalSavings,
          savingsRate,
          debtAtClose,
          debtPayments,
        },
      })

      // Step 3: Mark period as closed
      await tx.period.update({
        where: { id: periodId },
        data: { isClosed: true, closedAt: new Date() },
      })

      // Step 4: Create next period (upsert for idempotency)
      const nextMonth = period.month === 12 ? 1 : period.month + 1
      const nextYear = period.month === 12 ? period.year + 1 : period.year

      const nextPeriod = await tx.period.upsert({
        where: { month_year: { month: nextMonth, year: nextYear } },
        update: {},
        create: {
          month: nextMonth,
          year: nextYear,
          startDate: new Date(nextYear, nextMonth - 1, 1),
          endDate: new Date(nextYear, nextMonth, 0),
          isClosed: false,
        },
      })

      // Step 5: Copy budgets (skip if next period already has budgets)
      const nextBudgetCount = await tx.budget.count({
        where: { periodId: nextPeriod.id },
      })

      if (nextBudgetCount === 0) {
        const currentBudgets = await tx.budget.findMany({
          where: { periodId },
        })

        if (currentBudgets.length > 0) {
          await tx.budget.createMany({
            data: currentBudgets.map((b) => ({
              categoryId: b.categoryId,
              quincenalAmount: b.quincenalAmount,
              periodId: nextPeriod.id,
            })),
          })
        }
      }
    })

    revalidateHistoryPaths()
    return { success: true }
  } catch {
    return { error: { _form: ['Error de servidor'] } }
  }
}

/**
 * Reopens a closed period by deleting its MonthlySummary and unlocking it.
 * Does NOT delete the next period or its budgets.
 */
export async function reopenPeriod(periodId: string): Promise<ActionResult> {
  try {
    const period = await prisma.period.findUnique({
      where: { id: periodId },
    })

    if (!period) {
      return { error: { _form: ['Periodo no encontrado'] } }
    }

    if (!period.isClosed) {
      return { error: { _form: ['Este periodo no esta cerrado'] } }
    }

    await prisma.monthlySummary.delete({
      where: { periodId },
    })

    await prisma.period.update({
      where: { id: periodId },
      data: { isClosed: false, closedAt: null },
    })

    revalidateHistoryPaths()
    return { success: true }
  } catch {
    return { error: { _form: ['Error de servidor'] } }
  }
}

/**
 * Thin Server Action wrapper for getClosePeriodPreview.
 * Allows Client Components to invoke the preview as a Server Action.
 */
export async function getClosePeriodPreviewAction(
  periodId: string,
): Promise<ClosePeriodPreview> {
  return getClosePeriodPreview(periodId)
}
