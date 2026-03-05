import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { CreateApiKeySchema } from '@/lib/validators/apiKeySchema'
import { hashApiKey } from '@/lib/apiKeyAuth'
import ApiKey from '@/models/ApiKey'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await connectDB()

    const keys = await ApiKey.find({
      organizationId: auth.organizationId,
    })
      .sort({ createdAt: -1 })
      .lean<Record<string, unknown>[]>()

    const serialized = keys.map((k) => ({
      id: (k._id as { toString(): string }).toString(),
      organizationId: auth.organizationId,
      name: k.name,
      keyPrefix: k.keyPrefix,
      // Never return keyHash to the client
      permissions: k.permissions,
      lastUsedAt: k.lastUsedAt instanceof Date ? k.lastUsedAt.toISOString() : k.lastUsedAt ?? null,
      expiresAt: k.expiresAt instanceof Date ? k.expiresAt.toISOString() : k.expiresAt ?? null,
      createdBy: (k.createdBy as { toString(): string }).toString(),
      createdAt: (k.createdAt as Date).toISOString(),
      updatedAt: (k.updatedAt as Date).toISOString(),
    }))

    return NextResponse.json({ items: serialized, total: serialized.length })
  } catch (error: unknown) {
    console.error('[GET /api/settings/api-keys]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body: unknown = await req.json()
  const parsed = CreateApiKeySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  try {
    await connectDB()

    // Generate the full key — shown only once
    const rawKey = `eurocrm_${crypto.randomBytes(32).toString('hex')}`
    const keyPrefix = rawKey.slice(0, 12) // "eurocrm_" (8) + 4 random hex chars
    const keyHash = await hashApiKey(rawKey)

    const apiKey = await ApiKey.create({
      organizationId: auth.organizationId,
      name: parsed.data.name,
      keyPrefix,
      keyHash,
      permissions: parsed.data.permissions,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : undefined,
      createdBy: auth.userId,
    })

    const obj = apiKey.toObject() as Record<string, unknown>

    return NextResponse.json(
      {
        id: (obj._id as { toString(): string }).toString(),
        organizationId: auth.organizationId,
        name: obj.name,
        keyPrefix,
        key: rawKey, // Full key returned ONLY on creation
        permissions: obj.permissions,
        expiresAt: parsed.data.expiresAt ?? null,
        createdBy: auth.userId,
        createdAt: (obj.createdAt as Date).toISOString(),
        updatedAt: (obj.updatedAt as Date).toISOString(),
      },
      { status: 201 }
    )
  } catch (error: unknown) {
    console.error('[POST /api/settings/api-keys]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
