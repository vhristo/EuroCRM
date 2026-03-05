import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/db'
import ApiKey from '@/models/ApiKey'

export interface ApiKeyAuthResult {
  organizationId: string
  permissions: string[]
}

/**
 * Authenticate a request using the X-API-Key header.
 * Hashes the provided key with SHA-256 and looks it up in the ApiKey collection.
 * Updates lastUsedAt on success.
 * Returns null if the key is missing, invalid, expired, or not found.
 */
export async function requireApiKey(req: NextRequest): Promise<ApiKeyAuthResult | null> {
  const apiKeyHeader = req.headers.get('x-api-key')
  if (!apiKeyHeader) return null

  const keyHash = await hashApiKey(apiKeyHeader)

  try {
    await connectDB()

    const apiKey = await ApiKey.findOne({ keyHash }).lean<Record<string, unknown>>()

    if (!apiKey) return null

    // Check expiry if set
    if (apiKey.expiresAt) {
      const expiresAt = apiKey.expiresAt as Date
      if (expiresAt < new Date()) return null
    }

    // Update lastUsedAt asynchronously — do not await, do not block the request
    ApiKey.findByIdAndUpdate(apiKey._id, { $set: { lastUsedAt: new Date() } }).exec()

    return {
      organizationId: (apiKey.organizationId as { toString(): string }).toString(),
      permissions: (apiKey.permissions as string[]) ?? [],
    }
  } catch (error: unknown) {
    console.error('[requireApiKey]', error)
    return null
  }
}

/**
 * Hash an API key using SHA-256.
 * Uses the Web Crypto API (available in Next.js edge + Node runtimes).
 */
export async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(key)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Check whether a set of API key permissions includes the required permission.
 */
export function apiKeyHasPermission(permissions: string[], required: string): boolean {
  return permissions.includes(required)
}
