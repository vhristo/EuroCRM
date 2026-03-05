import { NextRequest, NextResponse } from 'next/server'
import { requireApiKey, apiKeyHasPermission } from '@/lib/apiKeyAuth'
import { connectDB } from '@/lib/db'
import { UpdateDealSchema } from '@/lib/validators/dealSchema'
import { serializeDeal } from '@/lib/v1/handlers'
import Deal from '@/models/Deal'
import { fireWebhooks } from '@/lib/webhooks'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, context: RouteContext) {
  const auth = await requireApiKey(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!apiKeyHasPermission(auth.permissions, 'deals:read')) {
    return NextResponse.json({ error: 'Forbidden', code: 'INSUFFICIENT_PERMISSIONS' }, { status: 403 })
  }

  const { id } = await context.params

  try {
    await connectDB()

    const deal = await Deal.findOne({
      _id: id,
      organizationId: auth.organizationId,
    }).lean<Record<string, unknown>>()

    if (!deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
    }

    return NextResponse.json(serializeDeal(deal))
  } catch (error: unknown) {
    console.error('[GET /api/v1/deals/[id]]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, context: RouteContext) {
  const auth = await requireApiKey(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!apiKeyHasPermission(auth.permissions, 'deals:write')) {
    return NextResponse.json({ error: 'Forbidden', code: 'INSUFFICIENT_PERMISSIONS' }, { status: 403 })
  }

  const body: unknown = await req.json()
  const parsed = UpdateDealSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { id } = await context.params

  try {
    await connectDB()

    // Handle won/lost status transitions
    const updateData: Record<string, unknown> = { ...parsed.data }
    if (parsed.data.status === 'won') updateData.wonAt = new Date()
    if (parsed.data.status === 'lost') updateData.lostAt = new Date()

    const updated = await Deal.findOneAndUpdate(
      { _id: id, organizationId: auth.organizationId },
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean<Record<string, unknown>>()

    if (!updated) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
    }

    const serialized = serializeDeal(updated)

    // Fire specific events for won/lost
    const event =
      parsed.data.status === 'won'
        ? 'deal.won'
        : parsed.data.status === 'lost'
        ? 'deal.lost'
        : 'deal.updated'

    fireWebhooks(auth.organizationId, event, serialized).catch(() => {})

    return NextResponse.json(serialized)
  } catch (error: unknown) {
    console.error('[PUT /api/v1/deals/[id]]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const auth = await requireApiKey(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!apiKeyHasPermission(auth.permissions, 'deals:delete')) {
    return NextResponse.json({ error: 'Forbidden', code: 'INSUFFICIENT_PERMISSIONS' }, { status: 403 })
  }

  const { id } = await context.params

  try {
    await connectDB()

    const deleted = await Deal.findOneAndDelete({
      _id: id,
      organizationId: auth.organizationId,
    })

    if (!deleted) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
    }

    fireWebhooks(auth.organizationId, 'deal.deleted', { id }).catch(() => {})

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('[DELETE /api/v1/deals/[id]]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
