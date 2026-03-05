import { NextRequest, NextResponse } from 'next/server'
import { requireApiKey, apiKeyHasPermission } from '@/lib/apiKeyAuth'
import { connectDB } from '@/lib/db'
import { CreateDealSchema } from '@/lib/validators/dealSchema'
import { serializeDeal, parsePagination } from '@/lib/v1/handlers'
import Deal from '@/models/Deal'
import { fireWebhooks } from '@/lib/webhooks'

export async function GET(req: NextRequest) {
  const auth = await requireApiKey(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!apiKeyHasPermission(auth.permissions, 'deals:read')) {
    return NextResponse.json({ error: 'Forbidden', code: 'INSUFFICIENT_PERMISSIONS' }, { status: 403 })
  }

  try {
    await connectDB()

    const { searchParams } = new URL(req.url)
    const { page, limit, skip } = parsePagination(searchParams)
    const search = searchParams.get('search')?.trim() ?? ''
    const ownerId = searchParams.get('ownerId')?.trim() ?? ''
    const status = searchParams.get('status')?.trim() ?? ''
    const pipelineId = searchParams.get('pipelineId')?.trim() ?? ''

    const filter: Record<string, unknown> = {
      organizationId: auth.organizationId,
    }

    if (ownerId) filter.ownerId = ownerId
    if (status) filter.status = status
    if (pipelineId) filter.pipelineId = pipelineId

    if (search) {
      filter.$or = [{ title: { $regex: search, $options: 'i' } }]
    }

    const [items, total] = await Promise.all([
      Deal.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean<Record<string, unknown>[]>(),
      Deal.countDocuments(filter),
    ])

    return NextResponse.json({ items: items.map(serializeDeal), total, page, limit })
  } catch (error: unknown) {
    console.error('[GET /api/v1/deals]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireApiKey(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!apiKeyHasPermission(auth.permissions, 'deals:write')) {
    return NextResponse.json({ error: 'Forbidden', code: 'INSUFFICIENT_PERMISSIONS' }, { status: 403 })
  }

  const body: unknown = await req.json()
  const parsed = CreateDealSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  try {
    await connectDB()

    const bodyRecord = body as Record<string, unknown>
    const ownerId =
      typeof bodyRecord.ownerId === 'string' && bodyRecord.ownerId
        ? bodyRecord.ownerId
        : auth.organizationId

    const deal = await Deal.create({
      ...parsed.data,
      organizationId: auth.organizationId,
      ownerId,
      stageEnteredAt: new Date(),
    })

    const obj = deal.toObject() as Record<string, unknown>
    const serialized = serializeDeal(obj)

    fireWebhooks(auth.organizationId, 'deal.created', serialized).catch(() => {})

    return NextResponse.json(serialized, { status: 201 })
  } catch (error: unknown) {
    console.error('[POST /api/v1/deals]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
