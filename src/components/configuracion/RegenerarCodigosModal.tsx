'use client'

import { useActionState, useState } from 'react'
import { Loader2 } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import FloatingInput from '@/components/ui/FloatingInput'
import BackupCodesScreen from './BackupCodesScreen'
import { regenerateBackupCodesAction } from '@/app/(app)/configuracion/totp-actions'

interface RegenerarCodigosModalProps {
  isOpen: boolean
  onClose: () => void
}

/**
 * Phase 29 D-22 — bottom-sheet to regenerate backup codes.
 * Requires a current TOTP or backup code; on success renders BackupCodesScreen
 * with the 10 fresh codes. Old codes stop working atomically.
 */
export default function RegenerarCodigosModal({ isOpen, onClose }: RegenerarCodigosModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Regenerar codigos de respaldo"
      maxWidth="max-w-[520px]"
    >
      {isOpen && <Content key="regenerate-codes" onClose={onClose} />}
    </Modal>
  )
}

function Content({ onClose }: { onClose: () => void }) {
  const [state, action, isPending] = useActionState(regenerateBackupCodesAction, undefined)
  const [code, setCode] = useState('')

  // Derive codes directly from the action result — avoid useEffect+setState sync
  // (React 19 react-hooks/set-state-in-effect rule).
  const successCodes = state && 'success' in state && state.success ? state.backupCodes : null

  if (successCodes) {
    return <BackupCodesScreen codes={successCodes} onFinish={onClose} />
  }

  const fieldError =
    state && 'error' in state ? (state.error.code?.[0] ?? state.error._form?.[0] ?? null) : null

  return (
    <form action={action} className="space-y-5">
      <p className="text-sm text-text-secondary">
        Para generar 10 codigos nuevos, primero ingresa un codigo actual. Los codigos anteriores
        dejaran de funcionar.
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
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-full bg-accent text-black font-semibold py-3 transition-all duration-200 hover:bg-accent-hover disabled:opacity-50"
      >
        {isPending ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 size={16} className="animate-spin" />
            Regenerando...
          </span>
        ) : (
          'Generar nuevos codigos'
        )}
      </button>
    </form>
  )
}
