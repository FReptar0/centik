import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'npx tsx prisma/seed.ts',
  },
  // CLI operations (migrate deploy, seed, introspect) use DIRECT_URL. Runtime uses DATABASE_URL via @prisma/adapter-pg in src/lib/prisma.ts. Pgbouncer transaction mode (on DATABASE_URL in prod) is DDL-incompatible — prepared statements and DDL locks break. Per D-03, corrected for Prisma 7 removal of datasource.directUrl (RESEARCH §Pitfalls).
  datasource: {
    url: env('DIRECT_URL'),
  },
})
