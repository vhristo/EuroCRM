import mongoose, { Schema, Document, Types } from 'mongoose'
import type { IWebFormField } from '@/types/webForm'

export interface IWebFormDocument extends Document {
  organizationId: Types.ObjectId
  name: string
  slug: string
  description?: string
  fields: IWebFormField[]
  styling: {
    primaryColor: string
    backgroundColor: string
    buttonText: string
  }
  successMessage: string
  active: boolean
  submissions: number
  createdAt: Date
  updatedAt: Date
}

const webFormFieldSchema = new Schema<IWebFormField>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['text', 'email', 'phone', 'textarea', 'select'],
      required: true,
    },
    required: { type: Boolean, default: false },
    options: [{ type: String }],
    order: { type: Number, required: true },
    mapTo: {
      type: String,
      enum: ['name', 'email', 'phone', 'company', 'notes', null],
      default: null,
    },
  },
  { _id: false }
)

const webFormSchema = new Schema<IWebFormDocument>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    description: { type: String, trim: true },
    fields: [webFormFieldSchema],
    styling: {
      primaryColor: { type: String, default: '#1976d2' },
      backgroundColor: { type: String, default: '#ffffff' },
      buttonText: { type: String, default: 'Submit' },
    },
    successMessage: {
      type: String,
      default: 'Thank you! We will be in touch shortly.',
    },
    active: { type: Boolean, default: true },
    submissions: { type: Number, default: 0 },
  },
  { timestamps: true }
)

// Slug must be unique per organization
webFormSchema.index({ organizationId: 1, slug: 1 }, { unique: true })
// Global unique slug for public URL resolution
webFormSchema.index({ slug: 1 }, { unique: true })
webFormSchema.index({ organizationId: 1, active: 1 })

const WebForm =
  mongoose.models.WebForm ??
  mongoose.model<IWebFormDocument>('WebForm', webFormSchema)

export default WebForm
