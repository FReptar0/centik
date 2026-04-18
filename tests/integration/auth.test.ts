import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import bcrypt from 'bcryptjs'
import { prisma } from '../setup'

// Mock next-auth to prevent next/server import chain.
// We only need authorizeUser which uses prisma + bcrypt directly.
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

// Import the REAL authorizeUser function -- only next-auth init is mocked
import { authorizeUser } from '@/auth'

const TEST_EMAIL = 'auth-integration-test@example.com'
const TEST_PASSWORD = 'integration-test-password-2026'
const UNAPPROVED_EMAIL = 'unapproved-integration@example.com'

let testUserId: string
let unapprovedUserId: string

describe('authorizeUser (integration)', () => {
  beforeAll(async () => {
    const hashedPassword = await bcrypt.hash(TEST_PASSWORD, 12)

    // Create approved test user
    const user = await prisma.user.create({
      data: {
        email: TEST_EMAIL,
        hashedPassword,
        isApproved: true,
        totpEnabled: false,
      },
    })
    testUserId = user.id

    // Create unapproved test user
    const unapproved = await prisma.user.create({
      data: {
        email: UNAPPROVED_EMAIL,
        hashedPassword,
        isApproved: false,
        totpEnabled: false,
      },
    })
    unapprovedUserId = unapproved.id
  }, 30000)

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { id: { in: [testUserId, unapprovedUserId] } },
    })
  })

  it('returns user object for valid credentials', async () => {
    const result = await authorizeUser({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    })

    expect(result).not.toBeNull()
    expect(result!.id).toBe(testUserId)
    expect(result!.email).toBe(TEST_EMAIL)
  })

  it('returns null for wrong password', async () => {
    const result = await authorizeUser({
      email: TEST_EMAIL,
      password: 'wrong-password',
    })

    expect(result).toBeNull()
  })

  it('returns null for non-existent email', async () => {
    const result = await authorizeUser({
      email: 'nobody@example.com',
      password: TEST_PASSWORD,
    })

    expect(result).toBeNull()
  })

  it('returns null for unapproved user', async () => {
    const result = await authorizeUser({
      email: UNAPPROVED_EMAIL,
      password: TEST_PASSWORD,
    })

    expect(result).toBeNull()
  })
})
