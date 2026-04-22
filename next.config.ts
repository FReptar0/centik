import type { NextConfig } from 'next'

// D-05 / D-07 / D-08 — static security headers applied to all routes.
// HSTS is gated on NODE_ENV === 'production' because browsers cache HSTS
// per-origin; emitting HSTS on http://localhost would force HTTPS-only on
// that port for `max-age` seconds (63M ≈ 2 years), bricking local dev.
// COOP/COEP intentionally omitted (D-08) — MVP has no cross-origin isolation
// needs, and COEP conflicts with common third-party assets.
const isProduction = process.env.NODE_ENV === 'production'

const staticSecurityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
  },
  ...(isProduction
    ? [
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=63072000; includeSubDomains; preload',
        },
      ]
    : []),
]

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: staticSecurityHeaders,
      },
    ]
  },
}

export default nextConfig
