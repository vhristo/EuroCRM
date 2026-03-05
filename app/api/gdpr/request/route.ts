import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { CreateDataRequestSchema } from '@/lib/validators/gdprSchema'
import Contact from '@/models/Contact'
import DataRequest from '@/models/DataRequest'

// POST /api/gdpr/request — create a new export or erasure request
export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await requireAuth(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Erasure requests are admin-only; exports can be admin or manager
  const body: unknown = await req.json()
  const parsed = CreateDataRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { type, contactId } = parsed.data

  if (type === 'erasure' && auth.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (type === 'export' && auth.role !== 'admin' && auth.role !== 'manager') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await connectDB()

  // Verify contact exists and belongs to this org
  const contact = await Contact.findOne({
    _id: contactId,
    organizationId: auth.organizationId,
  }).lean<{ email?: string }>()

  if (!contact) {
    return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
  }

  const dataRequest = await DataRequest.create({
    organizationId: auth.organizationId,
    type,
    contactId,
    contactEmail: contact.email ?? 'unknown',
    status: 'pending',
    requestedBy: auth.userId,
  })

  const doc = dataRequest.toObject() as Record<string, unknown>

  return NextResponse.json(
    {
      id: String(dataRequest._id),
      organizationId: String(doc.organizationId),
      type: doc.type,
      contactId: String(doc.contactId),
      contactEmail: doc.contactEmail,
      status: doc.status,
      requestedBy: String(doc.requestedBy),
      createdAt: (doc.createdAt as Date).toISOString(),
      updatedAt: (doc.updatedAt as Date).toISOString(),
    },
    { status: 201 }
  )
}
