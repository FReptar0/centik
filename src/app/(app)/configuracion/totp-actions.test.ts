import { describe, it } from 'vitest'

describe('totp-actions (Phase 29 — Wave 2)', () => {
  it.todo('prepareTotpSecretAction returns { secret, qrDataUrl } for authenticated user')
  it.todo('enableTotpAction rejects wrong code with generic Spanish error')
  it.todo('enableTotpAction persists encrypted secret + 10 backup codes in one $transaction')
  it.todo('disableTotpAction requires current code and clears totpSecret + deletes BackupCode rows')
  it.todo('regenerateBackupCodesAction requires current code and replaces all rows atomically')
  it.todo('all actions use requireAuth() and derive userId from session (IDOR-safe)')
})
