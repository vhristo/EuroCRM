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

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const auth = await requireAuth(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = params
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'Invalid message ID' }, { status: 400 })
  }

  await connectDB()

  const orgId = new mongoose.Types.ObjectId(auth.organizationId)
  const doc = await EmailMessage.findOne({
    _id: new mongoose.Types.ObjectId(id),
    organizationId: orgId,
  }).lean<Record<string, unknown>>()

  if (!doc) {
    return NextResponse.json({ error: 'Message not found' }, { status: 404 })
  }

  return NextResponse.json(serializeMessage(doc))
}
