import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { requireAuth, unauthorizedResponse } from '@/lib/auth'
import { ConvertLeadSchema } from '@/lib/validators/leadSchema'
import Lead from '@/models/Lead'
import Contact from '@/models/Contact'
import Deal from '@/models/Deal'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(req: NextRequest, context: RouteContext) {
  const auth = await requireAuth(req)
  if (!auth) return unauthorizedResponse()

  const parsed = ConvertLeadSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { id } = await context.params
  await connectDB()

  const lead = await Lead.findOne({
    _id: id,
    organizationId: auth.organizationId,
    status: { $ne: 'converted' },
  })

  if (!lead) {
    return NextResponse.json(
      { error: 'Lead not found or already converted' },
      { status: 404 }
    )
  }

  const nameParts = lead.name.trim().split(/\s+/)
  const firstName = nameParts[0]
  const lastName = nameParts.slice(1).join(' ') || firstName

  const contact = await Contact.create({
    organizationId: auth.organizationId,
    firstName,
    lastName,
    email: lead.email,
    phone: lead.phone,
    company: lead.company,
    currency: parsed.data.currency,
    tags: ['converted-lead'],
    ownerId: auth.userId,
  })

  const deal = await Deal.create({
    organizationId: auth.organizationId,
    title: parsed.data.dealTitle,
    value: parsed.data.dealValue,
    currency: parsed.data.currency,
    stage: parsed.data.stage,
    pipelineId: parsed.data.pipelineId,
    contactId: contact._id,
    status: 'open',
    probability: 10,
    stageEnteredAt: new Date(),
    ownerId: auth.userId,
  })

  await Lead.updateOne(
    { _id: id },
    {
      $set: {
        status: 'converted',
        convertedToDealId: deal._id,
        convertedToContactId: contact._id,
        convertedAt: new Date(),
      },
    }
  )

  return NextResponse.json(
    {
      contact: contact.toObject(),
      deal: deal.toObject(),
    },
    { status: 201 }
  )
}
