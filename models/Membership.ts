import mongoose, { Schema, Document, Types } from 'mongoose'

/**
 * Joins a user to an organization with a role scoped to that organization.
 *
 * Invariant: a Membership document exists if and only if the user is an active
 * member of that organization. There is deliberately no `status` field — when
 * invitations are added they get their own collection, so no membership check
 * can ever forget to exclude a pending row.
 */
export interface IMembership {
  id: string
  userId: string
  organizationId: string
  role: 'admin' | 'manager' | 'sales_rep'
  createdAt: string
  updatedAt: string
}

export interface IMembershipDocument
  extends Omit<IMembership, 'id' | 'userId' | 'organizationId' | 'createdAt' | 'updatedAt'>,
    Document {
  userId: Types.ObjectId
  organizationId: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const membershipSchema = new Schema<IMembershipDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    role: {
      // No default — the role is always explicit at the call site.
      type: String,
      enum: ['admin', 'manager', 'sales_rep'],
      required: true,
    },
  },
  {
    timestamps: true,
  }
)

// The integrity guarantee. The userId prefix also serves "list my organizations",
// so no separate { userId: 1 } index is needed.
membershipSchema.index({ userId: 1, organizationId: 1 }, { unique: true })

// Serves the oldest-admin lookup in the public web form route, sort included.
membershipSchema.index({ organizationId: 1, role: 1, createdAt: 1 })

const Membership =
  mongoose.models.Membership ??
  mongoose.model<IMembershipDocument>('Membership', membershipSchema)

export default Membership
