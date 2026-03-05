import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import Pipeline from '@/models/Pipeline'
import Deal from '@/models/Deal'
import { UpdatePipelineSchema } from '@/lib/validators/pipelineSchema'

interface RouteParams {
  params: Promise<{ id: string }>
}

function serializePipeline(p: Record<string, unknown>) {
  return {
    ...p,
    id: String(p._id),
    organizationId: String(p.organizationId),
  }
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await connectDB()

  const pipeline = await Pipeline.findOne({
    _id: id,
    organizationId: auth.organizationId,
  }).lean()

  if (!pipeline) {
    return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 })
  }

  return NextResponse.json(serializePipeline(pipeline as Record<string, unknown>))
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const parsed = UpdatePipelineSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  await connectDB()

  const updated = await Pipeline.findOneAndUpdate(
    { _id: id, organizationId: auth.organizationId },
    { $set: parsed.data },
    { new: true }
  ).lean()

  if (!updated) {
    return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 })
  }

  return NextResponse.json(serializePipeline(updated as Record<string, unknown>))
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await connectDB()

  const pipeline = await Pipeline.findOne({
    _id: id,
    organizationId: auth.organizationId,
  }).lean()

  if (!pipeline) {
    return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 })
  }

  if ((pipeline as Record<string, unknown>).isDefault) {
    return NextResponse.json(
      { error: 'Cannot delete the default pipeline' },
      { status: 400 }
    )
  }

  const dealCount = await Deal.countDocuments({
    organizationId: auth.organizationId,
    pipelineId: id,
  })

  if (dealCount > 0) {
    return NextResponse.json(
      { error: `Cannot delete pipeline with ${dealCount} existing deal(s). Move or delete them first.` },
      { status: 400 }
    )
  }

  await Pipeline.deleteOne({ _id: id, organizationId: auth.organizationId })

  return NextResponse.json({ success: true })
}
