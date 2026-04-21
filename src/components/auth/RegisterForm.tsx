'use client'

import { useActionState, useState } from 'react'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import FloatingInput from '@/components/ui/FloatingInput'
import { registerAction } from '@/actions/auth'

interface RegisterFormProps {
  email: string
  token: string
}

/**
 * Public registration form rendered only after server-side token validation.
 * Email arrives pre-filled and locked (per D-11: user cannot change it).
 * Two independent password-visibility toggles (per D-16).
 */
export default function RegisterForm({ email, token }: RegisterFormProps) {
  const [state, action, isPending] = useActionState(registerAction, undefined)
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  return (
    <form action={action} className="space-y-6">
      {/* Hidden inputs are the source of truth for the server action; the visible
          email FloatingInput uses a different name to avoid duplicate keys in FormData. */}
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="email" value={email} />

      <FloatingInput
        label="Correo electronico"
        type="email"
        name="email-display"
        value={email}
        onChange={() => {}}
        disabled
      />

      <FloatingInput
        label="Nombre"
        type="text"
        name="name"
        value={name}
        onChange={setName}
        autoFocus
        error={state?.error?.name?.[0]}
      />

      <div className="relative">
        <FloatingInput
          label="Contrasena"
          type={showPassword ? 'text' : 'password'}
          name="password"
          value={password}
          onChange={setPassword}
          error={state?.error?.password?.[0]}
        />
        <button
          type="button"
          onClick={() => setShowPassword((prev) => !prev)}
          className="absolute right-0 top-2 p-1 text-text-tertiary hover:text-text-secondary transition-all duration-200"
          aria-label={showPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'}
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
        <p className="mt-1 text-[11px] text-text-tertiary">
          Minimo 8 caracteres, incluye al menos un numero
        </p>
      </div>

      <div className="relative">
        <FloatingInput
          label="Confirmar contrasena"
          type={showConfirm ? 'text' : 'password'}
          name="confirmPassword"
          value={confirmPassword}
          onChange={setConfirmPassword}
          error={state?.error?.confirmPassword?.[0]}
        />
        <button
          type="button"
          onClick={() => setShowConfirm((prev) => !prev)}
          className="absolute right-0 top-2 p-1 text-text-tertiary hover:text-text-secondary transition-all duration-200"
          aria-label={showConfirm ? 'Ocultar contrasena' : 'Mostrar contrasena'}
        >
          {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>

      {state?.error?._form && <p className="text-sm text-negative">{state.error._form[0]}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-full bg-accent text-bg font-semibold py-3 transition-all duration-200 hover:bg-accent-hover disabled:opacity-50"
      >
        {isPending ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 size={16} className="animate-spin" />
            Creando cuenta...
          </span>
        ) : (
          'Crear cuenta'
        )}
      </button>
    </form>
  )
}
