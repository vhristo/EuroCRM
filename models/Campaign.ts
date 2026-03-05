import mongoose, { Schema, Document, Types } from 'mongoose'
import type { ICampaignRecipientFilter, ICampaignStats } from '@/types/campaign'

export interface ICampaign {
  id: string
  organizationId: string
  name: string
  subject: string
  htmlBody: string
  textBody?: string
  recipientFilter: ICampaignRecipientFilter
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused'
  scheduledAt?: string
  stats: ICampaignStats
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface ICampaignDocument
  extends Omit<ICampaign, 'id' | 'organizationId' | 'createdBy' | 'scheduledAt' | 'createdAt' | 'updatedAt'>,
    Document {
  organizationId: Types.ObjectId
  createdBy: Types.ObjectId
  scheduledAt?: Date
}

const recipientFilterSchema = new Schema<ICampaignRecipientFilter>(
  {
    tags: { type: [String], default: [] },
    ownerId: { type: String },
    country: { type: String },
  },
  { _id: false }
)

const statsSchema = new Schema<ICampaignStats>(
  {
    totalRecipients: { type: Number, default: 0 },
    sent: { type: Number, default: 0 },
    opened: { type: Number, default: 0 },
    clicked: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
  },
  { _id: false }
)

const campaignSchema = new Schema<ICampaignDocument>(
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
      maxlength: 200,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    htmlBody: {
      type: String,
      required: true,
    },
    textBody: {
      type: String,
    },
    recipientFilter: {
      type: recipientFilterSchema,
      default: () => ({}),
    },
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'sending', 'sent', 'paused'],
      default: 'draft',
    },
    scheduledAt: {
      type: Date,
    },
    stats: {
      type: statsSchema,
      default: () => ({
        totalRecipients: 0,
        sent: 0,
        opened: 0,
        clicked: 0,
        failed: 0,
      }),
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

campaignSchema.index({ organizationId: 1, status: 1 })
campaignSchema.index({ organizationId: 1, createdAt: -1 })

const Campaign =
  mongoose.models.Campaign ?? mongoose.model<ICampaignDocument>('Campaign', campaignSchema)

export default Campaign
