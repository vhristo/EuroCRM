import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import {
  verifyRefreshToken,
  signAccessToken,
  signRefreshToken,
  hashToken,
  getRefreshExpiry,
} from '@/lib/auth'
import User from '@/models/User'

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('refreshToken')?.value
    if (!token) {
      return NextResponse.json({ error: 'No refresh token' }, { status: 401 })
    }

    const payload = verifyRefreshToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid refresh token' }, { status: 401 })
    }

    await connectDB()

    const oldHash = await hashToken(token)

    const user = await User.findOneAndUpdate(
      {
        _id: payload.userId,
        'refreshTokens.tokenHash': oldHash,
      },
      { $pull: { refreshTokens: { tokenHash: oldHash } } },
      { new: true }
    )

    if (!user) {
      return NextResponse.json({ error: 'Refresh token not found' }, { status: 401 })
    }

    const newPayload = {
      userId: user._id.toString(),
      organizationId: user.organizationId.toString(),
      email: user.email,
      role: user.role,
    }

    const newAccessToken = signAccessToken(newPayload)
    const newRefreshToken = signRefreshToken(newPayload)
    const newHash = await hashToken(newRefreshToken)

    await User.updateOne(
      { _id: user._id },
      { $push: { refreshTokens: { tokenHash: newHash, expiresAt: getRefreshExpiry() } } }
    )

    const response = NextResponse.json({ accessToken: newAccessToken })

    response.cookies.set('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/auth',
      maxAge: 7 * 24 * 60 * 60,
    })

    return response
  } catch (error: unknown) {
    console.error('Refresh error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
