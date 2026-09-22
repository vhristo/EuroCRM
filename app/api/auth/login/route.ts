import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { connectDB } from '@/lib/db'
import { LoginSchema } from '@/lib/validators/authSchema'
import {
  resolveActiveMembership,
  issueSession,
  buildSessionResponse,
  setRefreshCookie,
  listOrganizations,
} from '@/lib/session'
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

    const membership = await resolveActiveMembership(
      user._id.toString(),
      user.lastOrganizationId?.toString()
    )

    // 403, not 401: the credentials were correct, so the login form must not
    // tell this user their password is wrong.
    if (!membership) {
      return NextResponse.json(
        { error: 'No organization access', code: 'NO_MEMBERSHIP' },
        { status: 403 }
      )
    }

    const { accessToken, refreshToken } = await issueSession(user, membership)
    await User.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } })

    const organizations = await listOrganizations(user._id.toString())

    const response = NextResponse.json(
      buildSessionResponse(user, membership, organizations, accessToken)
    )

    setRefreshCookie(response, refreshToken)

    return response
  } catch (error: unknown) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
