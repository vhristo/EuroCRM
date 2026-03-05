import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { requireAuth, unauthorizedResponse } from '@/lib/auth'
import Activity from '@/models/Activity'
import { evaluateWorkflows } from '@/lib/workflows/engine'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function PUT(req: NextRequest, context: RouteContext) {
  const auth = await requireAuth(req)
  if (!auth) return unauthorizedResponse()

  const { id } = await context.params
  await connectDB()

  const activity = await Activity.findOne({
    _id: id,
    organizationId: auth.organizationId,
  })

  if (!activity) {
    return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
  }

  const newDone = !activity.done

  const updated = await Activity.findOneAndUpdate(
    { _id: id, organizationId: auth.organizationId },
    {
      $set: {
        done: newDone,
        doneAt: newDone ? new Date() : null,
      },
    },
    { new: true }
  ).lean()

  // Fire-and-forget: trigger workflow only when activity is marked done (not undone)
  if (newDone && updated) {
    const activityEntity = updated as Record<string, unknown>
    evaluateWorkflows(auth.organizationId, 'activity_completed', {
      ...activityEntity,
      id: String(activityEntity._id),
    }).catch(console.error)
  }

  return NextResponse.json(updated)
}
