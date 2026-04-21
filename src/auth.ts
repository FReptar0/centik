// D-21 side-effect import — forces src/lib/env.ts validation at module load.
import '@/lib/env'
import NextAuth from 'next-auth'
import type { User, Session } from 'next-auth'
import type { AdapterUser } from 'next-auth/adapters'
import type { JWT } from 'next-auth/jwt'
import Credentials from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'
import { verifyChallenge } from '@/lib/challenge'
import { decryptSecret } from '@/lib/totp-crypto'
import { verifyTotp } from '@/lib/totp'
import { consumeBackupCode } from '@/lib/backup-codes'

/** User shape selected from DB inside authorizeUser. */
type AuthUserRow = {
  id: string
  email: string
  name: string | null
  hashedPassword: string | null
  isApproved: boolean
  isAdmin: boolean
  totpSecret: string | null
  totpEnabled: boolean
}

/**
 * Phase 29 D-18 — verifies the submitted second factor for a 2FA-enabled user.
 * Auto-detects shape: 6 digits => TOTP, 8 hex (optionally dashed) => backup code.
 * Returns true on a valid code (backup codes are atomically consumed inside consumeBackupCode).
 */
async function verifyTwoFactor(user: AuthUserRow, rawCode: string): Promise<boolean> {
  if (!user.totpSecret) return false // defensive: totpEnabled with no secret = corrupt state
  const normalized = rawCode.replace(/-/g, '').trim().toLowerCase()
  if (/^\d{6}$/.test(rawCode)) {
    const secret = decryptSecret(user.totpSecret)
    return verifyTotp(secret, rawCode)
  }
  if (/^[0-9a-f]{8}$/.test(normalized)) {
    return consumeBackupCode(user.id, normalized)
  }
  return false
}

/** Authorize callback -- exported for testability */
export async function authorizeUser(
  credentials: Partial<Record<'email' | 'password' | 'totpCode' | 'challenge', unknown>>,
) {
  const email = credentials?.email
  const password = credentials?.password
  if (typeof email !== 'string' || typeof password !== 'string') return null
  if (!email) return null

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      hashedPassword: true,
      isApproved: true,
      isAdmin: true,
      totpSecret: true,
      totpEnabled: true,
    },
  })

  if (!user || !user.hashedPassword) return null
  if (!user.isApproved) return null

  // Phase 29 D-14/D-16 — step-2 branch: challenge + totpCode present means
  // loginAction already verified the password in step 1 and issued a signed
  // challenge (HMAC-SHA256, 5-min TTL). The challenge is proof of step-1
  // success and authorizes this step-2 credential check. Password is not
  // re-verified here — the client discarded it after step 1.
  const rawTotpCode = credentials?.totpCode
  const rawChallenge = credentials?.challenge
  const hasTwoFactorPayload =
    typeof rawTotpCode === 'string' &&
    rawTotpCode.length > 0 &&
    typeof rawChallenge === 'string' &&
    rawChallenge.length > 0

  if (hasTwoFactorPayload) {
    const payload = verifyChallenge(rawChallenge)
    if (!payload) return null
    if (payload.userId !== user.id || payload.email !== user.email) return null
    if (!user.totpEnabled) return null
    const codeValid = await verifyTwoFactor(user, rawTotpCode)
    if (!codeValid) return null
    return { id: user.id, email: user.email, name: user.name, isAdmin: user.isAdmin }
  }

  // Step-1 / 1FA path: verify password
  if (!password) return null
  const isValid = await bcrypt.compare(password, user.hashedPassword)
  if (!isValid) return null
  // 2FA user reached the 1FA path without a challenge — refuse. loginAction
  // must branch to requiresTotp; this is defense-in-depth (T-29-AUTH-001).
  if (user.totpEnabled) return null
  return { id: user.id, email: user.email, name: user.name, isAdmin: user.isAdmin }
}

/** JWT callback -- exported for testability */
export async function jwtCallback({ token, user }: { token: JWT; user?: User | AdapterUser }) {
  if (user) {
    token.userId = user.id
    token.isAdmin = (user as User).isAdmin ?? false
  }
  return token
}

/** Session callback -- exported for testability */
export async function sessionCallback({ session, token }: { session: Session; token: JWT }) {
  if (token.userId) {
    session.user.id = token.userId as string
  }
  if (typeof token.isAdmin === 'boolean') {
    session.user.isAdmin = token.isAdmin
  } else {
    session.user.isAdmin = false
  }
  return session
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  pages: {
    signIn: '/login',
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        totpCode: { label: 'TOTP Code', type: 'text' },
        challenge: { label: 'Challenge', type: 'text' },
      },
      authorize: authorizeUser,
    }),
  ],
  callbacks: {
    jwt: jwtCallback,
    session: sessionCallback,
  },
  trustHost: true,
})
