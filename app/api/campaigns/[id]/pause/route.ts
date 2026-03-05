import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import Campaign from '@/models/Campaign'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, context: RouteContext) {
  const auth = await requireAuth(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await context.params

  try {
    await connectDB()

    const campaign = await Campaign.findOne({
      _id: id,
      organizationId: auth.organizationId,
    })

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    if (campaign.status !== 'sending') {
      return NextResponse.json(
        { error: 'Only a sending campaign can be paused' },
        { status: 409 }
      )
    }

    await Campaign.updateOne(
      { _id: id, organizationId: auth.organizationId },
      { $set: { status: 'paused' } }
    )

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('[POST /api/campaigns/[id]/pause]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
