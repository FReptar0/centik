import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { env } from './env'

const ALGO = 'aes-256-gcm'
const IV_LENGTH = 12 // 96 bits — NIST SP 800-38D recommendation for GCM

/** AUTH_TOTP_ENCRYPTION_KEY validated at boot by src/lib/env.ts (64-char hex). D-07 */
const KEY = Buffer.from(env.AUTH_TOTP_ENCRYPTION_KEY, 'hex')

/** Cifra un secreto TOTP. Devuelve `iv:ciphertext:authTag` (hex). TOTP-02, D-05, D-06 */
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGO, KEY, iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${ciphertext.toString('hex')}:${authTag.toString('hex')}`
}

/** Descifra un secreto TOTP almacenado. Arroja en caso de tampering (authTag invalido). TOTP-02 */
export function decryptSecret(stored: string): string {
  const parts = stored.split(':')
  if (parts.length !== 3) throw new Error('Invalid ciphertext format')
  const [ivHex, ctHex, tagHex] = parts
  const iv = Buffer.from(ivHex, 'hex')
  const ciphertext = Buffer.from(ctHex, 'hex')
  const authTag = Buffer.from(tagHex, 'hex')

  const decipher = createDecipheriv(ALGO, KEY, iv)
  decipher.setAuthTag(authTag)
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()])
  return plaintext.toString('utf8')
}
