import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { connectDB } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import Pipeline from '@/models/Pipeline'
import { DEFAULT_PIPELINE_STAGES } from '@/utils/constants'

const CreatePipelineSchema = z.object({
  name: z.string().min(1, 'Name is required').trim(),
})

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()

  let pipelines = await Pipeline.find({ organizationId: auth.organizationId })
    .sort({ isDefault: -1, createdAt: 1 })
    .lean()

  // Auto-create default pipeline if none exist
  if (pipelines.length === 0) {
    const stages = DEFAULT_PIPELINE_STAGES.map((s) => ({
      id: crypto.randomUUID(),
      name: s.name,
      order: s.order,
      probability: s.probability,
      rotDays: s.rotDays,
    }))

    const created = await Pipeline.create({
      organizationId: auth.organizationId,
      name: 'Sales Pipeline',
      stages,
      isDefault: true,
    })

    pipelines = [created.toObject()]
  }

  const result = pipelines.map((p: Record<string, unknown>) => ({
    ...p,
    id: String(p._id),
    organizationId: String(p.organizationId),
  }))

  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = CreatePipelineSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  await connectDB()

  const stages = DEFAULT_PIPELINE_STAGES.map((s) => ({
    id: crypto.randomUUID(),
    name: s.name,
    order: s.order,
    probability: s.probability,
    rotDays: s.rotDays,
  }))

  const pipeline = await Pipeline.create({
    organizationId: auth.organizationId,
    name: parsed.data.name,
    stages,
    isDefault: false,
  })

  const obj = pipeline.toObject()
  return NextResponse.json(
    {
      ...obj,
      id: obj._id.toString(),
      organizationId: obj.organizationId.toString(),
    },
    { status: 201 }
  )
}
