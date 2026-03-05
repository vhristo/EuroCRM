import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { hasPermission } from '@/lib/rbac'
import Workflow from '@/models/Workflow'
import { UpdateWorkflowSchema } from '@/lib/validators/workflowSchema'

interface RouteParams {
  params: Promise<{ id: string }>
}

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

export async function GET(req: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!hasPermission(auth, 'workflows:read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  await connectDB()

  const workflow = await Workflow.findOne({
    _id: id,
    organizationId: auth.organizationId,
  }).lean<Record<string, unknown>>()

  if (!workflow) {
    return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
  }

  return NextResponse.json(serializeWorkflow(workflow))
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!hasPermission(auth, 'workflows:write')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  const parsed = UpdateWorkflowSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  await connectDB()

  const updated = await Workflow.findOneAndUpdate(
    { _id: id, organizationId: auth.organizationId },
    { $set: parsed.data },
    { new: true }
  ).lean<Record<string, unknown>>()

  if (!updated) {
    return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
  }

  return NextResponse.json(serializeWorkflow(updated))
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!hasPermission(auth, 'workflows:write')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  await connectDB()

  const deleted = await Workflow.findOneAndDelete({
    _id: id,
    organizationId: auth.organizationId,
  }).lean()

  if (!deleted) {
    return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
