import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { requireAuth, unauthorizedResponse } from '@/lib/auth'
import { UpdateActivitySchema } from '@/lib/validators/activitySchema'
import Activity from '@/models/Activity'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(req: NextRequest, context: RouteContext) {
  const auth = await requireAuth(req)
  if (!auth) return unauthorizedResponse()

  const { id } = await context.params
  await connectDB()

  const activity = await Activity.findOne({
    _id: id,
    organizationId: auth.organizationId,
  }).lean()

  if (!activity) {
    return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
  }

  return NextResponse.json(activity)
}

export async function PUT(req: NextRequest, context: RouteContext) {
  const auth = await requireAuth(req)
  if (!auth) return unauthorizedResponse()

  const parsed = UpdateActivitySchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { id } = await context.params
  await connectDB()

  const updateData: Record<string, unknown> = { ...parsed.data }
  if (parsed.data.dueDate) {
    updateData.dueDate = new Date(parsed.data.dueDate)
  }

  const activity = await Activity.findOneAndUpdate(
    { _id: id, organizationId: auth.organizationId },
    { $set: updateData },
    { new: true }
  ).lean()

  if (!activity) {
    return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
  }

  return NextResponse.json(activity)
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const auth = await requireAuth(req)
  if (!auth) return unauthorizedResponse()

  const { id } = await context.params
  await connectDB()

  const result = await Activity.deleteOne({
    _id: id,
    organizationId: auth.organizationId,
  })

  if (result.deletedCount === 0) {
    return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
