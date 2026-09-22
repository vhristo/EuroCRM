import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { connectDB } from '@/lib/db'
import { RegisterSchema } from '@/lib/validators/authSchema'
import {
  issueSession,
  buildSessionResponse,
  setRefreshCookie,
  listOrganizations,
} from '@/lib/session'
import { seedOrganization } from '@/lib/orgBootstrap'
import User from '@/models/User'
import Organization from '@/models/Organization'
import Membership from '@/models/Membership'

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

    const organization = await Organization.create({ name: organizationName })
    await seedOrganization(organization._id.toString())

    const passwordHash = await bcrypt.hash(password, 12)

    const user = await User.create({
      email,
      passwordHash,
      firstName,
      lastName,
      refreshTokens: [],
      lastLoginAt: new Date(),
      // Deprecated, still written so a rollback to a pre-multi-org image works.
      organizationId: organization._id,
      role: 'admin',
      // This user's legacy organizationId is already represented by the
      // Membership created below, so the lazy backfill must never fire for them.
      membershipsBackfilledAt: new Date(),
    })

    const membership = await Membership.create({
      userId: user._id,
      organizationId: organization._id,
      role: 'admin',
    })

    const { accessToken, refreshToken } = await issueSession(user, membership)
    const organizations = await listOrganizations(user._id.toString())

    const response = NextResponse.json(
      buildSessionResponse(user, membership, organizations, accessToken),
      { status: 201 }
    )

    setRefreshCookie(response, refreshToken)

    return response
  } catch (error: unknown) {
    console.error('Register error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
