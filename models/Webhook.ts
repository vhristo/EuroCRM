import mongoose, { Schema, Document, Types } from 'mongoose'

export interface IWebhook {
  id: string
  organizationId: string
  url: string
  secret: string
  events: string[]
  active: boolean
  failureCount: number
  lastDeliveryAt?: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface IWebhookDocument
  extends Omit<
      IWebhook,
      'id' | 'organizationId' | 'lastDeliveryAt' | 'createdBy' | 'createdAt' | 'updatedAt'
    >,
    Document {
  organizationId: Types.ObjectId
  lastDeliveryAt?: Date
  createdBy: Types.ObjectId
}

const webhookSchema = new Schema<IWebhookDocument>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    secret: {
      type: String,
      required: true,
    },
    events: {
      type: [String],
      default: [],
    },
    active: {
      type: Boolean,
      default: true,
    },
    failureCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastDeliveryAt: {
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

webhookSchema.index({ organizationId: 1, active: 1 })

const Webhook = mongoose.models.Webhook ?? mongoose.model<IWebhookDocument>('Webhook', webhookSchema)

export default Webhook
