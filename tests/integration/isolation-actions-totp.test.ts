// Phase 30 Plan 30-05 (D-23) — TOTP Server-Action session-scope regression net.
// Split from isolation-actions.test.ts for CLAUDE.md <300-line-per-file rule.
//
// TOTP actions (disable/regenerate) read userId from requireAuth() and operate
// against THAT userId only. With User A's session, User B's totpEnabled /
// totpSecret / BackupCode rows must remain untouched no matter what the action
// returns or throws.

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { prisma } from '../setup'

vi.mock('next-auth', () => ({
  default: () => ({ handlers: {}, signIn: vi.fn(), signOut: vi.fn(), auth: vi.fn() }),
}))
vi.mock('@auth/prisma-adapter', () => ({ PrismaAdapter: vi.fn() }))
vi.mock('next-auth/providers/credentials', () => ({ default: vi.fn(() => ({})) }))
vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: Object.assign(
    vi.fn().mockImplementation(() => ({
      limit: vi.fn().mockResolvedValue({
        success: true,
        limit: 5,
        remaining: 4,
        reset: Date.now() + 60000,
        pending: Promise.resolve(),
      }),
    })),
    { slidingWindow: vi.fn(), fixedWindow: vi.fn() },
  ),
}))
vi.mock('@upstash/redis', () => ({ Redis: { fromEnv: vi.fn(() => ({})) } }))
vi.mock('@/lib/auth-utils', () => ({ requireAuth: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { requireAuth } from '@/lib/auth-utils'
import {
  disableTotpAction,
  regenerateBackupCodesAction,
} from '@/app/(app)/configuracion/totp-actions'

const T = Date.now()
const PLACEHOLDER_SECRET = 'aa:bb:cc'
let userAId: string
let userBId: string

beforeAll(async () => {
  const a = await prisma.user.create({
    data: {
      email: `iso-totp-a-${T}@test.com`,
      hashedPassword: 'x',
      isApproved: true,
      totpEnabled: false,
    },
  })
  userAId = a.id

  // User B has 2FA enabled so the assertion "totpEnabled still true + secret
  // still placeholder + backup codes still present" has teeth.
  const b = await prisma.user.create({
    data: {
      email: `iso-totp-b-${T}@test.com`,
      hashedPassword: 'x',
      isApproved: true,
      totpEnabled: true,
      totpSecret: PLACEHOLDER_SECRET, // never decrypted — only compared literally
    },
  })
  userBId = b.id

  await prisma.backupCode.createMany({
    data: [
      { userId: userBId, codeHash: '$2a$12$fake.b.1' },
      { userId: userBId, codeHash: '$2a$12$fake.b.2' },
    ],
  })
}, 30000)

afterAll(async () => {
  await prisma.backupCode.deleteMany({ where: { userId: { in: [userAId, userBId] } } })
  await prisma.user.deleteMany({ where: { id: { in: [userAId, userBId] } } })
})

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(requireAuth).mockResolvedValue({ userId: userAId })
})

describe('cross-user IDOR — TOTP actions are session-bound', () => {
  it('disableTotpAction: User A session cannot disable User B 2FA', async () => {
    const beforeCodes = await prisma.backupCode.findMany({ where: { userId: userBId } })
    const formData = new FormData()
    formData.set('code', '123456')
    try {
      await disableTotpAction({ success: false }, formData)
    } catch {
      // Ignore throws — the load-bearing check is User B's state below
    }
    const userB = await prisma.user.findUnique({
      where: { id: userBId },
      select: { totpEnabled: true, totpSecret: true },
    })
    expect(userB?.totpEnabled).toBe(true)
    expect(userB?.totpSecret).toBe(PLACEHOLDER_SECRET)

    const afterCodes = await prisma.backupCode.findMany({ where: { userId: userBId } })
    expect(afterCodes).toHaveLength(beforeCodes.length)
  })

  it('regenerateBackupCodesAction: User A session cannot touch User B backup codes', async () => {
    const beforeCodes = await prisma.backupCode.findMany({
      where: { userId: userBId },
      orderBy: { codeHash: 'asc' },
    })
    const formData = new FormData()
    formData.set('code', '123456')
    try {
      await regenerateBackupCodesAction({ success: false } as never, formData)
    } catch {
      // Ignore throws — load-bearing check is User B's codeHash list below
    }
    const afterCodes = await prisma.backupCode.findMany({
      where: { userId: userBId },
      orderBy: { codeHash: 'asc' },
    })
    expect(afterCodes).toHaveLength(beforeCodes.length)
    expect(afterCodes.map((c) => c.codeHash)).toEqual(beforeCodes.map((c) => c.codeHash))
  })
})
