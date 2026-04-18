import { connection } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { serializeBigInts } from '@/lib/serialize'
import IngresosClientWrapper from './IngresosClientWrapper'
import type { SerializedIncomeSource } from '@/types'

export default async function IngresosPage() {
  await connection()
  const session = await auth()
  // proxy.ts guarantees session exists for (app) routes
  const userId = session!.user!.id
  const sources = await prisma.incomeSource.findMany({
    where: { isActive: true, userId },
    orderBy: { createdAt: 'asc' },
  })

  const serialized = serializeBigInts(sources) as unknown as SerializedIncomeSource[]

  return <IngresosClientWrapper sources={serialized} />
}
