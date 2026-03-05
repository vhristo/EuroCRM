import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { testSmtpConnection } from '@/lib/email'
import EmailConfig from '@/models/EmailConfig'
import mongoose from 'mongoose'

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await requireAuth(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (auth.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await connectDB()

  const orgId = new mongoose.Types.ObjectId(auth.organizationId)
  const config = await EmailConfig.findOne({ organizationId: orgId })

  if (!config) {
    return NextResponse.json(
      { error: 'No email configuration found. Save your SMTP settings first.' },
      { status: 422 }
    )
  }

  try {
    await testSmtpConnection(config)
    return NextResponse.json({ success: true, message: 'SMTP connection successful' })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Connection failed'
    return NextResponse.json(
      { error: 'SMTP connection failed', detail: message },
      { status: 502 }
    )
  }
}
