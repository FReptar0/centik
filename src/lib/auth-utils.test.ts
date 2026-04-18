import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock next-auth to prevent full NextAuth initialization
vi.mock('next-auth', () => {
  return {
    default: () => ({
      handlers: {},
      signIn: vi.fn(),
      signOut: vi.fn(),
      auth: vi.fn(),
    }),
    AuthError: class AuthError extends Error {},
  }
})

// Mock @auth/prisma-adapter
vi.mock('@auth/prisma-adapter', () => ({
  PrismaAdapter: vi.fn(),
}))

// Mock next-auth/providers/credentials
vi.mock('next-auth/providers/credentials', () => ({
  default: vi.fn(() => ({})),
}))

// Mock prisma (needed by @/auth transitive import)
vi.mock('@/lib/prisma', () => ({
  default: {},
}))

// Mock bcryptjs (needed by @/auth transitive import)
vi.mock('bcryptjs', () => ({
  default: { compare: vi.fn() },
}))

// Mock next/navigation -- redirect() throws in real Next.js (NEXT_REDIRECT error)
const { mockRedirectFn } = vi.hoisted(() => {
  const fn = vi.fn().mockImplementation(() => {
    throw new Error('NEXT_REDIRECT')
  })
  return { mockRedirectFn: fn }
})
vi.mock('next/navigation', () => ({
  redirect: mockRedirectFn,
}))

// Mock @/auth to control auth() return value
const { mockAuth } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
}))
vi.mock('@/auth', () => ({
  auth: mockAuth,
}))

import { requireAuth } from '@/lib/auth-utils'

describe('requireAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns { userId } when session has user.id', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-123' } })

    const result = await requireAuth()

    expect(result).toEqual({ userId: 'user-123' })
    expect(mockRedirectFn).not.toHaveBeenCalled()
  })

  it('redirects to /login when auth() returns null', async () => {
    mockAuth.mockResolvedValue(null)

    await expect(requireAuth()).rejects.toThrow('NEXT_REDIRECT')

    expect(mockRedirectFn).toHaveBeenCalledWith('/login')
  })

  it('redirects to /login when session exists but user.id is undefined', async () => {
    mockAuth.mockResolvedValue({ user: {} })

    await expect(requireAuth()).rejects.toThrow('NEXT_REDIRECT')

    expect(mockRedirectFn).toHaveBeenCalledWith('/login')
  })
})
