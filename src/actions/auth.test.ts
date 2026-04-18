import { describe, it, expect, vi, beforeEach } from 'vitest'

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
const mockTokenFindUnique = vi.fn()
const mockTokenUpdate = vi.fn()
const mockTransaction = vi.fn()

vi.mock('@/lib/prisma', () => ({
  default: {
    $transaction: (fn: (tx: unknown) => Promise<unknown>) => mockTransaction(fn),
    user: { create: (...args: unknown[]) => mockUserCreate(...args) },
    inviteToken: {
      findUnique: (...args: unknown[]) => mockTokenFindUnique(...args),
      update: (...args: unknown[]) => mockTokenUpdate(...args),
    },
  },
}))

// Mock bcryptjs
vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed-password'),
  },
}))

import { loginAction, registerAction } from '@/actions/auth'

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
  })

  it('returns error for invalid email format', async () => {
    const fd = createFormData({ email: 'not-an-email', password: 'secret' })
    const result = await loginAction(undefined, fd)

    expect(result).toEqual({ error: 'Credenciales invalidas' })
    expect(mockSignIn).not.toHaveBeenCalled()
  })

  it('returns error for empty password', async () => {
    const fd = createFormData({ email: 'test@example.com', password: '' })
    const result = await loginAction(undefined, fd)

    expect(result).toEqual({ error: 'Credenciales invalidas' })
    expect(mockSignIn).not.toHaveBeenCalled()
  })

  it('returns error when AuthError is thrown', async () => {
    const { AuthError } = await import('next-auth')
    mockSignIn.mockRejectedValue(new (AuthError as new (msg?: string) => Error)('CredentialsSignin'))

    const fd = createFormData({ email: 'test@example.com', password: 'wrong' })
    const result = await loginAction(undefined, fd)

    expect(result).toEqual({ error: 'Credenciales invalidas' })
  })

  it('re-throws non-AuthError exceptions', async () => {
    const redirectError = new Error('NEXT_REDIRECT')
    mockSignIn.mockRejectedValue(redirectError)

    const fd = createFormData({ email: 'test@example.com', password: 'correct' })

    await expect(loginAction(undefined, fd)).rejects.toThrow('NEXT_REDIRECT')
  })

  it('calls signIn with correct params for valid data', async () => {
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
    mockSignIn.mockRejectedValue(new (AuthError as new (msg?: string) => Error)('CredentialsSignin'))

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
