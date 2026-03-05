import mongoose, { Schema, Document, Types } from 'mongoose'

export interface IApiKey {
  id: string
  organizationId: string
  name: string
  keyPrefix: string
  keyHash: string
  permissions: string[]
  lastUsedAt?: string
  expiresAt?: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface IApiKeyDocument
  extends Omit<
      IApiKey,
      'id' | 'organizationId' | 'lastUsedAt' | 'expiresAt' | 'createdBy' | 'createdAt' | 'updatedAt'
    >,
    Document {
  organizationId: Types.ObjectId
  lastUsedAt?: Date
  expiresAt?: Date
  createdBy: Types.ObjectId
}

const apiKeySchema = new Schema<IApiKeyDocument>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    keyPrefix: {
      type: String,
      required: true,
    },
    keyHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    permissions: {
      type: [String],
      default: [],
    },
    lastUsedAt: {
      type: Date,
    },
    expiresAt: {
      type: Date,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
)

apiKeySchema.index({ organizationId: 1, name: 1 })

const ApiKey = mongoose.models.ApiKey ?? mongoose.model<IApiKeyDocument>('ApiKey', apiKeySchema)

export default ApiKey
