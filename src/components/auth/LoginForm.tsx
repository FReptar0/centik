'use client'

import { useActionState, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import FloatingInput from '@/components/ui/FloatingInput'
import { loginAction } from '@/actions/auth'

/** Login form with email/password fields, password toggle, and loading state */
export default function LoginForm() {
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') ?? '/'

  const [state, action, isPending] = useActionState(loginAction, undefined)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />

      <FloatingInput
        label="Correo electronico"
        type="email"
        name="email"
        value={email}
        onChange={setEmail}
        autoFocus
      />

      <div className="relative">
        <FloatingInput
          label="Contrasena"
          type={showPassword ? 'text' : 'password'}
          name="password"
          value={password}
          onChange={setPassword}
        />
        <button
          type="button"
          onClick={() => setShowPassword((prev) => !prev)}
          className="absolute right-0 top-2 p-1 text-text-tertiary hover:text-text-secondary transition-all duration-200"
          aria-label={showPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'}
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>

      {state?.error && (
        <p className="text-sm text-negative">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-full bg-accent text-bg font-semibold py-3 transition-all duration-200 hover:bg-accent-hover disabled:opacity-50"
      >
        {isPending ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 size={16} className="animate-spin" />
            Iniciando sesion...
          </span>
        ) : (
          'Iniciar sesion'
        )}
      </button>
    </form>
  )
}
