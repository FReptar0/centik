import NextAuth from 'next-auth'
import type { User, Session } from 'next-auth'
import type { AdapterUser } from 'next-auth/adapters'
import type { JWT } from 'next-auth/jwt'
import Credentials from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'

/** Authorize callback -- exported for testability */
export async function authorizeUser(credentials: Partial<Record<'email' | 'password', unknown>>) {
  const email = credentials?.email
  const password = credentials?.password
  if (typeof email !== 'string' || typeof password !== 'string') return null
  if (!email || !password) return null

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      hashedPassword: true,
      isApproved: true,
    },
  })

  if (!user || !user.hashedPassword) return null
  if (!user.isApproved) return null

  const isValid = await bcrypt.compare(password, user.hashedPassword)
  if (!isValid) return null

  return { id: user.id, email: user.email, name: user.name }
}

/** JWT callback -- exported for testability */
export async function jwtCallback({ token, user }: { token: JWT; user?: User | AdapterUser }) {
  if (user) {
    token.userId = user.id
  }
  return token
}

/** Session callback -- exported for testability */
export async function sessionCallback({ session, token }: { session: Session; token: JWT }) {
  if (token.userId) {
    session.user.id = token.userId as string
  }
  return session
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  pages: {
    signIn: '/login',
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      authorize: authorizeUser,
    }),
  ],
  callbacks: {
    jwt: jwtCallback,
    session: sessionCallback,
  },
  trustHost: true,
})
