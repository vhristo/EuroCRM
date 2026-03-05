import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import Campaign from '@/models/Campaign'
import CampaignRecipient from '@/models/CampaignRecipient'
import { PAGINATION } from '@/utils/constants'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, context: RouteContext) {
  const auth = await requireAuth(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await context.params

  try {
    await connectDB()

    // Verify campaign belongs to org
    const campaign = await Campaign.findOne({
      _id: id,
      organizationId: auth.organizationId,
    })

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

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
      campaignId: id,
      organizationId: auth.organizationId,
    }

    if (status) {
      filter.status = status
    }

    const [items, total] = await Promise.all([
      CampaignRecipient.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      CampaignRecipient.countDocuments(filter),
    ])

    const serialized = items.map((r) => ({
      ...r,
      id: (r._id as { toString(): string }).toString(),
      _id: undefined,
      campaignId: (r.campaignId as { toString(): string }).toString(),
      organizationId: (r.organizationId as { toString(): string }).toString(),
      contactId: (r.contactId as { toString(): string }).toString(),
      sentAt: r.sentAt ? (r.sentAt as Date).toISOString() : undefined,
      openedAt: r.openedAt ? (r.openedAt as Date).toISOString() : undefined,
      clickedAt: r.clickedAt ? (r.clickedAt as Date).toISOString() : undefined,
    }))

    return NextResponse.json({ items: serialized, total, page, limit })
  } catch (error: unknown) {
    console.error('[GET /api/campaigns/[id]/recipients]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
