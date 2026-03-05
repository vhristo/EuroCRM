import mongoose, { Schema, Document, Types } from 'mongoose'

export interface ICampaignRecipient {
  id: string
  campaignId: string
  organizationId: string
  contactId: string
  email: string
  status: 'pending' | 'sent' | 'failed' | 'opened' | 'clicked'
  sentAt?: string
  openedAt?: string
  clickedAt?: string
  errorMessage?: string
}

export interface ICampaignRecipientDocument
  extends Omit<
      ICampaignRecipient,
      'id' | 'campaignId' | 'organizationId' | 'contactId' | 'sentAt' | 'openedAt' | 'clickedAt'
    >,
    Document {
  campaignId: Types.ObjectId
  organizationId: Types.ObjectId
  contactId: Types.ObjectId
  sentAt?: Date
  openedAt?: Date
  clickedAt?: Date
}

const campaignRecipientSchema = new Schema<ICampaignRecipientDocument>(
  {
    campaignId: {
      type: Schema.Types.ObjectId,
      ref: 'Campaign',
      required: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    contactId: {
      type: Schema.Types.ObjectId,
      ref: 'Contact',
      required: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'sent', 'failed', 'opened', 'clicked'],
      default: 'pending',
    },
    sentAt: { type: Date },
    openedAt: { type: Date },
    clickedAt: { type: Date },
    errorMessage: { type: String },
  },
  {
    timestamps: true,
  }
)

campaignRecipientSchema.index({ campaignId: 1, organizationId: 1 })
campaignRecipientSchema.index({ contactId: 1 })
campaignRecipientSchema.index({ campaignId: 1, status: 1 })

const CampaignRecipient =
  mongoose.models.CampaignRecipient ??
  mongoose.model<ICampaignRecipientDocument>('CampaignRecipient', campaignRecipientSchema)

export default CampaignRecipient
