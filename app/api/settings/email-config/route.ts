import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { EmailConfigSchema } from '@/lib/validators/emailSchema'
import { encrypt, decrypt } from '@/lib/encryption'
import EmailConfig from '@/models/EmailConfig'
import mongoose from 'mongoose'
import type { IEmailConfig } from '@/types/email'

function serializeConfig(doc: Record<string, unknown>): IEmailConfig {
  return {
    id: String(doc._id),
    organizationId: String(doc.organizationId),
    host: String(doc.host ?? ''),
    port: Number(doc.port ?? 587),
    secure: Boolean(doc.secure),
    username: String(doc.username ?? ''),
    // Never expose the encrypted password — return empty string for the UI
    password: '',
    fromName: String(doc.fromName ?? ''),
    fromEmail: String(doc.fromEmail ?? ''),
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt ?? ''),
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : String(doc.updatedAt ?? ''),
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await requireAuth(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (auth.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await connectDB()

  const orgId = new mongoose.Types.ObjectId(auth.organizationId)
  const doc = await EmailConfig.findOne({ organizationId: orgId }).lean<Record<string, unknown>>()

  if (!doc) {
    return NextResponse.json(null, { status: 200 })
  }

  return NextResponse.json(serializeConfig(doc))
}

export async function PUT(req: NextRequest): Promise<NextResponse> {
  const auth = await requireAuth(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (auth.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const parsed = EmailConfigSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  await connectDB()

  const orgId = new mongoose.Types.ObjectId(auth.organizationId)
  const { host, port, secure, username, password, fromName, fromEmail } = parsed.data

  const updateFields: Record<string, unknown> = {
    host,
    port,
    secure,
    username,
    fromName,
    fromEmail,
  }

  // Only update password if a non-empty value was provided
  if (password && password.length > 0) {
    updateFields.encryptedPassword = encrypt(password)
  }

  const doc = await EmailConfig.findOneAndUpdate(
    { organizationId: orgId },
    {
      $set: updateFields,
    },
    { upsert: true, new: true }
  ).lean<Record<string, unknown>>()

  return NextResponse.json(serializeConfig(doc!))
}
