import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import DataRequest from '@/models/DataRequest'

interface RouteParams {
  params: { id: string }
}

// GET /api/gdpr/requests/[id] — get single data request status
export async function GET(
  req: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const auth = await requireAuth(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (auth.role !== 'admin' && auth.role !== 'manager') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await connectDB()

  const doc = await DataRequest.findOne({
    _id: params.id,
    organizationId: auth.organizationId,
  }).lean<Record<string, unknown>>()

  if (!doc) {
    return NextResponse.json({ error: 'Data request not found' }, { status: 404 })
  }

  return NextResponse.json({
    id: String(doc._id),
    organizationId: String(doc.organizationId),
    type: doc.type,
    contactId: String(doc.contactId),
    contactEmail: doc.contactEmail,
    status: doc.status,
    result: doc.result
      ? {
          anonymizedFields: (doc.result as Record<string, unknown>).anonymizedFields,
          downloadUrl: (doc.result as Record<string, unknown>).downloadUrl,
        }
      : undefined,
    requestedBy: String(doc.requestedBy),
    completedAt: doc.completedAt
      ? (doc.completedAt as Date).toISOString()
      : undefined,
    createdAt: (doc.createdAt as Date).toISOString(),
    updatedAt: (doc.updatedAt as Date).toISOString(),
  })
}
