import mongoose, { Schema, Document, Types } from 'mongoose'

export interface IRefreshToken {
  tokenHash: string
  expiresAt: Date
}

export interface IUser {
  id: string
  organizationId: string
  email: string
  passwordHash: string
  firstName: string
  lastName: string
  role: 'admin' | 'manager' | 'sales_rep'
  refreshTokens: IRefreshToken[]
  lastLoginAt?: string
  createdAt: string
  updatedAt: string
}

export interface IUserDocument
  extends Omit<IUser, 'id' | 'organizationId' | 'lastLoginAt' | 'createdAt' | 'updatedAt'>,
    Document {
  organizationId: Types.ObjectId
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
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
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

userSchema.index({ organizationId: 1, email: 1 })

const User = mongoose.models.User ?? mongoose.model<IUserDocument>('User', userSchema)

export default User
