import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import Deal from '@/models/Deal'
import { CreateDealSchema } from '@/lib/validators/dealSchema'
import { PAGINATION } from '@/utils/constants'
import { evaluateWorkflows } from '@/lib/workflows/engine'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const limit = Math.min(
    PAGINATION.MAX_LIMIT,
    Math.max(1, parseInt(searchParams.get('limit') ?? String(PAGINATION.DEFAULT_LIMIT), 10))
  )
  const skip = (page - 1) * limit

  const pipelineId = searchParams.get('pipelineId')
  const status = searchParams.get('status')
  const stage = searchParams.get('stage')
  const ownerId = searchParams.get('ownerId')
  const contactId = searchParams.get('contactId')
  const search = searchParams.get('search')

  const filter: Record<string, unknown> = { organizationId: auth.organizationId }

  if (pipelineId) filter.pipelineId = pipelineId
  if (status) filter.status = status
  if (stage) filter.stage = stage
  if (ownerId) filter.ownerId = ownerId
  if (contactId) filter.contactId = contactId
  if (search) filter.title = { $regex: search, $options: 'i' }

  const [items, total] = await Promise.all([
    Deal.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Deal.countDocuments(filter),
  ])

  const serialized = items.map((d: Record<string, unknown>) => ({
    ...d,
    id: String(d._id),
    organizationId: String(d.organizationId),
    pipelineId: String(d.pipelineId),
    contactId: d.contactId ? String(d.contactId) : undefined,
    ownerId: String(d.ownerId),
  }))

  return NextResponse.json({ items: serialized, total, page, limit })
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = CreateDealSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  await connectDB()

  const { expectedCloseDate, ...rest } = parsed.data

  const deal = await Deal.create({
    ...rest,
    organizationId: auth.organizationId,
    ownerId: auth.userId,
    stageEnteredAt: new Date(),
    expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : undefined,
  })

  const obj = deal.toObject()
  const serializedDeal: Record<string, unknown> = {
    ...obj,
    id: obj._id.toString(),
    organizationId: obj.organizationId.toString(),
    pipelineId: obj.pipelineId.toString(),
    contactId: obj.contactId?.toString(),
    ownerId: obj.ownerId.toString(),
  }

  // Fire-and-forget: workflow errors must not block the response
  evaluateWorkflows(auth.organizationId, 'deal_created', serializedDeal).catch(console.error)

  return NextResponse.json(serializedDeal, { status: 201 })
}
