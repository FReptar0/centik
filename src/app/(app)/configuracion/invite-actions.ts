'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { createInviteSchema } from '@/lib/validators'
import { requireAuth } from '@/lib/auth-utils'
import { generateInviteToken, INVITE_TTL_MS } from '@/lib/invite-utils'

type ActionResult = { success: true } | { error: Record<string, string[]> }
type CreateInviteResult = { success: true; token: string } | { error: Record<string, string[]> }

/** Detect Prisma error codes from both real errors and test mocks */
function getPrismaErrorCode(error: unknown): string | null {
  if (error && typeof error === 'object' && 'code' in error) {
    return (error as { code: string }).code
  }
  return null
}

/** Double-gate: requireAuth() then DB-backed admin check. Returns null on non-admin. */
async function requireAdmin(): Promise<{ userId: string } | null> {
  const { userId } = await requireAuth()
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true },
  })
  if (!user?.isAdmin) return null
  return { userId }
}

/**
 * Generates a 7-day-valid invite token for the given email (per D-08, D-09, D-10).
 * Rejects: non-admin callers, emails that already have a User, emails with an
 * existing pending+non-expired token. Returns the raw token string on success
 * so the UI can render it once in the GeneratedUrlPanel (per D-04, RESEARCH Open Q4).
 */
export async function createInviteToken(formData: FormData): Promise<CreateInviteResult> {
  const parsed = createInviteSchema.safeParse({ email: formData.get('email') })
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  const admin = await requireAdmin()
  if (!admin) return { error: { _form: ['No autorizado'] } }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email: parsed.data.email },
      select: { id: true },
    })
    if (existingUser) {
      return { error: { email: ['Este usuario ya tiene una cuenta'] } }
    }

    const existingToken = await prisma.inviteToken.findFirst({
      where: {
        email: parsed.data.email,
        usedAt: null,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: { id: true },
    })
    if (existingToken) {
      return { error: { email: ['Ya existe una invitacion activa para este correo'] } }
    }

    const token = generateInviteToken()
    const expiresAt = new Date(Date.now() + INVITE_TTL_MS)

    await prisma.inviteToken.create({
      data: { token, email: parsed.data.email, expiresAt, createdBy: admin.userId },
    })

    revalidatePath('/configuracion')
    return { success: true, token }
  } catch (error: unknown) {
    const code = getPrismaErrorCode(error)
    if (code === 'P2002') {
      return { error: { email: ['Ya existe una invitacion activa para este correo'] } }
    }
    return { error: { _form: ['No pudimos generar la invitacion'] } }
  }
}

/**
 * Revokes a pending invite by setting revokedAt to NOW (per D-05).
 * IDOR-scoped: only the createdBy admin can revoke their own tokens (forward-compatible
 * with multi-admin if added later — RESEARCH security section).
 */
export async function revokeInviteToken(tokenId: string): Promise<ActionResult> {
  const idSchema = z.string().cuid()
  const { success, data } = idSchema.safeParse(tokenId)
  if (!success) return { error: { _form: ['ID de invitacion invalido'] } }

  const admin = await requireAdmin()
  if (!admin) return { error: { _form: ['No autorizado'] } }

  try {
    const token = await prisma.inviteToken.findFirst({
      where: { id: data, createdBy: admin.userId },
      select: { id: true, usedAt: true, revokedAt: true },
    })
    if (!token) return { error: { _form: ['Invitacion no encontrada'] } }
    if (token.usedAt) return { error: { _form: ['No se puede revocar una invitacion ya usada'] } }
    if (token.revokedAt) return { error: { _form: ['Esta invitacion ya fue revocada'] } }

    await prisma.inviteToken.update({
      where: { id: data },
      data: { revokedAt: new Date() },
    })

    revalidatePath('/configuracion')
    return { success: true }
  } catch {
    return { error: { _form: ['No pudimos revocar la invitacion'] } }
  }
}

/**
 * Returns the 20 most recent tokens created by the calling admin.
 * Used by /configuracion/page.tsx for the recent-invites list.
 */
export async function listInviteTokens() {
  const admin = await requireAdmin()
  if (!admin) return []
  return prisma.inviteToken.findMany({
    where: { createdBy: admin.userId },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })
}
