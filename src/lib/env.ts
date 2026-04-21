// Wave-0 stub per 30-VALIDATION.md §Wave 0 Requirements.
// Plan 30-02 replaces this file with a Zod-based boot-time validator (D-18 .. D-21).
// This temporary passthrough exists so downstream modules can import `{ env }`
// without waiting for Plan 30-02 to land.
export const env = process.env as unknown as {
  NODE_ENV: 'development' | 'test' | 'production'
  DATABASE_URL: string
  AUTH_SECRET: string
  AUTH_TOTP_ENCRYPTION_KEY: string
  UPSTASH_REDIS_REST_URL?: string
  UPSTASH_REDIS_REST_TOKEN?: string
  RATE_LIMIT_DISABLED?: string
}
export type Env = typeof env
