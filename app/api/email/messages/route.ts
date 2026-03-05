import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import EmailMessage from '@/models/EmailMessage'
import mongoose from 'mongoose'
import type { IEmailMessage } from '@/types/email'

function serializeMessage(doc: Record<string, unknown>): IEmailMessage {
  const opens = (doc.opens as Array<Record<string, unknown>>) ?? []
  const clicks = (doc.clicks as Array<Record<string, unknown>>) ?? []

  return {
    id: String(doc._id),
    organizationId: String(doc.organizationId),
    to: String(doc.to ?? ''),
    from: String(doc.from ?? ''),
    subject: String(doc.subject ?? ''),
    htmlBody: String(doc.htmlBody ?? ''),
    textBody: doc.textBody != null ? String(doc.textBody) : undefined,
    contactId: doc.contactId != null ? String(doc.contactId) : undefined,
    dealId: doc.dealId != null ? String(doc.dealId) : undefined,
    trackingId: String(doc.trackingId ?? ''),
    status: doc.status as IEmailMessage['status'],
    errorMessage: doc.errorMessage != null ? String(doc.errorMessage) : undefined,
    opens: opens.map((o) => ({
      timestamp: o.timestamp instanceof Date ? o.timestamp.toISOString() : String(o.timestamp),
      ip: o.ip != null ? String(o.ip) : undefined,
      userAgent: o.userAgent != null ? String(o.userAgent) : undefined,
    })),
    clicks: clicks.map((c) => ({
      timestamp: c.timestamp instanceof Date ? c.timestamp.toISOString() : String(c.timestamp),
      url: String(c.url ?? ''),
      ip: c.ip != null ? String(c.ip) : undefined,
      userAgent: c.userAgent != null ? String(c.userAgent) : undefined,
    })),
    sentAt: doc.sentAt instanceof Date ? doc.sentAt.toISOString() : (doc.sentAt != null ? String(doc.sentAt) : undefined),
    senderId: String(doc.senderId ?? ''),
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt ?? ''),
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : String(doc.updatedAt ?? ''),
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await requireAuth(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)))
  const skip = (page - 1) * limit
  const search = searchParams.get('search') ?? ''
  const status = searchParams.get('status') ?? ''

  const orgId = new mongoose.Types.ObjectId(auth.organizationId)

  const query: Record<string, unknown> = { organizationId: orgId }

  if (search) {
    query.$or = [
      { to: { $regex: search, $options: 'i' } },
      { subject: { $regex: search, $options: 'i' } },
    ]
  }

  if (status && ['queued', 'sent', 'failed'].includes(status)) {
    query.status = status
  }

  const [docs, total] = await Promise.all([
    EmailMessage.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean<Record<string, unknown>[]>(),
    EmailMessage.countDocuments(query),
  ])

  return NextResponse.json({
    items: docs.map(serializeMessage),
    total,
    page,
    limit,
  })
}
