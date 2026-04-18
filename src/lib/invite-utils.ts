import { randomBytes } from 'node:crypto'

/** 7 days in milliseconds — invite expiration window per D-09 */
export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000

/** Generates a 64-character hex token using crypto.randomBytes(32). Per INVITE-02. */
export function generateInviteToken(): string {
  return randomBytes(32).toString('hex')
}

export type InviteStatus = 'pending' | 'used' | 'expired' | 'revoked'

/** Derives token status from its DB row. Order matters: revoked > used > expired > pending. */
export function computeInviteStatus(
  token: {
    usedAt: Date | null
    revokedAt: Date | null
    expiresAt: Date
  },
  now: Date = new Date(),
): InviteStatus {
  if (token.revokedAt) return 'revoked'
  if (token.usedAt) return 'used'
  if (token.expiresAt.getTime() < now.getTime()) return 'expired'
  return 'pending'
}

/** Builds the public registration URL for a token. */
export function buildInviteUrl(origin: string, token: string): string {
  const trimmedOrigin = origin.endsWith('/') ? origin.slice(0, -1) : origin
  return `${trimmedOrigin}/register?token=${token}`
}

/** Formats a Date for the admin UI in es-MX. Variant 'datetime' = "DD MMM YYYY, HH:mm"; 'date' = "DD MMM YYYY". */
export function formatInviteDate(date: Date, variant: 'date' | 'datetime' = 'date'): string {
  const dateOptions: Intl.DateTimeFormatOptions =
    variant === 'datetime'
      ? {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }
      : { day: '2-digit', month: 'short', year: 'numeric' }
  return new Intl.DateTimeFormat('es-MX', dateOptions).format(date)
}
