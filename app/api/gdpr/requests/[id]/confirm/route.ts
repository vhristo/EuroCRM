import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { ConfirmErasureSchema } from '@/lib/validators/gdprSchema'
import { anonymizeContact } from '@/lib/gdpr/eraser'
import DataRequest from '@/models/DataRequest'

interface RouteParams {
  params: { id: string }
}

// POST /api/gdpr/requests/[id]/confirm — confirm and execute erasure
// Admin only. Requires body: { confirmation: 'DELETE' }
export async function POST(
  req: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const auth = await requireAuth(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Erasure is admin-only
  if (auth.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body: unknown = await req.json()
  const parsed = ConfirmErasureSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  await connectDB()

  const dataRequest = await DataRequest.findOne({
    _id: params.id,
    organizationId: auth.organizationId,
  })

  if (!dataRequest) {
    return NextResponse.json({ error: 'Data request not found' }, { status: 404 })
  }

  if (dataRequest.type !== 'erasure') {
    return NextResponse.json(
      { error: 'This endpoint is only for erasure requests' },
      { status: 400 }
    )
  }

  if (dataRequest.status === 'completed') {
    return NextResponse.json(
      { error: 'This erasure request has already been completed' },
      { status: 409 }
    )
  }

  if (dataRequest.status === 'processing') {
    return NextResponse.json(
      { error: 'This erasure request is currently being processed' },
      { status: 409 }
    )
  }

  // Mark as processing
  await DataRequest.updateOne(
    { _id: params.id, organizationId: auth.organizationId },
    { $set: { status: 'processing' } }
  )

  try {
    const anonymizedFields = await anonymizeContact(
      auth.organizationId,
      String(dataRequest.contactId)
    )

    await DataRequest.updateOne(
      { _id: params.id, organizationId: auth.organizationId },
      {
        $set: {
          status: 'completed',
          completedAt: new Date(),
          'result.anonymizedFields': anonymizedFields,
        },
      }
    )

    return NextResponse.json({
      success: true,
      anonymizedFields,
      completedAt: new Date().toISOString(),
    })
  } catch (err) {
    await DataRequest.updateOne(
      { _id: params.id, organizationId: auth.organizationId },
      { $set: { status: 'failed' } }
    )

    const message = err instanceof Error ? err.message : 'Erasure failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
