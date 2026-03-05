import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { UpdateCampaignSchema } from '@/lib/validators/campaignSchema'
import Campaign from '@/models/Campaign'

type RouteContext = { params: Promise<{ id: string }> }

function serializeCampaign(doc: Record<string, unknown>): Record<string, unknown> {
  return {
    ...doc,
    id: String(doc._id),
    _id: undefined,
    organizationId: String(doc.organizationId),
    createdBy: String(doc.createdBy),
    scheduledAt: doc.scheduledAt ? (doc.scheduledAt as Date).toISOString() : undefined,
    createdAt: (doc.createdAt as Date).toISOString(),
    updatedAt: (doc.updatedAt as Date).toISOString(),
  }
}

export async function GET(req: NextRequest, context: RouteContext) {
  const auth = await requireAuth(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await context.params

  try {
    await connectDB()

    const campaign = await Campaign.findOne({
      _id: id,
      organizationId: auth.organizationId,
    }).lean<Record<string, unknown>>()

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    return NextResponse.json(serializeCampaign(campaign))
  } catch (error: unknown) {
    console.error('[GET /api/campaigns/[id]]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, context: RouteContext) {
  const auth = await requireAuth(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body: unknown = await req.json()
  const parsed = UpdateCampaignSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { id } = await context.params

  try {
    await connectDB()

    // Only allow edits on draft campaigns
    const existing = await Campaign.findOne({
      _id: id,
      organizationId: auth.organizationId,
    })

    if (!existing) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    if (!['draft', 'paused'].includes(existing.status)) {
      return NextResponse.json(
        { error: 'Only draft or paused campaigns can be edited' },
        { status: 409 }
      )
    }

    const updated = await Campaign.findOneAndUpdate(
      { _id: id, organizationId: auth.organizationId },
      { $set: parsed.data },
      { new: true, runValidators: true }
    ).lean<Record<string, unknown>>()

    if (!updated) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    return NextResponse.json(serializeCampaign(updated))
  } catch (error: unknown) {
    console.error('[PUT /api/campaigns/[id]]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
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

    if (campaign.status === 'sending') {
      return NextResponse.json(
        { error: 'Cannot delete a campaign that is currently sending' },
        { status: 409 }
      )
    }

    await Campaign.deleteOne({ _id: id, organizationId: auth.organizationId })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('[DELETE /api/campaigns/[id]]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
