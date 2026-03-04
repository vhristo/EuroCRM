import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { connectDB } from '@/lib/db'
import { RegisterSchema } from '@/lib/validators/authSchema'
import { signAccessToken, signRefreshToken, hashToken, getRefreshExpiry } from '@/lib/auth'
import User from '@/models/User'
import Organization from '@/models/Organization'

export async function POST(req: NextRequest) {
  try {
    const parsed = RegisterSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    await connectDB()

    const { email, password, firstName, lastName, organizationName } = parsed.data

    const existingUser = await User.findOne({ email }).lean()
    if (existingUser) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
    }

    const organization = await Organization.create({
      name: organizationName,
    })

    const passwordHash = await bcrypt.hash(password, 12)

    const refreshToken = signRefreshToken({
      userId: 'pending',
      organizationId: organization._id.toString(),
      email,
      role: 'admin',
    })
    const tokenHash = await hashToken(refreshToken)

    const user = await User.create({
      organizationId: organization._id,
      email,
      passwordHash,
      firstName,
      lastName,
      role: 'admin',
      refreshTokens: [{ tokenHash, expiresAt: getRefreshExpiry() }],
      lastLoginAt: new Date(),
    })

    const payload = {
      userId: user._id.toString(),
      organizationId: organization._id.toString(),
      email: user.email,
      role: user.role,
    }

    const accessToken = signAccessToken(payload)
    const finalRefreshToken = signRefreshToken(payload)
    const finalHash = await hashToken(finalRefreshToken)

    await User.updateOne(
      { _id: user._id },
      { $set: { refreshTokens: [{ tokenHash: finalHash, expiresAt: getRefreshExpiry() }] } }
    )

    const response = NextResponse.json(
      {
        accessToken,
        user: {
          id: user._id.toString(),
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          organizationId: organization._id.toString(),
        },
      },
      { status: 201 }
    )

    response.cookies.set('refreshToken', finalRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/auth',
      maxAge: 7 * 24 * 60 * 60,
    })

    return response
  } catch (error: unknown) {
    console.error('Register error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
