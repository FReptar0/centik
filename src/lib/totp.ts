import { generateSecret, generateURI, verify } from 'otplib'

const ISSUER = 'Centik'
const WINDOW_SECONDS = 30 // ±30s tolerance (window=1 × 30s step) per D-04

/** Genera un secreto TOTP base32 compatible con apps de autenticador. D-01 */
export function createTotpSecret(): string {
  return generateSecret()
}

/** Construye el URI otpauth:// para el QR (issuer Centik, label Centik:<email>). D-01 */
export function buildOtpauthUri(secret: string, email: string): string {
  return generateURI({
    issuer: ISSUER,
    label: `${ISSUER}:${email}`,
    secret,
    // digits=6, period=30, algorithm='sha1' — defaults de otplib, compatibles con Google Authenticator
  })
}

/** Verifica un codigo TOTP con tolerancia de ±30s (window=1). D-04, TOTP-01 */
export async function verifyTotp(secret: string, code: string): Promise<boolean> {
  // otplib v13 `verify` signature: ({ secret, token, epochTolerance? }) → Promise<{ valid, delta? }>
  // Cualquier excepcion (codigo vacio, secreto corto, etc) se considera fallo de verificacion.
  try {
    const result = await verify({ secret, token: code, epochTolerance: WINDOW_SECONDS })
    return result.valid
  } catch {
    return false
  }
}
