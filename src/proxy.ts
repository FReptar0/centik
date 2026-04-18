import { auth } from '@/auth'
import { NextResponse } from 'next/server'

const publicPaths = ['/login', '/register']

export const proxy = auth((req) => {
  const { pathname } = req.nextUrl

  // Allow public routes
  if (publicPaths.some((path) => pathname.startsWith(path))) {
    // If already authenticated, redirect away from login/register to home
    if (req.auth) {
      return NextResponse.redirect(new URL('/', req.nextUrl.origin))
    }
    return NextResponse.next()
  }

  // Redirect unauthenticated users to /login with callbackUrl
  if (!req.auth) {
    const loginUrl = new URL('/login', req.nextUrl.origin)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    // Match all routes except static files, images, and API auth routes
    '/((?!api/auth|_next/static|_next/image|favicon.ico|fonts).*)',
  ],
}
