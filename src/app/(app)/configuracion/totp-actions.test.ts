import { describe, it, expect, vi, beforeEach } from 'vitest'
import bcrypt from 'bcryptjs'

// --- Mocks ---------------------------------------------------------------
const mockUserFindUnique = vi.fn()
const mockUserUpdate = vi.fn()
const mockBackupDeleteMany = vi.fn()
const mockBackupCreateMany = vi.fn()
const mockTransaction = vi.fn()

vi.mock('@/lib/prisma', () => ({
  default: {
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
      update: (...args: unknown[]) => mockUserUpdate(...args),
    },
    backupCode: {
      deleteMany: (...args: unknown[]) => mockBackupDeleteMany(...args),
      createMany: (...args: unknown[]) => mockBackupCreateMany(...args),
    },
    $transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}))

const TEST_USER_ID = 'test-user-id'
const TEST_USER_EMAIL = 'user@centik.test'

vi.mock('@/lib/auth-utils', () => ({
  // Literal string inside mock factory — vi.mock is hoisted above top-level consts.
  requireAuth: vi.fn().mockResolvedValue({ userId: 'test-user-id' }),
}))

const mockRevalidatePath = vi.fn()
vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}))

vi.mock('@/lib/totp', () => ({
  createTotpSecret: vi.fn(() => 'JBSWY3DPEHPK3PXP'),
  buildOtpauthUri: vi.fn(() => 'otpauth://totp/Centik:user@centik.test?secret=X'),
  verifyTotp: vi.fn(),
}))

vi.mock('@/lib/totp-crypto', () => ({
  encryptSecret: vi.fn((s: string) => `enc:${s}`),
  decryptSecret: vi.fn((s: string) => s.replace(/^enc:/, '')),
}))

vi.mock('@/lib/backup-codes', () => ({
  generateBackupCodes: vi.fn(),
  formatForDisplay: vi.fn(
    (raw: string) => `${raw.slice(0, 4).toUpperCase()}-${raw.slice(4, 8).toUpperCase()}`,
  ),
  consumeBackupCode: vi.fn(),
}))

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('$2b$12$fakehashfakehashfakehashfakehashfakehashfake'),
  },
}))

vi.mock('qrcode', () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,AAAA'),
  },
}))

// Imports must come after vi.mock calls
import { verifyTotp, createTotpSecret } from '@/lib/totp'
import { generateBackupCodes, consumeBackupCode } from '@/lib/backup-codes'
import {
  prepareTotpSecretAction,
  enableTotpAction,
  disableTotpAction,
  regenerateBackupCodesAction,
} from './totp-actions'

/** Helper — build FormData with given fields */
function fd(fields: Record<string, string>): FormData {
  const f = new FormData()
  for (const [k, v] of Object.entries(fields)) f.set(k, v)
  return f
}

function tenFakeCodes(): string[] {
  return [
    'aaaaaaaa',
    'bbbbbbbb',
    'cccccccc',
    'dddddddd',
    'eeeeeeee',
    'ffffffff',
    '00000000',
    '11111111',
    '22222222',
    '33333333',
  ]
}

// --- Tests ---------------------------------------------------------------

describe('prepareTotpSecretAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUserFindUnique.mockResolvedValue({ email: TEST_USER_EMAIL })
  })

  it('returns { secret, qrDataUrl } for authenticated user', async () => {
    const result = await prepareTotpSecretAction()
    expect(result).toEqual({
      secret: 'JBSWY3DPEHPK3PXP',
      qrDataUrl: 'data:image/png;base64,AAAA',
    })
  })

  it('does NOT write to the database', async () => {
    await prepareTotpSecretAction()
    expect(mockUserUpdate).not.toHaveBeenCalled()
    expect(mockBackupCreateMany).not.toHaveBeenCalled()
    expect(mockTransaction).not.toHaveBeenCalled()
  })

  it('generates a fresh secret on each call (no server-side caching)', async () => {
    vi.mocked(createTotpSecret)
      .mockReturnValueOnce('SECRET-ONE-AAAAAAAA')
      .mockReturnValueOnce('SECRET-TWO-BBBBBBBB')

    const r1 = await prepareTotpSecretAction()
    const r2 = await prepareTotpSecretAction()

    if ('secret' in r1 && 'secret' in r2) {
      expect(r1.secret).toBe('SECRET-ONE-AAAAAAAA')
      expect(r2.secret).toBe('SECRET-TWO-BBBBBBBB')
    } else {
      throw new Error('expected secrets in both results')
    }
  })

  it('returns error when user row is missing (defense-in-depth)', async () => {
    mockUserFindUnique.mockResolvedValue(null)
    const result = await prepareTotpSecretAction()
    expect(result).toEqual({ error: 'No autorizado' })
  })
})

describe('enableTotpAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(generateBackupCodes).mockReturnValue(tenFakeCodes())
    mockTransaction.mockResolvedValue([])
  })

  it('returns Zod field errors for missing secret', async () => {
    const result = await enableTotpAction(undefined, fd({ code: '123456' }))
    expect('error' in result).toBe(true)
    expect(mockTransaction).not.toHaveBeenCalled()
  })

  it('returns Zod field errors for non-6-digit code', async () => {
    const result = await enableTotpAction(
      undefined,
      fd({ secret: 'JBSWY3DPEHPK3PXP', code: 'abc' }),
    )
    expect('error' in result).toBe(true)
    expect(mockTransaction).not.toHaveBeenCalled()
  })

  it('rejects with "Codigo invalido" when verifyTotp returns false (no writes)', async () => {
    vi.mocked(verifyTotp).mockResolvedValue(false)
    const result = await enableTotpAction(
      undefined,
      fd({ secret: 'JBSWY3DPEHPK3PXP', code: '123456' }),
    )
    expect(result).toEqual({ error: { code: ['Codigo invalido'] } })
    expect(mockTransaction).not.toHaveBeenCalled()
    expect(mockUserUpdate).not.toHaveBeenCalled()
    expect(mockBackupCreateMany).not.toHaveBeenCalled()
  })

  it('persists encrypted secret + 10 backup codes in one $transaction on success', async () => {
    vi.mocked(verifyTotp).mockResolvedValue(true)
    await enableTotpAction(
      undefined,
      fd({ secret: 'JBSWY3DPEHPK3PXP', code: '123456' }),
    )

    expect(mockTransaction).toHaveBeenCalledTimes(1)
    const txOps = mockTransaction.mock.calls[0][0] as unknown[]
    expect(Array.isArray(txOps)).toBe(true)
    expect(txOps.length).toBe(3)

    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: TEST_USER_ID },
      data: { totpSecret: 'enc:JBSWY3DPEHPK3PXP', totpEnabled: true },
    })
    expect(mockBackupDeleteMany).toHaveBeenCalledWith({ where: { userId: TEST_USER_ID } })

    // createMany payload — 10 rows, all with same userId, all codeHashes starting with $2
    const createManyCall = mockBackupCreateMany.mock.calls[0][0]
    expect(createManyCall.data).toHaveLength(10)
    for (const row of createManyCall.data) {
      expect(row.userId).toBe(TEST_USER_ID)
      expect(row.codeHash).toMatch(/^\$2/)
    }
  })

  it('plaintext secret NEVER leaks to user.update — only ciphertext', async () => {
    vi.mocked(verifyTotp).mockResolvedValue(true)
    await enableTotpAction(
      undefined,
      fd({ secret: 'JBSWY3DPEHPK3PXP', code: '123456' }),
    )
    const updateArgs = mockUserUpdate.mock.calls[0][0]
    expect(updateArgs.data.totpSecret).not.toBe('JBSWY3DPEHPK3PXP')
    expect(updateArgs.data.totpSecret).toMatch(/^enc:/)
  })

  it('returns 10 plaintext backup codes (XXXX-XXXX) ONCE on success', async () => {
    vi.mocked(verifyTotp).mockResolvedValue(true)
    const result = await enableTotpAction(
      undefined,
      fd({ secret: 'JBSWY3DPEHPK3PXP', code: '123456' }),
    )
    if (!('success' in result) || !result.success) {
      throw new Error('expected success result')
    }
    expect(result.backupCodes).toHaveLength(10)
    for (const code of result.backupCodes) {
      expect(code).toMatch(/^[0-9A-F]{4}-[0-9A-F]{4}$/)
    }
  })

  it('hashes all 10 codes BEFORE opening $transaction (Pitfall 9)', async () => {
    vi.mocked(verifyTotp).mockResolvedValue(true)
    const hashSpy = vi.mocked(bcrypt.hash)
    await enableTotpAction(
      undefined,
      fd({ secret: 'JBSWY3DPEHPK3PXP', code: '123456' }),
    )

    expect(hashSpy).toHaveBeenCalledTimes(10)
    const lastHashOrder = Math.max(...hashSpy.mock.invocationCallOrder)
    const firstTxOrder = mockTransaction.mock.invocationCallOrder[0]
    expect(lastHashOrder).toBeLessThan(firstTxOrder)
  })

  it('uses userId from requireAuth ONLY, never from formData (IDOR-safe)', async () => {
    vi.mocked(verifyTotp).mockResolvedValue(true)
    const form = fd({
      secret: 'JBSWY3DPEHPK3PXP',
      code: '123456',
      userId: 'malicious-id',
    })
    await enableTotpAction(undefined, form)

    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: TEST_USER_ID } }),
    )
    const createManyCall = mockBackupCreateMany.mock.calls[0][0]
    for (const row of createManyCall.data) {
      expect(row.userId).toBe(TEST_USER_ID)
    }
  })

  it('calls revalidatePath("/configuracion") on success', async () => {
    vi.mocked(verifyTotp).mockResolvedValue(true)
    await enableTotpAction(
      undefined,
      fd({ secret: 'JBSWY3DPEHPK3PXP', code: '123456' }),
    )
    expect(mockRevalidatePath).toHaveBeenCalledWith('/configuracion')
  })

  it('returns generic _form error on transaction failure (no detail leak)', async () => {
    vi.mocked(verifyTotp).mockResolvedValue(true)
    mockTransaction.mockRejectedValueOnce(new Error('db exploded'))
    const result = await enableTotpAction(
      undefined,
      fd({ secret: 'JBSWY3DPEHPK3PXP', code: '123456' }),
    )
    expect(result).toEqual({ error: { _form: ['No pudimos activar 2FA. Intenta de nuevo.'] } })
  })
})

describe('disableTotpAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockTransaction.mockResolvedValue([])
  })

  it('returns Zod field errors for malformed code', async () => {
    const result = await disableTotpAction(undefined, fd({ code: 'xx' }))
    expect('error' in result).toBe(true)
    expect(mockTransaction).not.toHaveBeenCalled()
  })

  it('returns ambiguous "Codigo invalido" when user has totpEnabled=false', async () => {
    mockUserFindUnique.mockResolvedValue({ totpSecret: null, totpEnabled: false })
    const result = await disableTotpAction(undefined, fd({ code: '123456' }))
    expect(result).toEqual({ error: { _form: ['Codigo invalido'] } })
    expect(mockTransaction).not.toHaveBeenCalled()
  })

  it('returns ambiguous "Codigo invalido" when totpSecret is null (stale state)', async () => {
    mockUserFindUnique.mockResolvedValue({ totpSecret: null, totpEnabled: true })
    const result = await disableTotpAction(undefined, fd({ code: '123456' }))
    expect(result).toEqual({ error: { _form: ['Codigo invalido'] } })
    expect(mockTransaction).not.toHaveBeenCalled()
  })

  it('rejects with "Codigo invalido" when verifyTotp returns false', async () => {
    mockUserFindUnique.mockResolvedValue({
      totpSecret: 'enc:JBSWY3DPEHPK3PXP',
      totpEnabled: true,
    })
    vi.mocked(verifyTotp).mockResolvedValue(false)

    const result = await disableTotpAction(undefined, fd({ code: '999999' }))
    expect(result).toEqual({ error: { _form: ['Codigo invalido'] } })
    expect(mockTransaction).not.toHaveBeenCalled()
  })

  it('valid 6-digit TOTP code clears secret + deletes backup codes in one $transaction', async () => {
    mockUserFindUnique.mockResolvedValue({
      totpSecret: 'enc:JBSWY3DPEHPK3PXP',
      totpEnabled: true,
    })
    vi.mocked(verifyTotp).mockResolvedValue(true)

    const result = await disableTotpAction(undefined, fd({ code: '123456' }))
    expect(result).toEqual({ success: true })
    expect(mockTransaction).toHaveBeenCalledTimes(1)
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: TEST_USER_ID },
      data: { totpSecret: null, totpEnabled: false },
    })
    expect(mockBackupDeleteMany).toHaveBeenCalledWith({ where: { userId: TEST_USER_ID } })
  })

  it('valid 8-hex backup code (with dash) triggers consumeBackupCode and disables', async () => {
    mockUserFindUnique.mockResolvedValue({
      totpSecret: 'enc:JBSWY3DPEHPK3PXP',
      totpEnabled: true,
    })
    vi.mocked(consumeBackupCode).mockResolvedValue(true)

    const result = await disableTotpAction(undefined, fd({ code: 'ab12-cd34' }))
    expect(result).toEqual({ success: true })
    expect(vi.mocked(consumeBackupCode)).toHaveBeenCalledWith(TEST_USER_ID, 'ab12cd34')
    expect(mockTransaction).toHaveBeenCalledTimes(1)
  })

  it('rejects when backup-code shape is wrong', async () => {
    mockUserFindUnique.mockResolvedValue({
      totpSecret: 'enc:JBSWY3DPEHPK3PXP',
      totpEnabled: true,
    })

    const result = await disableTotpAction(undefined, fd({ code: 'zzzzzzzz' }))
    expect(result).toEqual({ error: { _form: ['Codigo invalido'] } })
    expect(mockTransaction).not.toHaveBeenCalled()
  })

  it('userId is taken from requireAuth — never from formData (IDOR-safe)', async () => {
    mockUserFindUnique.mockResolvedValue({
      totpSecret: 'enc:JBSWY3DPEHPK3PXP',
      totpEnabled: true,
    })
    vi.mocked(verifyTotp).mockResolvedValue(true)

    const form = fd({ code: '123456', userId: 'malicious-id' })
    await disableTotpAction(undefined, form)

    expect(mockUserFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: TEST_USER_ID } }),
    )
    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: TEST_USER_ID } }),
    )
    expect(mockBackupDeleteMany).toHaveBeenCalledWith({ where: { userId: TEST_USER_ID } })
  })

  it('calls revalidatePath("/configuracion") on success', async () => {
    mockUserFindUnique.mockResolvedValue({
      totpSecret: 'enc:JBSWY3DPEHPK3PXP',
      totpEnabled: true,
    })
    vi.mocked(verifyTotp).mockResolvedValue(true)

    await disableTotpAction(undefined, fd({ code: '123456' }))
    expect(mockRevalidatePath).toHaveBeenCalledWith('/configuracion')
  })
})

describe('regenerateBackupCodesAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(generateBackupCodes).mockReturnValue(tenFakeCodes())
    mockTransaction.mockResolvedValue([])
  })

  it('returns Zod field errors for malformed code', async () => {
    const result = await regenerateBackupCodesAction(undefined, fd({ code: 'xx' }))
    expect('error' in result).toBe(true)
    expect(mockTransaction).not.toHaveBeenCalled()
  })

  it('rejects with ambiguous "Codigo invalido" when verifyTotp fails', async () => {
    mockUserFindUnique.mockResolvedValue({
      totpSecret: 'enc:JBSWY3DPEHPK3PXP',
      totpEnabled: true,
    })
    vi.mocked(verifyTotp).mockResolvedValue(false)

    const result = await regenerateBackupCodesAction(undefined, fd({ code: '999999' }))
    expect(result).toEqual({ error: { _form: ['Codigo invalido'] } })
    expect(mockTransaction).not.toHaveBeenCalled()
  })

  it('valid code -> atomic deleteMany + createMany in one $transaction', async () => {
    mockUserFindUnique.mockResolvedValue({
      totpSecret: 'enc:JBSWY3DPEHPK3PXP',
      totpEnabled: true,
    })
    vi.mocked(verifyTotp).mockResolvedValue(true)

    const result = await regenerateBackupCodesAction(undefined, fd({ code: '123456' }))
    if (!('success' in result) || !result.success) {
      throw new Error('expected success result')
    }
    expect(result.backupCodes).toHaveLength(10)
    expect(mockTransaction).toHaveBeenCalledTimes(1)

    expect(mockBackupDeleteMany).toHaveBeenCalledWith({ where: { userId: TEST_USER_ID } })
    const createManyCall = mockBackupCreateMany.mock.calls[0][0]
    expect(createManyCall.data).toHaveLength(10)
    for (const row of createManyCall.data) {
      expect(row.userId).toBe(TEST_USER_ID)
      expect(row.codeHash).toMatch(/^\$2/)
    }
  })

  it('hashes all 10 codes BEFORE opening $transaction', async () => {
    mockUserFindUnique.mockResolvedValue({
      totpSecret: 'enc:JBSWY3DPEHPK3PXP',
      totpEnabled: true,
    })
    vi.mocked(verifyTotp).mockResolvedValue(true)
    const hashSpy = vi.mocked(bcrypt.hash)

    await regenerateBackupCodesAction(undefined, fd({ code: '123456' }))

    expect(hashSpy).toHaveBeenCalledTimes(10)
    const lastHashOrder = Math.max(...hashSpy.mock.invocationCallOrder)
    const firstTxOrder = mockTransaction.mock.invocationCallOrder[0]
    expect(lastHashOrder).toBeLessThan(firstTxOrder)
  })

  it('returns formatted XXXX-XXXX codes and calls revalidatePath', async () => {
    mockUserFindUnique.mockResolvedValue({
      totpSecret: 'enc:JBSWY3DPEHPK3PXP',
      totpEnabled: true,
    })
    vi.mocked(verifyTotp).mockResolvedValue(true)

    const result = await regenerateBackupCodesAction(undefined, fd({ code: '123456' }))
    if (!('success' in result) || !result.success) {
      throw new Error('expected success result')
    }
    for (const code of result.backupCodes) {
      expect(code).toMatch(/^[0-9A-F]{4}-[0-9A-F]{4}$/)
    }
    expect(mockRevalidatePath).toHaveBeenCalledWith('/configuracion')
  })

  it('userId from requireAuth only (IDOR-safe)', async () => {
    mockUserFindUnique.mockResolvedValue({
      totpSecret: 'enc:JBSWY3DPEHPK3PXP',
      totpEnabled: true,
    })
    vi.mocked(verifyTotp).mockResolvedValue(true)

    const form = fd({ code: '123456', userId: 'malicious-id' })
    await regenerateBackupCodesAction(undefined, form)

    expect(mockBackupDeleteMany).toHaveBeenCalledWith({ where: { userId: TEST_USER_ID } })
    const createManyCall = mockBackupCreateMany.mock.calls[0][0]
    for (const row of createManyCall.data) {
      expect(row.userId).toBe(TEST_USER_ID)
    }
  })
})
