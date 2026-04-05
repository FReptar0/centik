import prisma from '@/lib/prisma'
import ConfiguracionClientWrapper from './ConfiguracionClientWrapper'

export default async function ConfiguracionPage() {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  })

  return <ConfiguracionClientWrapper categories={categories} />
}
