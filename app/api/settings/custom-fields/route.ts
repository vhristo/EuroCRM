import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import Organization from '@/models/Organization'
import { CreateCustomFieldSchema } from '@/lib/validators/customFieldSchema'
import type { CustomFieldEntityType } from '@/types/customField'
import { Types } from 'mongoose'

const ENTITY_TYPES: CustomFieldEntityType[] = ['contacts', 'deals', 'leads']

// GET /api/settings/custom-fields?entityType=contacts
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const entityType = searchParams.get('entityType') as CustomFieldEntityType | null

  if (!entityType || !ENTITY_TYPES.includes(entityType)) {
    return NextResponse.json(
      { error: 'entityType query param must be one of: contacts, deals, leads' },
      { status: 400 }
    )
  }

  await connectDB()

  const org = await Organization.findById(auth.organizationId).lean<Record<string, unknown>>()
  if (!org) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
  }

  const customFields = org.customFields as Record<string, unknown> | undefined
  const fields = (customFields?.[entityType] as unknown[]) ?? []

  // Normalize _id → id and sort by order
  const normalized = (fields as Array<Record<string, unknown>>)
    .map((f) => ({
      id: (f._id as Types.ObjectId).toString(),
      name: f.name,
      label: f.label,
      type: f.type,
      entityType: f.entityType,
      required: f.required,
      options: f.options ?? [],
      order: f.order ?? 0,
    }))
    .sort((a, b) => (a.order as number) - (b.order as number))

  return NextResponse.json(normalized)
}

// POST /api/settings/custom-fields
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (auth.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 })
  }

  const parsed = CreateCustomFieldSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { entityType, name, label, type, required, options } = parsed.data

  await connectDB()

  const org = await Organization.findById(auth.organizationId)
  if (!org) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
  }

  // Enforce unique name per entity type
  const existing = org.customFields[entityType]
  if (existing.some((f: { name: string }) => f.name === name)) {
    return NextResponse.json(
      { error: `A field named "${name}" already exists for ${entityType}` },
      { status: 400 }
    )
  }

  const nextOrder = existing.length > 0
    ? Math.max(...existing.map((f: { order: number }) => f.order)) + 1
    : 0

  const newField = {
    _id: new Types.ObjectId(),
    name,
    label,
    type,
    entityType,
    required: required ?? false,
    options: options ?? [],
    order: nextOrder,
  }

  org.customFields[entityType].push(newField)
  await org.save()

  const saved = org.customFields[entityType][org.customFields[entityType].length - 1]

  return NextResponse.json(
    {
      id: (saved._id as Types.ObjectId).toString(),
      name: saved.name,
      label: saved.label,
      type: saved.type,
      entityType: saved.entityType,
      required: saved.required,
      options: saved.options,
      order: saved.order,
    },
    { status: 201 }
  )
}
