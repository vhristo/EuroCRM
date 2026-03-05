import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { exportContactData } from '@/lib/gdpr/exporter'
import DataRequest from '@/models/DataRequest'

interface RouteParams {
  params: { id: string }
}

// GET /api/gdpr/requests/[id]/download — download export as JSON
// Only available for export type requests in completed status
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

  const dataRequest = await DataRequest.findOne({
    _id: params.id,
    organizationId: auth.organizationId,
  })

  if (!dataRequest) {
    return NextResponse.json({ error: 'Data request not found' }, { status: 404 })
  }

  if (dataRequest.type !== 'export') {
    return NextResponse.json(
      { error: 'Download is only available for export requests' },
      { status: 400 }
    )
  }

  // If already completed, use cached export data
  const result = dataRequest.result as
    | { exportData?: Record<string, unknown>; anonymizedFields?: string[] }
    | undefined

  if (dataRequest.status === 'completed' && result?.exportData) {
    const filename = `gdpr-export-${String(dataRequest.contactId)}-${Date.now()}.json`
    return new NextResponse(JSON.stringify(result.exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  }

  // Generate export on demand (pending or processing state)
  try {
    // Mark as processing
    await DataRequest.updateOne(
      { _id: params.id, organizationId: auth.organizationId },
      { $set: { status: 'processing' } }
    )

    const exportData = await exportContactData(
      auth.organizationId,
      String(dataRequest.contactId)
    )

    // Mark as completed and cache export data
    await DataRequest.updateOne(
      { _id: params.id, organizationId: auth.organizationId },
      {
        $set: {
          status: 'completed',
          completedAt: new Date(),
          'result.exportData': exportData,
        },
      }
    )

    const filename = `gdpr-export-${String(dataRequest.contactId)}-${Date.now()}.json`
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    await DataRequest.updateOne(
      { _id: params.id, organizationId: auth.organizationId },
      { $set: { status: 'failed' } }
    )

    const message = err instanceof Error ? err.message : 'Export failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
