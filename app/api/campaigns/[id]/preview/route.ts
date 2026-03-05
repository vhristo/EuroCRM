import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import Campaign from '@/models/Campaign'
import Contact from '@/models/Contact'
import { replaceMergeTags } from '@/lib/campaignProcessor'

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

    // Pick a sample contact from the org (first alphabetically)
    const sampleContact = await Contact.findOne({
      organizationId: auth.organizationId,
    })
      .sort({ firstName: 1 })
      .lean<Record<string, unknown>>()

    const mergeContact = sampleContact
      ? {
          firstName: sampleContact.firstName as string | undefined,
          lastName: sampleContact.lastName as string | undefined,
          email: sampleContact.email as string | undefined,
          company: sampleContact.company as string | undefined,
        }
      : {
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane.smith@example.com',
          company: 'Acme Corp',
        }

    const previewHtml = replaceMergeTags(campaign.htmlBody, mergeContact)
    const previewText = campaign.textBody
      ? replaceMergeTags(campaign.textBody, mergeContact)
      : undefined

    return NextResponse.json({
      subject: campaign.subject,
      htmlBody: previewHtml,
      textBody: previewText,
      sampleContact: mergeContact,
    })
  } catch (error: unknown) {
    console.error('[POST /api/campaigns/[id]/preview]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
