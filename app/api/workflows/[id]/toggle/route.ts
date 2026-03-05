import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { hasPermission } from '@/lib/rbac'
import Workflow from '@/models/Workflow'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!hasPermission(auth, 'workflows:write')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  await connectDB()

  // Find current state to toggle
  const workflow = await Workflow.findOne({
    _id: id,
    organizationId: auth.organizationId,
  })

  if (!workflow) {
    return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
  }

  const updated = await Workflow.findOneAndUpdate(
    { _id: id, organizationId: auth.organizationId },
    { $set: { active: !workflow.active } },
    { new: true }
  ).lean<Record<string, unknown>>()

  if (!updated) {
    return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
  }

  return NextResponse.json({
    id: String(updated._id),
    active: updated.active,
  })
}
