import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { hasPermission } from '@/lib/rbac'
import Workflow from '@/models/Workflow'
import { CreateWorkflowSchema } from '@/lib/validators/workflowSchema'
import { PAGINATION } from '@/utils/constants'

function serializeWorkflow(w: Record<string, unknown>) {
  return {
    ...w,
    id: String(w._id),
    _id: undefined,
    organizationId: String(w.organizationId),
    createdBy: String(w.createdBy),
    lastExecutedAt: w.lastExecutedAt
      ? (w.lastExecutedAt as Date).toISOString()
      : undefined,
    createdAt: (w.createdAt as Date).toISOString(),
    updatedAt: (w.updatedAt as Date).toISOString(),
  }
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!hasPermission(auth, 'workflows:read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await connectDB()

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const limit = Math.min(
    PAGINATION.MAX_LIMIT,
    Math.max(1, parseInt(searchParams.get('limit') ?? String(PAGINATION.DEFAULT_LIMIT), 10))
  )
  const skip = (page - 1) * limit
  const trigger = searchParams.get('trigger')
  const active = searchParams.get('active')

  const filter: Record<string, unknown> = { organizationId: auth.organizationId }
  if (trigger) filter.trigger = trigger
  if (active !== null && active !== '') filter.active = active === 'true'

  const [items, total] = await Promise.all([
    Workflow.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean<Record<string, unknown>[]>(),
    Workflow.countDocuments(filter),
  ])

  return NextResponse.json({
    items: items.map(serializeWorkflow),
    total,
    page,
    limit,
  })
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!hasPermission(auth, 'workflows:write')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const parsed = CreateWorkflowSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  await connectDB()

  const workflow = await Workflow.create({
    ...parsed.data,
    organizationId: auth.organizationId,
    createdBy: auth.userId,
    executionCount: 0,
  })

  const obj = workflow.toObject() as Record<string, unknown>

  return NextResponse.json(serializeWorkflow(obj), { status: 201 })
}
