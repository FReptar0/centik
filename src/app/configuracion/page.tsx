import prisma from '@/lib/prisma'
import { getDefaultUserId } from '@/lib/auth-utils'
import ConfiguracionClientWrapper from './ConfiguracionClientWrapper'

export default async function ConfiguracionPage() {
  const userId = await getDefaultUserId()
  const categories = await prisma.category.findMany({
    where: { isActive: true, userId },
    orderBy: { sortOrder: 'asc' },
  })

  return <ConfiguracionClientWrapper categories={categories} />
}
