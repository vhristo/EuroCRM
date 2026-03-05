import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { SendEmailSchema } from '@/lib/validators/emailSchema'
import { sendEmail } from '@/lib/email'
import { encrypt } from '@/lib/encryption'
import EmailMessage from '@/models/EmailMessage'
import EmailConfig from '@/models/EmailConfig'
import mongoose from 'mongoose'
import { nanoid } from 'nanoid'

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await requireAuth(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = SendEmailSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  await connectDB()

  const orgId = new mongoose.Types.ObjectId(auth.organizationId)

  // Load SMTP config for this org
  const config = await EmailConfig.findOne({ organizationId: orgId })
  if (!config) {
    return NextResponse.json(
      { error: 'No email configuration found. Configure SMTP in Settings.' },
      { status: 422 }
    )
  }

  const { to, subject, htmlBody, textBody, contactId, dealId } = parsed.data
  const trackingId = nanoid(24)

  // Create the message record (queued)
  const message = await EmailMessage.create({
    organizationId: orgId,
    to,
    from: config.fromEmail,
    subject,
    htmlBody,
    textBody,
    contactId: contactId ? new mongoose.Types.ObjectId(contactId) : undefined,
    dealId: dealId ? new mongoose.Types.ObjectId(dealId) : undefined,
    trackingId,
    status: 'queued',
    senderId: new mongoose.Types.ObjectId(auth.userId),
    opens: [],
    clicks: [],
  })

  // Attempt to send
  try {
    await sendEmail(config, { to, subject, htmlBody, textBody, trackingId })

    message.status = 'sent'
    message.sentAt = new Date()
    await message.save()
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown SMTP error'
    message.status = 'failed'
    message.errorMessage = errorMessage
    await message.save()

    return NextResponse.json(
      { error: 'Failed to send email', detail: errorMessage },
      { status: 502 }
    )
  }

  return NextResponse.json(
    {
      id: message._id.toString(),
      trackingId: message.trackingId,
      status: message.status,
      sentAt: message.sentAt?.toISOString(),
    },
    { status: 201 }
  )
}
