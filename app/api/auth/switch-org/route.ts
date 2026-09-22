import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { requireAuth, unauthorizedResponse, hashToken } from '@/lib/auth'
import {
  issueSession,
  buildSessionResponse,
  setRefreshCookie,
  listOrganizations,
} from '@/lib/session'
import { SwitchOrganizationSchema } from '@/lib/validators/organizationSchema'
import User from '@/models/User'
import Membership from '@/models/Membership'

/** Makes a different organization the active one for this session. */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (!auth) return unauthorizedResponse()

    // Validated before it reaches Mongo: an unchecked string would throw a
    // CastError and surface as a 500.
    const parsed = SwitchOrganizationSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    await connectDB()

    const membership = await Membership.findOne({
      userId: auth.userId,
      organizationId: parsed.data.organizationId,
    })

    // The same 403 whether the organization does not exist or the caller is not
    // a member, so this endpoint cannot be used to probe for organization ids.
    if (!membership) {
      return NextResponse.json(
        { error: 'Forbidden', code: 'NOT_A_MEMBER' },
        { status: 403 }
      )
    }

    const user = await User.findById(auth.userId)
    if (!user) return unauthorizedResponse()

    // Rotating the old refresh token here is hygiene, not the security boundary
    // — the membership check above is. So a cookie that has already been rotated
    // by a concurrent refresh must not fail the switch.
    const currentToken = req.cookies.get('refreshToken')?.value
    const consumeHash = currentToken ? await hashToken(currentToken) : undefined

    const { accessToken, refreshToken } = await issueSession(user, membership, { consumeHash })
    const organizations = await listOrganizations(auth.userId)

    const response = NextResponse.json(
      buildSessionResponse(user, membership, organizations, accessToken)
    )

    setRefreshCookie(response, refreshToken)

    return response
  } catch (error: unknown) {
    console.error('Switch organization error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
