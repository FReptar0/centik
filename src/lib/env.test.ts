// Wave-0 stub per 30-VALIDATION.md §Wave 0 Requirements.
// Plan 30-02 fills in the real validator tests (missing var throws, production guard throws, happy path parses).
import { describe, it } from 'vitest'

describe('env.ts (Plan 30-02 will fill in)', () => {
  it.todo('throws at module import when AUTH_SECRET is unset in production')
  it.todo('throws when NODE_ENV=production and RATE_LIMIT_DISABLED=true')
  it.todo('parses happy-path production env without throwing')
  it.todo('parses development env with minimal required vars')
})
