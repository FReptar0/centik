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
