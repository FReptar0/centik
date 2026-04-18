import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock prisma before importing auth module
vi.mock('@/lib/prisma', () => ({
  default: {
    user: {
      findUnique: vi.fn(),
    },
  },
}))

// Mock bcryptjs
vi.mock('bcryptjs', () => ({
  default: {
    compare: vi.fn(),
  },
}))

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

import { authorizeUser, jwtCallback, sessionCallback } from '@/auth'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import type { Session } from 'next-auth'
import type { JWT } from 'next-auth/jwt'

const mockPrisma = vi.mocked(prisma)
const mockBcrypt = vi.mocked(bcrypt)

const testUser = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  hashedPassword: '$2a$12$hashedpassword',
  isApproved: true,
  isAdmin: false,
}

describe('authorizeUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns user object for valid credentials', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(testUser)
    mockBcrypt.compare.mockResolvedValue(true as never)

    const result = await authorizeUser({ email: 'test@example.com', password: 'correct' })

    expect(result).toEqual({
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      isAdmin: false,
    })
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'test@example.com' },
      select: {
        id: true,
        email: true,
        name: true,
        hashedPassword: true,
        isApproved: true,
        isAdmin: true,
      },
    })
  })

  it('returns null for wrong password', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(testUser)
    mockBcrypt.compare.mockResolvedValue(false as never)

    const result = await authorizeUser({ email: 'test@example.com', password: 'wrong' })

    expect(result).toBeNull()
  })

  it('returns null for non-existent email', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null)

    const result = await authorizeUser({ email: 'nobody@example.com', password: 'any' })

    expect(result).toBeNull()
    expect(mockBcrypt.compare).not.toHaveBeenCalled()
  })

  it('returns null for unapproved user', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ ...testUser, isApproved: false })

    const result = await authorizeUser({ email: 'test@example.com', password: 'correct' })

    expect(result).toBeNull()
    expect(mockBcrypt.compare).not.toHaveBeenCalled()
  })

  it('returns null for empty credentials', async () => {
    const result1 = await authorizeUser({})
    expect(result1).toBeNull()

    const result2 = await authorizeUser({ email: '', password: '' })
    expect(result2).toBeNull()
  })

  it('returns null for user with null hashedPassword', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ ...testUser, hashedPassword: null })

    const result = await authorizeUser({ email: 'test@example.com', password: 'any' })

    expect(result).toBeNull()
  })
})

describe('jwtCallback', () => {
  it('adds userId and isAdmin to token on initial sign-in', async () => {
    const token: JWT = { sub: 'sub-1' }
    const user = {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test',
      emailVerified: null,
      isAdmin: true,
    }

    const result = await jwtCallback({ token, user })

    expect(result.userId).toBe('user-1')
    expect(result.isAdmin).toBe(true)
  })

  it('defaults isAdmin to false when user.isAdmin is undefined', async () => {
    const token: JWT = { sub: 'sub-1' }
    const user = { id: 'user-1', email: 'test@example.com', name: 'Test', emailVerified: null }

    const result = await jwtCallback({ token, user })

    expect(result.userId).toBe('user-1')
    expect(result.isAdmin).toBe(false)
  })

  it('preserves existing token when no user (subsequent calls)', async () => {
    const token: JWT = { sub: 'sub-1', userId: 'user-1', isAdmin: true }

    const result = await jwtCallback({ token })

    expect(result.userId).toBe('user-1')
    expect(result.sub).toBe('sub-1')
    expect(result.isAdmin).toBe(true)
  })
})

describe('sessionCallback', () => {
  it('sets session.user.id from token.userId', async () => {
    const session = {
      user: { id: '', isAdmin: false, name: 'Test', email: 'test@example.com' },
      expires: '',
    } as Session
    const token: JWT = { userId: 'user-1' }

    const result = await sessionCallback({ session, token })

    expect(result.user.id).toBe('user-1')
  })

  it('sets session.user.isAdmin to true when token.isAdmin is true', async () => {
    const session = {
      user: { id: '', isAdmin: false, name: 'Test', email: 'test@example.com' },
      expires: '',
    } as Session
    const token: JWT = { userId: 'user-1', isAdmin: true }

    const result = await sessionCallback({ session, token })

    expect(result.user.isAdmin).toBe(true)
  })

  it('defaults session.user.isAdmin to false when token.isAdmin is missing (legacy JWT)', async () => {
    const session = {
      user: { id: '', isAdmin: true, name: 'Test', email: 'test@example.com' },
      expires: '',
    } as Session
    const token: JWT = { userId: 'user-1' }

    const result = await sessionCallback({ session, token })

    expect(result.user.isAdmin).toBe(false)
  })
})
