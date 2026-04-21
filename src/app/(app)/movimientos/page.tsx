import { connection } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { serializeBigInts } from '@/lib/serialize'
import { getCurrentPeriod } from '@/lib/period'
import MovimientosClientWrapper from './MovimientosClientWrapper'
import type { SerializedIncomeSource, SerializedTransaction } from '@/types'
import type { TransactionType, PaymentMethod, Prisma } from '../../../../generated/prisma/client'

type TransactionWithCategory = SerializedTransaction & {
  category: { name: string; icon: string; color: string }
}

interface PageProps {
  searchParams: Promise<{
    month?: string
    year?: string
    type?: string
    categoryId?: string
    startDate?: string
    endDate?: string
    paymentMethod?: string
    limit?: string
  }>
}

export default async function MovimientosPage({ searchParams }: PageProps) {
  await connection()
  const session = await auth()
  // proxy.ts guarantees session exists for (app) routes
  const userId = session!.user!.id
  const params = await searchParams

  const month = params.month ? Number(params.month) : undefined
  const year = params.year ? Number(params.year) : undefined

  let period
  if (month && year) {
    period = await prisma.period.findFirst({
      where: { month, year, userId },
    })
    if (!period) {
      period = await getCurrentPeriod(userId)
    }
  } else {
    period = await getCurrentPeriod(userId)
  }

  const where: Prisma.TransactionWhereInput = {
    periodId: period.id,
    userId,
    ...(params.type && { type: params.type as TransactionType }),
    ...(params.categoryId && { categoryId: params.categoryId }),
    ...(params.paymentMethod && {
      paymentMethod: params.paymentMethod as PaymentMethod,
    }),
    ...(params.startDate || params.endDate
      ? {
          date: {
            ...(params.startDate && { gte: new Date(params.startDate) }),
            ...(params.endDate && { lte: new Date(params.endDate) }),
          },
        }
      : {}),
  }

  const limit = Math.min(Number(params.limit) || 25, 200)

  const [rawTransactions, totalCount, categories, rawSources] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: {
        category: { select: { name: true, icon: true, color: true } },
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      take: limit,
    }),
    prisma.transaction.count({ where }),
    prisma.category.findMany({
      where: { isActive: true, userId },
      orderBy: { sortOrder: 'asc' },
    }),
    prisma.incomeSource.findMany({
      where: { isActive: true, userId },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  const transactions = serializeBigInts(rawTransactions) as unknown as TransactionWithCategory[]
  const incomeSources = serializeBigInts(rawSources) as unknown as SerializedIncomeSource[]

  return (
    <MovimientosClientWrapper
      transactions={transactions}
      categories={categories}
      incomeSources={incomeSources}
      totalCount={totalCount}
      periodIsClosed={period.isClosed}
      periodId={period.id}
    />
  )
}
