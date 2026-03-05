import crypto from 'crypto'

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length < 32) {
  // Allow missing key during build/import — will throw at runtime if used
  if (process.env.NODE_ENV !== 'production' && !ENCRYPTION_KEY) {
    // no-op in dev when key is missing at import time
  }
}

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Returns a colon-separated string: iv:authTag:encrypted (all hex-encoded).
 */
export function encrypt(text: string): string {
  const key = Buffer.from(ENCRYPTION_KEY.slice(0, 32), 'utf8')
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  return [iv.toString('hex'), authTag.toString('hex'), encrypted.toString('hex')].join(':')
}

/**
 * Decrypts a string produced by `encrypt`.
 * Input format: iv:authTag:encrypted (all hex-encoded).
 */
export function decrypt(encryptedText: string): string {
  const parts = encryptedText.split(':')
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted text format')
  }

  const [ivHex, authTagHex, encryptedHex] = parts
  const key = Buffer.from(ENCRYPTION_KEY.slice(0, 32), 'utf8')
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  const encryptedBuffer = Buffer.from(encryptedHex, 'hex')

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  const decrypted = Buffer.concat([decipher.update(encryptedBuffer), decipher.final()])
  return decrypted.toString('utf8')
}
