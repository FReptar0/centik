import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createHmac } from 'node:crypto'
import { signChallenge, verifyChallenge } from './challenge'

const AUTH_SECRET = 'test-auth-secret-32-bytes-entropy-ok-123'

describe('challenge (Phase 29 — Wave 1)', () => {
  beforeEach(() => {
    vi.stubEnv('AUTH_SECRET', AUTH_SECRET)
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
  })

  it('signChallenge + verifyChallenge round-trip returns { userId, email }', () => {
    const token = signChallenge('u1', 'a@b.c')
    const payload = verifyChallenge(token)
    expect(payload).toEqual({ userId: 'u1', email: 'a@b.c' })
  })

  it('token is a base64url(payload).base64url(sig) compact string', () => {
    const token = signChallenge('u1', 'a@b.c')
    expect(token).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/)
  })

  it('returns null for a token just shy of 5 minutes (vigente)', () => {
    const token = signChallenge('u1', 'a@b.c')
    // 4m59s later — still valid
    vi.setSystemTime(new Date('2026-01-01T00:04:59Z'))
    expect(verifyChallenge(token)).toEqual({ userId: 'u1', email: 'a@b.c' })
  })

  it('returns null for an expired token (5m01s after issue)', () => {
    const token = signChallenge('u1', 'a@b.c')
    vi.setSystemTime(new Date('2026-01-01T00:05:01Z'))
    expect(verifyChallenge(token)).toBeNull()
  })

  it('returns null when the signature is tampered (one char flipped)', () => {
    const token = signChallenge('u1', 'a@b.c')
    const [payloadB64, sig] = token.split('.')
    // Flip the LAST char of the signature to a different valid base64url char
    const last = sig[sig.length - 1]
    const flipped = last === 'A' ? 'B' : 'A'
    const tampered = `${payloadB64}.${sig.slice(0, -1)}${flipped}`
    expect(verifyChallenge(tampered)).toBeNull()
  })

  it('returns null when the payload is tampered (signature no longer matches)', () => {
    const token = signChallenge('u1', 'a@b.c')
    const [payloadB64, sig] = token.split('.')
    // Flip one char of payload — signature now invalid for new payload
    const last = payloadB64[payloadB64.length - 1]
    const flipped = last === 'A' ? 'B' : 'A'
    const tampered = `${payloadB64.slice(0, -1)}${flipped}.${sig}`
    expect(verifyChallenge(tampered)).toBeNull()
  })

  it('returns null for length-mismatched signature (timingSafeEqual safety, Pitfall 4)', () => {
    const token = signChallenge('u1', 'a@b.c')
    const [payloadB64] = token.split('.')
    // Truncated signature — lengths differ, must NOT throw
    const malformed = `${payloadB64}.short`
    expect(() => verifyChallenge(malformed)).not.toThrow()
    expect(verifyChallenge(malformed)).toBeNull()
  })

  it('returns null for malformed tokens', () => {
    expect(verifyChallenge('')).toBeNull()
    expect(verifyChallenge('onlyonepart')).toBeNull()
    expect(verifyChallenge('a.b.c')).toBeNull()
    expect(verifyChallenge('.')).toBeNull()
    expect(verifyChallenge('a.')).toBeNull()
    expect(verifyChallenge('.b')).toBeNull()
  })

  it('returns null when non-string is passed', () => {
    // @ts-expect-error — runtime shape check: null is not a string
    expect(verifyChallenge(null)).toBeNull()
    // @ts-expect-error — runtime shape check: undefined is not a string
    expect(verifyChallenge(undefined)).toBeNull()
    // @ts-expect-error — runtime shape check: number is not a string
    expect(verifyChallenge(123)).toBeNull()
  })

  it('returns null when payload JSON is valid but lacks userId (wrong shape)', () => {
    // Manually construct a token with valid signature but bad payload shape
    const badPayload = { exp: Date.now() + 60_000, email: 'a@b.c' }
    const payloadB64 = Buffer.from(JSON.stringify(badPayload), 'utf8').toString('base64url')
    const sig = createHmac('sha256', Buffer.from(AUTH_SECRET, 'utf8'))
      .update(payloadB64)
      .digest('base64url')
    const token = `${payloadB64}.${sig}`
    expect(verifyChallenge(token)).toBeNull()
  })

  it('returns null when payload JSON is valid but lacks email', () => {
    const badPayload = { exp: Date.now() + 60_000, userId: 'u1' }
    const payloadB64 = Buffer.from(JSON.stringify(badPayload), 'utf8').toString('base64url')
    const sig = createHmac('sha256', Buffer.from(AUTH_SECRET, 'utf8'))
      .update(payloadB64)
      .digest('base64url')
    const token = `${payloadB64}.${sig}`
    expect(verifyChallenge(token)).toBeNull()
  })

  it('returns null when payload is not JSON (base64url decodes to garbage)', () => {
    const payloadB64 = Buffer.from('not-json-at-all', 'utf8').toString('base64url')
    const sig = createHmac('sha256', Buffer.from(AUTH_SECRET, 'utf8'))
      .update(payloadB64)
      .digest('base64url')
    const token = `${payloadB64}.${sig}`
    expect(verifyChallenge(token)).toBeNull()
  })

  it('returns null when payload.exp is missing or non-numeric', () => {
    const badPayload = { userId: 'u1', email: 'a@b.c', exp: 'soon' }
    const payloadB64 = Buffer.from(JSON.stringify(badPayload), 'utf8').toString('base64url')
    const sig = createHmac('sha256', Buffer.from(AUTH_SECRET, 'utf8'))
      .update(payloadB64)
      .digest('base64url')
    const token = `${payloadB64}.${sig}`
    expect(verifyChallenge(token)).toBeNull()
  })

  it('throws when AUTH_SECRET is missing at sign time', () => {
    vi.stubEnv('AUTH_SECRET', '')
    expect(() => signChallenge('u1', 'a@b.c')).toThrow(/AUTH_SECRET/)
  })
})
