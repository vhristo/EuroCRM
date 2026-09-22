import mongoose, { Schema, Document, Types } from 'mongoose'

export interface IRefreshToken {
  tokenHash: string
  expiresAt: Date
}

export interface IUser {
  id: string
  /**
   * @deprecated Organization membership lives in the `Membership` collection.
   * Retained (and still populated at registration) so a rollback to a
   * pre-multi-org image keeps working against a migrated database. Nothing
   * reads it — use `resolveActiveMembership` from `lib/session.ts`.
   */
  organizationId?: string
  email: string
  passwordHash: string
  firstName: string
  lastName: string
  /**
   * @deprecated Role is per-organization and lives on `Membership.role`.
   * See the note on `organizationId` above.
   */
  role?: 'admin' | 'manager' | 'sales_rep'
  refreshTokens: IRefreshToken[]
  /** Which organization to open on next login. A hint only, never an authorization input. */
  lastOrganizationId?: string
  /**
   * Set once the user's legacy `organizationId` has been turned into a
   * Membership. Its presence stops the lazy backfill from ever running again —
   * without it, revoking someone's last membership would simply be undone the
   * next time they authenticated.
   */
  membershipsBackfilledAt?: string
  lastLoginAt?: string
  createdAt: string
  updatedAt: string
}

export interface IUserDocument
  extends Omit<
      IUser,
      | 'id'
      | 'organizationId'
      | 'lastOrganizationId'
      | 'membershipsBackfilledAt'
      | 'lastLoginAt'
      | 'createdAt'
      | 'updatedAt'
    >,
    Document {
  organizationId?: Types.ObjectId
  lastOrganizationId?: Types.ObjectId
  membershipsBackfilledAt?: Date
  lastLoginAt?: Date
}

const refreshTokenSchema = new Schema<IRefreshToken>(
  {
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { _id: false }
)

const userSchema = new Schema<IUserDocument>(
  {
    // @deprecated — see IUser. Kept for rollback safety; nothing reads it.
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: false,
      index: true,
    },
    lastOrganizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
    },
    membershipsBackfilledAt: {
      type: Date,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    // @deprecated — role is per-organization on Membership. See IUser.
    role: {
      type: String,
      enum: ['admin', 'manager', 'sales_rep'],
      default: 'sales_rep',
    },
    refreshTokens: {
      type: [refreshTokenSchema],
      default: [],
    },
    lastLoginAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
)

const User = mongoose.models.User ?? mongoose.model<IUserDocument>('User', userSchema)

export default User
