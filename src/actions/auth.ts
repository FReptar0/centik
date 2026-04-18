'use server'

import { signIn, signOut } from '@/auth'
import { AuthError } from 'next-auth'
import { loginSchema } from '@/lib/validators'

export async function loginAction(
  _prevState: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string }> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    return { error: 'Credenciales invalidas' }
  }

  try {
    await signIn('credentials', {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: (formData.get('callbackUrl') as string) || '/',
    })
    // signIn redirects on success -- this line is never reached
    return {}
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: 'Credenciales invalidas' }
    }
    // CRITICAL: Re-throw non-AuthError (NEXT_REDIRECT) -- see research Pitfall #1
    throw error
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: '/login' })
}
