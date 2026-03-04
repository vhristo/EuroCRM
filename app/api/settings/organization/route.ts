import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { connectDB } from '@/lib/db'
import { requireAuth, unauthorizedResponse } from '@/lib/auth'
import { requireRole } from '@/lib/rbac'
import Organization from '@/models/Organization'

const UpdateOrgSchema = z.object({
  name: z.string().min(1).max(200).trim().optional(),
  settings: z
    .object({
      defaultCurrency: z.string().length(3).optional(),
      timezone: z.string().max(100).optional(),
    })
    .optional(),
})

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth) return unauthorizedResponse()

  await connectDB()

  const org = await Organization.findById(auth.organizationId).lean<Record<string, unknown>>()
  if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 })

  return NextResponse.json({
    id: String(org._id),
    name: org.name,
    plan: org.plan,
    settings: org.settings,
  })
}

export async function PUT(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth) return unauthorizedResponse()

  const roleError = requireRole(auth, 'admin')
  if (roleError) return roleError

  const parsed = UpdateOrgSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  await connectDB()

  const updateData: Record<string, unknown> = {}
  if (parsed.data.name) updateData.name = parsed.data.name
  if (parsed.data.settings?.defaultCurrency) {
    updateData['settings.defaultCurrency'] = parsed.data.settings.defaultCurrency
  }
  if (parsed.data.settings?.timezone) {
    updateData['settings.timezone'] = parsed.data.settings.timezone
  }

  const updated = await Organization.findByIdAndUpdate(
    auth.organizationId,
    { $set: updateData },
    { new: true }
  ).lean<Record<string, unknown>>()

  if (!updated) return NextResponse.json({ error: 'Organization not found' }, { status: 404 })

  return NextResponse.json({
    id: String(updated._id),
    name: updated.name,
    plan: updated.plan,
    settings: updated.settings,
  })
}
