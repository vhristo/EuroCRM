import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import ApiKey from '@/models/ApiKey'

type RouteContext = { params: Promise<{ id: string }> }

export async function DELETE(req: NextRequest, context: RouteContext) {
  const auth = await requireAuth(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await context.params

  try {
    await connectDB()

    const deleted = await ApiKey.findOneAndDelete({
      _id: id,
      organizationId: auth.organizationId,
    })

    if (!deleted) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('[DELETE /api/settings/api-keys/[id]]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
