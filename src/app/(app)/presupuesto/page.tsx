import prisma from '@/lib/prisma'
import { serializeBigInts } from '@/lib/serialize'
import { getCurrentPeriod } from '@/lib/period'
import { getDefaultUserId } from '@/lib/auth-utils'
import { calculateIncomeSummary } from '@/lib/income'
import { getBudgetsWithSpent, copyBudgetsFromPreviousPeriod } from '@/lib/budget'
import PresupuestoClientWrapper from './PresupuestoClientWrapper'
import type { SerializedIncomeSource } from '@/types'

interface PageProps {
  searchParams: Promise<{ month?: string; year?: string }>
}

export default async function PresupuestoPage({ searchParams }: PageProps) {
  const params = await searchParams
  const month = params.month ? Number(params.month) : undefined
  const year = params.year ? Number(params.year) : undefined

  const userId = await getDefaultUserId()

  // Resolve period: URL params or current
  let period
  if (month && year) {
    period = await prisma.period.findFirst({
      where: { month, year, userId },
    })
  }

  if (!period) {
    period = await getCurrentPeriod(userId)
  }

  // Fetch budgets with spending data
  let budgets = await getBudgetsWithSpent(period.id, userId)

  // Auto-copy: if no budgets and period is open, copy from previous
  if (budgets.length === 0 && !period.isClosed) {
    const copied = await copyBudgetsFromPreviousPeriod(period.id, period.month, period.year, userId)
    if (copied) {
      budgets = await getBudgetsWithSpent(period.id, userId)
    }
  }

  // Fetch income for summary row
  const incomeSources = await prisma.incomeSource.findMany({
    where: { isActive: true, userId },
  })
  const serializedSources = serializeBigInts(incomeSources) as unknown as SerializedIncomeSource[]
  const incomeSummary = calculateIncomeSummary(serializedSources)

  return (
    <PresupuestoClientWrapper
      budgets={budgets}
      quincenalIncome={incomeSummary.quincenal}
      periodId={period.id}
      isClosed={period.isClosed}
    />
  )
}
