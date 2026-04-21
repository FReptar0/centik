'use client'

import { useActionState, useState } from 'react'
import { Loader2 } from 'lucide-react'
import FloatingInput from '@/components/ui/FloatingInput'
import { verifyTotpAction } from '@/actions/auth'

interface TotpStepProps {
  email: string
  challenge: string
  callbackUrl: string
}

/**
 * Phase 29 D-17/D-18 — Step 2 of the two-step login.
 * Rendered by LoginForm when loginAction returns { requiresTotp: true }.
 * Accepts either a 6-digit TOTP code OR an 8-hex backup code (with optional dash).
 * The server (verifyTotpAction + authorizeUser) auto-detects code shape and
 * routes to the right verifier — this UI never commits to one or the other.
 */
export default function TotpStep({ email, challenge, callbackUrl }: TotpStepProps) {
  const [state, action, isPending] = useActionState(verifyTotpAction, undefined)
  const [code, setCode] = useState('')
  const [useBackup, setUseBackup] = useState(false)

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="email" value={email} />
      <input type="hidden" name="challenge" value={challenge} />
      <input type="hidden" name="callbackUrl" value={callbackUrl} />

      <FloatingInput
        label={useBackup ? 'Codigo de respaldo' : 'Codigo de 6 digitos'}
        type="text"
        name="code"
        value={code}
        onChange={setCode}
        inputMode={useBackup ? 'text' : 'numeric'}
        placeholder={useBackup ? 'XXXX-XXXX' : '123456'}
        autoFocus
      />

      <button
        type="button"
        onClick={() => setUseBackup((b) => !b)}
        className="text-sm text-text-tertiary underline transition-colors duration-200 hover:text-text-secondary"
      >
        {useBackup ? 'Usar codigo de 6 digitos' : 'Usar codigo de respaldo'}
      </button>

      {state?.error && <p className="text-sm text-negative">{state.error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-full bg-accent text-bg font-semibold py-3 transition-all duration-200 hover:bg-accent-hover disabled:opacity-50"
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
    </form>
  )
}
