import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { requireAuth, unauthorizedResponse } from '@/lib/auth'
import { CreateActivitySchema } from '@/lib/validators/activitySchema'
import Activity from '@/models/Activity'
import { PAGINATION } from '@/utils/constants'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth) return unauthorizedResponse()

  await connectDB()

  const { searchParams } = req.nextUrl
  const page = Math.max(1, Number(searchParams.get('page')) || PAGINATION.DEFAULT_PAGE)
  const limit = Math.min(PAGINATION.MAX_LIMIT, Math.max(1, Number(searchParams.get('limit')) || PAGINATION.DEFAULT_LIMIT))
  const type = searchParams.get('type') || ''
  const done = searchParams.get('done')
  const contactId = searchParams.get('contactId') || ''
  const dealId = searchParams.get('dealId') || ''
  const ownerId = searchParams.get('ownerId') || ''

  const filter: Record<string, unknown> = { organizationId: auth.organizationId }
  if (type) filter.type = type
  if (done !== null && done !== '') filter.done = done === 'true'
  if (contactId) filter.contactId = contactId
  if (dealId) filter.dealId = dealId
  if (ownerId) filter.ownerId = ownerId

  const [items, total] = await Promise.all([
    Activity.find(filter).sort({ dueDate: 1, createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Activity.countDocuments(filter),
  ])

  return NextResponse.json({ items, total, page, limit })
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth) return unauthorizedResponse()

  const parsed = CreateActivitySchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  await connectDB()

  const data: Record<string, unknown> = {
    ...parsed.data,
    organizationId: auth.organizationId,
    ownerId: auth.userId,
  }

  if (parsed.data.dueDate) {
    data.dueDate = new Date(parsed.data.dueDate)
  }

  const activity = await Activity.create(data)
  return NextResponse.json(activity.toObject(), { status: 201 })
}
