import mongoose, { Schema, Document, Types } from 'mongoose'

export interface IActivity {
  id: string
  organizationId: string
  type: 'call' | 'email' | 'meeting' | 'task' | 'note'
  subject: string
  description?: string
  dueDate?: string
  done: boolean
  doneAt?: string
  contactId?: string
  dealId?: string
  ownerId: string
  createdAt: string
  updatedAt: string
}

export interface IActivityDocument
  extends Omit<
      IActivity,
      | 'id'
      | 'organizationId'
      | 'dueDate'
      | 'doneAt'
      | 'contactId'
      | 'dealId'
      | 'ownerId'
      | 'createdAt'
      | 'updatedAt'
    >,
    Document {
  organizationId: Types.ObjectId
  dueDate?: Date
  doneAt?: Date
  contactId?: Types.ObjectId
  dealId?: Types.ObjectId
  ownerId: Types.ObjectId
}

const activitySchema = new Schema<IActivityDocument>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['call', 'email', 'meeting', 'task', 'note'],
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
    },
    dueDate: {
      type: Date,
    },
    done: {
      type: Boolean,
      default: false,
    },
    doneAt: {
      type: Date,
    },
    contactId: {
      type: Schema.Types.ObjectId,
      ref: 'Contact',
    },
    dealId: {
      type: Schema.Types.ObjectId,
      ref: 'Deal',
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

activitySchema.index({ organizationId: 1, ownerId: 1, done: 1 })
activitySchema.index({ organizationId: 1, dealId: 1 })
activitySchema.index({ organizationId: 1, contactId: 1 })

const Activity = mongoose.models.Activity ?? mongoose.model<IActivityDocument>('Activity', activitySchema)

export default Activity
