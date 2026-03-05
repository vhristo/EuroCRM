import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { CreateWebhookSchema } from '@/lib/validators/webhookSchema'
import Webhook from '@/models/Webhook'

function serializeWebhook(w: Record<string, unknown>, organizationId: string): Record<string, unknown> {
  return {
    id: (w._id as { toString(): string }).toString(),
    organizationId,
    url: w.url,
    // Never expose secret in list/get responses — only on creation
    events: w.events,
    active: w.active,
    failureCount: w.failureCount,
    lastDeliveryAt:
      w.lastDeliveryAt instanceof Date ? w.lastDeliveryAt.toISOString() : w.lastDeliveryAt ?? null,
    createdBy: (w.createdBy as { toString(): string }).toString(),
    createdAt: (w.createdAt as Date).toISOString(),
    updatedAt: (w.updatedAt as Date).toISOString(),
  }
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await connectDB()

    const webhooks = await Webhook.find({
      organizationId: auth.organizationId,
    })
      .sort({ createdAt: -1 })
      .lean<Record<string, unknown>[]>()

    const serialized = webhooks.map((w) => serializeWebhook(w, auth.organizationId))

    return NextResponse.json({ items: serialized, total: serialized.length })
  } catch (error: unknown) {
    console.error('[GET /api/settings/webhooks]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body: unknown = await req.json()
  const parsed = CreateWebhookSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  try {
    await connectDB()

    // Generate a random 32-byte signing secret
    const secret = crypto.randomBytes(32).toString('hex')

    const webhook = await Webhook.create({
      organizationId: auth.organizationId,
      url: parsed.data.url,
      secret,
      events: parsed.data.events,
      active: parsed.data.active ?? true,
      failureCount: 0,
      createdBy: auth.userId,
    })

    const obj = webhook.toObject() as Record<string, unknown>

    return NextResponse.json(
      {
        ...serializeWebhook(obj, auth.organizationId),
        secret, // Secret exposed ONLY on creation — store it securely
      },
      { status: 201 }
    )
  } catch (error: unknown) {
    console.error('[POST /api/settings/webhooks]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
