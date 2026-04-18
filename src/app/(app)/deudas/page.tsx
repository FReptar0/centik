import { connection } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { serializeBigInts } from '@/lib/serialize'
import { calculateIncomeSummary } from '@/lib/income'
import DeudasClientWrapper from './DeudasClientWrapper'
import type { SerializedDebt, SerializedIncomeSource } from '@/types'

export default async function DeudasPage() {
  await connection()
  const session = await auth()
  // proxy.ts guarantees session exists for (app) routes
  const userId = session!.user!.id
  const [debts, incomeSources] = await Promise.all([
    prisma.debt.findMany({
      where: { isActive: true, userId },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.incomeSource.findMany({
      where: { isActive: true, userId },
    }),
  ])

  const serializedDebts = serializeBigInts(debts) as unknown as SerializedDebt[]
  const serializedSources = serializeBigInts(incomeSources) as unknown as SerializedIncomeSource[]
  const incomeSummary = calculateIncomeSummary(serializedSources)

  return <DeudasClientWrapper debts={serializedDebts} monthlyIncome={incomeSummary.monthly} />
}
