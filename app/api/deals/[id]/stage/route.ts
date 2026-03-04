import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import Deal from '@/models/Deal'
import { MoveDealStageSchema } from '@/lib/validators/dealSchema'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const parsed = MoveDealStageSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  await connectDB()

  const updateData: Record<string, unknown> = {
    stage: parsed.data.stage,
    stageEnteredAt: new Date(),
    rottenSince: null,
  }

  if (parsed.data.probability !== undefined) {
    updateData.probability = parsed.data.probability
  }

  const updated = await Deal.findOneAndUpdate(
    { _id: id, organizationId: auth.organizationId },
    { $set: updateData },
    { new: true }
  ).lean()

  if (!updated) {
    return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
  }

  const d = updated as Record<string, unknown>
  return NextResponse.json({
    ...d,
    id: (d._id as { toString(): string }).toString(),
    organizationId: (d.organizationId as { toString(): string }).toString(),
    pipelineId: (d.pipelineId as { toString(): string }).toString(),
    contactId: d.contactId
      ? (d.contactId as { toString(): string }).toString()
      : undefined,
    ownerId: (d.ownerId as { toString(): string }).toString(),
  })
}
