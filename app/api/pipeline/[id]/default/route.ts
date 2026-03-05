import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import Pipeline from '@/models/Pipeline'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await connectDB()

  const pipeline = await Pipeline.findOne({
    _id: id,
    organizationId: auth.organizationId,
  })

  if (!pipeline) {
    return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 })
  }

  // Unset current default
  await Pipeline.updateMany(
    { organizationId: auth.organizationId, isDefault: true },
    { $set: { isDefault: false } }
  )

  // Set new default
  pipeline.isDefault = true
  await pipeline.save()

  const obj = pipeline.toObject()
  return NextResponse.json({
    ...obj,
    id: obj._id.toString(),
    organizationId: obj.organizationId.toString(),
  })
}
