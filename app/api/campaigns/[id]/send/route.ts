import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import Campaign from '@/models/Campaign'
import CampaignRecipient from '@/models/CampaignRecipient'
import { buildRecipientList, processCampaignBatch } from '@/lib/campaignProcessor'

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

    if (!['draft', 'paused'].includes(campaign.status)) {
      return NextResponse.json(
        { error: 'Only draft or paused campaigns can be started' },
        { status: 409 }
      )
    }

    // Set status to 'sending' immediately
    await Campaign.updateOne(
      { _id: id, organizationId: auth.organizationId },
      { $set: { status: 'sending' } }
    )

    // For paused campaigns, skip recipient creation (they already exist)
    if (campaign.status === 'draft') {
      // Delete any stale recipients from a previous attempt
      await CampaignRecipient.deleteMany({
        campaignId: id,
        organizationId: auth.organizationId,
      })

      // Build fresh recipient list
      const totalRecipients = await buildRecipientList(
        id,
        auth.organizationId,
        campaign.recipientFilter as { tags?: string[]; ownerId?: string; country?: string }
      )

      if (totalRecipients === 0) {
        // Roll back to draft — no eligible contacts
        await Campaign.updateOne(
          { _id: id, organizationId: auth.organizationId },
          { $set: { status: 'draft' } }
        )
        return NextResponse.json(
          { error: 'No contacts with email addresses match the recipient filter' },
          { status: 422 }
        )
      }
    }

    // Process first batch (fire-and-forget is fine for a demo; in production
    // this would be enqueued to a job queue)
    const { sent, failed } = await processCampaignBatch(id, auth.organizationId)

    return NextResponse.json({ success: true, sent, failed })
  } catch (error: unknown) {
    console.error('[POST /api/campaigns/[id]/send]', error)
    // Attempt to revert status on unexpected error
    try {
      await Campaign.updateOne(
        { _id: id, organizationId: auth.organizationId, status: 'sending' },
        { $set: { status: 'draft' } }
      )
    } catch {
      // best-effort revert
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
