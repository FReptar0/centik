import { connection } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import ConfiguracionClientWrapper from './ConfiguracionClientWrapper'

export default async function ConfiguracionPage() {
  await connection()
  const session = await auth()
  // proxy.ts guarantees session exists for (app) routes
  const userId = session!.user!.id
  const isAdmin = session!.user!.isAdmin === true

  const [categories, inviteTokens, userMeta] = await Promise.all([
    prisma.category.findMany({
      where: { isActive: true, userId },
      orderBy: { sortOrder: 'asc' },
    }),
    isAdmin
      ? prisma.inviteToken.findMany({
          where: { createdBy: userId },
          orderBy: { createdAt: 'desc' },
          take: 20,
        })
      : Promise.resolve([]),
    prisma.user.findUnique({
      where: { id: userId },
      select: { totpEnabled: true },
    }),
  ])
  const totpEnabled = userMeta?.totpEnabled ?? false

  const h = await headers()
  const origin = `${h.get('x-forwarded-proto') ?? 'http'}://${h.get('host') ?? 'localhost:3000'}`

  return (
    <ConfiguracionClientWrapper
      categories={categories}
      inviteTokens={inviteTokens}
      isAdmin={isAdmin}
      origin={origin}
      totpEnabled={totpEnabled}
    />
  )
}
