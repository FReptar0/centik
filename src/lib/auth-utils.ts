import prisma from '@/lib/prisma'

/**
 * Temporary helper to get the default (admin) user ID.
 * Used by pages and server actions until Phase 27 implements
 * requireAuth() with real session-based user resolution.
 *
 * TODO(Phase-27): Replace all getDefaultUserId() calls with requireAuth()
 */
export async function getDefaultUserId(): Promise<string> {
  const user = await prisma.user.findFirst({
    where: { isApproved: true },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  })

  if (!user) {
    throw new Error('No approved user found. Run prisma db seed first.')
  }

  return user.id
}
