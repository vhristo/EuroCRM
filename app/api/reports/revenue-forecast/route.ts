import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { requireAuth, unauthorizedResponse } from '@/lib/auth'
import Deal from '@/models/Deal'
import mongoose from 'mongoose'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth) return unauthorizedResponse()

  await connectDB()

  const months = parseInt(req.nextUrl.searchParams.get('months') ?? '6')

  const now = new Date()
  const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const wonByMonth = await Deal.aggregate([
    {
      $match: {
        organizationId: new mongoose.Types.ObjectId(auth.organizationId),
        status: 'won',
        wonAt: { $gte: new Date(now.getFullYear(), now.getMonth() - months + 1, 1) },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: '$wonAt' },
          month: { $month: '$wonAt' },
        },
        revenue: { $sum: '$value' },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ])

  const forecast = await Deal.aggregate([
    {
      $match: {
        organizationId: new mongoose.Types.ObjectId(auth.organizationId),
        status: 'open',
        expectedCloseDate: {
          $gte: startOfCurrentMonth,
          $lt: new Date(now.getFullYear(), now.getMonth() + 3, 1),
        },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: '$expectedCloseDate' },
          month: { $month: '$expectedCloseDate' },
        },
        projectedRevenue: {
          $sum: { $multiply: ['$value', { $divide: ['$probability', 100] }] },
        },
        totalValue: { $sum: '$value' },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ])

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  return NextResponse.json({
    wonByMonth: wonByMonth.map((m) => ({
      month: `${monthNames[m._id.month - 1]} ${m._id.year}`,
      revenue: m.revenue,
      count: m.count,
    })),
    forecast: forecast.map((m) => ({
      month: `${monthNames[m._id.month - 1]} ${m._id.year}`,
      projectedRevenue: Math.round(m.projectedRevenue),
      totalValue: m.totalValue,
      count: m.count,
    })),
  })
}
