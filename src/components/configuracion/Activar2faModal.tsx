'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import Modal from '@/components/ui/Modal'
import FloatingInput from '@/components/ui/FloatingInput'
import BackupCodesScreen from './BackupCodesScreen'
import { prepareTotpSecretAction, enableTotpAction } from '@/app/(app)/configuracion/totp-actions'

interface Activar2faModalProps {
  isOpen: boolean
  onClose: () => void
}

type Step = 'scan' | 'verify' | 'codes'

type PrepareState = { secret: string; qrDataUrl: string }

/**
 * Phase 29 D-20 — 3-step bottom-sheet wizard to enable 2FA.
 * Step 1: scan QR / copy secret. Step 2: verify first code. Step 3: save backup codes.
 * The inner Content component is remounted via `key` so reopening the modal
 * resets step + state (matches CategoryForm pattern).
 */
export default function Activar2faModal({ isOpen, onClose }: Activar2faModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Activar 2FA" maxWidth="max-w-[520px]">
      {isOpen && <Content key="activate-2fa" onClose={onClose} />}
    </Modal>
  )
}

function Content({ onClose }: { onClose: () => void }) {
  const [localStep, setLocalStep] = useState<Exclude<Step, 'codes'>>('scan')
  const [prepare, setPrepare] = useState<PrepareState | null>(null)
  const [prepareError, setPrepareError] = useState<string | null>(null)
  const [state, action, isPending] = useActionState(enableTotpAction, undefined)
  const [code, setCode] = useState('')
  const toastedStateRef = useRef<typeof state>(undefined)

  useEffect(() => {
    let cancelled = false
    prepareTotpSecretAction().then((res) => {
      if (cancelled) return
      if ('error' in res) setPrepareError(res.error)
      else setPrepare(res)
    })
    return () => {
      cancelled = true
    }
  }, [])

  // Derive the wizard's final step from the action result — no local setState
  // sync (React 19 react-hooks/set-state-in-effect rule). Toast remains a pure
  // side-effect.
  const successCodes = state && 'success' in state && state.success ? state.backupCodes : null
  const step: Step = successCodes ? 'codes' : localStep

  useEffect(() => {
    if (!state || toastedStateRef.current === state) return
    toastedStateRef.current = state
    if ('success' in state && state.success) {
      toast.success('2FA activado', { duration: 4000 })
    }
  }, [state])

  if (prepareError) {
    return <p className="text-sm text-negative">{prepareError}</p>
  }

  if (!prepare) {
    return (
      <div className="flex items-center gap-2 text-text-secondary">
        <Loader2 size={16} className="animate-spin" />
        Preparando...
      </div>
    )
  }

  if (step === 'scan') {
    return (
      <div className="space-y-5">
        <p className="text-sm text-text-secondary">
          Escanea este codigo QR con tu app autenticadora (Google Authenticator, 1Password, Authy).
        </p>
        <div className="flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={prepare.qrDataUrl} alt="Codigo QR para 2FA" width={240} height={240} />
        </div>
        <div className="rounded-xl bg-surface p-3">
          <p className="text-xs text-text-tertiary mb-1">O ingresalo manualmente:</p>
          <p className="font-mono tabular-nums text-sm text-text-primary break-all">
            {prepare.secret}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setLocalStep('verify')}
          className="w-full rounded-full bg-accent text-black font-semibold py-3 transition-all duration-200 hover:bg-accent-hover"
        >
          Continuar
        </button>
      </div>
    )
  }

  if (step === 'verify') {
    const fieldError =
      state && 'error' in state ? (state.error.code?.[0] ?? state.error._form?.[0] ?? null) : null
    return (
      <form action={action} className="space-y-5">
        <p className="text-sm text-text-secondary">
          Ingresa el codigo de 6 digitos que muestra tu app autenticadora.
        </p>
        <input type="hidden" name="secret" value={prepare.secret} />
        <FloatingInput
          label="Codigo de 6 digitos"
          type="text"
          name="code"
          value={code}
          onChange={setCode}
          inputMode="numeric"
          placeholder="123456"
          autoFocus
        />
        {fieldError && <p className="text-sm text-negative">{fieldError}</p>}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setLocalStep('scan')}
            className="flex-1 rounded-full border border-border-divider text-text-primary font-semibold py-3 transition-colors duration-200 hover:border-text-secondary"
          >
            Atras
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="flex-1 rounded-full bg-accent text-black font-semibold py-3 transition-all duration-200 hover:bg-accent-hover disabled:opacity-50"
          >
            {isPending ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin" />
                Verificando...
              </span>
            ) : (
              'Verificar'
            )}
          </button>
        </div>
      </form>
    )
  }

  // step === 'codes'
  return successCodes ? <BackupCodesScreen codes={successCodes} onFinish={onClose} /> : null
}
