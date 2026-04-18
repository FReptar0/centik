'use client'

import { useCallback, useEffect, useState } from 'react'
import { Ticket, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { computeInviteStatus, formatInviteDate, type InviteStatus } from '@/lib/invite-utils'
import { revokeInviteToken } from '@/app/(app)/configuracion/invite-actions'
import type { InviteToken } from '@/types'

interface InvitacionesListProps {
  tokens: InviteToken[]
}

const STATUS_DISPLAY: Record<InviteStatus, { label: string; className: string }> = {
  pending: { label: 'Pendiente', className: 'bg-positive-subtle text-positive' },
  used: { label: 'Usada', className: 'bg-info-subtle text-info' },
  expired: { label: 'Expirada', className: 'bg-warning-subtle text-warning' },
  revoked: { label: 'Revocada', className: 'bg-negative-subtle text-negative' },
}

export default function InvitacionesList({ tokens }: InvitacionesListProps) {
  if (tokens.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Ticket size={32} className="text-text-tertiary mb-3" aria-hidden="true" />
        <p className="text-text-secondary text-lg">Aun no hay invitaciones</p>
        <p className="text-text-tertiary text-sm mt-2">
          Cuando generes una invitacion la veras aqui.
        </p>
      </div>
    )
  }

  return (
    <div>
      <p className="text-sm font-semibold text-text-secondary uppercase tracking-[2px] mb-3">
        Invitaciones recientes
      </p>
      <div className="space-y-3">
        {tokens.map((token) => (
          <InvitacionRow key={token.id} token={token} />
        ))}
      </div>
    </div>
  )
}

interface InvitacionRowProps {
  token: InviteToken
}

function InvitacionRow({ token }: InvitacionRowProps) {
  const [confirmingRevoke, setConfirmingRevoke] = useState(false)
  const [revoking, setRevoking] = useState(false)

  const status = computeInviteStatus(token)
  const statusInfo = STATUS_DISPLAY[status]

  useEffect(() => {
    if (!confirmingRevoke) return
    const timer = setTimeout(() => setConfirmingRevoke(false), 3000)
    return () => clearTimeout(timer)
  }, [confirmingRevoke])

  const handleRevoke = useCallback(async () => {
    setRevoking(true)
    try {
      const result = await revokeInviteToken(token.id)
      if (result && 'error' in result) {
        const messages = Object.values(result.error).flat()
        toast.error(messages[0] ?? 'No pudimos revocar la invitacion', { duration: 5000 })
      } else {
        toast.success('Invitacion revocada')
      }
    } catch {
      toast.error('No pudimos revocar la invitacion', { duration: 5000 })
    }
    setRevoking(false)
    setConfirmingRevoke(false)
  }, [token.id])

  const handleCancel = useCallback(() => {
    setConfirmingRevoke(false)
  }, [])

  const sublabel = (() => {
    if (status === 'revoked' && token.revokedAt)
      return `Revocada ${formatInviteDate(token.revokedAt, 'date')}`
    if (status === 'used' && token.usedAt)
      return `Usada ${formatInviteDate(token.usedAt, 'date')}`
    if (status === 'expired')
      return `Expiro ${formatInviteDate(token.expiresAt, 'date')}`
    return `Expira ${formatInviteDate(token.expiresAt, 'date')}`
  })()

  return (
    <div
      className={cn(
        'flex items-center gap-4 rounded-2xl bg-surface-elevated p-4',
        'transition-all duration-200',
      )}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface">
        <Ticket size={18} className="text-text-secondary" aria-hidden="true" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary truncate">{token.email}</p>
        <p className="font-mono tabular-nums text-xs text-text-secondary mt-0.5">
          {sublabel}
        </p>
      </div>

      <span
        className={cn(
          'text-[11px] font-semibold uppercase tracking-[2px]',
          'px-2 py-0.5 rounded-full inline-block',
          statusInfo.className,
        )}
      >
        {statusInfo.label}
      </span>

      {status === 'pending' && (
        <div className="shrink-0">
          {confirmingRevoke ? (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-text-secondary">Revocar?</span>
              <button
                onClick={handleRevoke}
                disabled={revoking}
                className="text-negative font-semibold hover:text-negative/80 transition-colors duration-200"
              >
                Si
              </button>
              <button
                onClick={handleCancel}
                className="text-text-secondary font-semibold hover:text-text-primary transition-colors duration-200"
              >
                No
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmingRevoke(true)}
              className="rounded-full p-2 text-text-tertiary transition-all duration-200 hover:text-negative hover:bg-negative/10 active:scale-[0.98]"
              aria-label="Revocar invitacion"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
