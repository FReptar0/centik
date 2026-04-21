import { describe, it } from 'vitest'

describe('totp-crypto (Phase 29 — Wave 1)', () => {
  it.todo('encryptSecret + decryptSecret round-trip preserves plaintext')
  it.todo('generates unique IVs across 1000 encryptions of the same plaintext')
  it.todo('mutating the ciphertext authTag causes decryptSecret to throw')
  it.todo('throws at module import if AUTH_TOTP_ENCRYPTION_KEY is missing / short / non-hex')
})
