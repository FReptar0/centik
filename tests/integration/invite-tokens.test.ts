import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { prisma } from '../setup'

// Mock next-auth init chain so importing src/auth.ts does not pull next/server.
vi.mock('next-auth', () => ({
  default: () => ({
    handlers: {},
    signIn: vi.fn(),
    signOut: vi.fn(),
    auth: vi.fn(),
  }),
}))
vi.mock('@auth/prisma-adapter', () => ({ PrismaAdapter: vi.fn() }))
vi.mock('next-auth/providers/credentials', () => ({ default: vi.fn(() => ({})) }))

// Mock requireAuth so the invite actions skip the real session lookup and
// return our test admin id. Everything downstream (prisma calls) hits the
// real test database.
vi.mock('@/lib/auth-utils', () => ({
  requireAuth: vi.fn(),
}))

// Mock next/cache so revalidatePath calls are safe in tests (no next runtime).
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

import { requireAuth } from '@/lib/auth-utils'
import { createInviteToken, revokeInviteToken } from '@/app/(app)/configuracion/invite-actions'
import { INVITE_TTL_MS } from '@/lib/invite-utils'

const ADMIN_EMAIL = 'invite-int-admin@test.example'
const EMAIL_PREFIX = 'invite-int-'

let adminId: string

function createFormData(fields: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [key, value] of Object.entries(fields)) {
    fd.set(key, value)
  }
  return fd
}

describe('invite-actions (integration)', () => {
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
    // Clean up all rows this test created
    await prisma.inviteToken.deleteMany({ where: { createdBy: adminId } })
    await prisma.user.deleteMany({
      where: {
        OR: [{ email: ADMIN_EMAIL }, { email: { startsWith: EMAIL_PREFIX } }],
      },
    })
  })

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireAuth).mockResolvedValue({ userId: adminId })
  })

  it('persists a real InviteToken row with 64-char hex token and 7d expiry', async () => {
    const email = `${EMAIL_PREFIX}persist@test.example`
    const before = Date.now()

    const result = await createInviteToken(createFormData({ email }))

    expect('success' in result && result.success).toBe(true)

    const stored = await prisma.inviteToken.findFirst({
      where: { email, createdBy: adminId },
    })

    expect(stored).not.toBeNull()
    expect(stored!.token).toMatch(/^[0-9a-f]{64}$/)
    expect(stored!.createdBy).toBe(adminId)

    const delta = stored!.expiresAt.getTime() - before
    expect(delta).toBeGreaterThanOrEqual(INVITE_TTL_MS - 5000)
    expect(delta).toBeLessThanOrEqual(INVITE_TTL_MS + 5000)
  })

  it('rejects a duplicate active invite for the same email', async () => {
    const email = `${EMAIL_PREFIX}duplicate@test.example`

    const first = await createInviteToken(createFormData({ email }))
    expect('success' in first && first.success).toBe(true)

    const second = await createInviteToken(createFormData({ email }))

    expect('error' in second).toBe(true)
    if ('error' in second) {
      expect(second.error.email).toBeDefined()
      expect(second.error.email?.[0]).toMatch(/activa/)
    }

    // And only one active row should exist
    const count = await prisma.inviteToken.count({
      where: { email, createdBy: adminId },
    })
    expect(count).toBe(1)
  })

  it('revokeInviteToken sets revokedAt', async () => {
    const email = `${EMAIL_PREFIX}revoke@test.example`

    await createInviteToken(createFormData({ email }))
    const created = await prisma.inviteToken.findFirst({
      where: { email, createdBy: adminId },
    })
    expect(created).not.toBeNull()

    const result = await revokeInviteToken(created!.id)
    expect(result).toEqual({ success: true })

    const after = await prisma.inviteToken.findUnique({
      where: { id: created!.id },
    })
    expect(after!.revokedAt).toBeInstanceOf(Date)
  })
})
