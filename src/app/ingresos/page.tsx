import prisma from '@/lib/prisma'
import { serializeBigInts } from '@/lib/serialize'
import IngresosClientWrapper from './IngresosClientWrapper'
import type { SerializedIncomeSource } from '@/types'

export default async function IngresosPage() {
  const sources = await prisma.incomeSource.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' },
  })

  const serialized = serializeBigInts(sources) as unknown as SerializedIncomeSource[]

  return <IngresosClientWrapper sources={serialized} />
}
