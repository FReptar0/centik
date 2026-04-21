import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import bcrypt from 'bcryptjs'
import { generateSync } from 'otplib'
import { prisma } from '../setup'

// Phase 29 Plan 29-05 — integration suite for 2FA lifecycle.
// Mocks NextAuth init + Upstash; everything else (prisma, bcrypt, otplib, totp-crypto, challenge) is REAL. D-35

// Mock next-auth to prevent next/server import chain (same pattern as auth.test.ts)
vi.mock('next-auth', () => ({
  default: () => ({
    handlers: {},
    signIn: vi.fn(),
    signOut: vi.fn(),
    auth: vi.fn(),
  }),
}))

vi.mock('@auth/prisma-adapter', () => ({
  PrismaAdapter: vi.fn(),
}))

vi.mock('next-auth/providers/credentials', () => ({
  default: vi.fn(() => ({})),
}))

// D-35 — mock Upstash so real credentials never need to exist. RATE_LIMIT_DISABLED=true in .env.test also bypasses at runtime.
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

// Real imports — NOT mocked (D-35 — totp-crypto + challenge + backup-codes are pure, fast)
import { authorizeUser } from '@/auth'
import { encryptSecret, decryptSecret } from '@/lib/totp-crypto'
import { createTotpSecret } from '@/lib/totp'
import { generateBackupCodes, consumeBackupCode } from '@/lib/backup-codes'
import { signChallenge } from '@/lib/challenge'

const TEST_PASSWORD = 'totp-integration-password-2026'
const BCRYPT_COST = 12
// Per-test timeout is set to 60s globally in vitest.integration.config.mts because
// cost-12 bcrypt x 10 codes + DB roundtrips easily exceeds the 5s default.
let userAId: string
let userBId: string
const userAEmail = `totp-int-a-${Date.now()}@test.com`
const userBEmail = `totp-int-b-${Date.now()}@test.com`

/**
 * Enables 2FA on userId by inlining the same atomic transaction that
 * enableTotpAction performs — encrypts the secret, flips totpEnabled,
 * inserts 10 BackupCode rows. Returns the raw secret + plaintext codes
 * so tests can drive the login paths.
 */
async function setup2FA(userId: string): Promise<{ secret: string; plainCodes: string[] }> {
  const secret = createTotpSecret()
  const encrypted = encryptSecret(secret)
  const plainCodes = generateBackupCodes(10)
  const hashes = await Promise.all(plainCodes.map((c) => bcrypt.hash(c.toLowerCase(), BCRYPT_COST)))

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { totpSecret: encrypted, totpEnabled: true },
    }),
    prisma.backupCode.deleteMany({ where: { userId } }),
    prisma.backupCode.createMany({
      data: hashes.map((codeHash) => ({ userId, codeHash })),
    }),
  ])

  return { secret, plainCodes }
}

beforeAll(async () => {
  const hashed = await bcrypt.hash(TEST_PASSWORD, BCRYPT_COST)
  const a = await prisma.user.create({
    data: { email: userAEmail, hashedPassword: hashed, isApproved: true, totpEnabled: false },
  })
  userAId = a.id
  const b = await prisma.user.create({
    data: { email: userBEmail, hashedPassword: hashed, isApproved: true, totpEnabled: false },
  })
  userBId = b.id
}, 30000)

afterAll(async () => {
  // onDelete: Cascade on BackupCode handles cleanup automatically
  await prisma.user.deleteMany({ where: { id: { in: [userAId, userBId] } } })
})

beforeEach(async () => {
  // Reset both users' 2FA state before each test for isolation
  await prisma.user.updateMany({
    where: { id: { in: [userAId, userBId] } },
    data: { totpSecret: null, totpEnabled: false },
  })
  await prisma.backupCode.deleteMany({ where: { userId: { in: [userAId, userBId] } } })
})

describe('TOTP 2FA — setup + stored format', () => {
  it('persists encrypted secret + 10 BackupCode rows atomically', async () => {
    await setup2FA(userAId)

    const user = await prisma.user.findUnique({
      where: { id: userAId },
      select: { totpSecret: true, totpEnabled: true },
    })
    expect(user?.totpSecret).toMatch(/^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/)
    expect(user?.totpEnabled).toBe(true)

    const count = await prisma.backupCode.count({ where: { userId: userAId } })
    expect(count).toBe(10)
  })

  it('decryptSecret round-trips stored ciphertext back to the original base32 secret', async () => {
    const { secret } = await setup2FA(userAId)
    const user = await prisma.user.findUnique({ where: { id: userAId } })
    expect(user?.totpSecret).toBeTruthy()
    expect(decryptSecret(user!.totpSecret!)).toBe(secret)
  })

  it('all 10 stored BackupCode rows start with usedAt null', async () => {
    await setup2FA(userAId)
    const unused = await prisma.backupCode.count({
      where: { userId: userAId, usedAt: null },
    })
    expect(unused).toBe(10)
  })
})

describe('TOTP 2FA — login flows with real authorizeUser', () => {
  it('1FA user — correct password returns the user row', async () => {
    const result = await authorizeUser({ email: userAEmail, password: TEST_PASSWORD })
    expect(result).toMatchObject({ id: userAId, email: userAEmail })
  })

  it('2FA-enabled user on 1FA path — password alone returns null (defense-in-depth)', async () => {
    await setup2FA(userAId)
    const result = await authorizeUser({ email: userAEmail, password: TEST_PASSWORD })
    expect(result).toBeNull()
  })

  it('2FA user — tampered challenge returns null', async () => {
    await setup2FA(userAId)
    const challenge = signChallenge(userAId, userAEmail)
    // Flip the last character to tamper the HMAC
    const lastChar = challenge.slice(-1)
    const tamperedLast = lastChar === 'A' ? 'B' : 'A'
    const tampered = challenge.slice(0, -1) + tamperedLast
    const result = await authorizeUser({
      email: userAEmail,
      password: '',
      totpCode: '000000',
      challenge: tampered,
    })
    expect(result).toBeNull()
  })

  it('2FA user — valid challenge + valid 6-digit TOTP returns the user', async () => {
    const { secret } = await setup2FA(userAId)
    const challenge = signChallenge(userAId, userAEmail)
    const code = generateSync({ secret })
    const result = await authorizeUser({
      email: userAEmail,
      password: '',
      totpCode: code,
      challenge,
    })
    expect(result).toMatchObject({ id: userAId, email: userAEmail })
  })

  it('2FA user — valid challenge + valid backup code returns user AND marks BackupCode.usedAt', async () => {
    const { plainCodes } = await setup2FA(userAId)
    const challenge = signChallenge(userAId, userAEmail)
    const code = plainCodes[0]

    const result = await authorizeUser({
      email: userAEmail,
      password: '',
      totpCode: code,
      challenge,
    })
    expect(result).toMatchObject({ id: userAId, email: userAEmail })

    const consumed = await prisma.backupCode.count({
      where: { userId: userAId, usedAt: { not: null } },
    })
    expect(consumed).toBe(1)
  })

  it('2FA user — backup code reused: first succeeds, second returns null', async () => {
    const { plainCodes } = await setup2FA(userAId)
    const challenge = signChallenge(userAId, userAEmail)
    const code = plainCodes[0]

    const first = await authorizeUser({
      email: userAEmail,
      password: '',
      totpCode: code,
      challenge,
    })
    expect(first).toMatchObject({ id: userAId })

    const second = await authorizeUser({
      email: userAEmail,
      password: '',
      totpCode: code,
      challenge,
    })
    expect(second).toBeNull()
  })

  it('2FA user — challenge bound to a different user returns null', async () => {
    await setup2FA(userAId)
    const forgedChallenge = signChallenge(userBId, userBEmail)
    const result = await authorizeUser({
      email: userAEmail,
      password: '',
      totpCode: '000000',
      challenge: forgedChallenge,
    })
    expect(result).toBeNull()
  })

  it('2FA user — wrong 6-digit TOTP code returns null', async () => {
    await setup2FA(userAId)
    const challenge = signChallenge(userAId, userAEmail)
    const result = await authorizeUser({
      email: userAEmail,
      password: '',
      totpCode: '000000',
      challenge,
    })
    expect(result).toBeNull()
  })
})

describe('TOTP 2FA — concurrent + cross-user + disable + regen', () => {
  it('concurrent Promise.all consume of same code yields exactly 1 success', async () => {
    const { plainCodes } = await setup2FA(userAId)
    const code = plainCodes[0]

    const [a, b] = await Promise.all([
      consumeBackupCode(userAId, code),
      consumeBackupCode(userAId, code),
    ])

    expect([a, b].filter(Boolean)).toHaveLength(1)

    // Exactly one row consumed
    const consumed = await prisma.backupCode.count({
      where: { userId: userAId, usedAt: { not: null } },
    })
    expect(consumed).toBe(1)
  })

  it("cross-user isolation — User B cannot consume User A's backup code (T-29-DATA-002)", async () => {
    const { plainCodes } = await setup2FA(userAId)
    // Also enable 2FA on user B so both have backup codes; B's codes must stay untouched
    await setup2FA(userBId)

    const result = await consumeBackupCode(userBId, plainCodes[0])
    expect(result).toBe(false)

    // User A's row still unused
    const userAUnused = await prisma.backupCode.count({
      where: { userId: userAId, usedAt: null },
    })
    expect(userAUnused).toBe(10)

    // User B's rows also untouched
    const userBUnused = await prisma.backupCode.count({
      where: { userId: userBId, usedAt: null },
    })
    expect(userBUnused).toBe(10)
  })

  it("cross-user isolation — login as User B with User A's backup code returns null", async () => {
    const { plainCodes } = await setup2FA(userAId)
    await setup2FA(userBId)

    const challengeForB = signChallenge(userBId, userBEmail)
    const result = await authorizeUser({
      email: userBEmail,
      password: '',
      totpCode: plainCodes[0],
      challenge: challengeForB,
    })
    expect(result).toBeNull()

    // User A's row still unused
    const userAUnused = await prisma.backupCode.count({
      where: { userId: userAId, usedAt: null },
    })
    expect(userAUnused).toBe(10)
  })

  it('disable flow — $transaction clears totpSecret + totpEnabled=false + deletes all BackupCode rows', async () => {
    await setup2FA(userAId)

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userAId },
        data: { totpSecret: null, totpEnabled: false },
      }),
      prisma.backupCode.deleteMany({ where: { userId: userAId } }),
    ])

    const user = await prisma.user.findUnique({
      where: { id: userAId },
      select: { totpSecret: true, totpEnabled: true },
    })
    const count = await prisma.backupCode.count({ where: { userId: userAId } })

    expect(user?.totpSecret).toBeNull()
    expect(user?.totpEnabled).toBe(false)
    expect(count).toBe(0)
  })

  it('regenerate flow — old rows deleted + fresh 10 rows inserted atomically with no overlap', async () => {
    await setup2FA(userAId)
    const before = (await prisma.backupCode.findMany({ where: { userId: userAId } }))
      .map((r) => r.codeHash)
      .sort()

    // Regenerate — new plaintext codes + fresh bcrypt hashes
    const newCodes = generateBackupCodes(10)
    const newHashes = await Promise.all(
      newCodes.map((c) => bcrypt.hash(c.toLowerCase(), BCRYPT_COST)),
    )

    await prisma.$transaction([
      prisma.backupCode.deleteMany({ where: { userId: userAId } }),
      prisma.backupCode.createMany({
        data: newHashes.map((codeHash) => ({ userId: userAId, codeHash })),
      }),
    ])

    const after = (await prisma.backupCode.findMany({ where: { userId: userAId } }))
      .map((r) => r.codeHash)
      .sort()

    expect(after).toHaveLength(10)
    // bcrypt is non-deterministic — no hash should appear in both arrays
    const overlap = before.filter((h) => after.includes(h))
    expect(overlap).toHaveLength(0)
  })
})
