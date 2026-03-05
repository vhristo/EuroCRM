import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import WebhookDelivery from '@/models/WebhookDelivery'
import Webhook from '@/models/Webhook'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, context: RouteContext) {
  const auth = await requireAuth(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await context.params

  try {
    await connectDB()

    // Verify the webhook belongs to this organization
    const webhook = await Webhook.findOne({
      _id: id,
      organizationId: auth.organizationId,
    }).lean()

    if (!webhook) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })
    }

    const { searchParams } = new URL(req.url)
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
    const rawLimit = parseInt(searchParams.get('limit') ?? '20', 10)
    const limit = Math.min(Math.max(1, isNaN(rawLimit) ? 20 : rawLimit), 100)
    const skip = (page - 1) * limit

    const [items, total] = await Promise.all([
      WebhookDelivery.find({ webhookId: id, organizationId: auth.organizationId })
        .sort({ deliveredAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean<Record<string, unknown>[]>(),
      WebhookDelivery.countDocuments({ webhookId: id, organizationId: auth.organizationId }),
    ])

    const serialized = items.map((d) => ({
      id: (d._id as { toString(): string }).toString(),
      webhookId: (d.webhookId as { toString(): string }).toString(),
      organizationId: auth.organizationId,
      event: d.event,
      payload: d.payload,
      responseStatus: d.responseStatus ?? null,
      responseBody: d.responseBody ?? null,
      success: d.success,
      error: d.error ?? null,
      deliveredAt:
        d.deliveredAt instanceof Date ? d.deliveredAt.toISOString() : d.deliveredAt,
    }))

    return NextResponse.json({ items: serialized, total, page, limit })
  } catch (error: unknown) {
    console.error('[GET /api/settings/webhooks/[id]/deliveries]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
