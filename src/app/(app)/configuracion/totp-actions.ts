'use server'

import { revalidatePath } from 'next/cache'
import QRCode from 'qrcode'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-utils'
import { enableTotpSchema, disableTotpSchema } from '@/lib/validators'
import { createTotpSecret, buildOtpauthUri, verifyTotp } from '@/lib/totp'
import { encryptSecret, decryptSecret } from '@/lib/totp-crypto'
import { generateBackupCodes, formatForDisplay, consumeBackupCode } from '@/lib/backup-codes'

type PrepareResult = { secret: string; qrDataUrl: string } | { error: string }

type EnableResult =
  | { success: true; backupCodes: string[] }
  | { error: Record<string, string[]> }

type SimpleFormResult = { success: true } | { error: Record<string, string[]> }

type RegenResult =
  | { success: true; backupCodes: string[] }
  | { error: Record<string, string[]> }

const BCRYPT_COST = 12

/**
 * Step 1 of 2FA setup (Phase 29 D-20 step 1).
 * Generates a fresh TOTP secret + QR data URL. NO DB writes (Open Q5).
 * Secret is held in client memory until step 2 submits it back with the first
 * verification code.
 */
export async function prepareTotpSecretAction(): Promise<PrepareResult> {
  const { userId } = await requireAuth()
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    })
    if (!user) return { error: 'No autorizado' }

    const secret = createTotpSecret()
    const uri = buildOtpauthUri(secret, user.email)
    const qrDataUrl = await QRCode.toDataURL(uri, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 240,
    })
    return { secret, qrDataUrl }
  } catch {
    return { error: 'No pudimos preparar 2FA. Intenta de nuevo.' }
  }
}

/**
 * Step 2 of 2FA setup (Phase 29 D-20 step 2, RESEARCH Pattern 9).
 * Verifies the code against the proposed secret, hashes 10 backup codes, and
 * atomically: encrypts+persists secret, flips totpEnabled, creates BackupCode rows.
 *
 * Hash BEFORE $transaction — bcrypt cost-12 x 10 is slow and would pin a DB
 * connection (Phase 28 P03 rule, RESEARCH Pitfall 9).
 * Returns plaintext backup codes ONCE — client step 3 displays them (D-12).
 */
export async function enableTotpAction(
  _prev: EnableResult | undefined,
  formData: FormData,
): Promise<EnableResult> {
  const { userId } = await requireAuth()

  const parsed = enableTotpSchema.safeParse({
    secret: formData.get('secret'),
    code: formData.get('code'),
  })
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  if (!(await verifyTotp(parsed.data.secret, parsed.data.code))) {
    return { error: { code: ['Codigo invalido'] } }
  }

  // Hash BEFORE opening the transaction (Phase 28 P03)
  const plainCodes = generateBackupCodes(10)
  const hashes = await Promise.all(
    plainCodes.map((c) => bcrypt.hash(c.toLowerCase(), BCRYPT_COST)),
  )
  const encryptedSecret = encryptSecret(parsed.data.secret)

  try {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { totpSecret: encryptedSecret, totpEnabled: true },
      }),
      prisma.backupCode.deleteMany({ where: { userId } }),
      prisma.backupCode.createMany({
        data: hashes.map((codeHash) => ({ userId, codeHash })),
      }),
    ])
  } catch {
    return { error: { _form: ['No pudimos activar 2FA. Intenta de nuevo.'] } }
  }

  revalidatePath('/configuracion')
  return {
    success: true,
    backupCodes: plainCodes.map(formatForDisplay),
  }
}

/**
 * Disable 2FA (Phase 29 D-21). Requires a current TOTP code OR backup code.
 * Atomically clears totpSecret, flips totpEnabled=false, and deletes all BackupCode rows.
 * Cannot disable by password alone; must prove possession of the second factor.
 */
export async function disableTotpAction(
  _prev: SimpleFormResult | undefined,
  formData: FormData,
): Promise<SimpleFormResult> {
  const { userId } = await requireAuth()

  const parsed = disableTotpSchema.safeParse({ code: formData.get('code') })
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  const ok = await verifyCurrentCode(userId, parsed.data.code)
  if (!ok) return { error: { _form: ['Codigo invalido'] } }

  try {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { totpSecret: null, totpEnabled: false },
      }),
      prisma.backupCode.deleteMany({ where: { userId } }),
    ])
  } catch {
    return { error: { _form: ['No pudimos desactivar 2FA. Intenta de nuevo.'] } }
  }

  revalidatePath('/configuracion')
  return { success: true }
}

/**
 * Regenerate backup codes (Phase 29 D-13, D-22). Requires a current TOTP or backup code.
 * Atomically deletes existing rows + inserts a fresh 10.
 */
export async function regenerateBackupCodesAction(
  _prev: RegenResult | undefined,
  formData: FormData,
): Promise<RegenResult> {
  const { userId } = await requireAuth()

  const parsed = disableTotpSchema.safeParse({ code: formData.get('code') })
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  const ok = await verifyCurrentCode(userId, parsed.data.code)
  if (!ok) return { error: { _form: ['Codigo invalido'] } }

  // Hash BEFORE opening the transaction (Phase 28 P03)
  const plainCodes = generateBackupCodes(10)
  const hashes = await Promise.all(
    plainCodes.map((c) => bcrypt.hash(c.toLowerCase(), BCRYPT_COST)),
  )

  try {
    await prisma.$transaction([
      prisma.backupCode.deleteMany({ where: { userId } }),
      prisma.backupCode.createMany({
        data: hashes.map((codeHash) => ({ userId, codeHash })),
      }),
    ])
  } catch {
    return { error: { _form: ['No pudimos regenerar los codigos. Intenta de nuevo.'] } }
  }

  revalidatePath('/configuracion')
  return { success: true, backupCodes: plainCodes.map(formatForDisplay) }
}

/**
 * Private helper — verifies `code` against the user's stored TOTP secret OR
 * a consumable backup code. Returns false (without leaking which branch failed)
 * when the user does not have 2FA enabled.
 */
async function verifyCurrentCode(userId: string, code: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { totpSecret: true, totpEnabled: true },
  })
  if (!user?.totpEnabled || !user.totpSecret) return false

  if (/^\d{6}$/.test(code)) {
    const secret = decryptSecret(user.totpSecret)
    return verifyTotp(secret, code)
  }
  const normalized = code.replace(/-/g, '').trim().toLowerCase()
  if (/^[0-9a-f]{8}$/.test(normalized)) {
    return consumeBackupCode(userId, normalized)
  }
  return false
}
