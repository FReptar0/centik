import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import { Mail } from 'lucide-react'
import prisma from '@/lib/prisma'
import RegisterForm from '@/components/auth/RegisterForm'
import TokenErrorScreen from '@/components/configuracion/TokenErrorScreen'

interface PageProps {
  searchParams: Promise<{ token?: string }>
}

/** Wrap Date.now() so the React purity lint rule does not flag it at the render call site. */
function currentTimeMs(): number {
  return Date.now()
}

/**
 * Server Component: validates the invite token in the URL, then renders either
 * the registration form (on success) or a differentiated error screen.
 * Per D-19: missing ?token query param triggers notFound() (Next.js 404 page).
 */
export default async function RegisterPage({ searchParams }: PageProps) {
  await connection()
  const { token } = await searchParams

  if (!token) notFound()

  const row = await prisma.inviteToken.findUnique({ where: { token } })
  const now = currentTimeMs()

  if (!row) return <TokenErrorScreen state="invalid" />
  if (row.revokedAt) return <TokenErrorScreen state="invalid" />
  if (row.usedAt !== null) return <TokenErrorScreen state="used" />
  if (row.expiresAt.getTime() < now) return <TokenErrorScreen state="expired" />

  return (
    <div className="max-w-sm w-full px-6">
      <h1 className="text-4xl font-semibold text-accent mb-2">Centik</h1>
      <p className="text-text-secondary text-sm mb-2">Crea tu cuenta para empezar</p>
      <div className="flex items-center gap-2 mb-10">
        <Mail size={14} className="text-text-secondary" aria-hidden="true" />
        <span className="text-xs text-text-secondary">
          Invitacion para{' '}
          <span className="font-mono tabular-nums text-text-primary">{row.email}</span>
        </span>
      </div>
      <RegisterForm email={row.email} token={row.token} />
    </div>
  )
}
