import { redirect } from 'next/navigation'
import { auth } from '@/auth'

/**
 * Session-based auth guard for Server Actions and server components.
 * Replaces getDefaultUserId() with real session validation.
 *
 * - Returns { userId } when a valid session exists
 * - Redirects to /login when no session or no user ID
 *
 * CVE-2025-29927 defense-in-depth: middleware can be bypassed,
 * so every Server Action MUST call requireAuth() before data access.
 */
export async function requireAuth(): Promise<{ userId: string }> {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login')
  }

  return { userId: session.user.id }
}
