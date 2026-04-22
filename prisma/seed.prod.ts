// prisma/seed.prod.ts — production seed (admin-only, idempotent, no rotate-on-exists).
// Manual one-shot post-deploy: `vercel env pull .env.production && npm run db:seed:prod`.
// NEVER wire into the Vercel build command (D-11).
// Writes ONLY to the User table (D-12): zero demo categories/debts/transactions/etc.
import 'dotenv/config'
import { PrismaClient } from '../generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

// D-09 — fail fast if operator forgot to set either env var.
const email = process.env.ADMIN_EMAIL
const password = process.env.ADMIN_PASSWORD
if (!email) {
  throw new Error('ADMIN_EMAIL is required for production seed.')
}
if (!password || password.length < 12) {
  throw new Error('ADMIN_PASSWORD is required and must be at least 12 characters.')
}

// Uses DATABASE_URL (pooled). A single-row upsert is pooler-safe.
// If the operator prefers the direct connection, swap to DIRECT_URL. Document both.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main(): Promise<void> {
  // D-10 — branch on existence: existing admin is a flags-only update (NO password rotation).
  const existing = await prisma.user.findUnique({
    where: { email: email! },
    select: { id: true },
  })

  if (existing) {
    await prisma.user.update({
      where: { email: email! },
      data: { isAdmin: true, isApproved: true },
    })
    console.log(`Admin user ${email} already exists -- flags verified (password NOT rotated).`)
    return
  }

  // New admin: hash password BEFORE any $transaction to avoid connection pinning
  // (~300ms cost-12 bcrypt; Phase 28 P03 discipline).
  const hashedPassword = await bcrypt.hash(password!, 12)

  await prisma.user.create({
    data: {
      email: email!,
      hashedPassword,
      isAdmin: true,
      isApproved: true,
      totpEnabled: false,
    },
  })

  console.log(`Admin user ${email} created.`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (err) => {
    console.error(err)
    await prisma.$disconnect()
    process.exit(1)
  })
