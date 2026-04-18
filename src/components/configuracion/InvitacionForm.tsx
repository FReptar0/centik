'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import FloatingInput from '@/components/ui/FloatingInput'
import { createInviteToken } from '@/app/(app)/configuracion/invite-actions'
import { INVITE_TTL_MS } from '@/lib/invite-utils'

type CreateInviteResult =
  | { success: true; token: string }
  | { error: Record<string, string[]> }

interface InvitacionFormProps {
  onTokenGenerated: (token: string, expiresAt: Date) => void
}

/**
 * Email input + "Generar invitacion" submit. Uses useActionState wired to
 * createInviteToken Server Action. Emits token to parent via callback on
 * success so the parent can render the GeneratedUrlPanel once.
 *
 * After a successful generation the input value is left as-is: the admin can
 * see exactly what they just invited, the toast + URL panel confirm the action,
 * and any follow-up invite will overwrite the field by typing. Keeping the
 * effect free of React setState satisfies react-hooks/set-state-in-effect.
 */
export default function InvitacionForm({ onTokenGenerated }: InvitacionFormProps) {
  const [state, action, isPending] = useActionState<CreateInviteResult | undefined, FormData>(
    async (_prev, fd) => createInviteToken(fd),
    undefined,
  )
  const [email, setEmail] = useState('')
  const lastHandledStateRef = useRef<CreateInviteResult | undefined>(undefined)

  useEffect(() => {
    if (!state) return
    if (lastHandledStateRef.current === state) return
    lastHandledStateRef.current = state

    if ('success' in state && state.success) {
      const expiresAt = new Date(Date.now() + INVITE_TTL_MS)
      onTokenGenerated(state.token, expiresAt)
      toast.success('Invitacion generada', { duration: 4000 })
      return
    }
    if ('error' in state && state.error._form) {
      toast.error(state.error._form[0] ?? 'No pudimos generar la invitacion', {
        duration: 5000,
      })
    }
  }, [state, onTokenGenerated])

  const emailError = state && 'error' in state ? state.error.email?.[0] : undefined

  return (
    <form action={action} className="space-y-6">
      <FloatingInput
        label="Correo del invitado"
        type="email"
        name="email"
        value={email}
        onChange={setEmail}
        disabled={isPending}
        error={emailError}
      />

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-full bg-accent text-bg font-semibold py-3 transition-all duration-200 hover:bg-accent-hover disabled:opacity-50"
      >
        {isPending ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 size={16} className="animate-spin" />
            Generando...
          </span>
        ) : (
          'Generar invitacion'
        )}
      </button>
    </form>
  )
}
