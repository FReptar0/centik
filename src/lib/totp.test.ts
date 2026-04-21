import { describe, it } from 'vitest'

describe('totp (Phase 29 — Wave 1)', () => {
  it.todo('createTotpSecret returns a base32 string')
  it.todo('buildOtpauthUri returns otpauth URI with Centik issuer + email label')
  it.todo('verifyTotp accepts code generated at T+0 (window=1 tolerance)')
  it.todo('verifyTotp rejects code generated at T+60s (outside window=1)')
})
