import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock @upstash/ratelimit and @upstash/redis so tests never hit real Upstash.
// The Ratelimit mock is a class constructor spy — we override .limit() per test.
vi.mock('@upstash/ratelimit', () => {
  class FakeRatelimit {
    limit = vi.fn().mockResolvedValue({
      success: true,
      limit: 5,
      remaining: 4,
      reset: Date.now() + 60_000,
      pending: Promise.resolve(),
    })
    static slidingWindow = vi.fn(() => ({ kind: 'sliding' }))
    static fixedWindow = vi.fn()
  }
  return { Ratelimit: FakeRatelimit }
})

vi.mock('@upstash/redis', () => ({
  Redis: { fromEnv: vi.fn(() => ({})) },
}))

// Mock next/headers for getClientIp tests
vi.mock('next/headers', () => ({
  headers: vi.fn(),
}))

import { headers } from 'next/headers'

const mockedHeaders = vi.mocked(headers)

describe('rate-limit (Phase 29 — Wave 1)', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  describe('bypass logic (loginLimiter / totpLimiter as null)', () => {
    it('loginLimiter + totpLimiter are null when NODE_ENV=test (default)', async () => {
      vi.stubEnv('NODE_ENV', 'test')
      vi.stubEnv('RATE_LIMIT_DISABLED', 'false')
      const mod = await import('./rate-limit')
      expect(mod.loginLimiter).toBeNull()
      expect(mod.totpLimiter).toBeNull()
    })

    it('loginLimiter + totpLimiter are null when RATE_LIMIT_DISABLED=true even in production', async () => {
      vi.stubEnv('NODE_ENV', 'production')
      vi.stubEnv('RATE_LIMIT_DISABLED', 'true')
      const mod = await import('./rate-limit')
      expect(mod.loginLimiter).toBeNull()
      expect(mod.totpLimiter).toBeNull()
    })

    it('loginLimiter + totpLimiter are NOT null when NODE_ENV=production and RATE_LIMIT_DISABLED is unset', async () => {
      vi.stubEnv('NODE_ENV', 'production')
      vi.stubEnv('RATE_LIMIT_DISABLED', '')
      const mod = await import('./rate-limit')
      expect(mod.loginLimiter).not.toBeNull()
      expect(mod.totpLimiter).not.toBeNull()
    })
  })

  describe('checkRateLimit', () => {
    it('returns { success: true } when limiter is null (bypass)', async () => {
      const { checkRateLimit } = await import('./rate-limit')
      const result = await checkRateLimit(null, 'any-key')
      expect(result).toEqual({ success: true })
    })

    it('returns { success: true } when limiter.limit reports success', async () => {
      const { checkRateLimit } = await import('./rate-limit')
      const fakeLimiter = {
        limit: vi.fn().mockResolvedValue({
          success: true,
          limit: 5,
          remaining: 4,
          reset: Date.now() + 60_000,
          pending: Promise.resolve(),
        }),
      } as unknown as import('@upstash/ratelimit').Ratelimit
      const result = await checkRateLimit(fakeLimiter, 'a:b')
      expect(result).toEqual({ success: true })
      expect(fakeLimiter.limit).toHaveBeenCalledWith('a:b')
    })

    it('returns { success: false, retryAfterMs } when limiter.limit reports failure', async () => {
      const { checkRateLimit } = await import('./rate-limit')
      const fakeLimiter = {
        limit: vi.fn().mockResolvedValue({
          success: false,
          limit: 5,
          remaining: 0,
          reset: Date.now() + 45_000,
          pending: Promise.resolve(),
        }),
      } as unknown as import('@upstash/ratelimit').Ratelimit
      const result = await checkRateLimit(fakeLimiter, 'a:b')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.retryAfterMs).toBeGreaterThan(0)
        expect(result.retryAfterMs).toBeLessThanOrEqual(45_000)
      }
    })

    it('first 5 mocked calls pass, 6th fails (sliding window contract)', async () => {
      const { checkRateLimit } = await import('./rate-limit')
      let callCount = 0
      const fakeLimiter = {
        limit: vi.fn().mockImplementation(async () => {
          callCount++
          if (callCount <= 5) {
            return {
              success: true,
              limit: 5,
              remaining: 5 - callCount,
              reset: Date.now() + 60_000,
              pending: Promise.resolve(),
            }
          }
          return {
            success: false,
            limit: 5,
            remaining: 0,
            reset: Date.now() + 60_000,
            pending: Promise.resolve(),
          }
        }),
      } as unknown as import('@upstash/ratelimit').Ratelimit

      for (let i = 1; i <= 5; i++) {
        expect((await checkRateLimit(fakeLimiter, 'user:ip')).success).toBe(true)
      }
      const sixth = await checkRateLimit(fakeLimiter, 'user:ip')
      expect(sixth.success).toBe(false)
    })
  })

  describe('getClientIp', () => {
    it('returns first hop of x-forwarded-for (comma-separated)', async () => {
      mockedHeaders.mockResolvedValue(new Headers({ 'x-forwarded-for': '203.0.113.5, 10.0.0.1' }))
      const { getClientIp } = await import('./rate-limit')
      expect(await getClientIp()).toBe('203.0.113.5')
    })

    it('returns x-forwarded-for value when single hop', async () => {
      mockedHeaders.mockResolvedValue(new Headers({ 'x-forwarded-for': '203.0.113.9' }))
      const { getClientIp } = await import('./rate-limit')
      expect(await getClientIp()).toBe('203.0.113.9')
    })

    it('falls back to x-real-ip when x-forwarded-for is absent', async () => {
      mockedHeaders.mockResolvedValue(new Headers({ 'x-real-ip': '10.0.0.5' }))
      const { getClientIp } = await import('./rate-limit')
      expect(await getClientIp()).toBe('10.0.0.5')
    })

    it('falls back to 127.0.0.1 when neither header is set', async () => {
      mockedHeaders.mockResolvedValue(new Headers({}))
      const { getClientIp } = await import('./rate-limit')
      expect(await getClientIp()).toBe('127.0.0.1')
    })

    it('trims whitespace from the first hop', async () => {
      mockedHeaders.mockResolvedValue(
        new Headers({ 'x-forwarded-for': '  203.0.113.5  ,10.0.0.1' }),
      )
      const { getClientIp } = await import('./rate-limit')
      expect(await getClientIp()).toBe('203.0.113.5')
    })

    it('falls back to x-real-ip when x-forwarded-for first hop is empty after trim', async () => {
      mockedHeaders.mockResolvedValue(
        new Headers({ 'x-forwarded-for': ',  10.0.0.1', 'x-real-ip': '10.0.0.5' }),
      )
      const { getClientIp } = await import('./rate-limit')
      expect(await getClientIp()).toBe('10.0.0.5')
    })
  })
})
