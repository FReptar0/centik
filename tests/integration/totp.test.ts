import { describe, it } from 'vitest'

describe('TOTP 2FA — integration (Phase 29 — Wave 3)', () => {
  it.todo('enable flow: encrypts secret + creates 10 BackupCodes in one transaction')
  it.todo('login with TOTP: real authorizeUser + real crypto + real DB round-trip')
  it.todo('login with backup code: consumes row, second use fails')
  it.todo('disable flow: clears totpSecret + deletes BackupCode rows atomically')
  it.todo("cross-user isolation: User B cannot consume User A's backup code")
  it.todo(
    'concurrent consume: Promise.all([consume, consume]) of same code yields exactly 1 success',
  )
  it.todo('stored totpSecret matches /^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/ after enable')
})
