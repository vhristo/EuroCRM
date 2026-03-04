import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { connectDB } from '@/lib/db'
import { requireAuth, unauthorizedResponse } from '@/lib/auth'
import User from '@/models/User'

const UpdateProfileSchema = z.object({
  firstName: z.string().min(1).max(100).trim().optional(),
  lastName: z.string().min(1).max(100).trim().optional(),
})

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
})

export async function PUT(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth) return unauthorizedResponse()

  const body: unknown = await req.json()

  // Check if this is a password change or profile update
  const passwordParsed = ChangePasswordSchema.safeParse(body)
  if (passwordParsed.success) {
    await connectDB()
    const user = await User.findOne({ _id: auth.userId, organizationId: auth.organizationId })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const valid = await bcrypt.compare(passwordParsed.data.currentPassword, user.passwordHash)
    if (!valid) return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })

    user.passwordHash = await bcrypt.hash(passwordParsed.data.newPassword, 12)
    await user.save()
    return NextResponse.json({ success: true })
  }

  const parsed = UpdateProfileSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  await connectDB()

  const updated = await User.findOneAndUpdate(
    { _id: auth.userId, organizationId: auth.organizationId },
    { $set: parsed.data },
    { new: true }
  ).lean<Record<string, unknown>>()

  if (!updated) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  return NextResponse.json({
    id: String(updated._id),
    email: updated.email,
    firstName: updated.firstName,
    lastName: updated.lastName,
    role: updated.role,
  })
}
