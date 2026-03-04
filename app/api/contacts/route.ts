import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { CreateContactSchema } from '@/lib/validators/contactSchema'
import Contact from '@/models/Contact'
import { PAGINATION } from '@/utils/constants'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await connectDB()

    const { searchParams } = new URL(req.url)
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
    const rawLimit = parseInt(
      searchParams.get('limit') ?? String(PAGINATION.DEFAULT_LIMIT),
      10
    )
    const limit = Math.min(
      Math.max(1, isNaN(rawLimit) ? PAGINATION.DEFAULT_LIMIT : rawLimit),
      PAGINATION.MAX_LIMIT
    )
    const search = searchParams.get('search')?.trim() ?? ''
    const ownerId = searchParams.get('ownerId')?.trim() ?? ''

    // Always scope by organizationId — multi-tenant boundary
    const filter: Record<string, unknown> = {
      organizationId: auth.organizationId,
    }

    if (ownerId) {
      filter.ownerId = ownerId
    }

    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
      ]
    }

    const skip = (page - 1) * limit

    const [items, total] = await Promise.all([
      Contact.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Contact.countDocuments(filter),
    ])

    const serialized = items.map((c) => ({
      ...c,
      id: (c._id as { toString(): string }).toString(),
      _id: undefined,
      organizationId: (c.organizationId as { toString(): string }).toString(),
      ownerId: (c.ownerId as { toString(): string }).toString(),
      createdAt: (c.createdAt as Date).toISOString(),
      updatedAt: (c.updatedAt as Date).toISOString(),
    }))

    return NextResponse.json({ items: serialized, total, page, limit })
  } catch (error: unknown) {
    console.error('[GET /api/contacts]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body: unknown = await req.json()
  const parsed = CreateContactSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  try {
    await connectDB()

    const contact = await Contact.create({
      ...parsed.data,
      organizationId: auth.organizationId,
      ownerId: auth.userId,
    })

    const obj = contact.toObject() as Record<string, unknown>

    return NextResponse.json(
      {
        ...obj,
        id: (obj._id as { toString(): string }).toString(),
        _id: undefined,
        organizationId: auth.organizationId,
        ownerId: auth.userId,
        createdAt: (obj.createdAt as Date).toISOString(),
        updatedAt: (obj.updatedAt as Date).toISOString(),
      },
      { status: 201 }
    )
  } catch (error: unknown) {
    console.error('[POST /api/contacts]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
