import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const VALID_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'

/** Dynamically re-import the module under test after env stubs so loadKey() re-runs. */
async function importFreshWithKey(key: string | undefined) {
  vi.resetModules()
  if (key === undefined) {
    vi.stubEnv('AUTH_TOTP_ENCRYPTION_KEY', '')
    // stubEnv can't truly unset; simulate absence via empty string — loadKey rejects empty
  } else {
    vi.stubEnv('AUTH_TOTP_ENCRYPTION_KEY', key)
  }
  return await import('./totp-crypto')
}

describe('totp-crypto (Phase 29 — Wave 1)', () => {
  beforeEach(() => {
    vi.stubEnv('AUTH_TOTP_ENCRYPTION_KEY', VALID_KEY)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('encryptSecret + decryptSecret round-trip preserves plaintext', async () => {
    const { encryptSecret, decryptSecret } = await importFreshWithKey(VALID_KEY)
    const plain = 'JBSWY3DPEHPK3PXP'
    const encrypted = encryptSecret(plain)
    expect(decryptSecret(encrypted)).toBe(plain)
  })

  it('round-trips unicode and multi-byte characters losslessly', async () => {
    const { encryptSecret, decryptSecret } = await importFreshWithKey(VALID_KEY)
    const plain = 'JBSWY3DPEHPK3PXP-áéí-✓'
    expect(decryptSecret(encryptSecret(plain))).toBe(plain)
  })

  it('produces unique IVs across 1000 encryptions of the same plaintext', async () => {
    const { encryptSecret } = await importFreshWithKey(VALID_KEY)
    const plain = 'JBSWY3DPEHPK3PXP'
    const ivs = new Set<string>()
    for (let i = 0; i < 1000; i++) {
      const [iv] = encryptSecret(plain).split(':')
      ivs.add(iv)
    }
    expect(ivs.size).toBe(1000)
  })

  it('output matches format iv:ciphertext:authTag (all hex) with 24-char IV', async () => {
    const { encryptSecret } = await importFreshWithKey(VALID_KEY)
    const out = encryptSecret('JBSWY3DPEHPK3PXP')
    expect(out).toMatch(/^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/)
    const [iv] = out.split(':')
    expect(iv.length).toBe(24) // 12 bytes = 24 hex chars
  })

  it('mutating the authTag causes decryptSecret to throw', async () => {
    const { encryptSecret, decryptSecret } = await importFreshWithKey(VALID_KEY)
    const encrypted = encryptSecret('JBSWY3DPEHPK3PXP')
    const [iv, ct, tag] = encrypted.split(':')
    // Flip the last hex char of authTag
    const lastChar = tag[tag.length - 1]
    const flipped = (parseInt(lastChar, 16) ^ 0x1).toString(16)
    const tamperedTag = tag.slice(0, -1) + flipped
    const tampered = `${iv}:${ct}:${tamperedTag}`
    expect(() => decryptSecret(tampered)).toThrow()
  })

  it('mutating the ciphertext byte causes decryptSecret to throw', async () => {
    const { encryptSecret, decryptSecret } = await importFreshWithKey(VALID_KEY)
    const encrypted = encryptSecret('JBSWY3DPEHPK3PXP')
    const [iv, ct, tag] = encrypted.split(':')
    const firstChar = ct[0]
    const flipped = (parseInt(firstChar, 16) ^ 0x1).toString(16)
    const tamperedCt = flipped + ct.slice(1)
    const tampered = `${iv}:${tamperedCt}:${tag}`
    expect(() => decryptSecret(tampered)).toThrow()
  })

  it('throws for malformed stored value (wrong number of parts)', async () => {
    const { decryptSecret } = await importFreshWithKey(VALID_KEY)
    expect(() => decryptSecret('not-three-parts')).toThrow('Invalid ciphertext format')
    expect(() => decryptSecret('a:b')).toThrow('Invalid ciphertext format')
    expect(() => decryptSecret('a:b:c:d')).toThrow('Invalid ciphertext format')
  })

  it('throws at module import when AUTH_TOTP_ENCRYPTION_KEY is unset', async () => {
    vi.resetModules()
    vi.stubEnv('AUTH_TOTP_ENCRYPTION_KEY', '')
    await expect(import('./totp-crypto')).rejects.toThrow(/AUTH_TOTP_ENCRYPTION_KEY/)
  })

  it('throws at module import when AUTH_TOTP_ENCRYPTION_KEY is too short (63 chars)', async () => {
    vi.resetModules()
    vi.stubEnv('AUTH_TOTP_ENCRYPTION_KEY', 'a'.repeat(63))
    await expect(import('./totp-crypto')).rejects.toThrow(/64-character hex/)
  })

  it('throws at module import when AUTH_TOTP_ENCRYPTION_KEY is too long (65 chars)', async () => {
    vi.resetModules()
    vi.stubEnv('AUTH_TOTP_ENCRYPTION_KEY', 'a'.repeat(65))
    await expect(import('./totp-crypto')).rejects.toThrow(/64-character hex/)
  })

  it('throws at module import when AUTH_TOTP_ENCRYPTION_KEY contains non-hex chars', async () => {
    vi.resetModules()
    // 64 chars but contains 'z' (non-hex)
    vi.stubEnv('AUTH_TOTP_ENCRYPTION_KEY', 'z'.repeat(64))
    await expect(import('./totp-crypto')).rejects.toThrow(/64-character hex/)
  })
})
