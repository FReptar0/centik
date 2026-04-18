import prisma from '@/lib/prisma'
import { getMonthlySummariesForYear, getAvailableYears } from '@/lib/history'
import { getCurrentPeriod } from '@/lib/period'
import { getDefaultUserId } from '@/lib/auth-utils'
import HistorialClientWrapper from '@/components/history/HistorialClientWrapper'

interface PageProps {
  searchParams: Promise<{ year?: string }>
}

export default async function HistorialPage({ searchParams }: PageProps) {
  const params = await searchParams

  const now = new Date()
  const defaultYear = now.getFullYear()
  const year = params.year ? Number(params.year) : defaultYear
  const userId = await getDefaultUserId()

  const [data, availableYears, periodsForYear, currentPeriod] =
    await Promise.all([
      getMonthlySummariesForYear(year, userId),
      getAvailableYears(userId),
      prisma.period.findMany({
        where: { year, userId },
        select: { id: true, month: true, year: true, isClosed: true },
      }),
      getCurrentPeriod(userId),
    ])

  // Ensure current year is in available years
  const allYears = Array.from(new Set([...availableYears, defaultYear])).sort()

  // Determine current period ID if it falls in the displayed year
  const currentPeriodId =
    currentPeriod.year === year ? currentPeriod.id : null

  return (
    <HistorialClientWrapper
      initialYear={year}
      availableYears={allYears}
      data={data}
      periods={periodsForYear}
      currentPeriodId={currentPeriodId}
    />
  )
}
