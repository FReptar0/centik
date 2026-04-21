import { PrismaClient } from '../../generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { env } from './env'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

function createPrismaClient() {
  // env.ts guarantees DATABASE_URL is non-empty (D-19). No null check needed.
  const adapter = new PrismaPg({ connectionString: env.DATABASE_URL })
  return new PrismaClient({ adapter })
}

const prisma = globalForPrisma.prisma || createPrismaClient()

if (env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma
