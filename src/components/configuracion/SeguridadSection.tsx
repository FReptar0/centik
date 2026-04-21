'use client'

import { useState } from 'react'
import { ShieldCheck, KeyRound } from 'lucide-react'
import StatusDot from '@/components/ui/StatusDot'
import Activar2faModal from './Activar2faModal'
import Desactivar2faModal from './Desactivar2faModal'
import RegenerarCodigosModal from './RegenerarCodigosModal'

type OpenModal = 'activate' | 'deactivate' | 'regenerate' | null

interface SeguridadSectionProps {
  totpEnabled: boolean
}

/**
 * Phase 29 D-19 — 2FA management surface on /configuracion.
 * Visible to every authenticated user (NOT admin-gated).
 * Shows current 2FA status + CTAs that open the three modals.
 */
export default function SeguridadSection({ totpEnabled }: SeguridadSectionProps) {
  const [open, setOpen] = useState<OpenModal>(null)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-2xl bg-surface-elevated p-5">
        <div className="flex items-center gap-3">
          <ShieldCheck size={20} className={totpEnabled ? 'text-positive' : 'text-text-tertiary'} />
          <div>
            <p className="font-semibold text-text-primary">Autenticacion de dos factores</p>
            <div className="flex items-center gap-2 mt-1">
              <StatusDot className={totpEnabled ? 'bg-positive' : 'bg-text-tertiary'} />
              <span className="text-sm text-text-secondary">
                {totpEnabled ? 'Activado' : 'Desactivado'}
              </span>
            </div>
          </div>
        </div>
        {!totpEnabled ? (
          <button
            onClick={() => setOpen('activate')}
            className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-black transition-all duration-200 hover:bg-accent-hover active:scale-[0.98]"
          >
            Activar 2FA
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setOpen('regenerate')}
              className="flex items-center gap-2 rounded-full border border-border-divider px-3 py-2 text-sm text-text-secondary transition-colors duration-200 hover:text-text-primary hover:border-text-secondary"
            >
              <KeyRound size={14} />
              Regenerar codigos
            </button>
            <button
              onClick={() => setOpen('deactivate')}
              className="rounded-full border border-border-divider px-3 py-2 text-sm text-negative transition-colors duration-200 hover:border-negative"
            >
              Desactivar
            </button>
          </div>
        )}
      </div>

      <Activar2faModal isOpen={open === 'activate'} onClose={() => setOpen(null)} />
      <Desactivar2faModal isOpen={open === 'deactivate'} onClose={() => setOpen(null)} />
      <RegenerarCodigosModal isOpen={open === 'regenerate'} onClose={() => setOpen(null)} />
    </div>
  )
}
