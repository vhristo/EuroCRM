import { NextRequest, NextResponse } from 'next/server'
import { requireApiKey, apiKeyHasPermission } from '@/lib/apiKeyAuth'
import { connectDB } from '@/lib/db'
import { UpdateLeadSchema } from '@/lib/validators/leadSchema'
import { serializeLead } from '@/lib/v1/handlers'
import Lead from '@/models/Lead'
import { fireWebhooks } from '@/lib/webhooks'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, context: RouteContext) {
  const auth = await requireApiKey(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!apiKeyHasPermission(auth.permissions, 'leads:read')) {
    return NextResponse.json({ error: 'Forbidden', code: 'INSUFFICIENT_PERMISSIONS' }, { status: 403 })
  }

  const { id } = await context.params

  try {
    await connectDB()

    const lead = await Lead.findOne({
      _id: id,
      organizationId: auth.organizationId,
    }).lean<Record<string, unknown>>()

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    return NextResponse.json(serializeLead(lead))
  } catch (error: unknown) {
    console.error('[GET /api/v1/leads/[id]]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, context: RouteContext) {
  const auth = await requireApiKey(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!apiKeyHasPermission(auth.permissions, 'leads:write')) {
    return NextResponse.json({ error: 'Forbidden', code: 'INSUFFICIENT_PERMISSIONS' }, { status: 403 })
  }

  const body: unknown = await req.json()
  const parsed = UpdateLeadSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { id } = await context.params

  try {
    await connectDB()

    const updated = await Lead.findOneAndUpdate(
      { _id: id, organizationId: auth.organizationId },
      { $set: parsed.data },
      { new: true, runValidators: true }
    ).lean<Record<string, unknown>>()

    if (!updated) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    const serialized = serializeLead(updated)
    fireWebhooks(auth.organizationId, 'lead.updated', serialized).catch(() => {})

    return NextResponse.json(serialized)
  } catch (error: unknown) {
    console.error('[PUT /api/v1/leads/[id]]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const auth = await requireApiKey(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!apiKeyHasPermission(auth.permissions, 'leads:delete')) {
    return NextResponse.json({ error: 'Forbidden', code: 'INSUFFICIENT_PERMISSIONS' }, { status: 403 })
  }

  const { id } = await context.params

  try {
    await connectDB()

    const deleted = await Lead.findOneAndDelete({
      _id: id,
      organizationId: auth.organizationId,
    })

    if (!deleted) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    fireWebhooks(auth.organizationId, 'lead.deleted', { id }).catch(() => {})

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('[DELETE /api/v1/leads/[id]]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
