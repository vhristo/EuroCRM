import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { requireAuth, unauthorizedResponse } from '@/lib/auth'
import Deal from '@/models/Deal'
import User from '@/models/User'
import mongoose from 'mongoose'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth) return unauthorizedResponse()

  await connectDB()

  const period = req.nextUrl.searchParams.get('period') ?? 'month'
  const now = new Date()

  let startDate: Date
  switch (period) {
    case 'week':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)
      break
    case 'quarter':
      startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
      break
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1)
      break
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
  }

  const leaderboard = await Deal.aggregate([
    {
      $match: {
        organizationId: new mongoose.Types.ObjectId(auth.organizationId),
        status: 'won',
        wonAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: '$ownerId',
        wonDeals: { $sum: 1 },
        totalRevenue: { $sum: '$value' },
      },
    },
    { $sort: { totalRevenue: -1 } },
    { $limit: 20 },
  ])

  const userIds = leaderboard.map((l) => l._id)
  const users = await User.find(
    { _id: { $in: userIds } },
    { firstName: 1, lastName: 1, email: 1 }
  ).lean()

  const userMap = new Map(
    users.map((u: Record<string, unknown>) => [
      String(u._id),
      { firstName: String(u.firstName), lastName: String(u.lastName), email: String(u.email) },
    ])
  )

  return NextResponse.json({
    period,
    leaderboard: leaderboard.map((entry, index) => {
      const user = userMap.get(entry._id.toString())
      return {
        rank: index + 1,
        userId: entry._id.toString(),
        name: user ? `${user.firstName} ${user.lastName}` : 'Unknown',
        email: user?.email ?? '',
        wonDeals: entry.wonDeals,
        totalRevenue: entry.totalRevenue,
      }
    }),
  })
}
