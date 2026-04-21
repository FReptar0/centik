import { describe, it } from 'vitest'

describe('challenge (Phase 29 — Wave 1)', () => {
  it.todo('signChallenge + verifyChallenge round-trip returns { userId, email }')
  it.todo('verifyChallenge returns null for a token older than 5 minutes')
  it.todo('verifyChallenge returns null for a token with mutated signature')
  it.todo(
    'verifyChallenge returns null when signature buffer length differs (timingSafeEqual safety)',
  )
})
