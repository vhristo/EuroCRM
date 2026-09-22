/**
 * The caller's organizations — the ones they are a member of.
 *
 * Not to be confused with /api/settings/organization (singular), which reads and
 * writes the settings of whichever organization is currently active.
 */
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { requireAuth, unauthorizedResponse } from '@/lib/auth'
import {
  issueSession,
  buildSessionResponse,
  setRefreshCookie,
  listOrganizations,
} from '@/lib/session'
import { seedOrganization } from '@/lib/orgBootstrap'
import { CreateOrganizationSchema } from '@/lib/validators/organizationSchema'
import User from '@/models/User'
import Organization from '@/models/Organization'
import Membership from '@/models/Membership'

/** Nothing else in this app is rate limited, and this is the first endpoint where
 *  an authenticated user can create unbounded top-level records. */
const MAX_OWNED_ORGANIZATIONS = 10

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (!auth) return unauthorizedResponse()

    await connectDB()

    const items = await listOrganizations(auth.userId)

    return NextResponse.json({ items, total: items.length })
  } catch (error: unknown) {
    console.error('List organizations error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** Creates a new organization owned by the caller and switches them into it. */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (!auth) return unauthorizedResponse()

    const parsed = CreateOrganizationSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    await connectDB()

    const owned = await Membership.countDocuments({ userId: auth.userId, role: 'admin' })
    if (owned >= MAX_OWNED_ORGANIZATIONS) {
      return NextResponse.json(
        { error: 'Organization limit reached', code: 'ORG_LIMIT_REACHED' },
        { status: 403 }
      )
    }

    const user = await User.findById(auth.userId)
    if (!user) return unauthorizedResponse()

    const organization = await Organization.create({ name: parsed.data.name })
    await seedOrganization(organization._id.toString())

    const membership = await Membership.findOneAndUpdate(
      { userId: auth.userId, organizationId: organization._id },
      {
        $setOnInsert: {
          userId: auth.userId,
          organizationId: organization._id,
          role: 'admin',
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )

    const { accessToken, refreshToken } = await issueSession(user, membership)
    const organizations = await listOrganizations(auth.userId)

    const response = NextResponse.json(
      buildSessionResponse(user, membership, organizations, accessToken),
      { status: 201 }
    )

    setRefreshCookie(response, refreshToken)

    return response
  } catch (error: unknown) {
    console.error('Create organization error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
