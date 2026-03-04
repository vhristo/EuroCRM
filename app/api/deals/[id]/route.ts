import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import Deal from '@/models/Deal'
import { UpdateDealSchema } from '@/lib/validators/dealSchema'

interface RouteParams {
  params: Promise<{ id: string }>
}

function serializeDeal(d: Record<string, unknown>) {
  return {
    ...d,
    id: (d._id as { toString(): string }).toString(),
    organizationId: (d.organizationId as { toString(): string }).toString(),
    pipelineId: (d.pipelineId as { toString(): string }).toString(),
    contactId: d.contactId
      ? (d.contactId as { toString(): string }).toString()
      : undefined,
    ownerId: (d.ownerId as { toString(): string }).toString(),
  }
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  await connectDB()

  const deal = await Deal.findOne({
    _id: id,
    organizationId: auth.organizationId,
  }).lean()

  if (!deal) {
    return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
  }

  return NextResponse.json(serializeDeal(deal as Record<string, unknown>))
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const parsed = UpdateDealSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  await connectDB()

  const { expectedCloseDate, status, ...rest } = parsed.data

  const updateData: Record<string, unknown> = { ...rest }

  if (expectedCloseDate !== undefined) {
    updateData.expectedCloseDate = expectedCloseDate ? new Date(expectedCloseDate) : undefined
  }

  if (status !== undefined) {
    updateData.status = status
    if (status === 'won') {
      updateData.wonAt = new Date()
      updateData.lostAt = undefined
    } else if (status === 'lost') {
      updateData.lostAt = new Date()
      updateData.wonAt = undefined
    }
  }

  const updated = await Deal.findOneAndUpdate(
    { _id: id, organizationId: auth.organizationId },
    { $set: updateData },
    { new: true }
  ).lean()

  if (!updated) {
    return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
  }

  return NextResponse.json(serializeDeal(updated as Record<string, unknown>))
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  await connectDB()

  const deleted = await Deal.findOneAndDelete({
    _id: id,
    organizationId: auth.organizationId,
  }).lean()

  if (!deleted) {
    return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
