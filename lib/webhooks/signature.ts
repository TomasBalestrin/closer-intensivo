import crypto from 'crypto'

export function generateSignature(payload: any, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex')
}

export function validateSignature(payload: any, secret: string, signature: string | null): boolean {
  if (!signature) return false
  const expected = generateSignature(payload, secret)
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  } catch {
    return false
  }
}

export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex')
}
