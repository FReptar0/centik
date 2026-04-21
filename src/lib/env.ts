// src/lib/env.ts — boot-time production env validator (D-18, D-19, D-20).
// Validated on first import. All consumers use `env.X` instead of `process.env.X`.
// D-31: throws on failure, never console.logs.
import { z } from 'zod'

const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    AUTH_SECRET: z
      .string()
      .min(32, 'AUTH_SECRET must be at least 32 characters. Generate: openssl rand -hex 32'),
    AUTH_TOTP_ENCRYPTION_KEY: z
      .string()
      .regex(
        /^[0-9a-fA-F]{64}$/,
        'AUTH_TOTP_ENCRYPTION_KEY must be a 64-char hex string (32 bytes). Generate: openssl rand -hex 32',
      ),
    UPSTASH_REDIS_REST_URL: z.string().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
    RATE_LIMIT_DISABLED: z.string().optional(),
    // ADMIN_EMAIL / ADMIN_PASSWORD are validated by prisma/seed.prod.ts at its own boundary.
  })
  .superRefine((v, ctx) => {
    if (v.NODE_ENV === 'production') {
      if (!v.UPSTASH_REDIS_REST_URL) {
        ctx.addIssue({
          code: 'custom',
          path: ['UPSTASH_REDIS_REST_URL'],
          message: 'UPSTASH_REDIS_REST_URL is required in production (Phase 29 D-24).',
        })
      }
      if (!v.UPSTASH_REDIS_REST_TOKEN) {
        ctx.addIssue({
          code: 'custom',
          path: ['UPSTASH_REDIS_REST_TOKEN'],
          message: 'UPSTASH_REDIS_REST_TOKEN is required in production (Phase 29 D-24).',
        })
      }
      if (v.RATE_LIMIT_DISABLED === 'true') {
        ctx.addIssue({
          code: 'custom',
          path: ['RATE_LIMIT_DISABLED'],
          message: 'RATE_LIMIT_DISABLED must not be "true" in production (D-20).',
        })
      }
    }
  })

const parsed = schema.safeParse(process.env)
if (!parsed.success) {
  throw new Error(
    `Invalid environment configuration:\n${parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n')}`,
  )
}

export const env = parsed.data
export type Env = typeof env
