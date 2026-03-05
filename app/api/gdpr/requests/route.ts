import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import DataRequest from '@/models/DataRequest'

// GET /api/gdpr/requests — list all GDPR data requests for this org
export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await requireAuth(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (auth.role !== 'admin' && auth.role !== 'manager') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)))
  const skip = (page - 1) * limit

  await connectDB()

  const filter = { organizationId: auth.organizationId }

  const [items, total] = await Promise.all([
    DataRequest.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean<Record<string, unknown>[]>()
      .exec(),
    DataRequest.countDocuments(filter),
  ])

  const serialized = items.map((doc) => ({
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
  }))

  return NextResponse.json({ items: serialized, total, page, limit })
}
