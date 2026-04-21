import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ReactElement } from 'react'

// Mock next-auth init chain so importing RegisterPage is safe in a jsdom env.
vi.mock('next-auth', () => ({
  AuthError: class extends Error {},
  default: () => ({ handlers: {}, signIn: vi.fn(), signOut: vi.fn(), auth: vi.fn() }),
}))
vi.mock('@auth/prisma-adapter', () => ({ PrismaAdapter: vi.fn() }))
vi.mock('next-auth/providers/credentials', () => ({ default: vi.fn(() => ({})) }))

// Phase 29 — @/auth now transitively imports TOTP crypto, which validates
// AUTH_TOTP_ENCRYPTION_KEY at module load. Mock the lib modules so this test
// never triggers the env-coupled validation path.
vi.mock('@/lib/totp-crypto', () => ({
  encryptSecret: vi.fn(),
  decryptSecret: vi.fn(),
}))
vi.mock('@/lib/totp', () => ({
  createTotpSecret: vi.fn(),
  buildOtpauthUri: vi.fn(),
  verifyTotp: vi.fn(),
}))
vi.mock('@/lib/backup-codes', () => ({
  generateBackupCodes: vi.fn(),
  formatForDisplay: vi.fn(),
  hashBackupCodes: vi.fn(),
  consumeBackupCode: vi.fn(),
}))
vi.mock('@/lib/challenge', () => ({
  signChallenge: vi.fn(),
  verifyChallenge: vi.fn(),
}))
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(),
  loginLimiter: null,
  totpLimiter: null,
  getClientIp: vi.fn(),
}))

const mockNotFound = vi.fn(() => {
  throw new Error('NEXT_NOT_FOUND')
})
vi.mock('next/navigation', () => ({ notFound: () => mockNotFound() }))

const mockConnection = vi.fn().mockResolvedValue(undefined)
vi.mock('next/server', async () => {
  const actual = await vi.importActual<typeof import('next/server')>('next/server')
  return { ...actual, connection: () => mockConnection() }
})

const mockTokenFindUnique = vi.fn()
vi.mock('@/lib/prisma', () => ({
  default: {
    inviteToken: { findUnique: (...args: unknown[]) => mockTokenFindUnique(...args) },
  },
}))

import RegisterPage from './page'
import TokenErrorScreen from '@/components/configuracion/TokenErrorScreen'
import RegisterForm from '@/components/auth/RegisterForm'

/** Walk a React element tree and return the first element whose `.type` matches */
function findByType(node: unknown, type: React.ElementType): ReactElement | null {
  if (!node || typeof node !== 'object') return null
  const el = node as ReactElement
  if (el.type === type) return el
  const props = (el.props ?? {}) as { children?: unknown }
  const children = props.children
  if (children === undefined || children === null) return null
  const array = Array.isArray(children) ? children : [children]
  for (const child of array) {
    const hit = findByType(child, type)
    if (hit) return hit
  }
  return null
}

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockConnection.mockResolvedValue(undefined)
  })

  it('calls notFound() when no token query param', async () => {
    await expect(RegisterPage({ searchParams: Promise.resolve({}) })).rejects.toThrow(
      'NEXT_NOT_FOUND',
    )
    expect(mockNotFound).toHaveBeenCalledTimes(1)
    expect(mockTokenFindUnique).not.toHaveBeenCalled()
  })

  it('renders TokenErrorScreen state=invalid when token row not found', async () => {
    mockTokenFindUnique.mockResolvedValue(null)
    const result = (await RegisterPage({
      searchParams: Promise.resolve({ token: 'nope' }),
    })) as ReactElement

    expect(result.type).toBe(TokenErrorScreen)
    const props = result.props as { state: string }
    expect(props.state).toBe('invalid')
  })

  it('renders TokenErrorScreen state=invalid when token has revokedAt', async () => {
    mockTokenFindUnique.mockResolvedValue({
      id: 'a',
      token: 'a',
      email: 'a@b.com',
      expiresAt: new Date(Date.now() + 1000),
      usedAt: null,
      revokedAt: new Date(),
      createdBy: 'admin',
      createdAt: new Date(),
    })
    const result = (await RegisterPage({
      searchParams: Promise.resolve({ token: 'a' }),
    })) as ReactElement

    expect(result.type).toBe(TokenErrorScreen)
    const props = result.props as { state: string }
    expect(props.state).toBe('invalid')
  })

  it('renders TokenErrorScreen state=used when token has usedAt', async () => {
    mockTokenFindUnique.mockResolvedValue({
      id: 'a',
      token: 'a',
      email: 'a@b.com',
      expiresAt: new Date(Date.now() + 1000),
      usedAt: new Date(),
      revokedAt: null,
      createdBy: 'admin',
      createdAt: new Date(),
    })
    const result = (await RegisterPage({
      searchParams: Promise.resolve({ token: 'a' }),
    })) as ReactElement

    expect(result.type).toBe(TokenErrorScreen)
    const props = result.props as { state: string }
    expect(props.state).toBe('used')
  })

  it('renders TokenErrorScreen state=expired when expiresAt is past', async () => {
    mockTokenFindUnique.mockResolvedValue({
      id: 'a',
      token: 'a',
      email: 'a@b.com',
      expiresAt: new Date(Date.now() - 1000),
      usedAt: null,
      revokedAt: null,
      createdBy: 'admin',
      createdAt: new Date(),
    })
    const result = (await RegisterPage({
      searchParams: Promise.resolve({ token: 'a' }),
    })) as ReactElement

    expect(result.type).toBe(TokenErrorScreen)
    const props = result.props as { state: string }
    expect(props.state).toBe('expired')
  })

  it('renders the RegisterForm shell when token is valid', async () => {
    const row = {
      id: 'valid-id',
      token: 'valid-token',
      email: 'invitee@example.com',
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: null,
      revokedAt: null,
      createdBy: 'admin',
      createdAt: new Date(),
    }
    mockTokenFindUnique.mockResolvedValue(row)

    const result = (await RegisterPage({
      searchParams: Promise.resolve({ token: 'valid-token' }),
    })) as ReactElement

    // Outer container is a div, not TokenErrorScreen
    expect(result.type).toBe('div')

    const form = findByType(result, RegisterForm)
    expect(form).not.toBeNull()
    const formProps = form!.props as { email: string; token: string }
    expect(formProps.email).toBe('invitee@example.com')
    expect(formProps.token).toBe('valid-token')
  })
})
