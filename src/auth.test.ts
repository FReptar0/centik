import { describe, it } from 'vitest'

describe('authorizeUser', () => {
  it.todo('returns user object for valid credentials')
  it.todo('returns null for wrong password')
  it.todo('returns null for non-existent email')
  it.todo('returns null for unapproved user')
  it.todo('returns null for empty credentials')
  it.todo('returns null for user with null hashedPassword')
})

describe('jwtCallback', () => {
  it.todo('adds userId to token on initial sign-in')
  it.todo('preserves existing token when no user')
})

describe('sessionCallback', () => {
  it.todo('sets session.user.id from token.userId')
})
