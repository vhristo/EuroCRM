import mongoose, { Schema, Document, Types } from 'mongoose'

export interface IDeal {
  id: string
  organizationId: string
  title: string
  value: number
  currency: string
  stage: string
  pipelineId: string
  contactId?: string
  status: 'open' | 'won' | 'lost'
  probability: number
  expectedCloseDate?: string
  rottenSince?: string | null
  stageEnteredAt: string
  wonAt?: string
  lostAt?: string
  lostReason?: string
  notes?: string
  ownerId: string
  createdAt: string
  updatedAt: string
}

export interface IDealDocument
  extends Omit<
      IDeal,
      | 'id'
      | 'organizationId'
      | 'pipelineId'
      | 'contactId'
      | 'ownerId'
      | 'expectedCloseDate'
      | 'rottenSince'
      | 'stageEnteredAt'
      | 'wonAt'
      | 'lostAt'
      | 'createdAt'
      | 'updatedAt'
    >,
    Document {
  organizationId: Types.ObjectId
  pipelineId: Types.ObjectId
  contactId?: Types.ObjectId
  ownerId: Types.ObjectId
  expectedCloseDate?: Date
  rottenSince?: Date | null
  stageEnteredAt: Date
  wonAt?: Date
  lostAt?: Date
}

const dealSchema = new Schema<IDealDocument>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    value: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: (v: number) => Number.isInteger(v),
        message: 'Deal value must be an integer (cents)',
      },
    },
    currency: {
      type: String,
      default: 'EUR',
    },
    stage: {
      type: String,
      required: true,
    },
    pipelineId: {
      type: Schema.Types.ObjectId,
      ref: 'Pipeline',
      required: true,
    },
    contactId: {
      type: Schema.Types.ObjectId,
      ref: 'Contact',
    },
    status: {
      type: String,
      enum: ['open', 'won', 'lost'],
      default: 'open',
    },
    probability: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    expectedCloseDate: {
      type: Date,
    },
    rottenSince: {
      type: Date,
      default: null,
    },
    stageEnteredAt: {
      type: Date,
      default: Date.now,
    },
    wonAt: {
      type: Date,
    },
    lostAt: {
      type: Date,
    },
    lostReason: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
)

dealSchema.index({ organizationId: 1, pipelineId: 1, status: 1 })
dealSchema.index({ organizationId: 1, ownerId: 1 })
dealSchema.index({ organizationId: 1, contactId: 1 })

const Deal = mongoose.models.Deal ?? mongoose.model<IDealDocument>('Deal', dealSchema)

export default Deal
