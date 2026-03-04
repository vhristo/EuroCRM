import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { requireAuth, unauthorizedResponse } from '@/lib/auth'
import { UpdateLeadSchema } from '@/lib/validators/leadSchema'
import Lead from '@/models/Lead'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(req: NextRequest, context: RouteContext) {
  const auth = await requireAuth(req)
  if (!auth) return unauthorizedResponse()

  const { id } = await context.params
  await connectDB()

  const lead = await Lead.findOne({
    _id: id,
    organizationId: auth.organizationId,
  }).lean()

  if (!lead) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  }

  return NextResponse.json(lead)
}

export async function PUT(req: NextRequest, context: RouteContext) {
  const auth = await requireAuth(req)
  if (!auth) return unauthorizedResponse()

  const parsed = UpdateLeadSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { id } = await context.params
  await connectDB()

  const lead = await Lead.findOneAndUpdate(
    { _id: id, organizationId: auth.organizationId },
    { $set: parsed.data },
    { new: true }
  ).lean()

  if (!lead) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  }

  return NextResponse.json(lead)
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const auth = await requireAuth(req)
  if (!auth) return unauthorizedResponse()

  const { id } = await context.params
  await connectDB()

  const result = await Lead.deleteOne({
    _id: id,
    organizationId: auth.organizationId,
  })

  if (result.deletedCount === 0) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
