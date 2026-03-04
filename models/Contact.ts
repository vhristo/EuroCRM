import mongoose, { Schema, Document, Types } from 'mongoose'

export interface IContact {
  id: string
  organizationId: string
  firstName: string
  lastName: string
  email?: string
  phone?: string
  company?: string
  jobTitle?: string
  country?: string
  city?: string
  address?: string
  currency: string
  tags: string[]
  notes?: string
  ownerId: string
  createdAt: string
  updatedAt: string
}

export interface IContactDocument
  extends Omit<IContact, 'id' | 'organizationId' | 'ownerId' | 'createdAt' | 'updatedAt'>,
    Document {
  organizationId: Types.ObjectId
  ownerId: Types.ObjectId
}

const contactSchema = new Schema<IContactDocument>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
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
    jobTitle: {
      type: String,
      trim: true,
    },
    country: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    currency: {
      type: String,
      default: 'EUR',
    },
    tags: {
      type: [String],
      default: [],
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

contactSchema.index({ organizationId: 1, ownerId: 1 })
contactSchema.index({ organizationId: 1, email: 1 })

const Contact = mongoose.models.Contact ?? mongoose.model<IContactDocument>('Contact', contactSchema)

export default Contact
