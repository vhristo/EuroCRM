import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { verifyRefreshToken, hashToken } from '@/lib/auth'
import {
  resolveActiveMembership,
  issueSession,
  buildSessionResponse,
  setRefreshCookie,
  clearRefreshCookie,
  listOrganizations,
} from '@/lib/session'
import User, { type IRefreshToken } from '@/models/User'
import Membership from '@/models/Membership'

function unauthorized(message: string) {
  const response = NextResponse.json({ error: message }, { status: 401 })
  clearRefreshCookie(response)
  return response
}

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('refreshToken')?.value
    if (!token) {
      return NextResponse.json({ error: 'No refresh token' }, { status: 401 })
    }

    const payload = verifyRefreshToken(token)
    if (!payload) {
      return unauthorized('Invalid refresh token')
    }

    await connectDB()

    const oldHash = await hashToken(token)

    // Atomic single-use consumption: match on the hash and remove it in one
    // operation, so two concurrent refreshes cannot both succeed. `new: false`
    // returns the pre-update document, which still holds the consumed subdocument
    // so its stored expiry can be checked.
    const user = await User.findOneAndUpdate(
      {
        _id: payload.userId,
        'refreshTokens.tokenHash': oldHash,
      },
      { $pull: { refreshTokens: { tokenHash: oldHash } } },
      { new: false }
    )

    if (!user) {
      return unauthorized('Refresh token not found')
    }

    const stored = (user.refreshTokens as IRefreshToken[]).find((t) => t.tokenHash === oldHash)
    if (stored && stored.expiresAt.getTime() < Date.now()) {
      return unauthorized('Refresh token expired')
    }

    // The active organization comes from the token, not from the user document —
    // that is what lets a switched organization survive a refresh.
    let membership = await Membership.findOne({
      userId: payload.userId,
      organizationId: payload.organizationId,
    })

    // Membership revoked since the token was issued. Fall back to another
    // organization rather than signing out: one organization removing a user
    // must not log them out of every other organization they belong to.
    if (!membership) {
      membership = await resolveActiveMembership(payload.userId)
    }

    if (!membership) {
      return unauthorized('No organization access')
    }

    // Role is always re-read from the membership, never carried over from the
    // token, so role changes take effect within one access-token lifetime.
    const { accessToken, refreshToken } = await issueSession(user, membership)
    const organizations = await listOrganizations(user._id.toString())

    const response = NextResponse.json(
      buildSessionResponse(user, membership, organizations, accessToken)
    )

    setRefreshCookie(response, refreshToken)

    return response
  } catch (error: unknown) {
    console.error('Refresh error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
