import prisma from '@/lib/prisma'
import { serializeBigInts } from '@/lib/serialize'
import { calculateIncomeSummary } from '@/lib/income'
import DeudasClientWrapper from './DeudasClientWrapper'
import type { SerializedDebt, SerializedIncomeSource } from '@/types'

export default async function DeudasPage() {
  const [debts, incomeSources] = await Promise.all([
    prisma.debt.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.incomeSource.findMany({
      where: { isActive: true },
    }),
  ])

  const serializedDebts = serializeBigInts(debts) as unknown as SerializedDebt[]
  const serializedSources = serializeBigInts(incomeSources) as unknown as SerializedIncomeSource[]
  const incomeSummary = calculateIncomeSummary(serializedSources)

  return <DeudasClientWrapper debts={serializedDebts} monthlyIncome={incomeSummary.monthly} />
}
