import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { CreateCampaignSchema } from '@/lib/validators/campaignSchema'
import Campaign from '@/models/Campaign'
import { PAGINATION } from '@/utils/constants'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await connectDB()

    const { searchParams } = new URL(req.url)
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
    const rawLimit = parseInt(searchParams.get('limit') ?? String(PAGINATION.DEFAULT_LIMIT), 10)
    const limit = Math.min(
      Math.max(1, isNaN(rawLimit) ? PAGINATION.DEFAULT_LIMIT : rawLimit),
      PAGINATION.MAX_LIMIT
    )
    const status = searchParams.get('status')?.trim() ?? ''
    const skip = (page - 1) * limit

    const filter: Record<string, unknown> = {
      organizationId: auth.organizationId,
    }

    if (status) {
      filter.status = status
    }

    const [items, total] = await Promise.all([
      Campaign.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Campaign.countDocuments(filter),
    ])

    const serialized = items.map((c) => ({
      ...c,
      id: (c._id as { toString(): string }).toString(),
      _id: undefined,
      organizationId: (c.organizationId as { toString(): string }).toString(),
      createdBy: (c.createdBy as { toString(): string }).toString(),
      scheduledAt: c.scheduledAt ? (c.scheduledAt as Date).toISOString() : undefined,
      createdAt: (c.createdAt as Date).toISOString(),
      updatedAt: (c.updatedAt as Date).toISOString(),
    }))

    return NextResponse.json({ items: serialized, total, page, limit })
  } catch (error: unknown) {
    console.error('[GET /api/campaigns]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body: unknown = await req.json()
  const parsed = CreateCampaignSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  try {
    await connectDB()

    const campaign = await Campaign.create({
      ...parsed.data,
      organizationId: auth.organizationId,
      createdBy: auth.userId,
    })

    const obj = campaign.toObject() as Record<string, unknown>

    return NextResponse.json(
      {
        ...obj,
        id: (obj._id as { toString(): string }).toString(),
        _id: undefined,
        organizationId: auth.organizationId,
        createdBy: auth.userId,
        scheduledAt: obj.scheduledAt ? (obj.scheduledAt as Date).toISOString() : undefined,
        createdAt: (obj.createdAt as Date).toISOString(),
        updatedAt: (obj.updatedAt as Date).toISOString(),
      },
      { status: 201 }
    )
  } catch (error: unknown) {
    console.error('[POST /api/campaigns]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
