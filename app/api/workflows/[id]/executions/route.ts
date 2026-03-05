import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { hasPermission } from '@/lib/rbac'
import Workflow from '@/models/Workflow'
import WorkflowExecution from '@/models/WorkflowExecution'
import { PAGINATION } from '@/utils/constants'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!hasPermission(auth, 'workflows:read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  await connectDB()

  // Verify the workflow belongs to this org
  const workflow = await Workflow.findOne({
    _id: id,
    organizationId: auth.organizationId,
  }).lean()

  if (!workflow) {
    return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
  }

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const limit = Math.min(
    PAGINATION.MAX_LIMIT,
    Math.max(1, parseInt(searchParams.get('limit') ?? String(PAGINATION.DEFAULT_LIMIT), 10))
  )
  const skip = (page - 1) * limit

  const filter = {
    workflowId: id,
    organizationId: auth.organizationId,
  }

  const [items, total] = await Promise.all([
    WorkflowExecution.find(filter)
      .sort({ executedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean<Record<string, unknown>[]>(),
    WorkflowExecution.countDocuments(filter),
  ])

  const serialized = items.map((e) => ({
    ...e,
    id: String(e._id),
    _id: undefined,
    workflowId: String(e.workflowId),
    organizationId: String(e.organizationId),
    executedAt: (e.executedAt as Date).toISOString(),
  }))

  return NextResponse.json({ items: serialized, total, page, limit })
}
