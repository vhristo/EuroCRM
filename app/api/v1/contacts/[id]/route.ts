import { NextRequest, NextResponse } from 'next/server'
import { requireApiKey, apiKeyHasPermission } from '@/lib/apiKeyAuth'
import { connectDB } from '@/lib/db'
import { UpdateContactSchema } from '@/lib/validators/contactSchema'
import { serializeContact } from '@/lib/v1/handlers'
import Contact from '@/models/Contact'
import { fireWebhooks } from '@/lib/webhooks'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, context: RouteContext) {
  const auth = await requireApiKey(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!apiKeyHasPermission(auth.permissions, 'contacts:read')) {
    return NextResponse.json({ error: 'Forbidden', code: 'INSUFFICIENT_PERMISSIONS' }, { status: 403 })
  }

  const { id } = await context.params

  try {
    await connectDB()

    const contact = await Contact.findOne({
      _id: id,
      organizationId: auth.organizationId,
    }).lean<Record<string, unknown>>()

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    return NextResponse.json(serializeContact(contact))
  } catch (error: unknown) {
    console.error('[GET /api/v1/contacts/[id]]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, context: RouteContext) {
  const auth = await requireApiKey(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!apiKeyHasPermission(auth.permissions, 'contacts:write')) {
    return NextResponse.json({ error: 'Forbidden', code: 'INSUFFICIENT_PERMISSIONS' }, { status: 403 })
  }

  const body: unknown = await req.json()
  const parsed = UpdateContactSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { id } = await context.params

  try {
    await connectDB()

    const updated = await Contact.findOneAndUpdate(
      { _id: id, organizationId: auth.organizationId },
      { $set: parsed.data },
      { new: true, runValidators: true }
    ).lean<Record<string, unknown>>()

    if (!updated) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    const serialized = serializeContact(updated)
    fireWebhooks(auth.organizationId, 'contact.updated', serialized).catch(() => {})

    return NextResponse.json(serialized)
  } catch (error: unknown) {
    console.error('[PUT /api/v1/contacts/[id]]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const auth = await requireApiKey(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!apiKeyHasPermission(auth.permissions, 'contacts:delete')) {
    return NextResponse.json({ error: 'Forbidden', code: 'INSUFFICIENT_PERMISSIONS' }, { status: 403 })
  }

  const { id } = await context.params

  try {
    await connectDB()

    const deleted = await Contact.findOneAndDelete({
      _id: id,
      organizationId: auth.organizationId,
    })

    if (!deleted) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    fireWebhooks(auth.organizationId, 'contact.deleted', { id }).catch(() => {})

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('[DELETE /api/v1/contacts/[id]]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
