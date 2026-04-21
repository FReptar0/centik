import { describe, it, expect, vi, beforeEach } from 'vitest'
import bcrypt from 'bcryptjs'

// Mock next-auth to avoid next/server import chain
vi.mock('next-auth', () => ({
  AuthError: class AuthError extends Error {
    constructor(message?: string) {
      super(message)
      this.name = 'AuthError'
    }
  },
}))

// Mock @/auth
const mockSignIn = vi.fn()
vi.mock('@/auth', () => ({
  signIn: (...args: unknown[]) => mockSignIn(...args),
  signOut: vi.fn(),
}))

// Mock prisma
const mockUserCreate = vi.fn()
const mockUserFindUnique = vi.fn()
const mockTokenFindUnique = vi.fn()
const mockTokenUpdate = vi.fn()
const mockTransaction = vi.fn()

vi.mock('@/lib/prisma', () => ({
  default: {
    $transaction: (fn: (tx: unknown) => Promise<unknown>) => mockTransaction(fn),
    user: {
      create: (...args: unknown[]) => mockUserCreate(...args),
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
    },
    inviteToken: {
      findUnique: (...args: unknown[]) => mockTokenFindUnique(...args),
      update: (...args: unknown[]) => mockTokenUpdate(...args),
    },
  },
}))

// Mock bcryptjs — include compare so Phase 29 loginAction can assert bcrypt.compare behavior
vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed-password'),
    compare: vi.fn(),
  },
}))

// Phase 29 — mock rate-limit helpers (loginLimiter/totpLimiter are sentinels here)
const mockCheckRateLimit = vi.fn()
const mockGetClientIp = vi.fn()
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  loginLimiter: null,
  totpLimiter: null,
  getClientIp: (...args: unknown[]) => mockGetClientIp(...args),
}))

// Phase 29 — mock challenge helpers
const mockSignChallenge = vi.fn()
const mockVerifyChallenge = vi.fn()
vi.mock('@/lib/challenge', () => ({
  signChallenge: (...args: unknown[]) => mockSignChallenge(...args),
  verifyChallenge: (...args: unknown[]) => mockVerifyChallenge(...args),
}))

import { loginAction, registerAction, verifyTotpAction } from '@/actions/auth'

/** Helper to create FormData with given fields */
function createFormData(fields: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [key, value] of Object.entries(fields)) {
    fd.set(key, value)
  }
  return fd
}

describe('loginAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: rate-limit passes and IP is deterministic for 1FA tests that reach it
    mockGetClientIp.mockResolvedValue('1.2.3.4')
    mockCheckRateLimit.mockResolvedValue({ success: true })
    vi.mocked(bcrypt.compare).mockReset()
  })

  it('returns error for invalid email format', async () => {
    const fd = createFormData({ email: 'not-an-email', password: 'secret' })
    const result = await loginAction(undefined, fd)

    expect(result).toEqual({ error: 'Credenciales invalidas' })
    expect(mockSignIn).not.toHaveBeenCalled()
    // Zod failure happens BEFORE rate-limit burn
    expect(mockCheckRateLimit).not.toHaveBeenCalled()
  })

  it('returns error for empty password', async () => {
    const fd = createFormData({ email: 'test@example.com', password: '' })
    const result = await loginAction(undefined, fd)

    expect(result).toEqual({ error: 'Credenciales invalidas' })
    expect(mockSignIn).not.toHaveBeenCalled()
    expect(mockCheckRateLimit).not.toHaveBeenCalled()
  })

  it('returns error when AuthError is thrown (wrong password on 1FA signIn)', async () => {
    const { AuthError } = await import('next-auth')
    mockUserFindUnique.mockResolvedValue({
      id: 'u1',
      email: 'test@example.com',
      hashedPassword: 'h',
      isApproved: true,
      totpEnabled: false,
    })
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never)
    mockSignIn.mockRejectedValue(
      new (AuthError as new (msg?: string) => Error)('CredentialsSignin'),
    )

    const fd = createFormData({ email: 'test@example.com', password: 'wrong' })
    const result = await loginAction(undefined, fd)

    expect(result).toEqual({ error: 'Credenciales invalidas' })
  })

  it('re-throws non-AuthError exceptions (NEXT_REDIRECT on 1FA signIn)', async () => {
    mockUserFindUnique.mockResolvedValue({
      id: 'u1',
      email: 'test@example.com',
      hashedPassword: 'h',
      isApproved: true,
      totpEnabled: false,
    })
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never)
    const redirectError = new Error('NEXT_REDIRECT')
    mockSignIn.mockRejectedValue(redirectError)

    const fd = createFormData({ email: 'test@example.com', password: 'correct' })

    await expect(loginAction(undefined, fd)).rejects.toThrow('NEXT_REDIRECT')
  })

  it('calls signIn with correct params for valid 1FA data', async () => {
    mockUserFindUnique.mockResolvedValue({
      id: 'u1',
      email: 'test@example.com',
      hashedPassword: 'h',
      isApproved: true,
      totpEnabled: false,
    })
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never)
    mockSignIn.mockResolvedValue(undefined)

    const fd = createFormData({
      email: 'test@example.com',
      password: 'secret123',
      callbackUrl: '/movimientos',
    })
    await loginAction(undefined, fd)

    expect(mockSignIn).toHaveBeenCalledWith('credentials', {
      email: 'test@example.com',
      password: 'secret123',
      redirectTo: '/movimientos',
    })
  })
})

// ────────────────────────────────────────────────────────────────────────────
// Phase 29 — loginAction 2FA + rate limit branch (D-15, D-25)
// ────────────────────────────────────────────────────────────────────────────
describe('loginAction — Phase 29 2FA + rate limit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetClientIp.mockResolvedValue('9.9.9.9')
    mockCheckRateLimit.mockResolvedValue({ success: true })
    vi.mocked(bcrypt.compare).mockReset()
  })

  it('returns { requiresTotp, challenge, callbackUrl } for 2FA-enabled user with correct password', async () => {
    mockUserFindUnique.mockResolvedValue({
      id: 'user-1',
      email: 'a@b.co',
      hashedPassword: 'hash',
      isApproved: true,
      totpEnabled: true,
    })
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never)
    mockSignChallenge.mockReturnValue('fake-challenge-token')

    const fd = createFormData({
      email: 'a@b.co',
      password: 'correct',
      callbackUrl: '/dashboard',
    })
    const result = await loginAction(undefined, fd)

    expect(result).toEqual({
      requiresTotp: true,
      challenge: 'fake-challenge-token',
      callbackUrl: '/dashboard',
    })
    expect(mockSignIn).not.toHaveBeenCalled() // CRITICAL: no session issued in step 1
    expect(mockSignChallenge).toHaveBeenCalledWith('user-1', 'a@b.co')
  })

  it('defaults callbackUrl to / when not provided (2FA user)', async () => {
    mockUserFindUnique.mockResolvedValue({
      id: 'user-1',
      email: 'a@b.co',
      hashedPassword: 'hash',
      isApproved: true,
      totpEnabled: true,
    })
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never)
    mockSignChallenge.mockReturnValue('t')

    const fd = createFormData({ email: 'a@b.co', password: 'correct' })
    const result = await loginAction(undefined, fd)

    expect(result).toMatchObject({ requiresTotp: true, callbackUrl: '/' })
  })

  it('uses email:ip as the rate-limit key', async () => {
    mockGetClientIp.mockResolvedValue('9.9.9.9')
    mockUserFindUnique.mockResolvedValue(null) // we just want the rate-limit key asserted

    const fd = createFormData({ email: 'x@y.co', password: 'whatever' })
    await loginAction(undefined, fd)

    expect(mockCheckRateLimit).toHaveBeenCalledWith(null, 'x@y.co:9.9.9.9')
  })

  it('returns generic error on rate-limit rejection — no oracle (D-25)', async () => {
    mockCheckRateLimit.mockResolvedValue({ success: false, retryAfterMs: 5000 })

    const fd = createFormData({ email: 'a@b.co', password: 'anything' })
    const result = await loginAction(undefined, fd)

    expect(result).toEqual({ error: 'Credenciales invalidas' })
    expect(mockUserFindUnique).not.toHaveBeenCalled() // guard BEFORE DB
    expect(mockSignIn).not.toHaveBeenCalled()
  })

  it('returns generic error for unknown user (same string as wrong password)', async () => {
    mockUserFindUnique.mockResolvedValue(null)

    const fd = createFormData({ email: 'nobody@example.co', password: 'anything' })
    const result = await loginAction(undefined, fd)

    expect(result).toEqual({ error: 'Credenciales invalidas' })
    expect(vi.mocked(bcrypt.compare)).not.toHaveBeenCalled()
  })

  it('returns generic error for unapproved user (same string)', async () => {
    mockUserFindUnique.mockResolvedValue({
      id: 'u1',
      email: 'a@b.co',
      hashedPassword: 'h',
      isApproved: false,
      totpEnabled: false,
    })

    const fd = createFormData({ email: 'a@b.co', password: 'anything' })
    const result = await loginAction(undefined, fd)

    expect(result).toEqual({ error: 'Credenciales invalidas' })
  })

  it('returns generic error for wrong password (bcrypt.compare → false)', async () => {
    mockUserFindUnique.mockResolvedValue({
      id: 'u1',
      email: 'a@b.co',
      hashedPassword: 'h',
      isApproved: true,
      totpEnabled: false,
    })
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never)

    const fd = createFormData({ email: 'a@b.co', password: 'wrong' })
    const result = await loginAction(undefined, fd)

    expect(result).toEqual({ error: 'Credenciales invalidas' })
    expect(mockSignIn).not.toHaveBeenCalled()
  })
})

// ────────────────────────────────────────────────────────────────────────────
// Phase 29 — verifyTotpAction (T-29-AUTH-006, Pitfall 1, Pitfall 7)
// ────────────────────────────────────────────────────────────────────────────
describe('verifyTotpAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetClientIp.mockResolvedValue('1.1.1.1')
    mockCheckRateLimit.mockResolvedValue({ success: true })
  })

  it('returns generic error when challenge is missing/too short (Zod fail)', async () => {
    const fd = createFormData({ challenge: 'short', code: '123456' })
    const result = await verifyTotpAction(undefined, fd)

    expect(result).toEqual({ error: 'Codigo invalido' })
    expect(mockVerifyChallenge).not.toHaveBeenCalled()
    expect(mockCheckRateLimit).not.toHaveBeenCalled() // NO rate-limit burn on malformed payload
  })

  it('returns generic error when code is missing (Zod fail)', async () => {
    const fd = createFormData({ challenge: 'long-enough-challenge', code: '12' })
    const result = await verifyTotpAction(undefined, fd)

    expect(result).toEqual({ error: 'Codigo invalido' })
    expect(mockCheckRateLimit).not.toHaveBeenCalled()
  })

  it('returns generic error when challenge signature is invalid (no oracle)', async () => {
    mockVerifyChallenge.mockReturnValue(null)

    const fd = createFormData({ challenge: 'tampered.token.value', code: '123456' })
    const result = await verifyTotpAction(undefined, fd)

    expect(result).toEqual({ error: 'Codigo invalido' })
    expect(mockCheckRateLimit).not.toHaveBeenCalled() // can't derive userId => don't burn
  })

  it('returns generic error when rate-limit rejects (no oracle)', async () => {
    mockVerifyChallenge.mockReturnValue({ userId: 'user-1', email: 'a@b.co' })
    mockCheckRateLimit.mockResolvedValue({ success: false, retryAfterMs: 5000 })

    const fd = createFormData({ challenge: 'valid.token.here', code: '123456' })
    const result = await verifyTotpAction(undefined, fd)

    expect(result).toEqual({ error: 'Codigo invalido' })
    expect(mockSignIn).not.toHaveBeenCalled()
  })

  it('uses userId:ip as rate-limit key — userId from verified challenge (Pitfall 7 IDOR-safe)', async () => {
    mockVerifyChallenge.mockReturnValue({ userId: 'user-1', email: 'a@b.co' })
    mockGetClientIp.mockResolvedValue('1.1.1.1')
    // even if formData claims a different userId, rate-limit uses the verified one
    const fd = createFormData({
      challenge: 'valid.token.here',
      code: '123456',
      userId: 'ATTACKER-CONTROLLED',
    })
    mockSignIn.mockRejectedValue(new Error('NEXT_REDIRECT'))

    await expect(verifyTotpAction(undefined, fd)).rejects.toThrow('NEXT_REDIRECT')

    expect(mockCheckRateLimit).toHaveBeenCalledWith(null, 'user-1:1.1.1.1')
  })

  it('calls signIn with challenge, totpCode, email, empty password, and redirectTo', async () => {
    mockVerifyChallenge.mockReturnValue({ userId: 'user-1', email: 'a@b.co' })
    mockSignIn.mockRejectedValue(new Error('NEXT_REDIRECT'))

    const fd = createFormData({
      challenge: 'valid.token.here',
      code: '123456',
      callbackUrl: '/movimientos',
    })

    await expect(verifyTotpAction(undefined, fd)).rejects.toThrow('NEXT_REDIRECT')

    expect(mockSignIn).toHaveBeenCalledWith('credentials', {
      email: 'a@b.co',
      challenge: 'valid.token.here',
      totpCode: '123456',
      password: '',
      redirectTo: '/movimientos',
    })
  })

  it('defaults redirectTo to / when callbackUrl not provided', async () => {
    mockVerifyChallenge.mockReturnValue({ userId: 'user-1', email: 'a@b.co' })
    mockSignIn.mockRejectedValue(new Error('NEXT_REDIRECT'))

    const fd = createFormData({ challenge: 'valid.token.here', code: '123456' })

    await expect(verifyTotpAction(undefined, fd)).rejects.toThrow('NEXT_REDIRECT')

    expect(mockSignIn).toHaveBeenCalledWith(
      'credentials',
      expect.objectContaining({ redirectTo: '/' }),
    )
  })

  it('returns generic error on AuthError (wrong code path, no oracle)', async () => {
    const { AuthError } = await import('next-auth')
    mockVerifyChallenge.mockReturnValue({ userId: 'user-1', email: 'a@b.co' })
    mockSignIn.mockRejectedValue(
      new (AuthError as new (msg?: string) => Error)('CredentialsSignin'),
    )

    const fd = createFormData({ challenge: 'valid.token.here', code: '000000' })
    const result = await verifyTotpAction(undefined, fd)

    expect(result).toEqual({ error: 'Codigo invalido' })
  })

  it('re-throws NEXT_REDIRECT on signIn success (Pitfall 1)', async () => {
    mockVerifyChallenge.mockReturnValue({ userId: 'user-1', email: 'a@b.co' })
    mockSignIn.mockRejectedValue(new Error('NEXT_REDIRECT'))

    const fd = createFormData({ challenge: 'valid.token.here', code: '123456' })
    await expect(verifyTotpAction(undefined, fd)).rejects.toThrow('NEXT_REDIRECT')
  })
})

describe('registerAction', () => {
  /** Build a valid token row for use in $transaction mocks */
  function validToken(overrides: Record<string, unknown> = {}) {
    return {
      id: 'token-id-1',
      token: 'valid-token-abc',
      email: 'invitee@example.com',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      usedAt: null,
      revokedAt: null,
      createdBy: 'admin-id',
      createdAt: new Date(),
      ...overrides,
    }
  }

  /** Build a valid FormData payload */
  function validFormData(overrides: Record<string, string> = {}): FormData {
    return createFormData({
      token: 'valid-token-abc',
      email: 'invitee@example.com',
      name: 'Invitee User',
      password: 'password1',
      confirmPassword: 'password1',
      ...overrides,
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Default transaction implementation: invoke callback with a tx proxy
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        inviteToken: { findUnique: mockTokenFindUnique, update: mockTokenUpdate },
        user: { create: mockUserCreate },
      }),
    )
  })

  it('returns Zod field errors for missing token', async () => {
    const fd = validFormData()
    fd.delete('token')

    const result = await registerAction(undefined, fd)

    expect(result?.error?.token).toBeDefined()
    expect(mockTransaction).not.toHaveBeenCalled()
  })

  it('returns Zod field errors for password too short', async () => {
    const fd = validFormData({ password: 'short1', confirmPassword: 'short1' })

    const result = await registerAction(undefined, fd)

    expect(result?.error?.password).toBeDefined()
    expect(mockTransaction).not.toHaveBeenCalled()
  })

  it('returns Zod field errors for password missing digit', async () => {
    const fd = validFormData({ password: 'longpassword', confirmPassword: 'longpassword' })

    const result = await registerAction(undefined, fd)

    expect(result?.error?.password).toBeDefined()
    expect(mockTransaction).not.toHaveBeenCalled()
  })

  it('returns Zod field error for password mismatch on confirmPassword path', async () => {
    const fd = validFormData({ password: 'password1', confirmPassword: 'password2' })

    const result = await registerAction(undefined, fd)

    expect(result?.error?.confirmPassword).toBeDefined()
    expect(mockTransaction).not.toHaveBeenCalled()
  })

  it('creates user and marks token used inside $transaction on happy path', async () => {
    mockTokenFindUnique.mockResolvedValue(validToken())
    mockUserCreate.mockResolvedValue({ id: 'new-user-id' })
    mockTokenUpdate.mockResolvedValue(validToken({ usedAt: new Date() }))
    mockSignIn.mockRejectedValue(new Error('NEXT_REDIRECT'))

    const fd = validFormData()

    await expect(registerAction(undefined, fd)).rejects.toThrow('NEXT_REDIRECT')

    expect(mockTransaction).toHaveBeenCalledTimes(1)
    expect(mockUserCreate).toHaveBeenCalledWith({
      data: {
        email: 'invitee@example.com',
        name: 'Invitee User',
        hashedPassword: 'hashed-password',
        isApproved: true,
        isAdmin: false,
        totpEnabled: false,
      },
    })
    expect(mockTokenUpdate).toHaveBeenCalledWith({
      where: { id: 'token-id-1' },
      data: { usedAt: expect.any(Date) },
    })
  })

  it('returns INVITE_INVALID error when token does not exist', async () => {
    mockTokenFindUnique.mockResolvedValue(null)

    const result = await registerAction(undefined, validFormData())

    expect(result?.error?._form?.[0]).toMatch(/no es valido/)
    expect(mockUserCreate).not.toHaveBeenCalled()
    expect(mockSignIn).not.toHaveBeenCalled()
  })

  it('returns INVITE_REVOKED error when token has revokedAt', async () => {
    mockTokenFindUnique.mockResolvedValue(validToken({ revokedAt: new Date() }))

    const result = await registerAction(undefined, validFormData())

    expect(result?.error?._form?.[0]).toMatch(/no es valido/)
    expect(mockUserCreate).not.toHaveBeenCalled()
  })

  it('returns INVITE_USED error when token has usedAt', async () => {
    mockTokenFindUnique.mockResolvedValue(validToken({ usedAt: new Date() }))

    const result = await registerAction(undefined, validFormData())

    expect(result?.error?._form?.[0]).toMatch(/no es valido/)
    expect(mockUserCreate).not.toHaveBeenCalled()
  })

  it('returns INVITE_EXPIRED error when token expiresAt is in the past', async () => {
    mockTokenFindUnique.mockResolvedValue(validToken({ expiresAt: new Date(Date.now() - 1000) }))

    const result = await registerAction(undefined, validFormData())

    expect(result?.error?._form?.[0]).toMatch(/no es valido/)
    expect(mockUserCreate).not.toHaveBeenCalled()
  })

  it('returns INVITE_EMAIL_MISMATCH error when form email differs from token email', async () => {
    mockTokenFindUnique.mockResolvedValue(validToken({ email: 'other@example.com' }))

    const result = await registerAction(undefined, validFormData())

    expect(result?.error?._form?.[0]).toMatch(/no es valido/)
    expect(mockUserCreate).not.toHaveBeenCalled()
  })

  it('returns AuthError-derived form error when signIn fails (non-redirect)', async () => {
    const { AuthError } = await import('next-auth')
    mockTokenFindUnique.mockResolvedValue(validToken())
    mockUserCreate.mockResolvedValue({ id: 'new-user-id' })
    mockTokenUpdate.mockResolvedValue(validToken({ usedAt: new Date() }))
    mockSignIn.mockRejectedValue(
      new (AuthError as new (msg?: string) => Error)('CredentialsSignin'),
    )

    const result = await registerAction(undefined, validFormData())

    expect(result?.error?._form?.[0]).toMatch(/automaticamente/)
  })

  it('re-throws NEXT_REDIRECT (does not swallow it)', async () => {
    mockTokenFindUnique.mockResolvedValue(validToken())
    mockUserCreate.mockResolvedValue({ id: 'new-user-id' })
    mockTokenUpdate.mockResolvedValue(validToken({ usedAt: new Date() }))
    mockSignIn.mockRejectedValue(new Error('NEXT_REDIRECT'))

    await expect(registerAction(undefined, validFormData())).rejects.toThrow('NEXT_REDIRECT')
  })

  it("calls signIn with email + password + redirectTo: '/'", async () => {
    mockTokenFindUnique.mockResolvedValue(validToken())
    mockUserCreate.mockResolvedValue({ id: 'new-user-id' })
    mockTokenUpdate.mockResolvedValue(validToken({ usedAt: new Date() }))
    mockSignIn.mockRejectedValue(new Error('NEXT_REDIRECT'))

    await expect(registerAction(undefined, validFormData())).rejects.toThrow('NEXT_REDIRECT')

    expect(mockSignIn).toHaveBeenCalledWith('credentials', {
      email: 'invitee@example.com',
      password: 'password1',
      redirectTo: '/',
    })
  })

  it('returns email error on Prisma P2002 unique constraint violation', async () => {
    mockTokenFindUnique.mockResolvedValue(validToken())
    const p2002 = Object.assign(new Error('Unique constraint'), { code: 'P2002' })
    mockUserCreate.mockRejectedValue(p2002)

    const result = await registerAction(undefined, validFormData())

    expect(result?.error?.email?.[0]).toMatch(/Ya existe una cuenta/)
  })
})
