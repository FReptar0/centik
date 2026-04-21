import { describe, it } from 'vitest'

describe('rate-limit (Phase 29 — Wave 1)', () => {
  it.todo('checkRateLimit returns success=true when RATE_LIMIT_DISABLED=true')
  it.todo('checkRateLimit returns success=true for first 5 attempts (mocked limiter)')
  it.todo('checkRateLimit returns success=false on 6th attempt (mocked limiter)')
  it.todo('getClientIp returns first hop of x-forwarded-for')
  it.todo('getClientIp falls back to x-real-ip then 127.0.0.1')
})
