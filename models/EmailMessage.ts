import mongoose, { Schema, Document, Types } from 'mongoose'

export interface IEmailOpenSubdoc {
  timestamp: Date
  ip?: string
  userAgent?: string
}

export interface IEmailClickSubdoc {
  timestamp: Date
  url: string
  ip?: string
  userAgent?: string
}

export interface IEmailMessageDocument extends Document {
  organizationId: Types.ObjectId
  to: string
  from: string
  subject: string
  htmlBody: string
  textBody?: string
  contactId?: Types.ObjectId
  dealId?: Types.ObjectId
  trackingId: string
  status: 'queued' | 'sent' | 'failed'
  errorMessage?: string
  opens: IEmailOpenSubdoc[]
  clicks: IEmailClickSubdoc[]
  sentAt?: Date
  senderId: Types.ObjectId
}

const openSchema = new Schema<IEmailOpenSubdoc>(
  {
    timestamp: { type: Date, required: true, default: Date.now },
    ip: { type: String },
    userAgent: { type: String },
  },
  { _id: false }
)

const clickSchema = new Schema<IEmailClickSubdoc>(
  {
    timestamp: { type: Date, required: true, default: Date.now },
    url: { type: String, required: true },
    ip: { type: String },
    userAgent: { type: String },
  },
  { _id: false }
)

const emailMessageSchema = new Schema<IEmailMessageDocument>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    to: { type: String, required: true, lowercase: true, trim: true },
    from: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    htmlBody: { type: String, required: true },
    textBody: { type: String },
    contactId: { type: Schema.Types.ObjectId, ref: 'Contact' },
    dealId: { type: Schema.Types.ObjectId, ref: 'Deal' },
    trackingId: { type: String, required: true, unique: true, index: true },
    status: {
      type: String,
      enum: ['queued', 'sent', 'failed'],
      required: true,
      default: 'queued',
    },
    errorMessage: { type: String },
    opens: { type: [openSchema], default: [] },
    clicks: { type: [clickSchema], default: [] },
    sentAt: { type: Date },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
)

emailMessageSchema.index({ organizationId: 1, createdAt: -1 })
emailMessageSchema.index({ organizationId: 1, to: 1 })
emailMessageSchema.index({ organizationId: 1, status: 1 })

const EmailMessage =
  mongoose.models.EmailMessage ??
  mongoose.model<IEmailMessageDocument>('EmailMessage', emailMessageSchema)

export default EmailMessage
