'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { toast } from 'sonner'
import { formatInviteDate } from '@/lib/invite-utils'

interface GeneratedUrlPanelProps {
  url: string
  expiresAt: Date
}

/**
 * Panel shown immediately after a successful token generation.
 * Displays the registration URL + a copy button that swaps Copy ↔ Check
 * icons for 1600ms on click, plus the expiry timestamp below.
 */
export default function GeneratedUrlPanel({ url, expiresAt }: GeneratedUrlPanelProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      toast.error('No pudimos copiar el enlace', { duration: 5000 })
    }
  }

  return (
    <div className="rounded-2xl bg-surface-elevated p-5 mt-4">
      <p className="text-[11px] font-semibold uppercase tracking-[2px] text-text-secondary mb-2">
        Enlace de invitacion
      </p>

      <div className="rounded-xl bg-surface p-3 flex items-center gap-3">
        <span
          tabIndex={0}
          className="font-mono tabular-nums text-sm text-text-primary flex-1 truncate"
        >
          {url}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          aria-label={copied ? 'Copiado' : 'Copiar enlace'}
          className="shrink-0 rounded-full p-2 transition-all duration-200 hover:bg-surface-elevated active:scale-[0.98]"
        >
          {copied ? (
            <Check size={16} className="text-accent" />
          ) : (
            <Copy size={16} className="text-text-tertiary" />
          )}
        </button>
      </div>

      <p className="text-xs text-text-secondary mt-2">
        Expira el {formatInviteDate(expiresAt, 'datetime')}
      </p>
    </div>
  )
}
