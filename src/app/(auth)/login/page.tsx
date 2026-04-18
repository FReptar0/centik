import { Suspense } from 'react'
import LoginForm from '@/components/auth/LoginForm'

/** Login page -- minimal branding on OLED black, no card container */
export default function LoginPage() {
  return (
    <div className="max-w-sm w-full px-6">
      <h1 className="text-4xl font-bold text-accent mb-2">Centik</h1>
      <p className="text-text-secondary text-sm mb-10">
        Tus finanzas, simplificadas
      </p>
      <Suspense
        fallback={
          <div className="space-y-6">
            <div className="h-10 bg-surface animate-pulse rounded" />
            <div className="h-10 bg-surface animate-pulse rounded" />
            <div className="h-12 bg-surface animate-pulse rounded-full" />
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  )
}
