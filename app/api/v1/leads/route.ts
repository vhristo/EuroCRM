import { NextRequest, NextResponse } from 'next/server'
import { requireApiKey, apiKeyHasPermission } from '@/lib/apiKeyAuth'
import { connectDB } from '@/lib/db'
import { CreateLeadSchema } from '@/lib/validators/leadSchema'
import { serializeLead, parsePagination } from '@/lib/v1/handlers'
import Lead from '@/models/Lead'
import { fireWebhooks } from '@/lib/webhooks'

export async function GET(req: NextRequest) {
  const auth = await requireApiKey(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!apiKeyHasPermission(auth.permissions, 'leads:read')) {
    return NextResponse.json({ error: 'Forbidden', code: 'INSUFFICIENT_PERMISSIONS' }, { status: 403 })
  }

  try {
    await connectDB()

    const { searchParams } = new URL(req.url)
    const { page, limit, skip } = parsePagination(searchParams)
    const search = searchParams.get('search')?.trim() ?? ''
    const ownerId = searchParams.get('ownerId')?.trim() ?? ''
    const status = searchParams.get('status')?.trim() ?? ''

    const filter: Record<string, unknown> = {
      organizationId: auth.organizationId,
    }

    if (ownerId) filter.ownerId = ownerId
    if (status) filter.status = status

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
      ]
    }

    const [items, total] = await Promise.all([
      Lead.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean<Record<string, unknown>[]>(),
      Lead.countDocuments(filter),
    ])

    return NextResponse.json({ items: items.map(serializeLead), total, page, limit })
  } catch (error: unknown) {
    console.error('[GET /api/v1/leads]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireApiKey(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!apiKeyHasPermission(auth.permissions, 'leads:write')) {
    return NextResponse.json({ error: 'Forbidden', code: 'INSUFFICIENT_PERMISSIONS' }, { status: 403 })
  }

  const body: unknown = await req.json()
  const parsed = CreateLeadSchema.safeParse(body)
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

    const lead = await Lead.create({
      ...parsed.data,
      organizationId: auth.organizationId,
      ownerId,
    })

    const obj = lead.toObject() as Record<string, unknown>
    const serialized = serializeLead(obj)

    fireWebhooks(auth.organizationId, 'lead.created', serialized).catch(() => {})

    return NextResponse.json(serialized, { status: 201 })
  } catch (error: unknown) {
    console.error('[POST /api/v1/leads]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
