import { NextRequest, NextResponse } from 'next/server'
import { requireApiKey, apiKeyHasPermission } from '@/lib/apiKeyAuth'
import { connectDB } from '@/lib/db'
import { CreateActivitySchema } from '@/lib/validators/activitySchema'
import { serializeActivity, parsePagination } from '@/lib/v1/handlers'
import Activity from '@/models/Activity'
import { fireWebhooks } from '@/lib/webhooks'

export async function GET(req: NextRequest) {
  const auth = await requireApiKey(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!apiKeyHasPermission(auth.permissions, 'activities:read')) {
    return NextResponse.json({ error: 'Forbidden', code: 'INSUFFICIENT_PERMISSIONS' }, { status: 403 })
  }

  try {
    await connectDB()

    const { searchParams } = new URL(req.url)
    const { page, limit, skip } = parsePagination(searchParams)
    const ownerId = searchParams.get('ownerId')?.trim() ?? ''
    const contactId = searchParams.get('contactId')?.trim() ?? ''
    const dealId = searchParams.get('dealId')?.trim() ?? ''
    const done = searchParams.get('done')

    const filter: Record<string, unknown> = {
      organizationId: auth.organizationId,
    }

    if (ownerId) filter.ownerId = ownerId
    if (contactId) filter.contactId = contactId
    if (dealId) filter.dealId = dealId
    if (done !== null) filter.done = done === 'true'

    const [items, total] = await Promise.all([
      Activity.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean<Record<string, unknown>[]>(),
      Activity.countDocuments(filter),
    ])

    return NextResponse.json({ items: items.map(serializeActivity), total, page, limit })
  } catch (error: unknown) {
    console.error('[GET /api/v1/activities]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireApiKey(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!apiKeyHasPermission(auth.permissions, 'activities:write')) {
    return NextResponse.json({ error: 'Forbidden', code: 'INSUFFICIENT_PERMISSIONS' }, { status: 403 })
  }

  const body: unknown = await req.json()
  const parsed = CreateActivitySchema.safeParse(body)
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

    const activity = await Activity.create({
      ...parsed.data,
      organizationId: auth.organizationId,
      ownerId,
    })

    const obj = activity.toObject() as Record<string, unknown>
    const serialized = serializeActivity(obj)

    fireWebhooks(auth.organizationId, 'activity.created', serialized).catch(() => {})

    return NextResponse.json(serialized, { status: 201 })
  } catch (error: unknown) {
    console.error('[POST /api/v1/activities]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
