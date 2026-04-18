import { describe, it } from 'vitest'

describe('proxy', () => {
  it.todo('redirects unauthenticated request to /login')
  it.todo('preserves callbackUrl for protected routes')
  it.todo('allows authenticated request to pass through')
  it.todo('allows unauthenticated access to /login')
  it.todo('allows unauthenticated access to /register')
  it.todo('redirects authenticated user from /login to /')
})
