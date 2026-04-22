import { auth } from '@/auth'
import { NextResponse } from 'next/server'

const publicPaths = ['/login', '/register']

export const proxy = auth((req) => {
  const { pathname } = req.nextUrl

  // --- Phase 26 auth redirect chain — ORDER PRESERVED ---
  // The three original return branches are hoisted into a single `response`
  // variable so a post-branch block can attach CSP + nonce to non-redirects.
  const isPublic = publicPaths.some((path) => pathname.startsWith(path))

  let response: NextResponse
  if (isPublic) {
    if (req.auth) {
      response = NextResponse.redirect(new URL('/', req.nextUrl.origin))
    } else {
      response = NextResponse.next()
    }
  } else if (!req.auth) {
    const loginUrl = new URL('/login', req.nextUrl.origin)
    loginUrl.searchParams.set('callbackUrl', pathname)
    response = NextResponse.redirect(loginUrl)
  } else {
    response = NextResponse.next()
  }

  // --- D-05 / D-06 — CSP nonce + CSP header on non-redirect responses ---
  // Browsers discard the body of 3xx responses, so CSP on a redirect is wasted
  // bytes AND would force the client to cache a stale nonce against the
  // redirect target. Short-circuit here.
  if (response.status >= 300 && response.status < 400) {
    return response
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const isDev = process.env.NODE_ENV !== 'production'

  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    `style-src 'self' 'unsafe-inline'`, // Tailwind v4 + React 19 trade-off (D-06)
    `img-src 'self' data: blob:`, // QR codes (Phase 29) + backup-code download blob
    `font-src 'self' data:`, // next/font inlines as data URIs
    `connect-src 'self' https://*.upstash.io`, // Upstash rate-limit REST API
    `frame-ancestors 'none'`, // matches X-Frame-Options: DENY
    `base-uri 'self'`,
    `form-action 'self'`,
    `object-src 'none'`,
    `upgrade-insecure-requests`,
  ].join('; ')

  // Inject nonce into downstream request headers so Server Components can
  // read it via headers().get('x-nonce') if they render <Script nonce={...}>.
  // Next.js 16 auto-applies the nonce to its own framework scripts when a CSP
  // header containing 'nonce-${value}' is present on the response.
  const requestHeaders = new Headers(req.headers)
  requestHeaders.set('x-nonce', nonce)

  const responseWithNonce = NextResponse.next({
    request: { headers: requestHeaders },
  })

  // Preserve any headers (e.g. Set-Cookie) that were on the original response.
  response.headers.forEach((v, k) => responseWithNonce.headers.set(k, v))
  responseWithNonce.headers.set('Content-Security-Policy', csp)
  return responseWithNonce
})

export const config = {
  matcher: [
    // Exclude Next internals + NextAuth handler (manages own response headers)
    '/((?!api/auth|_next/static|_next/image|favicon.ico|fonts).*)',
  ],
}
