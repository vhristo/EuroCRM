import mongoose, { Schema, Document, Types } from 'mongoose'

export interface ILead {
  id: string
  organizationId: string
  name: string
  email?: string
  phone?: string
  company?: string
  source: 'website' | 'referral' | 'cold_call' | 'email_campaign' | 'social_media' | 'trade_show' | 'other'
  status: 'new' | 'contacted' | 'qualified' | 'unqualified' | 'converted'
  notes?: string
  ownerId: string
  convertedToDealId?: string | null
  convertedToContactId?: string | null
  convertedAt?: string
  createdAt: string
  updatedAt: string
}

export interface ILeadDocument
  extends Omit<
      ILead,
      | 'id'
      | 'organizationId'
      | 'ownerId'
      | 'convertedToDealId'
      | 'convertedToContactId'
      | 'convertedAt'
      | 'createdAt'
      | 'updatedAt'
    >,
    Document {
  organizationId: Types.ObjectId
  ownerId: Types.ObjectId
  convertedToDealId?: Types.ObjectId | null
  convertedToContactId?: Types.ObjectId | null
  convertedAt?: Date
}

const leadSchema = new Schema<ILeadDocument>(
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
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    company: {
      type: String,
      trim: true,
    },
    source: {
      type: String,
      enum: ['website', 'referral', 'cold_call', 'email_campaign', 'social_media', 'trade_show', 'other'],
      default: 'other',
    },
    status: {
      type: String,
      enum: ['new', 'contacted', 'qualified', 'unqualified', 'converted'],
      default: 'new',
    },
    notes: {
      type: String,
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    convertedToDealId: {
      type: Schema.Types.ObjectId,
      ref: 'Deal',
      default: null,
    },
    convertedToContactId: {
      type: Schema.Types.ObjectId,
      ref: 'Contact',
      default: null,
    },
    convertedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
)

leadSchema.index({ organizationId: 1, status: 1 })
leadSchema.index({ organizationId: 1, ownerId: 1 })

const Lead = mongoose.models.Lead ?? mongoose.model<ILeadDocument>('Lead', leadSchema)

export default Lead
