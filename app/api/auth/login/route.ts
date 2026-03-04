import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { connectDB } from '@/lib/db'
import { LoginSchema } from '@/lib/validators/authSchema'
import { signAccessToken, signRefreshToken, hashToken, getRefreshExpiry } from '@/lib/auth'
import User from '@/models/User'

export async function POST(req: NextRequest) {
  try {
    const parsed = LoginSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    await connectDB()

    const { email, password } = parsed.data

    const user = await User.findOne({ email })
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const isValid = await bcrypt.compare(password, user.passwordHash)
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const payload = {
      userId: user._id.toString(),
      organizationId: user.organizationId.toString(),
      email: user.email,
      role: user.role,
    }

    const accessToken = signAccessToken(payload)
    const refreshToken = signRefreshToken(payload)
    const tokenHash = await hashToken(refreshToken)

    await User.updateOne(
      { _id: user._id },
      {
        $push: { refreshTokens: { tokenHash, expiresAt: getRefreshExpiry() } },
        $set: { lastLoginAt: new Date() },
      }
    )

    const response = NextResponse.json({
      accessToken,
      user: {
        id: user._id.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        organizationId: user.organizationId.toString(),
      },
    })

    response.cookies.set('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/auth',
      maxAge: 7 * 24 * 60 * 60,
    })

    return response
  } catch (error: unknown) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
