import jwt, { type SignOptions } from 'jsonwebtoken'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const JWT_SECRET = process.env.JWT_SECRET!
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!
const JWT_ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY ?? '15m'
const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY ?? '7d'

const AuthPayloadSchema = z.object({
  userId: z.string(),
  organizationId: z.string(),
  email: z.string(),
  role: z.string(),
})

export type AuthPayload = z.infer<typeof AuthPayloadSchema>

export function signAccessToken(payload: AuthPayload): string {
  const opts: SignOptions = { expiresIn: JWT_ACCESS_EXPIRY as string & SignOptions['expiresIn'] }
  return jwt.sign({ ...payload }, JWT_SECRET, opts)
}

export function signRefreshToken(payload: AuthPayload): string {
  const opts: SignOptions = { expiresIn: JWT_REFRESH_EXPIRY as string & SignOptions['expiresIn'] }
  return jwt.sign({ ...payload }, JWT_REFRESH_SECRET, opts)
}

export function verifyAccessToken(token: string): AuthPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    const parsed = AuthPayloadSchema.safeParse(decoded)
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

export function verifyRefreshToken(token: string): AuthPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET)
    const parsed = AuthPayloadSchema.safeParse(decoded)
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

export async function requireAuth(
  req: NextRequest
): Promise<AuthPayload | null> {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.slice(7)
  return verifyAccessToken(token)
}

export function unauthorizedResponse(): NextResponse {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

export async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(token)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function getRefreshExpiry(): Date {
  const match = JWT_REFRESH_EXPIRY.match(/^(\d+)([dhm])$/)
  if (!match) return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  const [, num, unit] = match
  const ms: Record<string, number> = {
    d: 24 * 60 * 60 * 1000,
    h: 60 * 60 * 1000,
    m: 60 * 1000,
  }
  return new Date(Date.now() + parseInt(num) * (ms[unit] ?? ms.d))
}
