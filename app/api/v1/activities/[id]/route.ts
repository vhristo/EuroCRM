import { NextRequest, NextResponse } from 'next/server'
import { requireApiKey, apiKeyHasPermission } from '@/lib/apiKeyAuth'
import { connectDB } from '@/lib/db'
import { UpdateActivitySchema } from '@/lib/validators/activitySchema'
import { serializeActivity } from '@/lib/v1/handlers'
import Activity from '@/models/Activity'
import { fireWebhooks } from '@/lib/webhooks'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, context: RouteContext) {
  const auth = await requireApiKey(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!apiKeyHasPermission(auth.permissions, 'activities:read')) {
    return NextResponse.json({ error: 'Forbidden', code: 'INSUFFICIENT_PERMISSIONS' }, { status: 403 })
  }

  const { id } = await context.params

  try {
    await connectDB()

    const activity = await Activity.findOne({
      _id: id,
      organizationId: auth.organizationId,
    }).lean<Record<string, unknown>>()

    if (!activity) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
    }

    return NextResponse.json(serializeActivity(activity))
  } catch (error: unknown) {
    console.error('[GET /api/v1/activities/[id]]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, context: RouteContext) {
  const auth = await requireApiKey(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!apiKeyHasPermission(auth.permissions, 'activities:write')) {
    return NextResponse.json({ error: 'Forbidden', code: 'INSUFFICIENT_PERMISSIONS' }, { status: 403 })
  }

  const body: unknown = await req.json()
  const parsed = UpdateActivitySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { id } = await context.params

  try {
    await connectDB()

    const updateData: Record<string, unknown> = { ...parsed.data }

    // If marking as done, record doneAt
    const bodyRecord = body as Record<string, unknown>
    if (bodyRecord.done === true) {
      updateData.done = true
      updateData.doneAt = new Date()
    }

    const updated = await Activity.findOneAndUpdate(
      { _id: id, organizationId: auth.organizationId },
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean<Record<string, unknown>>()

    if (!updated) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
    }

    const serialized = serializeActivity(updated)

    const event = updated.done === true ? 'activity.completed' : 'activity.updated' as string
    fireWebhooks(auth.organizationId, event, serialized).catch(() => {})

    return NextResponse.json(serialized)
  } catch (error: unknown) {
    console.error('[PUT /api/v1/activities/[id]]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const auth = await requireApiKey(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!apiKeyHasPermission(auth.permissions, 'activities:delete')) {
    return NextResponse.json({ error: 'Forbidden', code: 'INSUFFICIENT_PERMISSIONS' }, { status: 403 })
  }

  const { id } = await context.params

  try {
    await connectDB()

    const deleted = await Activity.findOneAndDelete({
      _id: id,
      organizationId: auth.organizationId,
    })

    if (!deleted) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
    }

    fireWebhooks(auth.organizationId, 'activity.deleted', { id }).catch(() => {})

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('[DELETE /api/v1/activities/[id]]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
