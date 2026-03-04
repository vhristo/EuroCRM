import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { requireAuth, unauthorizedResponse } from '@/lib/auth'
import Contact from '@/models/Contact'
import Deal from '@/models/Deal'
import Activity from '@/models/Activity'
import mongoose from 'mongoose'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth) return unauthorizedResponse()

  await connectDB()

  const orgId = new mongoose.Types.ObjectId(auth.organizationId)

  const [totalContacts, openDeals, pipelineValue, activitiesDue] =
    await Promise.all([
      Contact.countDocuments({ organizationId: orgId }),
      Deal.countDocuments({ organizationId: orgId, status: 'open' }),
      Deal.aggregate([
        { $match: { organizationId: orgId, status: 'open' } },
        { $group: { _id: null, total: { $sum: '$value' } } },
      ]),
      Activity.countDocuments({
        organizationId: orgId,
        done: false,
        dueDate: { $lte: new Date() },
      }),
    ])

  return NextResponse.json({
    totalContacts,
    openDeals,
    pipelineValue: pipelineValue[0]?.total ?? 0,
    activitiesDue,
  })
}
