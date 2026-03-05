import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import Organization from '@/models/Organization'
import { UpdateCustomFieldSchema } from '@/lib/validators/customFieldSchema'
import type { CustomFieldEntityType } from '@/types/customField'
import { Types } from 'mongoose'

type RouteParams = { params: { id: string } }

function findFieldInOrg(
  org: InstanceType<typeof Organization>,
  fieldId: string
): { entityType: CustomFieldEntityType; index: number } | null {
  const entityTypes: CustomFieldEntityType[] = ['contacts', 'deals', 'leads']

  for (const entityType of entityTypes) {
    const fields = org.customFields[entityType] as Array<{ _id: Types.ObjectId }>
    const index = fields.findIndex((f) => f._id.toString() === fieldId)
    if (index !== -1) return { entityType, index }
  }

  return null
}

// PUT /api/settings/custom-fields/[id]
export async function PUT(req: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (auth.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 })
  }

  const parsed = UpdateCustomFieldSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  await connectDB()

  const org = await Organization.findById(auth.organizationId)
  if (!org) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
  }

  const found = findFieldInOrg(org, params.id)
  if (!found) {
    return NextResponse.json({ error: 'Custom field not found' }, { status: 404 })
  }

  const { entityType, index } = found
  const field = org.customFields[entityType][index]

  const { label, type, required, options } = parsed.data

  if (label !== undefined) field.label = label
  if (type !== undefined) field.type = type
  if (required !== undefined) field.required = required
  if (options !== undefined) field.options = options

  await org.save()

  const updated = org.customFields[entityType][index]

  return NextResponse.json({
    id: (updated._id as Types.ObjectId).toString(),
    name: updated.name,
    label: updated.label,
    type: updated.type,
    entityType: updated.entityType,
    required: updated.required,
    options: updated.options,
    order: updated.order,
  })
}

// DELETE /api/settings/custom-fields/[id]
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (auth.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 })
  }

  await connectDB()

  const org = await Organization.findById(auth.organizationId)
  if (!org) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
  }

  const found = findFieldInOrg(org, params.id)
  if (!found) {
    return NextResponse.json({ error: 'Custom field not found' }, { status: 404 })
  }

  const { entityType, index } = found
  org.customFields[entityType].splice(index, 1)
  await org.save()

  return NextResponse.json({ success: true })
}
