import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { headers } from 'next/headers'

/** True cuando se debe bypass (dev/test o flag explicito). D-26 */
function isBypassed(): boolean {
  return process.env.NODE_ENV !== 'production' || process.env.RATE_LIMIT_DISABLED === 'true'
}

/** Construye un Ratelimit nuevo con ventana deslizante 5/60s. Solo se llama en produccion. D-24, D-25 */
function buildLimiter(): Ratelimit {
  return new Ratelimit({
    redis: Redis.fromEnv(), // UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
    limiter: Ratelimit.slidingWindow(5, '60 s'), // D-25 — 5 intentos por 60s
    analytics: false,
    prefix: '@centik/ratelimit',
  })
}

/** Limitador para loginAction (keyed por email:ip). null en dev/test. */
export const loginLimiter: Ratelimit | null = isBypassed() ? null : buildLimiter()

/** Limitador para verifyTotpAction (keyed por userId:ip). null en dev/test. */
export const totpLimiter: Ratelimit | null = isBypassed() ? null : buildLimiter()

/** Resultado uniforme: o success o razon. */
export type LimitResult = { success: true } | { success: false; retryAfterMs: number }

/** Chequea el rate limit contra el limitador dado. Bypass-aware. D-26, TOTP-05 */
export async function checkRateLimit(limiter: Ratelimit | null, key: string): Promise<LimitResult> {
  if (!limiter) return { success: true } // bypass en dev/test
  const res = await limiter.limit(key)
  if (res.success) return { success: true }
  return { success: false, retryAfterMs: Math.max(0, res.reset - Date.now()) }
}

/** Extrae el IP del cliente: primer hop de x-forwarded-for, luego x-real-ip, luego 127.0.0.1. D-27 */
export async function getClientIp(): Promise<string> {
  const h = await headers()
  const fwd = h.get('x-forwarded-for')
  if (fwd) {
    const first = fwd.split(',')[0]?.trim()
    if (first) return first
  }
  return h.get('x-real-ip') ?? '127.0.0.1'
}
