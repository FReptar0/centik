import { connection } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import ConfiguracionClientWrapper from './ConfiguracionClientWrapper'

export default async function ConfiguracionPage() {
  await connection()
  const session = await auth()
  // proxy.ts guarantees session exists for (app) routes
  const userId = session!.user!.id
  const categories = await prisma.category.findMany({
    where: { isActive: true, userId },
    orderBy: { sortOrder: 'asc' },
  })

  return <ConfiguracionClientWrapper categories={categories} />
}
