import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import Campaign from '@/models/Campaign'
import EmailConfig from '@/models/EmailConfig'
import User from '@/models/User'
import { sendEmail } from '@/lib/email'
import { replaceMergeTags } from '@/lib/campaignProcessor'
import { nanoid } from 'nanoid'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, context: RouteContext) {
  const auth = await requireAuth(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await context.params

  try {
    await connectDB()

    const [campaign, emailConfig, currentUser] = await Promise.all([
      Campaign.findOne({ _id: id, organizationId: auth.organizationId }),
      EmailConfig.findOne({ organizationId: auth.organizationId }),
      User.findOne({ _id: auth.userId }).lean<Record<string, unknown>>(),
    ])

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    if (!emailConfig) {
      return NextResponse.json(
        { error: 'No email configuration found. Please configure SMTP in Settings.' },
        { status: 422 }
      )
    }

    if (!currentUser?.email) {
      return NextResponse.json({ error: 'Could not determine your email address' }, { status: 422 })
    }

    const mergeContact = {
      firstName: currentUser.firstName as string | undefined,
      lastName: currentUser.lastName as string | undefined,
      email: currentUser.email as string,
      company: undefined,
    }

    const personalizedHtml = replaceMergeTags(campaign.htmlBody, mergeContact)
    const personalizedText = campaign.textBody
      ? replaceMergeTags(campaign.textBody, mergeContact)
      : undefined

    await sendEmail(emailConfig, {
      to: currentUser.email as string,
      subject: `[TEST] ${campaign.subject}`,
      htmlBody: personalizedHtml,
      textBody: personalizedText,
      trackingId: `test-${nanoid(10)}`,
    })

    return NextResponse.json({ success: true, sentTo: currentUser.email })
  } catch (error: unknown) {
    console.error('[POST /api/campaigns/[id]/test]', error)
    const message = error instanceof Error ? error.message : 'Failed to send test email'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
