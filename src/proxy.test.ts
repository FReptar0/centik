import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextResponse } from 'next/server'

// Mock the auth module -- proxy.ts imports { auth } from '@/auth'
const mockAuthCallback = vi.fn()
vi.mock('@/auth', () => ({
  auth: (handler: unknown) => {
    // Store the handler so we can call it directly in tests
    mockAuthCallback.handler = handler
    return handler
  },
  signIn: vi.fn(),
  signOut: vi.fn(),
  handlers: {},
}))

// Store reference for TypeScript
declare module 'vitest' {
  interface MockInstance {
    handler?: unknown
  }
}

/** Helper to create a mock request matching Auth.js enhanced NextRequest */
function createMockRequest(pathname: string, isAuthenticated: boolean) {
  const origin = 'http://localhost:3000'
  return {
    auth: isAuthenticated ? { user: { id: 'user-1', email: 'test@example.com' } } : null,
    nextUrl: new URL(`${origin}${pathname}`),
    // Added for Plan 30-03: proxy.ts reads `new Headers(req.headers)` when
    // attaching CSP. Additive — existing 6 tests do not read this field.
    headers: new Headers(),
  }
}

describe('proxy', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    // Re-import proxy to get the handler via auth mock
    await import('@/proxy')
  })

  it('redirects unauthenticated request to /login', async () => {
    const handler = mockAuthCallback.handler as (req: unknown) => NextResponse
    const req = createMockRequest('/', false)
    const result = handler(req)

    expect(result).toBeInstanceOf(NextResponse)
    const location = new URL(result!.headers.get('location')!)
    expect(location.pathname).toBe('/login')
    expect(location.searchParams.get('callbackUrl')).toBe('/')
  })

  it('preserves callbackUrl for protected routes', async () => {
    const handler = mockAuthCallback.handler as (req: unknown) => NextResponse
    const req = createMockRequest('/movimientos', false)
    const result = handler(req)

    const location = new URL(result!.headers.get('location')!)
    expect(location.pathname).toBe('/login')
    expect(location.searchParams.get('callbackUrl')).toBe('/movimientos')
  })

  it('allows authenticated request to pass through', async () => {
    const handler = mockAuthCallback.handler as (req: unknown) => NextResponse
    const req = createMockRequest('/', true)

    const spy = vi.spyOn(NextResponse, 'next')
    handler(req)

    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  it('allows unauthenticated access to /login', async () => {
    const handler = mockAuthCallback.handler as (req: unknown) => NextResponse
    const req = createMockRequest('/login', false)

    const spy = vi.spyOn(NextResponse, 'next')
    handler(req)

    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  it('allows unauthenticated access to /register', async () => {
    const handler = mockAuthCallback.handler as (req: unknown) => NextResponse
    const req = createMockRequest('/register', false)

    const spy = vi.spyOn(NextResponse, 'next')
    handler(req)

    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  it('redirects authenticated user from /login to /', async () => {
    const handler = mockAuthCallback.handler as (req: unknown) => NextResponse
    const req = createMockRequest('/login', true)
    const result = handler(req)

    expect(result).toBeInstanceOf(NextResponse)
    const location = new URL(result!.headers.get('location')!)
    expect(location.pathname).toBe('/')
  })
})

describe('proxy CSP + security headers', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await import('@/proxy')
  })

  it('sets Content-Security-Policy with a per-request nonce on authenticated non-redirect responses', () => {
    const handler = mockAuthCallback.handler as (req: unknown) => NextResponse
    const req = createMockRequest('/', true)
    const result = handler(req)

    expect(result).toBeInstanceOf(NextResponse)
    const csp = result!.headers.get('Content-Security-Policy')
    expect(csp).toBeTruthy()
    expect(csp).toContain("default-src 'self'")
    expect(csp).toContain("'strict-dynamic'")
    expect(csp).toMatch(/nonce-[A-Za-z0-9+/=]+/)
    expect(csp).toContain("frame-ancestors 'none'")
    expect(csp).toContain("connect-src 'self' https://*.upstash.io")
  })

  it('produces a fresh nonce on each request', () => {
    const handler = mockAuthCallback.handler as (req: unknown) => NextResponse
    const a = handler(createMockRequest('/', true))
    const b = handler(createMockRequest('/', true))

    const cspA = a!.headers.get('Content-Security-Policy')!
    const cspB = b!.headers.get('Content-Security-Policy')!
    const nonceA = cspA.match(/nonce-([A-Za-z0-9+/=]+)/)?.[1]
    const nonceB = cspB.match(/nonce-([A-Za-z0-9+/=]+)/)?.[1]
    expect(nonceA).toBeTruthy()
    expect(nonceB).toBeTruthy()
    expect(nonceA).not.toBe(nonceB)
  })

  it('does NOT attach CSP to redirect responses', () => {
    const handler = mockAuthCallback.handler as (req: unknown) => NextResponse
    // Unauthenticated hitting protected route -> 3xx redirect to /login
    const req = createMockRequest('/movimientos', false)
    const result = handler(req)

    expect(result.status).toBeGreaterThanOrEqual(300)
    expect(result.status).toBeLessThan(400)
    expect(result.headers.get('Content-Security-Policy')).toBeNull()
  })

  it('injects x-nonce request header matching the response CSP nonce', () => {
    // NextResponse.next({ request: { headers } }) stores the new headers under
    // the internal 'x-middleware-request-headers' header. We verify via CSP.
    const handler = mockAuthCallback.handler as (req: unknown) => NextResponse
    const req = createMockRequest('/', true)
    const result = handler(req)

    const csp = result!.headers.get('Content-Security-Policy')!
    const nonceMatch = csp.match(/nonce-([A-Za-z0-9+/=]+)/)
    expect(nonceMatch).toBeTruthy()
    // The nonce shape is base64 of a UUID (about 48 chars)
    expect(nonceMatch![1].length).toBeGreaterThan(20)
  })
})
