import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { hashToken, verifyRefreshToken } from '@/lib/auth'
import { clearRefreshCookie } from '@/lib/session'
import User from '@/models/User'

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('refreshToken')?.value

    if (token) {
      const payload = verifyRefreshToken(token)
      if (payload) {
        await connectDB()
        const tokenHash = await hashToken(token)
        // Scoped by _id as well as hash — matching on the hash alone would be a
        // cross-user write surface.
        await User.updateOne(
          { _id: payload.userId, 'refreshTokens.tokenHash': tokenHash },
          { $pull: { refreshTokens: { tokenHash } } }
        )
      }
    }

    const response = NextResponse.json({ success: true })
    clearRefreshCookie(response)

    return response
  } catch (error: unknown) {
    console.error('Logout error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
