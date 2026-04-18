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

import { loginAction } from '@/actions/auth'

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
