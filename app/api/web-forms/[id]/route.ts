import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { requireAuth, unauthorizedResponse } from '@/lib/auth'
import { UpdateWebFormSchema } from '@/lib/validators/webFormSchema'
import WebForm from '@/models/WebForm'

function serializeWebForm(doc: Record<string, unknown>): Record<string, unknown> {
  return {
    ...doc,
    id: String(doc._id),
    organizationId: String(doc.organizationId),
    _id: undefined,
    __v: undefined,
  }
}

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(req: NextRequest, context: RouteContext) {
  const auth = await requireAuth(req)
  if (!auth) return unauthorizedResponse()

  const { id } = await context.params

  await connectDB()

  const doc = await WebForm.findOne({
    _id: id,
    organizationId: auth.organizationId,
  }).lean<Record<string, unknown>>()

  if (!doc) {
    return NextResponse.json({ error: 'Web form not found' }, { status: 404 })
  }

  return NextResponse.json(serializeWebForm(doc))
}

export async function PUT(req: NextRequest, context: RouteContext) {
  const auth = await requireAuth(req)
  if (!auth) return unauthorizedResponse()

  const { id } = await context.params

  const parsed = UpdateWebFormSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  await connectDB()

  // Disallow slug updates via PUT — slug is generated at creation
  const { ...updateData } = parsed.data

  const doc = await WebForm.findOneAndUpdate(
    { _id: id, organizationId: auth.organizationId },
    { $set: updateData },
    { new: true }
  ).lean<Record<string, unknown>>()

  if (!doc) {
    return NextResponse.json({ error: 'Web form not found' }, { status: 404 })
  }

  return NextResponse.json(serializeWebForm(doc))
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const auth = await requireAuth(req)
  if (!auth) return unauthorizedResponse()

  const { id } = await context.params

  await connectDB()

  const doc = await WebForm.findOneAndDelete({
    _id: id,
    organizationId: auth.organizationId,
  })

  if (!doc) {
    return NextResponse.json({ error: 'Web form not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
