import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { generate } from 'otplib'
import { buildOtpauthUri, createTotpSecret, verifyTotp } from './totp'

describe('totp (Phase 29 — Wave 1)', () => {
  describe('createTotpSecret', () => {
    it('returns a non-empty base32 string (A-Z, 2-7 alphabet, 16+ chars)', () => {
      const secret = createTotpSecret()
      expect(typeof secret).toBe('string')
      expect(secret.length).toBeGreaterThanOrEqual(16)
      expect(secret).toMatch(/^[A-Z2-7]+=*$/)
    })

    it('produces different secrets on each call', () => {
      const a = createTotpSecret()
      const b = createTotpSecret()
      expect(a).not.toBe(b)
    })
  })

  describe('buildOtpauthUri', () => {
    it('returns an otpauth://totp URI with Centik issuer + email label', () => {
      const uri = buildOtpauthUri('JBSWY3DPEHPK3PXP', 'user@example.com')
      expect(uri).toMatch(/^otpauth:\/\/totp\//)
      expect(uri).toContain('Centik')
      expect(uri).toContain('issuer=Centik')
      // secret is URL-encoded in the query string
      expect(uri).toContain('secret=JBSWY3DPEHPK3PXP')
    })

    it('encodes the email inside the label', () => {
      const uri = buildOtpauthUri('JBSWY3DPEHPK3PXP', 'user@example.com')
      // @ becomes %40 in URI-encoded form
      expect(uri).toMatch(/Centik%3Auser%40example\.com|Centik:user%40example\.com/)
    })
  })

  describe('verifyTotp', () => {
    // Use createTotpSecret to obtain a valid base32 secret (otplib default length/padding rules).
    let SECRET: string

    beforeEach(() => {
      SECRET = createTotpSecret()
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('accepts a code generated at T+0', async () => {
      const code = await generate({ secret: SECRET })
      const valid = await verifyTotp(SECRET, code)
      expect(valid).toBe(true)
    })

    it('accepts a code generated 29 seconds ago (within window=1 tolerance)', async () => {
      const codeAtT0 = await generate({ secret: SECRET })
      // Advance system time by 29s — code from T+0 should still be valid within epochTolerance=30s
      vi.setSystemTime(new Date('2026-01-01T00:00:29Z'))
      const valid = await verifyTotp(SECRET, codeAtT0)
      expect(valid).toBe(true)
    })

    it('rejects a code generated 120 seconds ago (outside window)', async () => {
      const codeAtT0 = await generate({ secret: SECRET })
      vi.setSystemTime(new Date('2026-01-01T00:02:00Z'))
      const valid = await verifyTotp(SECRET, codeAtT0)
      expect(valid).toBe(false)
    })

    it('returns false for a clearly wrong code without throwing', async () => {
      const valid = await verifyTotp(SECRET, '000000')
      expect(valid).toBe(false)
    })

    it('returns false for a non-numeric code without throwing', async () => {
      const valid = await verifyTotp(SECRET, 'abcdef')
      expect(valid).toBe(false)
    })

    it('returns false for an empty code', async () => {
      const valid = await verifyTotp(SECRET, '')
      expect(valid).toBe(false)
    })
  })
})
