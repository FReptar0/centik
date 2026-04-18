import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mocks for prisma — both user.findUnique (requireAdmin) and inviteToken.* operations.
const mockUserFindUnique = vi.fn()
const mockInviteCreate = vi.fn()
const mockInviteFindFirst = vi.fn()
const mockInviteFindMany = vi.fn()
const mockInviteUpdate = vi.fn()

vi.mock('@/lib/prisma', () => ({
  default: {
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
    },
    inviteToken: {
      create: (...args: unknown[]) => mockInviteCreate(...args),
      findFirst: (...args: unknown[]) => mockInviteFindFirst(...args),
      findMany: (...args: unknown[]) => mockInviteFindMany(...args),
      update: (...args: unknown[]) => mockInviteUpdate(...args),
    },
  },
}))

const mockRevalidatePath = vi.fn()
vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}))

const TEST_USER_ID = 'test-user-id'
vi.mock('@/lib/auth-utils', () => ({
  requireAuth: vi.fn().mockResolvedValue({ userId: 'test-user-id' }),
}))

import {
  createInviteToken,
  revokeInviteToken,
  listInviteTokens,
} from './invite-actions'
import { INVITE_TTL_MS } from '@/lib/invite-utils'

/** Helper to create FormData with given fields */
function createFormData(fields: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [key, value] of Object.entries(fields)) {
    fd.set(key, value)
  }
  return fd
}

/** cuid shape for revoke tests — Prisma @id @default(cuid()) values are ~25-char base32 starting with 'c' */
const VALID_CUID = 'cltestinviteid00000000001'

describe('requireAdmin gating', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects createInviteToken when caller is not admin', async () => {
    // First user.findUnique call is requireAdmin → isAdmin false
    mockUserFindUnique.mockResolvedValueOnce({ isAdmin: false })

    const fd = createFormData({ email: 'invitee@example.com' })
    const result = await createInviteToken(fd)

    expect(result).toEqual({ error: { _form: ['No autorizado'] } })
    expect(mockInviteCreate).not.toHaveBeenCalled()
  })

  it('rejects revokeInviteToken when caller is not admin', async () => {
    mockUserFindUnique.mockResolvedValueOnce({ isAdmin: false })

    const result = await revokeInviteToken(VALID_CUID)

    expect(result).toEqual({ error: { _form: ['No autorizado'] } })
    expect(mockInviteUpdate).not.toHaveBeenCalled()
  })
})

describe('createInviteToken', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates token with 64-char hex, email, 7d expiry, createdBy', async () => {
    // 1st findUnique → requireAdmin (isAdmin true); 2nd findUnique → existing user check (null)
    mockUserFindUnique
      .mockResolvedValueOnce({ isAdmin: true })
      .mockResolvedValueOnce(null)
    mockInviteFindFirst.mockResolvedValue(null)
    mockInviteCreate.mockResolvedValue({ id: 'new-token-id' })

    const beforeCall = Date.now()
    const fd = createFormData({ email: 'invitee@example.com' })
    await createInviteToken(fd)

    expect(mockInviteCreate).toHaveBeenCalledTimes(1)
    const createArgs = mockInviteCreate.mock.calls[0][0]
    expect(createArgs.data.token).toMatch(/^[0-9a-f]{64}$/)
    expect(createArgs.data.email).toBe('invitee@example.com')
    expect(createArgs.data.createdBy).toBe(TEST_USER_ID)
    const expiryDelta = createArgs.data.expiresAt.getTime() - beforeCall
    expect(expiryDelta).toBeGreaterThanOrEqual(INVITE_TTL_MS - 5000)
    expect(expiryDelta).toBeLessThanOrEqual(INVITE_TTL_MS + 5000)
  })

  it('returns the raw token in the result so UI can render it', async () => {
    mockUserFindUnique
      .mockResolvedValueOnce({ isAdmin: true })
      .mockResolvedValueOnce(null)
    mockInviteFindFirst.mockResolvedValue(null)
    mockInviteCreate.mockResolvedValue({ id: 'new-token-id' })

    const fd = createFormData({ email: 'invitee@example.com' })
    const result = await createInviteToken(fd)

    expect('success' in result && result.success).toBe(true)
    if ('success' in result) {
      expect(typeof result.token).toBe('string')
      expect(result.token.length).toBe(64)
    }
  })

  it('rejects email that already has a User row', async () => {
    mockUserFindUnique
      .mockResolvedValueOnce({ isAdmin: true })
      .mockResolvedValueOnce({ id: 'existing-user' })

    const fd = createFormData({ email: 'exists@example.com' })
    const result = await createInviteToken(fd)

    expect(result).toEqual({ error: { email: ['Este usuario ya tiene una cuenta'] } })
    expect(mockInviteCreate).not.toHaveBeenCalled()
  })

  it('rejects email with existing active invite token', async () => {
    mockUserFindUnique
      .mockResolvedValueOnce({ isAdmin: true })
      .mockResolvedValueOnce(null)
    mockInviteFindFirst.mockResolvedValue({ id: 'existing-token' })

    const fd = createFormData({ email: 'pending@example.com' })
    const result = await createInviteToken(fd)

    expect(result).toEqual({
      error: { email: ['Ya existe una invitacion activa para este correo'] },
    })
    expect(mockInviteCreate).not.toHaveBeenCalled()
  })

  it('returns Zod field errors for invalid email format', async () => {
    const fd = createFormData({ email: 'not-an-email' })
    const result = await createInviteToken(fd)

    expect('error' in result).toBe(true)
    if ('error' in result) {
      expect(result.error.email).toBeDefined()
    }
    expect(mockInviteCreate).not.toHaveBeenCalled()
    // Zod rejection happens before requireAdmin — so user.findUnique is NOT called
    expect(mockUserFindUnique).not.toHaveBeenCalled()
  })

  it('calls revalidatePath("/configuracion") after successful create', async () => {
    mockUserFindUnique
      .mockResolvedValueOnce({ isAdmin: true })
      .mockResolvedValueOnce(null)
    mockInviteFindFirst.mockResolvedValue(null)
    mockInviteCreate.mockResolvedValue({ id: 'new-token-id' })

    const fd = createFormData({ email: 'invitee@example.com' })
    await createInviteToken(fd)

    expect(mockRevalidatePath).toHaveBeenCalledWith('/configuracion')
  })

  it('maps Prisma P2002 to the "activa" field error', async () => {
    mockUserFindUnique
      .mockResolvedValueOnce({ isAdmin: true })
      .mockResolvedValueOnce(null)
    mockInviteFindFirst.mockResolvedValue(null)
    mockInviteCreate.mockRejectedValue({ code: 'P2002' })

    const fd = createFormData({ email: 'race@example.com' })
    const result = await createInviteToken(fd)

    expect(result).toEqual({
      error: { email: ['Ya existe una invitacion activa para este correo'] },
    })
  })
})

describe('revokeInviteToken', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects a non-cuid tokenId with ID de invitacion invalido', async () => {
    const result = await revokeInviteToken('not-a-cuid')

    expect(result).toEqual({ error: { _form: ['ID de invitacion invalido'] } })
    // cuid validation happens BEFORE requireAdmin -- user.findUnique not called
    expect(mockUserFindUnique).not.toHaveBeenCalled()
    expect(mockInviteUpdate).not.toHaveBeenCalled()
  })

  it('sets revokedAt on a pending token', async () => {
    mockUserFindUnique.mockResolvedValueOnce({ isAdmin: true })
    mockInviteFindFirst.mockResolvedValue({ id: VALID_CUID, usedAt: null, revokedAt: null })
    mockInviteUpdate.mockResolvedValue({ id: VALID_CUID, revokedAt: new Date() })

    const result = await revokeInviteToken(VALID_CUID)

    expect(result).toEqual({ success: true })
    expect(mockInviteUpdate).toHaveBeenCalledWith({
      where: { id: VALID_CUID },
      data: { revokedAt: expect.any(Date) },
    })
    // IDOR scope: findFirst includes createdBy
    expect(mockInviteFindFirst).toHaveBeenCalledWith({
      where: { id: VALID_CUID, createdBy: TEST_USER_ID },
      select: { id: true, usedAt: true, revokedAt: true },
    })
  })

  it('returns IDOR error for token not owned by caller', async () => {
    mockUserFindUnique.mockResolvedValueOnce({ isAdmin: true })
    mockInviteFindFirst.mockResolvedValue(null)

    const result = await revokeInviteToken(VALID_CUID)

    expect(result).toEqual({ error: { _form: ['Invitacion no encontrada'] } })
    expect(mockInviteUpdate).not.toHaveBeenCalled()
  })

  it('refuses to revoke an already-used token', async () => {
    mockUserFindUnique.mockResolvedValueOnce({ isAdmin: true })
    mockInviteFindFirst.mockResolvedValue({
      id: VALID_CUID,
      usedAt: new Date(),
      revokedAt: null,
    })

    const result = await revokeInviteToken(VALID_CUID)

    expect(result).toEqual({
      error: { _form: ['No se puede revocar una invitacion ya usada'] },
    })
    expect(mockInviteUpdate).not.toHaveBeenCalled()
  })

  it('refuses to revoke an already-revoked token', async () => {
    mockUserFindUnique.mockResolvedValueOnce({ isAdmin: true })
    mockInviteFindFirst.mockResolvedValue({
      id: VALID_CUID,
      usedAt: null,
      revokedAt: new Date(),
    })

    const result = await revokeInviteToken(VALID_CUID)

    expect(result).toEqual({
      error: { _form: ['Esta invitacion ya fue revocada'] },
    })
    expect(mockInviteUpdate).not.toHaveBeenCalled()
  })

  it('calls revalidatePath("/configuracion") after successful revoke', async () => {
    mockUserFindUnique.mockResolvedValueOnce({ isAdmin: true })
    mockInviteFindFirst.mockResolvedValue({ id: VALID_CUID, usedAt: null, revokedAt: null })
    mockInviteUpdate.mockResolvedValue({ id: VALID_CUID })

    await revokeInviteToken(VALID_CUID)

    expect(mockRevalidatePath).toHaveBeenCalledWith('/configuracion')
  })
})

describe('listInviteTokens', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns [] for non-admin callers', async () => {
    mockUserFindUnique.mockResolvedValueOnce({ isAdmin: false })

    const result = await listInviteTokens()

    expect(result).toEqual([])
    expect(mockInviteFindMany).not.toHaveBeenCalled()
  })

  it('returns tokens scoped to calling admin (createdBy), ordered desc, take 20', async () => {
    mockUserFindUnique.mockResolvedValueOnce({ isAdmin: true })
    mockInviteFindMany.mockResolvedValue([{ id: 't1' }, { id: 't2' }])

    const result = await listInviteTokens()

    expect(result).toEqual([{ id: 't1' }, { id: 't2' }])
    expect(mockInviteFindMany).toHaveBeenCalledWith({
      where: { createdBy: TEST_USER_ID },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })
  })
})
