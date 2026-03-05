import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import Organization from '@/models/Organization'
import { ReorderCustomFieldsSchema } from '@/lib/validators/customFieldSchema'
import type { CustomFieldEntityType } from '@/types/customField'
import { Types } from 'mongoose'
import { z } from 'zod'

const ENTITY_TYPES: CustomFieldEntityType[] = ['contacts', 'deals', 'leads']

const ReorderRequestSchema = ReorderCustomFieldsSchema.extend({
  entityType: z.enum(['contacts', 'deals', 'leads']),
})

// PUT /api/settings/custom-fields/reorder
export async function PUT(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (auth.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 })
  }

  const parsed = ReorderRequestSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { entityType, items } = parsed.data

  if (!ENTITY_TYPES.includes(entityType)) {
    return NextResponse.json(
      { error: 'entityType must be one of: contacts, deals, leads' },
      { status: 400 }
    )
  }

  await connectDB()

  const org = await Organization.findById(auth.organizationId)
  if (!org) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
  }

  const fields = org.customFields[entityType] as Array<{
    _id: Types.ObjectId
    order: number
  }>

  for (const { id, order } of items) {
    const field = fields.find((f) => f._id.toString() === id)
    if (field) {
      field.order = order
    }
  }

  await org.save()

  const normalized = org.customFields[entityType]
    .map((f: { _id: Types.ObjectId; name: string; label: string; type: string; entityType: string; required: boolean; options: string[]; order: number }) => ({
      id: f._id.toString(),
      name: f.name,
      label: f.label,
      type: f.type,
      entityType: f.entityType,
      required: f.required,
      options: f.options,
      order: f.order,
    }))
    .sort((a: { order: number }, b: { order: number }) => a.order - b.order)

  return NextResponse.json(normalized)
}
