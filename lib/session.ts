import { NextResponse } from 'next/server'
import { Types } from 'mongoose'
import {
  signAccessToken,
  signRefreshToken,
  hashToken,
  getRefreshExpiry,
  type AuthPayload,
} from '@/lib/auth'
import User from '@/models/User'
import Membership, { type IMembershipDocument } from '@/models/Membership'
import Organization from '@/models/Organization'

const REFRESH_COOKIE = 'refreshToken'

export interface OrganizationSummary {
  id: string
  name: string
  role: string
}

export interface SessionUser {
  id: string
  email: string
  firstName: string
  lastName: string
  /** Role in the currently active organization. */
  role: string
  /** The currently active organization. */
  organizationId: string
}

export interface SessionResponseBody {
  accessToken: string
  user: SessionUser
  organizations: OrganizationSummary[]
}

/** The subset of a user document this module needs. Keeps us off Mongoose's loose model typing. */
export interface SessionUserDoc {
  _id: Types.ObjectId
  email: string
  firstName: string
  lastName: string
}

/**
 * Picks the organization a session should open in.
 *
 * Order: the explicitly requested one, then the last one used, then the oldest
 * membership. Returns null only when the user belongs to no organization.
 *
 * Also carries the lazy backfill for users created before multi-organization
 * support: if they have no membership but still carry the legacy
 * `User.organizationId`, one is created on the spot. This is what makes the
 * migration order-independent — a user who somehow misses the migration script
 * self-heals on their next login or token refresh.
 */
export async function resolveActiveMembership(
  userId: string,
  preferredOrgId?: string
): Promise<IMembershipDocument | null> {
  if (preferredOrgId) {
    const preferred = await Membership.findOne({ userId, organizationId: preferredOrgId })
    if (preferred) return preferred
  }

  const oldest = await Membership.findOne({ userId }).sort({ createdAt: 1 })
  if (oldest) return oldest

  return backfillLegacyMembership(userId)
}

async function backfillLegacyMembership(userId: string): Promise<IMembershipDocument | null> {
  const user = await User.findById(userId)
    .select('organizationId role membershipsBackfilledAt')
    .lean<{
      organizationId?: Types.ObjectId
      role?: string
      membershipsBackfilledAt?: Date
    } | null>()

  // Runs at most once per user. Otherwise revoking someone's last membership
  // would be silently undone the next time they logged in or refreshed.
  if (!user?.organizationId || user.membershipsBackfilledAt) return null

  const role = user.role ?? 'sales_rep'

  const membership = await Membership.findOneAndUpdate(
    { userId, organizationId: user.organizationId },
    { $setOnInsert: { userId, organizationId: user.organizationId, role } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )

  await User.updateOne({ _id: userId }, { $set: { membershipsBackfilledAt: new Date() } })

  return membership
}

/** Every organization the user belongs to, oldest membership first. */
export async function listOrganizations(userId: string): Promise<OrganizationSummary[]> {
  const memberships = await Membership.find({ userId })
    .sort({ createdAt: 1 })
    .lean<{ organizationId: Types.ObjectId; role: string }[]>()

  if (memberships.length === 0) return []

  const orgs = await Organization.find({
    _id: { $in: memberships.map((m) => m.organizationId) },
  })
    .select('name')
    .lean<{ _id: Types.ObjectId; name: string }[]>()

  const namesById = new Map(orgs.map((o) => [o._id.toString(), o.name]))

  return memberships
    .filter((m) => namesById.has(m.organizationId.toString()))
    .map((m) => ({
      id: m.organizationId.toString(),
      name: namesById.get(m.organizationId.toString()) as string,
      role: m.role,
    }))
}

/**
 * Signs a new token pair scoped to `membership`'s organization and role, stores
 * the refresh token hash, and records the organization as the user's most recent.
 *
 * `consumeHash` removes a superseded refresh token in the same pass. It is
 * best-effort: callers that need single-use consumption to be atomic (the
 * refresh route) must do the matched `$pull` themselves before calling this.
 * Expired hashes are pruned on every call, since nothing else prunes them.
 */
export async function issueSession(
  user: SessionUserDoc,
  membership: IMembershipDocument,
  opts: { consumeHash?: string } = {}
): Promise<{ accessToken: string; refreshToken: string; payload: AuthPayload }> {
  const payload: AuthPayload = {
    userId: user._id.toString(),
    organizationId: membership.organizationId.toString(),
    email: user.email,
    role: membership.role,
  }

  const accessToken = signAccessToken(payload)
  const refreshToken = signRefreshToken(payload)
  const tokenHash = await hashToken(refreshToken)

  // $pull and $push on the same array cannot share one update operation.
  const staleConditions: Record<string, unknown>[] = [{ expiresAt: { $lt: new Date() } }]
  if (opts.consumeHash) staleConditions.push({ tokenHash: opts.consumeHash })

  await User.updateOne(
    { _id: user._id },
    { $pull: { refreshTokens: { $or: staleConditions } } }
  )

  await User.updateOne(
    { _id: user._id },
    {
      $push: { refreshTokens: { tokenHash, expiresAt: getRefreshExpiry() } },
      $set: { lastOrganizationId: membership.organizationId },
    }
  )

  return { accessToken, refreshToken, payload }
}

/** The one definition of the refresh cookie's options. */
export function setRefreshCookie(res: NextResponse, token: string): void {
  const maxAge = Math.max(0, Math.floor((getRefreshExpiry().getTime() - Date.now()) / 1000))

  res.cookies.set(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth',
    maxAge,
  })
}

export function clearRefreshCookie(res: NextResponse): void {
  res.cookies.set(REFRESH_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: 0,
  })
}

/** The single response shape for register, login, refresh, switch and create. */
export function buildSessionResponse(
  user: SessionUserDoc,
  membership: IMembershipDocument,
  organizations: OrganizationSummary[],
  accessToken: string
): SessionResponseBody {
  return {
    accessToken,
    user: {
      id: user._id.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: membership.role,
      organizationId: membership.organizationId.toString(),
    },
    organizations,
  }
}
