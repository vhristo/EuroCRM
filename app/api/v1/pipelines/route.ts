import { NextRequest, NextResponse } from 'next/server'
import { requireApiKey, apiKeyHasPermission } from '@/lib/apiKeyAuth'
import { connectDB } from '@/lib/db'
import { serializePipeline } from '@/lib/v1/handlers'
import Pipeline from '@/models/Pipeline'

export async function GET(req: NextRequest) {
  const auth = await requireApiKey(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!apiKeyHasPermission(auth.permissions, 'pipelines:read')) {
    return NextResponse.json({ error: 'Forbidden', code: 'INSUFFICIENT_PERMISSIONS' }, { status: 403 })
  }

  try {
    await connectDB()

    const pipelines = await Pipeline.find({
      organizationId: auth.organizationId,
    })
      .sort({ isDefault: -1, createdAt: 1 })
      .lean<Record<string, unknown>[]>()

    return NextResponse.json({
      items: pipelines.map(serializePipeline),
      total: pipelines.length,
      page: 1,
      limit: pipelines.length,
    })
  } catch (error: unknown) {
    console.error('[GET /api/v1/pipelines]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
