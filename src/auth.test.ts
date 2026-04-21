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

// Phase 29: mock TOTP libraries used by the 2FA branch of authorizeUser
vi.mock('@/lib/challenge', () => ({
  signChallenge: vi.fn(),
  verifyChallenge: vi.fn(),
}))
vi.mock('@/lib/totp-crypto', () => ({
  encryptSecret: vi.fn(),
  decryptSecret: vi.fn(),
}))
vi.mock('@/lib/totp', () => ({
  verifyTotp: vi.fn(),
}))
vi.mock('@/lib/backup-codes', () => ({
  consumeBackupCode: vi.fn(),
}))

import { authorizeUser, jwtCallback, sessionCallback } from '@/auth'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { verifyChallenge } from '@/lib/challenge'
import { decryptSecret } from '@/lib/totp-crypto'
import { verifyTotp } from '@/lib/totp'
import { consumeBackupCode } from '@/lib/backup-codes'
import type { Session } from 'next-auth'
import type { JWT } from 'next-auth/jwt'

const mockPrisma = vi.mocked(prisma)
const mockBcrypt = vi.mocked(bcrypt)
const mockVerifyChallenge = vi.mocked(verifyChallenge)
const mockDecryptSecret = vi.mocked(decryptSecret)
const mockVerifyTotp = vi.mocked(verifyTotp)
const mockConsumeBackupCode = vi.mocked(consumeBackupCode)

const testUser = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  hashedPassword: '$2a$12$hashedpassword',
  isApproved: true,
  isAdmin: false,
  totpSecret: null as string | null,
  totpEnabled: false,
}

/** 2FA-enabled variant of testUser */
const testUser2fa = {
  ...testUser,
  totpSecret: 'iv:ciphertext:authTag',
  totpEnabled: true,
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
        totpSecret: true,
        totpEnabled: true,
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

// ─────────────────────────────────────────────────────────────────────────────
// Phase 29 — authorizeUser 2FA branch (D-14, D-16, D-18)
// ─────────────────────────────────────────────────────────────────────────────
describe('authorizeUser — TOTP branch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── 2FA rejection paths (password alone insufficient) ───────────────────────
  it('returns null when 2FA user supplies correct password but no challenge/code', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(testUser2fa)
    mockBcrypt.compare.mockResolvedValue(true as never)

    const result = await authorizeUser({ email: testUser2fa.email, password: 'correct' })

    expect(result).toBeNull()
  })

  it('returns null when 2FA user supplies totpCode but no challenge', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(testUser2fa)
    mockBcrypt.compare.mockResolvedValue(true as never)

    const result = await authorizeUser({
      email: testUser2fa.email,
      password: 'correct',
      totpCode: '123456',
    })

    expect(result).toBeNull()
  })

  it('returns null when 2FA user supplies challenge but no totpCode', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(testUser2fa)
    mockBcrypt.compare.mockResolvedValue(true as never)

    const result = await authorizeUser({
      email: testUser2fa.email,
      password: 'correct',
      challenge: 'some-challenge',
    })

    expect(result).toBeNull()
  })

  // ── Challenge validation ────────────────────────────────────────────────────
  it('returns null when challenge signature is invalid', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(testUser2fa)
    mockVerifyChallenge.mockReturnValue(null) // invalid signature

    const result = await authorizeUser({
      email: testUser2fa.email,
      password: '',
      totpCode: '123456',
      challenge: 'tampered.token',
    })

    expect(result).toBeNull()
    expect(mockVerifyTotp).not.toHaveBeenCalled()
  })

  it('returns null when challenge is signed for a DIFFERENT user (T-29-DATA-002)', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(testUser2fa)
    mockVerifyChallenge.mockReturnValue({
      userId: 'OTHER-user-id',
      email: testUser2fa.email,
    })

    const result = await authorizeUser({
      email: testUser2fa.email,
      password: '',
      totpCode: '123456',
      challenge: 'wrong-user.token',
    })

    expect(result).toBeNull()
    expect(mockVerifyTotp).not.toHaveBeenCalled()
  })

  it('returns null when challenge email does not match user email', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(testUser2fa)
    mockVerifyChallenge.mockReturnValue({
      userId: testUser2fa.id,
      email: 'different@example.com',
    })

    const result = await authorizeUser({
      email: testUser2fa.email,
      password: '',
      totpCode: '123456',
      challenge: 'wrong-email.token',
    })

    expect(result).toBeNull()
  })

  // ── 6-digit TOTP verification ───────────────────────────────────────────────
  it('returns user for valid challenge + valid 6-digit TOTP code', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(testUser2fa)
    mockVerifyChallenge.mockReturnValue({
      userId: testUser2fa.id,
      email: testUser2fa.email,
    })
    mockDecryptSecret.mockReturnValue('JBSWY3DPEHPK3PXP')
    mockVerifyTotp.mockResolvedValue(true)

    const result = await authorizeUser({
      email: testUser2fa.email,
      password: '',
      totpCode: '123456',
      challenge: 'valid.token',
    })

    expect(result).toEqual({
      id: testUser2fa.id,
      email: testUser2fa.email,
      name: testUser2fa.name,
      isAdmin: testUser2fa.isAdmin,
    })
    expect(mockDecryptSecret).toHaveBeenCalledWith(testUser2fa.totpSecret)
    expect(mockVerifyTotp).toHaveBeenCalledWith('JBSWY3DPEHPK3PXP', '123456')
  })

  it('returns null for valid challenge + expired/wrong TOTP code', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(testUser2fa)
    mockVerifyChallenge.mockReturnValue({
      userId: testUser2fa.id,
      email: testUser2fa.email,
    })
    mockDecryptSecret.mockReturnValue('JBSWY3DPEHPK3PXP')
    mockVerifyTotp.mockResolvedValue(false)

    const result = await authorizeUser({
      email: testUser2fa.email,
      password: '',
      totpCode: '000000',
      challenge: 'valid.token',
    })

    expect(result).toBeNull()
  })

  // ── Backup code verification ────────────────────────────────────────────────
  it('returns user for valid challenge + valid 8-hex backup code (raw lowercase)', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(testUser2fa)
    mockVerifyChallenge.mockReturnValue({
      userId: testUser2fa.id,
      email: testUser2fa.email,
    })
    mockConsumeBackupCode.mockResolvedValue(true)

    const result = await authorizeUser({
      email: testUser2fa.email,
      password: '',
      totpCode: 'ab12cd34',
      challenge: 'valid.token',
    })

    expect(result).toEqual({
      id: testUser2fa.id,
      email: testUser2fa.email,
      name: testUser2fa.name,
      isAdmin: testUser2fa.isAdmin,
    })
    expect(mockConsumeBackupCode).toHaveBeenCalledWith(testUser2fa.id, 'ab12cd34')
    expect(mockVerifyTotp).not.toHaveBeenCalled()
  })

  it('returns user for valid challenge + dashed backup code (AB12-CD34)', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(testUser2fa)
    mockVerifyChallenge.mockReturnValue({
      userId: testUser2fa.id,
      email: testUser2fa.email,
    })
    mockConsumeBackupCode.mockResolvedValue(true)

    const result = await authorizeUser({
      email: testUser2fa.email,
      password: '',
      totpCode: 'AB12-CD34',
      challenge: 'valid.token',
    })

    expect(result).not.toBeNull()
    // consumeBackupCode receives the normalized form (dashes stripped, lowercase)
    expect(mockConsumeBackupCode).toHaveBeenCalledWith(testUser2fa.id, 'ab12cd34')
  })

  it('returns null for valid challenge + already-consumed backup code', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(testUser2fa)
    mockVerifyChallenge.mockReturnValue({
      userId: testUser2fa.id,
      email: testUser2fa.email,
    })
    mockConsumeBackupCode.mockResolvedValue(false)

    const result = await authorizeUser({
      email: testUser2fa.email,
      password: '',
      totpCode: 'ab12cd34',
      challenge: 'valid.token',
    })

    expect(result).toBeNull()
  })

  it('returns null for garbage code (neither 6-digit nor 8-hex)', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(testUser2fa)
    mockVerifyChallenge.mockReturnValue({
      userId: testUser2fa.id,
      email: testUser2fa.email,
    })

    const result = await authorizeUser({
      email: testUser2fa.email,
      password: '',
      totpCode: 'not-a-code',
      challenge: 'valid.token',
    })

    expect(result).toBeNull()
    expect(mockVerifyTotp).not.toHaveBeenCalled()
    expect(mockConsumeBackupCode).not.toHaveBeenCalled()
  })

  // ── Defensive / corruption paths ────────────────────────────────────────────
  it('returns null when totpEnabled=true but totpSecret is missing (corrupt state)', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ ...testUser2fa, totpSecret: null })
    mockVerifyChallenge.mockReturnValue({
      userId: testUser2fa.id,
      email: testUser2fa.email,
    })

    const result = await authorizeUser({
      email: testUser2fa.email,
      password: '',
      totpCode: '123456',
      challenge: 'valid.token',
    })

    expect(result).toBeNull()
    expect(mockDecryptSecret).not.toHaveBeenCalled()
  })

  it('returns null when challenge-path user is not approved', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ ...testUser2fa, isApproved: false })

    const result = await authorizeUser({
      email: testUser2fa.email,
      password: '',
      totpCode: '123456',
      challenge: 'valid.token',
    })

    expect(result).toBeNull()
    expect(mockVerifyChallenge).not.toHaveBeenCalled()
  })

  // ── 1FA regression: totpEnabled=false works on password alone ──────────────
  it('1FA user (totpEnabled=false) authenticates with correct password — no challenge needed', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(testUser)
    mockBcrypt.compare.mockResolvedValue(true as never)

    const result = await authorizeUser({
      email: testUser.email,
      password: 'correct',
    })

    expect(result).toEqual({
      id: testUser.id,
      email: testUser.email,
      name: testUser.name,
      isAdmin: testUser.isAdmin,
    })
    expect(mockVerifyChallenge).not.toHaveBeenCalled()
  })

  it('2FA user on password-only (1FA) path is rejected — forces step-2 flow', async () => {
    // When loginAction bugs out and naively passes password-only for a 2FA user,
    // authorize must refuse to issue a session (defense in depth).
    mockPrisma.user.findUnique.mockResolvedValue(testUser2fa)
    mockBcrypt.compare.mockResolvedValue(true as never)

    const result = await authorizeUser({
      email: testUser2fa.email,
      password: 'correct-password-but-no-2fa',
    })

    expect(result).toBeNull()
  })
})
