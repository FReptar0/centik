// src/lib/env.test.ts — boot-time validator tests (Plan 30-02).
// Pattern: vi.resetModules + vi.stubEnv + await import('./env') forces re-parse per test.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const VALID_AUTH_SECRET = 'a'.repeat(32)
const VALID_TOTP_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'

/** Minimal valid env block (development profile — UPSTASH not required). */
function baseDevEnv() {
  vi.stubEnv('NODE_ENV', 'development')
  vi.stubEnv('DATABASE_URL', 'postgresql://dev:dev@localhost:5432/dev')
  vi.stubEnv('AUTH_SECRET', VALID_AUTH_SECRET)
  vi.stubEnv('AUTH_TOTP_ENCRYPTION_KEY', VALID_TOTP_KEY)
  vi.stubEnv('UPSTASH_REDIS_REST_URL', '')
  vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '')
  vi.stubEnv('RATE_LIMIT_DISABLED', 'true')
}

/** Minimal valid env block (production profile — UPSTASH required, RATE_LIMIT_DISABLED unset). */
function baseProdEnv() {
  vi.stubEnv('NODE_ENV', 'production')
  vi.stubEnv('DATABASE_URL', 'postgresql://prod:prod@pooled.db.prisma.io:5432/prod')
  vi.stubEnv('AUTH_SECRET', VALID_AUTH_SECRET)
  vi.stubEnv('AUTH_TOTP_ENCRYPTION_KEY', VALID_TOTP_KEY)
  vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://upstash.example.io')
  vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'token')
  vi.stubEnv('RATE_LIMIT_DISABLED', '')
}

describe('env.ts (Plan 30-02 — boot-time validator)', () => {
  beforeEach(() => {
    vi.resetModules()
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('parses development env successfully with minimal required vars', async () => {
    baseDevEnv()
    const mod = await import('./env')
    expect(mod.env.NODE_ENV).toBe('development')
    expect(mod.env.AUTH_SECRET).toBe(VALID_AUTH_SECRET)
    expect(mod.env.AUTH_TOTP_ENCRYPTION_KEY).toBe(VALID_TOTP_KEY)
  })

  it('parses production env successfully when UPSTASH_* set and RATE_LIMIT_DISABLED unset', async () => {
    baseProdEnv()
    const mod = await import('./env')
    expect(mod.env.NODE_ENV).toBe('production')
    expect(mod.env.UPSTASH_REDIS_REST_URL).toBe('https://upstash.example.io')
  })

  it('throws when AUTH_SECRET is shorter than 32 chars', async () => {
    baseDevEnv()
    vi.stubEnv('AUTH_SECRET', 'short')
    await expect(import('./env')).rejects.toThrow(/AUTH_SECRET/)
  })

  it('throws when AUTH_TOTP_ENCRYPTION_KEY is not 64 hex chars', async () => {
    baseDevEnv()
    vi.stubEnv('AUTH_TOTP_ENCRYPTION_KEY', 'not-hex')
    await expect(import('./env')).rejects.toThrow(/AUTH_TOTP_ENCRYPTION_KEY/)
  })

  it('throws in production when UPSTASH_REDIS_REST_URL is missing (D-19)', async () => {
    baseProdEnv()
    vi.stubEnv('UPSTASH_REDIS_REST_URL', '')
    await expect(import('./env')).rejects.toThrow(/UPSTASH_REDIS_REST_URL/)
  })

  it('throws in production when UPSTASH_REDIS_REST_TOKEN is missing (D-19)', async () => {
    baseProdEnv()
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '')
    await expect(import('./env')).rejects.toThrow(/UPSTASH_REDIS_REST_TOKEN/)
  })

  it('throws in production when RATE_LIMIT_DISABLED=true (D-20)', async () => {
    baseProdEnv()
    vi.stubEnv('RATE_LIMIT_DISABLED', 'true')
    await expect(import('./env')).rejects.toThrow(/RATE_LIMIT_DISABLED/)
  })
})
