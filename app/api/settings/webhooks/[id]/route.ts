import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { UpdateWebhookSchema } from '@/lib/validators/webhookSchema'
import Webhook from '@/models/Webhook'

type RouteContext = { params: Promise<{ id: string }> }

function serializeWebhook(w: Record<string, unknown>, organizationId: string): Record<string, unknown> {
  return {
    id: (w._id as { toString(): string }).toString(),
    organizationId,
    url: w.url,
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

export async function GET(req: NextRequest, context: RouteContext) {
  const auth = await requireAuth(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await context.params

  try {
    await connectDB()

    const webhook = await Webhook.findOne({
      _id: id,
      organizationId: auth.organizationId,
    }).lean<Record<string, unknown>>()

    if (!webhook) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })
    }

    return NextResponse.json(serializeWebhook(webhook, auth.organizationId))
  } catch (error: unknown) {
    console.error('[GET /api/settings/webhooks/[id]]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, context: RouteContext) {
  const auth = await requireAuth(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body: unknown = await req.json()
  const parsed = UpdateWebhookSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { id } = await context.params

  try {
    await connectDB()

    const updateData: Record<string, unknown> = { ...parsed.data }

    // Reset failure count when re-activating a disabled webhook
    if (parsed.data.active === true) {
      updateData.failureCount = 0
    }

    const updated = await Webhook.findOneAndUpdate(
      { _id: id, organizationId: auth.organizationId },
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean<Record<string, unknown>>()

    if (!updated) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })
    }

    return NextResponse.json(serializeWebhook(updated, auth.organizationId))
  } catch (error: unknown) {
    console.error('[PUT /api/settings/webhooks/[id]]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const auth = await requireAuth(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await context.params

  try {
    await connectDB()

    const deleted = await Webhook.findOneAndDelete({
      _id: id,
      organizationId: auth.organizationId,
    })

    if (!deleted) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('[DELETE /api/settings/webhooks/[id]]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
