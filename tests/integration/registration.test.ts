import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { prisma } from '../setup'

// Mock next-auth to prevent next/server import chain (same pattern as auth.test.ts integration).
vi.mock('next-auth', () => ({
  AuthError: class AuthError extends Error {
    constructor(message?: string) {
      super(message)
      this.name = 'AuthError'
    }
  },
  default: () => ({
    handlers: {},
    signIn: vi.fn(),
    signOut: vi.fn(),
    auth: vi.fn(),
  }),
}))

vi.mock('@auth/prisma-adapter', () => ({ PrismaAdapter: vi.fn() }))

vi.mock('next-auth/providers/credentials', () => ({ default: vi.fn(() => ({})) }))

// Mock @/auth so signIn does not actually run the full credentials flow during tests.
const mockSignIn = vi.fn()
vi.mock('@/auth', () => ({
  signIn: (...args: unknown[]) => mockSignIn(...args),
  signOut: vi.fn(),
}))

import { registerAction } from '@/actions/auth'

const ADMIN_EMAIL = 'reg-int-admin@test.example'
const EMAIL_PREFIX = 'reg-int-'
let adminId: string

function createFormData(fields: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [key, value] of Object.entries(fields)) {
    fd.set(key, value)
  }
  return fd
}

describe('registerAction (integration)', () => {
  beforeAll(async () => {
    const admin = await prisma.user.create({
      data: {
        email: ADMIN_EMAIL,
        hashedPassword: 'x',
        isApproved: true,
        isAdmin: true,
        totpEnabled: false,
      },
    })
    adminId = admin.id
  }, 30000)

  afterAll(async () => {
    // Delete invite tokens created by this test admin
    await prisma.inviteToken.deleteMany({ where: { createdBy: adminId } })
    // Delete any users created by this test run (including the admin)
    await prisma.user.deleteMany({
      where: { email: { startsWith: EMAIL_PREFIX } },
    })
  })

  beforeEach(() => {
    vi.clearAllMocks()
    // Mock signIn to resolve (no NEXT_REDIRECT thrown) -- keeps tests simple
    mockSignIn.mockResolvedValue(undefined)
  })

  it('creates a new User and marks the InviteToken used in a single transaction', async () => {
    const email = `${EMAIL_PREFIX}create@test.example`
    const tokenStr = `tok-${Date.now()}-create`
    const inviteToken = await prisma.inviteToken.create({
      data: {
        token: tokenStr,
        email,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdBy: adminId,
      },
    })

    const fd = createFormData({
      token: tokenStr,
      email,
      name: 'Integration Create',
      password: 'password1',
      confirmPassword: 'password1',
    })

    const result = await registerAction(undefined, fd)

    expect(result).toBeUndefined()

    const user = await prisma.user.findUnique({ where: { email } })
    expect(user).not.toBeNull()
    expect(user!.isApproved).toBe(true)
    expect(user!.isAdmin).toBe(false)
    expect(user!.hashedPassword).toMatch(/^\$2/)
    expect(user!.name).toBe('Integration Create')

    const consumed = await prisma.inviteToken.findUnique({ where: { id: inviteToken.id } })
    expect(consumed!.usedAt).toBeInstanceOf(Date)

    expect(mockSignIn).toHaveBeenCalledWith('credentials', {
      email,
      password: 'password1',
      redirectTo: '/',
    })
  })

  it('atomically rolls back: if user.create would conflict, token is NOT marked used', async () => {
    const email = `${EMAIL_PREFIX}conflict@test.example`
    const tokenStr = `tok-${Date.now()}-conflict`

    // Pre-create a user with this email so user.create inside the transaction will throw P2002
    await prisma.user.create({
      data: {
        email,
        hashedPassword: 'x',
        isApproved: true,
        isAdmin: false,
        totpEnabled: false,
      },
    })

    const inviteToken = await prisma.inviteToken.create({
      data: {
        token: tokenStr,
        email,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdBy: adminId,
      },
    })

    const fd = createFormData({
      token: tokenStr,
      email,
      name: 'Conflict User',
      password: 'password1',
      confirmPassword: 'password1',
    })

    const result = await registerAction(undefined, fd)

    expect(result?.error).toBeDefined()

    // Token must remain unconsumed because the transaction rolled back
    const stillUnused = await prisma.inviteToken.findUnique({ where: { id: inviteToken.id } })
    expect(stillUnused!.usedAt).toBeNull()
  })

  it('rejects email mismatch between form and token', async () => {
    const tokenEmail = `${EMAIL_PREFIX}mismatch-token@test.example`
    const formEmail = `${EMAIL_PREFIX}mismatch-form@test.example`
    const tokenStr = `tok-${Date.now()}-mismatch`

    const inviteToken = await prisma.inviteToken.create({
      data: {
        token: tokenStr,
        email: tokenEmail,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdBy: adminId,
      },
    })

    const fd = createFormData({
      token: tokenStr,
      email: formEmail,
      name: 'Mismatch User',
      password: 'password1',
      confirmPassword: 'password1',
    })

    const result = await registerAction(undefined, fd)

    expect(result?.error?._form).toBeDefined()

    const u = await prisma.user.findUnique({ where: { email: formEmail } })
    expect(u).toBeNull()

    const stillUnused = await prisma.inviteToken.findUnique({ where: { id: inviteToken.id } })
    expect(stillUnused!.usedAt).toBeNull()
  })

  it('rejects expired token', async () => {
    const email = `${EMAIL_PREFIX}expired@test.example`
    const tokenStr = `tok-${Date.now()}-expired`

    await prisma.inviteToken.create({
      data: {
        token: tokenStr,
        email,
        expiresAt: new Date(Date.now() - 1000),
        createdBy: adminId,
      },
    })

    const fd = createFormData({
      token: tokenStr,
      email,
      name: 'Expired User',
      password: 'password1',
      confirmPassword: 'password1',
    })

    const result = await registerAction(undefined, fd)

    expect(result?.error?._form).toBeDefined()

    const u = await prisma.user.findUnique({ where: { email } })
    expect(u).toBeNull()
  })

  it('rejects already-used token', async () => {
    const email = `${EMAIL_PREFIX}used@test.example`
    const tokenStr = `tok-${Date.now()}-used`

    await prisma.inviteToken.create({
      data: {
        token: tokenStr,
        email,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        usedAt: new Date(),
        createdBy: adminId,
      },
    })

    const fd = createFormData({
      token: tokenStr,
      email,
      name: 'Used User',
      password: 'password1',
      confirmPassword: 'password1',
    })

    const result = await registerAction(undefined, fd)

    expect(result?.error?._form).toBeDefined()

    const u = await prisma.user.findUnique({ where: { email } })
    expect(u).toBeNull()
  })
})
