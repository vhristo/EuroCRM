import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import Deal from '@/models/Deal'
import { MoveDealStageSchema } from '@/lib/validators/dealSchema'
import { evaluateWorkflows } from '@/lib/workflows/engine'

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

  // Capture previousStage before the update for workflow context
  const existing = await Deal.findOne({
    _id: id,
    organizationId: auth.organizationId,
  }).lean<Record<string, unknown>>()

  if (!existing) {
    return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
  }

  const previousStage = String(existing.stage ?? '')

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
  const serializedDeal: Record<string, unknown> = {
    ...d,
    id: (d._id as { toString(): string }).toString(),
    organizationId: (d.organizationId as { toString(): string }).toString(),
    pipelineId: (d.pipelineId as { toString(): string }).toString(),
    contactId: d.contactId
      ? (d.contactId as { toString(): string }).toString()
      : undefined,
    ownerId: (d.ownerId as { toString(): string }).toString(),
  }

  // Fire-and-forget
  evaluateWorkflows(
    auth.organizationId,
    'deal_stage_changed',
    serializedDeal,
    { previousStage }
  ).catch(console.error)

  return NextResponse.json(serializedDeal)
}
