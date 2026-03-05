import { NextRequest, NextResponse } from 'next/server'
import { requireApiKey, apiKeyHasPermission } from '@/lib/apiKeyAuth'
import { connectDB } from '@/lib/db'
import { CreateContactSchema } from '@/lib/validators/contactSchema'
import { serializeContact, parsePagination } from '@/lib/v1/handlers'
import Contact from '@/models/Contact'
import { fireWebhooks } from '@/lib/webhooks'

export async function GET(req: NextRequest) {
  const auth = await requireApiKey(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!apiKeyHasPermission(auth.permissions, 'contacts:read')) {
    return NextResponse.json({ error: 'Forbidden', code: 'INSUFFICIENT_PERMISSIONS' }, { status: 403 })
  }

  try {
    await connectDB()

    const { searchParams } = new URL(req.url)
    const { page, limit, skip } = parsePagination(searchParams)
    const search = searchParams.get('search')?.trim() ?? ''
    const ownerId = searchParams.get('ownerId')?.trim() ?? ''

    const filter: Record<string, unknown> = {
      organizationId: auth.organizationId,
    }

    if (ownerId) filter.ownerId = ownerId

    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
      ]
    }

    const [items, total] = await Promise.all([
      Contact.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean<Record<string, unknown>[]>(),
      Contact.countDocuments(filter),
    ])

    return NextResponse.json({ items: items.map(serializeContact), total, page, limit })
  } catch (error: unknown) {
    console.error('[GET /api/v1/contacts]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireApiKey(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!apiKeyHasPermission(auth.permissions, 'contacts:write')) {
    return NextResponse.json({ error: 'Forbidden', code: 'INSUFFICIENT_PERMISSIONS' }, { status: 403 })
  }

  const body: unknown = await req.json()
  const parsed = CreateContactSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  try {
    await connectDB()

    // V1 API key context has no userId — use organizationId as fallback ownerId
    // Callers can supply ownerId via the body if they choose; otherwise we default to the org ID.
    const bodyWithOwner = body as Record<string, unknown>
    const ownerId = typeof bodyWithOwner.ownerId === 'string' && bodyWithOwner.ownerId
      ? bodyWithOwner.ownerId
      : auth.organizationId

    const contact = await Contact.create({
      ...parsed.data,
      organizationId: auth.organizationId,
      ownerId,
    })

    const obj = contact.toObject() as Record<string, unknown>
    const serialized = serializeContact(obj)

    // Fire webhooks — non-blocking
    fireWebhooks(auth.organizationId, 'contact.created', serialized).catch(() => {})

    return NextResponse.json(serialized, { status: 201 })
  } catch (error: unknown) {
    console.error('[POST /api/v1/contacts]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
