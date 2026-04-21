'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import Modal from '@/components/ui/Modal'
import FloatingInput from '@/components/ui/FloatingInput'
import { disableTotpAction } from '@/app/(app)/configuracion/totp-actions'

interface Desactivar2faModalProps {
  isOpen: boolean
  onClose: () => void
}

/**
 * Phase 29 D-21 — single-step destructive bottom-sheet.
 * Requires a current TOTP or backup code BEFORE clearing the stored secret +
 * deleting BackupCode rows. Cannot disable by password alone.
 */
export default function Desactivar2faModal({ isOpen, onClose }: Desactivar2faModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Desactivar 2FA" maxWidth="max-w-[480px]">
      {isOpen && <Content key="deactivate-2fa" onClose={onClose} />}
    </Modal>
  )
}

function Content({ onClose }: { onClose: () => void }) {
  const [state, action, isPending] = useActionState(disableTotpAction, undefined)
  const [code, setCode] = useState('')
  const handledStateRef = useRef<typeof state>(undefined)

  useEffect(() => {
    if (!state || handledStateRef.current === state) return
    handledStateRef.current = state
    if ('success' in state && state.success) {
      toast.success('2FA desactivado', { duration: 4000 })
      onClose()
    }
  }, [state, onClose])

  const fieldError =
    state && 'error' in state ? (state.error.code?.[0] ?? state.error._form?.[0] ?? null) : null

  return (
    <form action={action} className="space-y-5">
      <p className="text-sm text-text-secondary">
        Seguro que quieres desactivar 2FA? Tu cuenta quedara protegida solo por contrasena.
      </p>
      <FloatingInput
        label="Codigo actual"
        type="text"
        name="code"
        value={code}
        onChange={setCode}
        inputMode="text"
        placeholder="123456 o XXXX-XXXX"
        autoFocus
      />
      {fieldError && <p className="text-sm text-negative">{fieldError}</p>}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-full border border-border-divider text-text-primary font-semibold py-3 transition-colors duration-200 hover:border-text-secondary"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 rounded-full bg-negative text-black font-semibold py-3 transition-all duration-200 disabled:opacity-50"
        >
          {isPending ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin" />
              Desactivando...
            </span>
          ) : (
            'Desactivar'
          )}
        </button>
      </div>
    </form>
  )
}
