import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { hashToken } from '@/lib/auth'
import User from '@/models/User'

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('refreshToken')?.value

    if (token) {
      await connectDB()
      const tokenHash = await hashToken(token)
      await User.updateOne(
        { 'refreshTokens.tokenHash': tokenHash },
        { $pull: { refreshTokens: { tokenHash } } }
      )
    }

    const response = NextResponse.json({ success: true })

    response.cookies.set('refreshToken', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/auth',
      maxAge: 0,
    })

    return response
  } catch (error: unknown) {
    console.error('Logout error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
