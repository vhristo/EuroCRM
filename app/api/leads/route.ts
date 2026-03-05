import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { requireAuth, unauthorizedResponse } from '@/lib/auth'
import { CreateLeadSchema } from '@/lib/validators/leadSchema'
import Lead from '@/models/Lead'
import { PAGINATION } from '@/utils/constants'
import { evaluateWorkflows } from '@/lib/workflows/engine'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth) return unauthorizedResponse()

  await connectDB()

  const { searchParams } = req.nextUrl
  const page = Math.max(1, Number(searchParams.get('page')) || PAGINATION.DEFAULT_PAGE)
  const limit = Math.min(PAGINATION.MAX_LIMIT, Math.max(1, Number(searchParams.get('limit')) || PAGINATION.DEFAULT_LIMIT))
  const search = searchParams.get('search') || ''
  const status = searchParams.get('status') || ''
  const ownerId = searchParams.get('ownerId') || ''

  const filter: Record<string, unknown> = { organizationId: auth.organizationId }
  if (status) filter.status = status
  if (ownerId) filter.ownerId = ownerId
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { company: { $regex: search, $options: 'i' } },
    ]
  }

  const [items, total] = await Promise.all([
    Lead.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Lead.countDocuments(filter),
  ])

  return NextResponse.json({ items, total, page, limit })
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth) return unauthorizedResponse()

  const parsed = CreateLeadSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  await connectDB()

  const lead = await Lead.create({
    ...parsed.data,
    organizationId: auth.organizationId,
    ownerId: auth.userId,
  })

  const serializedLead = lead.toObject() as Record<string, unknown>

  // Fire-and-forget
  evaluateWorkflows(auth.organizationId, 'lead_created', {
    ...serializedLead,
    id: String(serializedLead._id),
  }).catch(console.error)

  return NextResponse.json(serializedLead, { status: 201 })
}
