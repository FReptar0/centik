import { randomBytes } from 'node:crypto'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'

const BACKUP_CODE_BYTES = 4 // 4 bytes = 8 hex chars = 32 bits entropy per code (D-10)
const BACKUP_CODE_COUNT = 10 // 10 codes per setup (D-10)
const BCRYPT_COST = 12 // cost factor 12 consistent with passwords (D-11)
const CODE_SHAPE = /^[0-9a-f]{8}$/

/** Normaliza un codigo: quita guiones y pasa a minusculas. D-10 */
function normalize(code: string): string {
  return code.replace(/-/g, '').toLowerCase()
}

/** Genera N codigos de respaldo (raw, 8 hex). Por default N=10. D-10, TOTP-04 */
export function generateBackupCodes(n: number = BACKUP_CODE_COUNT): string[] {
  return Array.from({ length: n }, () => randomBytes(BACKUP_CODE_BYTES).toString('hex'))
}

/** Formatea un codigo raw para display: ab12cd34 -> AB12-CD34. D-12 */
export function formatForDisplay(raw: string): string {
  const u = raw.toUpperCase()
  return `${u.slice(0, 4)}-${u.slice(4, 8)}`
}

/** Hashea un arreglo de codigos con bcrypt cost 12. Normaliza antes de hashear. D-11 */
export async function hashBackupCodes(codes: string[]): Promise<string[]> {
  return Promise.all(codes.map((c) => bcrypt.hash(normalize(c), BCRYPT_COST)))
}

/** Consume un codigo de respaldo atomicamente (single-use, scoped por userId). D-11, TOTP-04 */
export async function consumeBackupCode(userId: string, code: string): Promise<boolean> {
  const normalized = normalize(code)
  // Shape-check: rechaza sin tocar DB si no es 8-hex
  if (!CODE_SHAPE.test(normalized)) return false

  const candidates = await prisma.backupCode.findMany({
    where: { userId, usedAt: null },
    select: { id: true, codeHash: true },
  })

  for (const c of candidates) {
    if (await bcrypt.compare(normalized, c.codeHash)) {
      // Atomic claim: solo tiene exito si usedAt sigue null (Postgres READ COMMITTED re-evalua WHERE bajo lock de fila)
      const { count } = await prisma.backupCode.updateMany({
        where: { id: c.id, usedAt: null },
        data: { usedAt: new Date() },
      })
      return count === 1
    }
  }
  return false
}
