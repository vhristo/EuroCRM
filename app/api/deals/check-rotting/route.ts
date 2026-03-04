import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { requireAuth, unauthorizedResponse } from '@/lib/auth'
import Deal from '@/models/Deal'
import Pipeline from '@/models/Pipeline'
import mongoose from 'mongoose'

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth) return unauthorizedResponse()

  await connectDB()

  const orgId = new mongoose.Types.ObjectId(auth.organizationId)

  const pipelines = await Pipeline.find({ organizationId: orgId }).lean<Record<string, unknown>[]>()

  const stageRotDays = new Map<string, number>()
  for (const pipeline of pipelines) {
    const stages = pipeline.stages as Array<{ id: string; rotDays: number }>
    for (const stage of stages) {
      if (stage.rotDays > 0) {
        stageRotDays.set(stage.id, stage.rotDays)
      }
    }
  }

  const openDeals = await Deal.find({
    organizationId: orgId,
    status: 'open',
  }).lean<Record<string, unknown>[]>()

  const now = new Date()
  let rottenCount = 0
  let freshCount = 0

  for (const deal of openDeals) {
    const rotDays = stageRotDays.get(deal.stage as string)
    if (!rotDays) continue

    const stageEnteredAt = new Date(deal.stageEnteredAt as string)
    const daysSinceEntry = (now.getTime() - stageEnteredAt.getTime()) / (1000 * 60 * 60 * 24)

    if (daysSinceEntry > rotDays && !deal.rottenSince) {
      await Deal.updateOne(
        { _id: deal._id },
        { $set: { rottenSince: now } }
      )
      rottenCount++
    } else if (daysSinceEntry <= rotDays && deal.rottenSince) {
      await Deal.updateOne(
        { _id: deal._id },
        { $set: { rottenSince: null } }
      )
      freshCount++
    }
  }

  return NextResponse.json({
    checked: openDeals.length,
    markedRotten: rottenCount,
    markedFresh: freshCount,
  })
}
