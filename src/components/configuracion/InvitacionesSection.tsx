'use client'

import { useState } from 'react'
import InvitacionForm from './InvitacionForm'
import GeneratedUrlPanel from './GeneratedUrlPanel'
import InvitacionesList from './InvitacionesList'
import { buildInviteUrl, INVITE_TTL_MS } from '@/lib/invite-utils'
import type { InviteToken } from '@/types'

interface InvitacionesSectionProps {
  inviteTokens: InviteToken[]
  origin: string
}

/**
 * Admin-only shell composing the invite form, the freshly-generated URL panel
 * (visible only right after a successful create), and the recent-tokens list.
 * Per D-04: one compound section, not multiple pages.
 */
export default function InvitacionesSection({ inviteTokens, origin }: InvitacionesSectionProps) {
  const [generated, setGenerated] = useState<{ token: string; expiresAt: Date } | null>(null)

  function handleTokenGenerated(token: string, expiresAt: Date) {
    setGenerated({ token, expiresAt })
  }

  return (
    <div className="space-y-4">
      <InvitacionForm onTokenGenerated={handleTokenGenerated} />

      {generated && (
        <GeneratedUrlPanel
          url={buildInviteUrl(origin, generated.token)}
          expiresAt={generated.expiresAt}
        />
      )}

      <InvitacionesList tokens={inviteTokens} />
    </div>
  )
}

/** Re-export for components that need to compute the default expiry window client-side. */
export { INVITE_TTL_MS }
