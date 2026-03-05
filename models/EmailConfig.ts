import mongoose, { Schema, Document, Types } from 'mongoose'

export interface IEmailConfigDocument extends Document {
  organizationId: Types.ObjectId
  host: string
  port: number
  secure: boolean
  username: string
  // stored as iv:authTag:encryptedHex
  encryptedPassword: string
  fromName: string
  fromEmail: string
}

const emailConfigSchema = new Schema<IEmailConfigDocument>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      unique: true,
      index: true,
    },
    host: { type: String, required: true, trim: true },
    port: { type: Number, required: true, default: 587 },
    secure: { type: Boolean, required: true, default: false },
    username: { type: String, required: true, trim: true },
    encryptedPassword: { type: String, required: true },
    fromName: { type: String, required: true, trim: true },
    fromEmail: { type: String, required: true, lowercase: true, trim: true },
  },
  { timestamps: true }
)

const EmailConfig =
  mongoose.models.EmailConfig ??
  mongoose.model<IEmailConfigDocument>('EmailConfig', emailConfigSchema)

export default EmailConfig
