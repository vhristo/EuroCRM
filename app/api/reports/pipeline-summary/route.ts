import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { requireAuth, unauthorizedResponse } from '@/lib/auth'
import Deal from '@/models/Deal'
import mongoose from 'mongoose'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth) return unauthorizedResponse()

  await connectDB()

  const pipelineId = req.nextUrl.searchParams.get('pipelineId')
  const matchStage: Record<string, unknown> = {
    organizationId: new mongoose.Types.ObjectId(auth.organizationId),
    status: 'open',
  }
  if (pipelineId) {
    matchStage.pipelineId = new mongoose.Types.ObjectId(pipelineId)
  }

  const summary = await Deal.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$stage',
        count: { $sum: 1 },
        totalValue: { $sum: '$value' },
        avgProbability: { $avg: '$probability' },
        weightedValue: {
          $sum: { $multiply: ['$value', { $divide: ['$probability', 100] }] },
        },
      },
    },
    { $sort: { _id: 1 } },
  ])

  const totals = await Deal.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalDeals: { $sum: 1 },
        totalValue: { $sum: '$value' },
        totalWeightedValue: {
          $sum: { $multiply: ['$value', { $divide: ['$probability', 100] }] },
        },
      },
    },
  ])

  return NextResponse.json({
    stages: summary.map((s) => ({
      stage: s._id,
      count: s.count,
      totalValue: s.totalValue,
      avgProbability: Math.round(s.avgProbability),
      weightedValue: Math.round(s.weightedValue),
    })),
    totals: totals[0]
      ? {
          totalDeals: totals[0].totalDeals,
          totalValue: totals[0].totalValue,
          totalWeightedValue: Math.round(totals[0].totalWeightedValue),
        }
      : { totalDeals: 0, totalValue: 0, totalWeightedValue: 0 },
  })
}
