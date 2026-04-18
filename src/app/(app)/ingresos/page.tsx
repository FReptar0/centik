import prisma from '@/lib/prisma'
import { serializeBigInts } from '@/lib/serialize'
import { getDefaultUserId } from '@/lib/auth-utils'
import IngresosClientWrapper from './IngresosClientWrapper'
import type { SerializedIncomeSource } from '@/types'

export default async function IngresosPage() {
  const userId = await getDefaultUserId()
  const sources = await prisma.incomeSource.findMany({
    where: { isActive: true, userId },
    orderBy: { createdAt: 'asc' },
  })

  const serialized = serializeBigInts(sources) as unknown as SerializedIncomeSource[]

  return <IngresosClientWrapper sources={serialized} />
}
