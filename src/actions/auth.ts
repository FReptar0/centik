'use server'

import bcrypt from 'bcryptjs'
import { signIn, signOut } from '@/auth'
import { AuthError } from 'next-auth'
import prisma from '@/lib/prisma'
import { loginPasswordSchema, verifyTotpSchema, registerSchema } from '@/lib/validators'
import { signChallenge, verifyChallenge } from '@/lib/challenge'
import { checkRateLimit, loginLimiter, totpLimiter, getClientIp } from '@/lib/rate-limit'

/**
 * Phase 29 D-15 — loginAction is split into two stages.
 * Stage 1 (this function): validates email+password, enforces rate limit, and
 *   - if the user has totpEnabled=false, signs them in immediately (existing flow)
 *   - if totpEnabled=true, returns { requiresTotp, challenge, callbackUrl } and does NOT sign in
 * Stage 2 is verifyTotpAction, below.
 */
type LoginResult =
  | undefined
  | { error?: string }
  | { requiresTotp: true; challenge: string; callbackUrl: string }

export async function loginAction(
  _prevState: LoginResult,
  formData: FormData,
): Promise<LoginResult> {
  const parsed = loginPasswordSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) {
    // Zod failure BEFORE rate-limit — do not burn a slot on malformed input
    return { error: 'Credenciales invalidas' }
  }

  // Rate-limit keyed on email:ip (D-25). Dev/test short-circuits inside checkRateLimit.
  const ip = await getClientIp()
  const rl = await checkRateLimit(loginLimiter, `${parsed.data.email}:${ip}`)
  if (!rl.success) return { error: 'Credenciales invalidas' } // no oracle

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: {
      id: true,
      email: true,
      hashedPassword: true,
      isApproved: true,
      totpEnabled: true,
    },
  })
  if (!user?.hashedPassword || !user.isApproved) {
    return { error: 'Credenciales invalidas' }
  }
  const passwordOk = await bcrypt.compare(parsed.data.password, user.hashedPassword)
  if (!passwordOk) return { error: 'Credenciales invalidas' }

  const callbackUrl = (formData.get('callbackUrl') as string) || '/'

  // 1FA user — signIn throws NEXT_REDIRECT on success (must NOT be swallowed — Pitfall 1)
  if (!user.totpEnabled) {
    try {
      await signIn('credentials', {
        email: parsed.data.email,
        password: parsed.data.password,
        redirectTo: callbackUrl,
      })
      return {}
    } catch (error) {
      if (error instanceof AuthError) return { error: 'Credenciales invalidas' }
      throw error // CRITICAL: re-throw NEXT_REDIRECT
    }
  }

  // 2FA user — emit signed challenge, let client swap to TotpStep
  return {
    requiresTotp: true,
    challenge: signChallenge(user.id, user.email),
    callbackUrl,
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: '/login' })
}

/**
 * Phase 29 D-15/D-18 — Stage 2 of two-step login.
 * Validates challenge + code, enforces userId:ip rate limit (userId derived
 * from verified challenge, NEVER from form data — Pitfall 7 IDOR), and calls
 * signIn('credentials', { email, challenge, totpCode, password: '', redirectTo })
 * so authorizeUser finalizes the session in its 2FA branch.
 *
 * All failure paths collapse to a single generic Spanish string — no oracle.
 */
type VerifyTotpResult = { error?: string } | undefined

export async function verifyTotpAction(
  _prevState: VerifyTotpResult,
  formData: FormData,
): Promise<VerifyTotpResult> {
  const parsed = verifyTotpSchema.safeParse({
    challenge: formData.get('challenge'),
    code: formData.get('code'),
  })
  if (!parsed.success) return { error: 'Codigo invalido' }

  const payload = verifyChallenge(parsed.data.challenge)
  // verifyChallenge returns null on signature failure OR expiry — same response either way (no oracle)
  if (!payload) return { error: 'Codigo invalido' }

  // Rate-limit keyed on userId:ip — userId from the verified challenge payload, not the form.
  const ip = await getClientIp()
  const rl = await checkRateLimit(totpLimiter, `${payload.userId}:${ip}`)
  if (!rl.success) return { error: 'Codigo invalido' }

  const callbackUrl = (formData.get('callbackUrl') as string) || '/'

  try {
    await signIn('credentials', {
      email: payload.email,
      challenge: parsed.data.challenge,
      totpCode: parsed.data.code,
      password: '', // authorizeUser branches on challenge+totpCode presence before password check
      redirectTo: callbackUrl,
    })
    return undefined
  } catch (error) {
    if (error instanceof AuthError) return { error: 'Codigo invalido' }
    throw error // CRITICAL: re-throw NEXT_REDIRECT (Pitfall 1)
  }
}

type RegisterResult = { error?: Record<string, string[]> } | undefined

/**
 * Creates a new user account from a valid InviteToken.
 * Per D-17: atomic create User + mark InviteToken.usedAt + signIn auto-login + redirect to /.
 * Per D-10: rejects email mismatch between form and token (defense in depth -- server-side check).
 * Per RESEARCH Pitfall #1 + Pitfall #2: catches AuthError; re-throws NEXT_REDIRECT;
 * re-checks token inside transaction to defeat TOCTOU.
 */
export async function registerAction(
  _prevState: RegisterResult,
  formData: FormData,
): Promise<RegisterResult> {
  const parsed = registerSchema.safeParse({
    token: formData.get('token'),
    email: formData.get('email'),
    name: formData.get('name'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  })

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  // Hash BEFORE the transaction (bcrypt is slow; do not hold a DB transaction open during it)
  const hashedPassword = await bcrypt.hash(parsed.data.password, 12)

  try {
    await prisma.$transaction(async (tx) => {
      const token = await tx.inviteToken.findUnique({
        where: { token: parsed.data.token },
      })
      if (!token) throw new Error('INVITE_INVALID')
      if (token.revokedAt) throw new Error('INVITE_REVOKED')
      if (token.usedAt) throw new Error('INVITE_USED')
      if (token.expiresAt.getTime() < Date.now()) throw new Error('INVITE_EXPIRED')
      if (token.email !== parsed.data.email) throw new Error('INVITE_EMAIL_MISMATCH')

      await tx.user.create({
        data: {
          email: parsed.data.email,
          name: parsed.data.name,
          hashedPassword,
          isApproved: true,
          isAdmin: false,
          totpEnabled: false,
        },
      })

      await tx.inviteToken.update({
        where: { id: token.id },
        data: { usedAt: new Date() },
      })
    })
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('INVITE_')) {
      return { error: { _form: ['Este enlace de invitacion ya no es valido'] } }
    }
    // P2002 on User.email unique = race with another concurrent registration
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    ) {
      return { error: { email: ['Ya existe una cuenta con este correo'] } }
    }
    return { error: { _form: ['No pudimos crear tu cuenta. Intenta de nuevo.'] } }
  }

  // Auto-login after successful registration. signIn throws NEXT_REDIRECT on success -- DO NOT swallow.
  try {
    await signIn('credentials', {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: '/',
    })
    return undefined
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: { _form: ['No pudimos iniciar sesion automaticamente'] } }
    }
    throw error // CRITICAL: re-throw NEXT_REDIRECT so Next.js performs the redirect
  }
}
