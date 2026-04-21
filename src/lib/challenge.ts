import { createHmac, timingSafeEqual } from 'node:crypto'
import { env } from './env'

const CHALLENGE_TTL_MS = 5 * 60 * 1000 // 5 minutos per D-16

/** AUTH_SECRET validated at boot by src/lib/env.ts — env.AUTH_SECRET is guaranteed >=32 chars. */
function getSecret(): Buffer {
  return Buffer.from(env.AUTH_SECRET, 'utf8')
}

/** Payload firmado: base64url(payloadJson).base64url(hmac). D-16, TOTP-03 */
export function signChallenge(userId: string, email: string): string {
  const payload = { userId, email, exp: Date.now() + CHALLENGE_TTL_MS }
  const payloadB64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
  const sig = createHmac('sha256', getSecret()).update(payloadB64).digest('base64url')
  return `${payloadB64}.${sig}`
}

/** Devuelve { userId, email } si el token es valido y vigente, null en cualquier otro caso. TOTP-03 */
export function verifyChallenge(token: string): { userId: string; email: string } | null {
  if (typeof token !== 'string') return null
  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [payloadB64, sig] = parts
  if (!payloadB64 || !sig) return null

  const expected = createHmac('sha256', getSecret()).update(payloadB64).digest('base64url')
  const a = Buffer.from(sig, 'utf8')
  const b = Buffer.from(expected, 'utf8')
  // timingSafeEqual requires equal-length buffers — pre-check avoids throw (Pitfall 4)
  if (a.length !== b.length) return null
  if (!timingSafeEqual(a, b)) return null

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'))
    if (typeof payload.exp !== 'number' || payload.exp < Date.now()) return null
    if (typeof payload.userId !== 'string' || typeof payload.email !== 'string') return null
    return { userId: payload.userId, email: payload.email }
  } catch {
    return null
  }
}
