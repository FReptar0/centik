import { beforeEach, describe, expect, it, vi } from 'vitest'
import bcrypt from 'bcryptjs'

// Mock the Prisma singleton so we can drive findMany/updateMany per test.
vi.mock('@/lib/prisma', () => ({
  default: {
    backupCode: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}))

import prismaMock from '@/lib/prisma'
import {
  consumeBackupCode,
  formatForDisplay,
  generateBackupCodes,
  hashBackupCodes,
} from './backup-codes'

// Typed accessors for the mocked Prisma methods.
const findMany = (prismaMock as unknown as { backupCode: { findMany: ReturnType<typeof vi.fn> } })
  .backupCode.findMany
const updateMany = (
  prismaMock as unknown as { backupCode: { updateMany: ReturnType<typeof vi.fn> } }
).backupCode.updateMany

describe('backup-codes (Phase 29 — Wave 1)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('generateBackupCodes', () => {
    it('returns an array of 10 codes by default, each matching /^[0-9a-f]{8}$/', () => {
      const codes = generateBackupCodes()
      expect(codes).toHaveLength(10)
      codes.forEach((c) => expect(c).toMatch(/^[0-9a-f]{8}$/))
    })

    it('returns 10 unique codes with overwhelming probability', () => {
      const codes = generateBackupCodes(10)
      const unique = new Set(codes)
      expect(unique.size).toBe(10)
    })

    it('respects n parameter', () => {
      expect(generateBackupCodes(3)).toHaveLength(3)
      expect(generateBackupCodes(1)).toHaveLength(1)
    })
  })

  describe('formatForDisplay', () => {
    it("uppercases and inserts dash: 'ab12cd34' -> 'AB12-CD34'", () => {
      expect(formatForDisplay('ab12cd34')).toBe('AB12-CD34')
    })

    it('handles all-zero and all-f edge cases', () => {
      expect(formatForDisplay('00000000')).toBe('0000-0000')
      expect(formatForDisplay('ffff0000')).toBe('FFFF-0000')
    })
  })

  describe('hashBackupCodes', () => {
    it('hashes each code; bcrypt.compare matches the raw form', async () => {
      const [hash] = await hashBackupCodes(['ab12cd34'])
      expect(typeof hash).toBe('string')
      expect(hash.startsWith('$2')).toBe(true) // bcrypt identifier
      expect(await bcrypt.compare('ab12cd34', hash)).toBe(true)
    })

    it('normalizes (strips dashes, lowercases) BEFORE hashing so display form matches raw', async () => {
      const [hashOfDisplay] = await hashBackupCodes(['AB12-CD34'])
      // Hash of display form must be verifiable against the NORMALIZED raw code
      expect(await bcrypt.compare('ab12cd34', hashOfDisplay)).toBe(true)
    })

    it('returns one hash per input code', async () => {
      const hashes = await hashBackupCodes(['aaaa0000', 'bbbb1111', 'cccc2222'])
      expect(hashes).toHaveLength(3)
      hashes.forEach((h) => expect(h.startsWith('$2')).toBe(true))
    })
  })

  describe('consumeBackupCode', () => {
    const USER_A = 'user-a'
    const USER_B = 'user-b'
    const RAW_CODE = 'ab12cd34'

    it('returns true on first match, advances DB state via updateMany', async () => {
      const hash = await bcrypt.hash(RAW_CODE, 12)
      findMany.mockResolvedValueOnce([{ id: 'bc-1', codeHash: hash }])
      updateMany.mockResolvedValueOnce({ count: 1 })

      const result = await consumeBackupCode(USER_A, RAW_CODE)
      expect(result).toBe(true)
      expect(findMany).toHaveBeenCalledWith({
        where: { userId: USER_A, usedAt: null },
        select: { id: true, codeHash: true },
      })
      expect(updateMany).toHaveBeenCalledWith({
        where: { id: 'bc-1', usedAt: null },
        data: { usedAt: expect.any(Date) },
      })
    })

    it('returns false on second call (updateMany count=0, already consumed)', async () => {
      const hash = await bcrypt.hash(RAW_CODE, 12)
      findMany.mockResolvedValueOnce([{ id: 'bc-1', codeHash: hash }])
      updateMany.mockResolvedValueOnce({ count: 0 }) // row already consumed by concurrent request

      const result = await consumeBackupCode(USER_A, RAW_CODE)
      expect(result).toBe(false)
    })

    it('returns false when no candidates belong to the user (cross-user isolation)', async () => {
      // User B has no rows — User A's code cannot possibly match
      findMany.mockResolvedValueOnce([])

      const result = await consumeBackupCode(USER_B, RAW_CODE)
      expect(result).toBe(false)
      expect(findMany).toHaveBeenCalledWith({
        where: { userId: USER_B, usedAt: null },
        select: { id: true, codeHash: true },
      })
      expect(updateMany).not.toHaveBeenCalled()
    })

    it('returns false for a malformed code (shape check, no DB hit)', async () => {
      const result = await consumeBackupCode(USER_A, 'not-hex')
      expect(result).toBe(false)
      expect(findMany).not.toHaveBeenCalled()
    })

    it("accepts the display form 'AB12-CD34' when a hash of 'ab12cd34' exists", async () => {
      const hash = await bcrypt.hash('ab12cd34', 12)
      findMany.mockResolvedValueOnce([{ id: 'bc-1', codeHash: hash }])
      updateMany.mockResolvedValueOnce({ count: 1 })

      const result = await consumeBackupCode(USER_A, 'AB12-CD34')
      expect(result).toBe(true)
    })

    it('returns false when bcrypt.compare misses every candidate (wrong code)', async () => {
      const hash = await bcrypt.hash('somethingelse', 12)
      findMany.mockResolvedValueOnce([{ id: 'bc-1', codeHash: hash }])

      const result = await consumeBackupCode(USER_A, RAW_CODE)
      expect(result).toBe(false)
      expect(updateMany).not.toHaveBeenCalled()
    })
  })
})
