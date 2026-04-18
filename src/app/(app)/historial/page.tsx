import { connection } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { getMonthlySummariesForYear, getAvailableYears } from '@/lib/history'
import { getCurrentPeriod } from '@/lib/period'
import HistorialClientWrapper from '@/components/history/HistorialClientWrapper'

interface PageProps {
  searchParams: Promise<{ year?: string }>
}

export default async function HistorialPage({ searchParams }: PageProps) {
  await connection()
  const session = await auth()
  // proxy.ts guarantees session exists for (app) routes
  const userId = session!.user!.id
  const params = await searchParams

  const now = new Date()
  const defaultYear = now.getFullYear()
  const year = params.year ? Number(params.year) : defaultYear

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
